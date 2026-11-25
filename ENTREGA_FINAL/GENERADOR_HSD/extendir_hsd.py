"""
EXTENSION CONTROLADA DE HSD - anade lecturas 2025-01-01 a 2026-11-24
sobre la base energia_hsd existente, sin borrar ni reescribir los
10,800,000 registros ya cargados.

Estrategia:
  - Crea particiones mensuales nuevas (2025-01..12 y 2026-04..11).
  - Anade filas de calendario que no existan (PK fecha).
  - Reutiliza los 5,000 servicios y 5,260 medidores actuales.
  - Genera eventos, alertas y lecturas en un rango nuevo.
  - Desplaza id_evento, id_alerta e id_periodo con MAX+1 para no
    colisionar con las corridas anteriores.
  - Registra una corrida nueva en energia.corrida_generacion.

Uso:
  .venv\\Scripts\\python.exe extendir_hsd.py
"""

import random
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

import yaml

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from config.settings import settings
from database.connection import get_connection
from database.insertar import copy_lote
from Generation.Calendario_Gen import generar_calendario
from Generation.Lecturas_Gen import generar_lecturas
from Generation.Periodos_Gen import generar_periodos


def cargar_yaml(ruta):
    with open(ruta, "r", encoding="utf-8") as fh:
        return yaml.safe_load(fh)


def hash_params(config):
    import hashlib
    import json
    texto = json.dumps(config, sort_keys=True, default=str)
    return hashlib.sha256(texto.encode("utf-8")).hexdigest()


def crear_corrida(connection, config):
    with connection.cursor() as cur:
        cur.execute(
            "SELECT COALESCE(MAX(id_corrida), 0) + 1 "
            "FROM energia.corrida_generacion"
        )
        id_corrida = cur.fetchone()[0]
        cur.execute(
            """
            INSERT INTO energia.corrida_generacion
                (id_corrida, nombre, semilla, version_reglas, hash_parametros,
                 ts_inicio_ejecucion, fecha_desde, fecha_hasta, intervalo_min)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                id_corrida,
                config["generation"]["name"][:40],
                config["generation"]["seed"],
                config["generation"]["rules_version"],
                hash_params(config),
                datetime.now().isoformat(),
                config["generation"]["date_start"],
                config["generation"]["date_end"],
                config["generation"]["interval_minutes"],
            ),
        )
    connection.commit()
    return id_corrida


def cerrar_corrida(connection, id_corrida, total_lecturas):
    with connection.cursor() as cur:
        cur.execute(
            """
            UPDATE energia.corrida_generacion
            SET ts_fin_ejecucion = %s, total_lecturas = %s
            WHERE id_corrida = %s
            """,
            (datetime.now().isoformat(), total_lecturas, id_corrida),
        )
    connection.commit()


def crear_particiones(connection):
    meses = []
    for anio in (2025, 2026):
        for mes in range(1, 13):
            if anio == 2026 and mes <= 3:
                continue  # ya existen
            if anio == 2026 and mes > 11:
                continue  # solo hasta hoy (24 nov 2026)
            meses.append((anio, mes))

    with connection.cursor() as cur:
        for anio, mes in meses:
            nombre = f"lectura_{anio}_{mes:02d}"
            desde = date(anio, mes, 1)
            if mes == 12:
                hasta = date(anio + 1, 1, 1)
            else:
                hasta = date(anio, mes + 1, 1)
            cur.execute(
                f"""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_class c
                        JOIN pg_namespace n ON n.oid = c.relnamespace
                        WHERE n.nspname = 'energia' AND c.relname = '{nombre}'
                    ) THEN
                        CREATE TABLE energia.{nombre}
                        PARTITION OF energia.lectura
                        FOR VALUES FROM ('{desde}') TO ('{hasta}');
                    END IF;
                END $$;
                """
            )
    connection.commit()
    print(f"  Particiones verificadas/creadas: {len(meses)}")


def main():
    print("=" * 72)
    print("  EXTENSION HSD - 2025-01-01 a 2026-11-24")
    print("=" * 72)

    config = cargar_yaml(BASE_DIR / "config" / "generation.yaml")
    rules = cargar_yaml(BASE_DIR / "config" / "rules.yaml")

    # 603 dias nuevos: 2025 (365) + 2026-04-01..2026-11-24 (238).
    # Ene-mar 2026 ya tiene lecturas de los 5,000 medidores; regenerarlos
    # violaria pk_lectura. Con 553 medidores: 553 x 603 x 24 = 8,003,016.
    LIMITE_MEDIDORES = 553
    config["generation"]["date_start"] = date(2025, 1, 1)
    config["generation"]["date_end"] = date(2026, 11, 24)
    config["generation"]["name"] = "toluca_hsd_2025_2026_ext"
    # Semilla distinta para que los datos nuevos no repitan la corrida inicial
    config["generation"]["seed"] = 20250101
    config["features"]["billing"] = False

    random.seed(config["generation"]["seed"])

    connection = get_connection()
    try:
        crear_particiones(connection)

        # Offset de IDs para no colisionar con la corrida original
        with connection.cursor() as cur:
            cur.execute("SELECT COALESCE(MAX(id_evento), 0) FROM energia.evento")
            off_evento = cur.fetchone()[0]
            cur.execute("SELECT COALESCE(MAX(id_alerta), 0) FROM energia.alerta")
            off_alerta = cur.fetchone()[0]
            cur.execute("SELECT fecha FROM energia.calendario")
            fechas_existentes = {r[0] for r in cur.fetchall()}

        print(f"  Offsets: evento={off_evento:,} alerta={off_alerta:,}")
        print(f"  Fechas de calendario ya presentes: {len(fechas_existentes):,}")
        print(f"  Medidores a generar: {LIMITE_MEDIDORES}")

        # Parche de copy_lote, instalado antes de generar_calendario:
        #   - calendario: omite fechas que ya estan en la BD (PK fecha)
        #   - alerta: desplaza id_alerta para no colisionar
        import database.insertar as INS

        copy_lote_original = INS.copy_lote

        def copy_lote_con_offset(con, tabla, columnas, filas,
                                 etiqueta="", acumulado=0):
            if tabla == "calendario":
                idx_fecha = columnas.index("fecha")
                filas = [
                    f for f in filas if f[idx_fecha] not in fechas_existentes
                ]
                if not filas:
                    return 0
            elif tabla == "alerta":
                filas = [[f[0] + off_alerta] + list(f[1:]) for f in filas]
            return copy_lote_original(
                con, tabla, columnas, filas, etiqueta, acumulado
            )

        INS.copy_lote = copy_lote_con_offset

        # 1. Calendario: solo se insertan las fechas nuevas. La funcion
        #    devuelve el rango completo en memoria; aqui se filtran las fechas
        #    con lecturas existentes para no duplicar pk_lectura.
        print("\n--- CALENDARIO ---")
        calendario_completo = generar_calendario(connection, config, rules)
        connection.commit()
        calendario_util = [
            d for d in calendario_completo
            if d["fecha"] not in fechas_existentes
        ]
        print(f"  Dias en rango: {len(calendario_completo):,}")
        print(f"  Dias nuevos para lecturas: {len(calendario_util):,}")

        # 2. Registrar corrida
        id_corrida = crear_corrida(connection, config)
        print(f"\n  Corrida registrada: id={id_corrida}")

        # 3. Eventos + alertas + lecturas, con IDs desplazados
        print("\n--- LECTURAS + EVENTOS + ALERTAS ---")

        # Parche local de la funcion de eventos: reasigna IDs despues de generar
        import Generation.Lecturas_Gen as LG

        generar_eventos_original = LG._generar_eventos

        def generar_eventos_con_offset(medidores, tipos_evento, cfg, rng):
            eventos = generar_eventos_original(medidores, tipos_evento, cfg, rng)
            for ev in eventos:
                ev["id_evento"] += off_evento
            return eventos

        LG._generar_eventos = generar_eventos_con_offset
        # generar_lecturas importa copy_lote dentro de la funcion,
        # por lo que toma la version parcheada en tiempo de ejecucion.

        total_lecturas, total_eventos, total_alertas = generar_lecturas(
            connection, config, rules, calendario_util,
            limitar_medidores=LIMITE_MEDIDORES,
        )
        print(f"    Eventos:   {total_eventos:,}")
        print(f"    Alertas:   {total_alertas:,}")
        print(f"    Lecturas:  {total_lecturas:,}")

        cerrar_corrida(connection, id_corrida, total_lecturas)

        # 4. Verificacion final
        print("\n--- VERIFICACION ---")
        with connection.cursor() as cur:
            cur.execute(
                """
                SELECT count(*), min(ts)::date, max(ts)::date
                FROM energia.lectura
                """
            )
            total, minimo, maximo = cur.fetchone()
            print(f"  Total lecturas en BD: {total:,}")
            print(f"  Rango completo: {minimo} a {maximo}")

        print("\n  EXTENSION COMPLETADA")
    except Exception as exc:
        connection.rollback()
        print(f"\n  [ERROR] {exc}")
        raise
    finally:
        connection.close()


if __name__ == "__main__":
    main()
