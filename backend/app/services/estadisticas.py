"""Herramientas atómicas de solo lectura para el agente analítico de SIMET.

El LLM nunca recibe la conexión. Cada herramienta consulta vistas `datamart.*`
o catálogos ligeros, devuelve datos, fuentes exactas y una visualización lista
para Recharts. No se escanea `energia.lectura` directamente: solo se accede a
ella a través de las vistas materializadas por el datamart.
"""

from __future__ import annotations

import os
import re
import threading
import time
import unicodedata
from decimal import Decimal
from typing import Any, Callable

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from .parametros import validar

load_dotenv()


def _normalizar_url(url: str) -> str:
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url[len("postgresql://") :]
    return url


_URL = _normalizar_url(os.getenv("ASISTENTE_DATABASE_URL") or "")
if not _URL:
    raise RuntimeError(
        "El asistente requiere ASISTENTE_DATABASE_URL con un rol de solo lectura."
    )

_TIMEOUT_MS = int(os.getenv("ASISTENTE_STATEMENT_TIMEOUT_MS", "30000"))
_OPTIONS = f"-c default_transaction_read_only=on -c statement_timeout={_TIMEOUT_MS}"

engine = create_engine(
    _URL,
    pool_pre_ping=True,
    connect_args={"options": _OPTIONS},
)
SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    expire_on_commit=False,
)

_CACHE: dict[str, tuple[float, Any]] = {}
_CACHE_LOCK = threading.Lock()
TTL_SEGUNDOS = 600

ORDEN_ZONAS: dict[str, tuple[str, str]] = {
    "consumo": ("consumo_total_kwh", "DESC"),
    "desviacion": ("desviacion_pct", "DESC"),
    "kwh_desviados": ("kwh_desviados", "DESC"),
    "eventos": ("num_eventos", "DESC"),
    "lecturas": ("num_lecturas", "DESC"),
    "medidores": ("num_medidores", "DESC"),
    "nombre": ("z.nombre", "ASC"),
}
DIAS_PERMITIDOS = (7, 15, 30)


def _ttl_cache(segundos: int) -> Callable:
    def decorador(func: Callable) -> Callable:
        def envoltorio(*args: Any, **kwargs: Any) -> Any:
            detalles = sorted((clave, repr(valor)) for clave, valor in kwargs.items())
            clave = f"{func.__name__}:{args!r}:{detalles}"
            ahora = time.monotonic()
            with _CACHE_LOCK:
                guardado = _CACHE.get(clave)
                if guardado and ahora - guardado[0] < segundos:
                    return guardado[1]
            valor = func(*args, **kwargs)
            with _CACHE_LOCK:
                _CACHE[clave] = (ahora, valor)
            return valor

        return envoltorio

    return decorador


def _limpiar(valor: Any) -> Any:
    if isinstance(valor, Decimal):
        return round(float(valor), 4)
    if isinstance(valor, float):
        return round(valor, 4)
    if hasattr(valor, "isoformat") and not isinstance(valor, str):
        return valor.isoformat()
    if isinstance(valor, bytes):
        return valor.decode("utf-8", errors="replace")
    if isinstance(valor, list):
        return [_limpiar(item) for item in valor]
    if isinstance(valor, dict):
        return {clave: _limpiar(item) for clave, item in valor.items()}
    return valor


def _consultar(sql: str, parametros: dict[str, Any] | None = None) -> list[dict]:
    sentencia = sql.strip()
    if not sentencia.upper().startswith(("SELECT", "WITH")):
        raise ValueError("Las herramientas del asistente solo ejecutan SELECT.")
    with SessionLocal() as sesion:
        resultado = sesion.execute(text(sentencia), parametros or {})
        return [_limpiar(dict(fila._mapping)) for fila in resultado.fetchall()]


def _primero(sql: str, parametros: dict[str, Any] | None = None) -> dict:
    filas = _consultar(sql, parametros)
    return filas[0] if filas else {}


def _texto_seguro(valor: Any, maximo: int = 60) -> str | None:
    if valor is None:
        return None
    texto = str(valor).strip().replace("%", "").replace("_", "")
    return texto[:maximo] or None


def _normalizar(texto: str) -> str:
    sin_tildes = "".join(
        letra
        for letra in unicodedata.normalize("NFD", texto.lower())
        if unicodedata.category(letra) != "Mn"
    )
    return " ".join(sin_tildes.split())


def _paquete(
    nombre: str,
    fuentes: list[str],
    datos: Any,
    metodo: str = "observación directa",
    visualizacion: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "herramienta": nombre,
        "fuentes": fuentes,
        "metodo": metodo,
        "datos": datos,
        "datos_visualizacion": [visualizacion] if visualizacion else [],
    }


def _grafica(
    tipo: str,
    titulo: str,
    eje_x: str,
    series: list[dict[str, str]],
    filas: list[dict[str, Any]],
    subtitulo: str | None = None,
) -> dict[str, Any]:
    grafica = {
        "tipo": tipo,
        "titulo": titulo,
        "eje_x": eje_x,
        "series": series,
        "datos": filas[:30],
    }
    if subtitulo:
        grafica["subtitulo"] = subtitulo
    return grafica


@_ttl_cache(TTL_SEGUNDOS)
def _integridad() -> dict:
    return _primero("SELECT * FROM datamart.dm_validacion_integridad")


@_ttl_cache(TTL_SEGUNDOS)
def _resumen() -> dict:
    return _primero("SELECT * FROM datamart.dm_resumen_general")


@_ttl_cache(TTL_SEGUNDOS)
def _consumo_por_tipo_servicio() -> list[dict]:
    return _consultar(
        """
        SELECT tipo_servicio,
               SUM(consumo_real_kwh) AS consumo_real_kwh,
               SUM(lecturas) AS lecturas,
               COUNT(DISTINCT mes) AS meses,
               COUNT(DISTINCT zona) AS zonas
        FROM datamart.dm_consumo_por_servicio
        GROUP BY tipo_servicio
        ORDER BY consumo_real_kwh DESC
        """
    )


@_ttl_cache(TTL_SEGUNDOS)
def _catalogo_servicios_tarifas() -> list[dict]:
    return _consultar(
        """
        SELECT ts.clave AS tipo_servicio,
               ts.nombre AS nombre_tipo_servicio,
               t.codigo AS codigo_tarifa,
               t.nombre AS nombre_tarifa,
               t.categoria,
               t.limite_dac_kwh_mes,
               COUNT(*) AS num_servicios,
               SUM(s.carga_contratada_kw) AS carga_contratada_kw
        FROM energia.servicio s
        JOIN energia.tipo_servicio ts ON ts.id_tipo_servicio = s.id_tipo_servicio
        JOIN energia.tarifa t ON t.id_tarifa = s.id_tarifa
        GROUP BY ts.clave, ts.nombre, t.codigo, t.nombre, t.categoria,
                 t.limite_dac_kwh_mes
        ORDER BY ts.clave, t.codigo
        """
    )


@_ttl_cache(TTL_SEGUNDOS)
def _serie_diaria(dias: int) -> list[dict]:
    # `medidores_activos` obliga a un count(DISTINCT ...) sobre 10.8 M filas y
    # agota statement_timeout. Ninguna fórmula ni gráfica del asistente lo usa.
    filas = _consultar(
        """
        SELECT fecha::text AS fecha,
               consumo_total_kwh,
               consumo_promedio_kwh,
               demanda_maxima_kwh,
               num_lecturas,
               perdidas_comunicacion
        FROM datamart.dm_kpi_diarios
        ORDER BY fecha DESC
        LIMIT :dias
        """,
        {"dias": dias},
    )
    return list(reversed(filas))


@_ttl_cache(TTL_SEGUNDOS)
def _perfil_horario(tipo_servicio: str | None) -> list[dict]:
    # El parámetro se omite cuando no hay filtro: `:x IS NULL` con None vuelve
    # `$1` ambiguo en psycopg y la herramienta falla antes de consultar.
    filtro = ""
    parametros: dict[str, Any] = {}
    if tipo_servicio:
        filtro = "WHERE ts.clave = :tipo_servicio"
        parametros["tipo_servicio"] = tipo_servicio
    return _consultar(
        f"""
        SELECT p.hora,
               p.tipo_dia,
               AVG(p.factor) AS factor
        FROM energia.perfil_carga_horaria p
        JOIN energia.tipo_servicio ts ON ts.id_tipo_servicio = p.id_tipo_servicio
        {filtro}
        GROUP BY p.hora, p.tipo_dia
        ORDER BY p.hora, p.tipo_dia
        """,
        parametros,
    )


def obtener_resumen_sistema() -> dict[str, Any]:
    """Resume el sistema, la integridad del datamart y la corrida semilla."""
    resumen = _resumen()
    corrida = _primero(
        """
        SELECT semilla, version_reglas, fecha_desde, fecha_hasta, total_lecturas
        FROM energia.corrida_generacion
        WHERE semilla = 20260103
        ORDER BY id_corrida DESC
        LIMIT 1
        """
    )
    nota = None
    if not corrida:
        corrida = _primero(
            """
            SELECT semilla, version_reglas, fecha_desde, fecha_hasta, total_lecturas
            FROM energia.corrida_generacion
            ORDER BY id_corrida DESC
            LIMIT 1
            """
        )
        if corrida:
            nota = (
                "La corrida con semilla 20260103 no está disponible; "
                "se muestra la más reciente."
            )

    integridad = _integridad()
    lecturas_energia = integridad.get("lecturas_energia") or 0
    lecturas_datamart = integridad.get("lecturas_datamart") or 0
    datos = {
        **resumen,
        "semilla": corrida.get("semilla"),
        "version_reglas": corrida.get("version_reglas"),
        "fecha_desde": corrida.get("fecha_desde"),
        "fecha_hasta": corrida.get("fecha_hasta"),
        "lecturas_energia": lecturas_energia,
        "lecturas_datamart": lecturas_datamart,
        "diferencia_lecturas": round(
            float(lecturas_energia) - float(lecturas_datamart), 4
        ),
        "nota_corrida": nota,
    }
    return _paquete(
        "obtener_resumen_sistema",
        [
            "datamart.dm_resumen_general",
            "datamart.dm_validacion_integridad",
            "energia.corrida_generacion",
        ],
        datos,
    )


def consultar_zonas(
    zona_nombre: str | None = None,
    orden_por: str = "consumo",
    limite: int = 10,
) -> dict[str, Any]:
    """Filtra, compara o rankea zonas usando consumo, anomalías y catálogo."""
    zona = _texto_seguro(zona_nombre)
    orden = str(orden_por or "consumo").strip().lower()
    columna, direccion = ORDEN_ZONAS.get(orden, ORDEN_ZONAS["consumo"])
    try:
        tope = int(limite)
    except (TypeError, ValueError):
        tope = 10
    tope = max(1, min(tope, 46))

    filas = _consultar(
        f"""
        WITH zonas_filtradas AS (
            SELECT id_zona, nombre, tipo_urbano
            FROM energia.zona
            WHERE (CAST(:zona AS TEXT) IS NULL
                   OR nombre ILIKE '%' || CAST(:zona AS TEXT) || '%')
        ),
        servicios AS (
            SELECT s.id_servicio, s.id_zona
            FROM energia.servicio s
            JOIN zonas_filtradas zf ON zf.id_zona = s.id_zona
        ),
        medidores AS (
            SELECT m.id_medidor, m.id_servicio
            FROM energia.medidor m
            JOIN servicios s ON s.id_servicio = m.id_servicio
        ),
        consumo AS (
            SELECT s.id_zona,
                   SUM(l.consumo_real_kwh) AS consumo_total_kwh,
                   SUM(COALESCE(l.consumo_kwh, 0)) AS consumo_reportado_kwh,
                   COUNT(l.ts) AS num_lecturas,
                   COUNT(DISTINCT m.id_medidor) AS num_medidores
            FROM energia.lectura l
            JOIN medidores m ON m.id_medidor = l.id_medidor
            JOIN servicios s ON s.id_servicio = m.id_servicio
            GROUP BY s.id_zona
        ),
        anomalias AS (
            SELECT s.id_zona,
                   SUM(e.kwh_desviados) AS kwh_desviados,
                   COUNT(e.id_evento) AS num_eventos
            FROM energia.evento e
            JOIN medidores m ON m.id_medidor = e.id_medidor
            JOIN servicios s ON s.id_servicio = m.id_servicio
            GROUP BY s.id_zona
        )
        SELECT zf.nombre AS zona,
               zf.tipo_urbano,
               c.consumo_total_kwh,
               c.consumo_reportado_kwh,
               c.num_lecturas,
               c.num_medidores,
               COALESCE(a.kwh_desviados, 0) AS kwh_desviados,
               COALESCE(a.num_eventos, 0) AS num_eventos,
               CASE WHEN c.consumo_total_kwh > 0
                    THEN ROUND(100 * COALESCE(a.kwh_desviados, 0)
                               / c.consumo_total_kwh, 4)
                    ELSE 0 END AS desviacion_pct
        FROM zonas_filtradas zf
        JOIN consumo c ON c.id_zona = zf.id_zona
        LEFT JOIN anomalias a ON a.id_zona = zf.id_zona
        ORDER BY {columna} {direccion} NULLS LAST, zf.nombre ASC
        LIMIT :limite
        """,
        {"zona": zona, "limite": tope},
    )
    periodo = "Acumulado enero–marzo de 2026 (90 días). No es promedio mensual."
    datos = {
        "zonas": filas,
        "filtro_zona": zona,
        "orden_por": orden if orden in ORDEN_ZONAS else "consumo",
        "limite": tope,
        "total_resultados": len(filas),
        "periodo": periodo,
    }
    if zona and len(filas) == 1:
        titulo_grafica = f"Consumo total y reportado en {filas[0].get('zona')}"
    else:
        titulo_grafica = "Consumo total y reportado por zona"
    return _paquete(
        "consultar_zonas",
        [
            "energia.zona",
            "energia.servicio",
            "energia.medidor",
            "energia.lectura",
            "energia.evento",
        ],
        datos,
        visualizacion=_grafica(
            "barras",
            titulo_grafica,
            "zona",
            [
                {"clave": "consumo_total_kwh", "etiqueta": "Consumo real (kWh)"},
                {"clave": "consumo_reportado_kwh", "etiqueta": "Consumo reportado (kWh)"},
            ],
            filas,
            subtitulo=periodo,
        ),
    )


def consultar_servicios_y_tarifas(categoria: str | None = None) -> dict[str, Any]:
    """Consume el datamart por tipo de servicio y añade catálogo tarifario."""
    filtro = _normalizar(_texto_seguro(categoria, 18) or "")
    consumo = _consumo_por_tipo_servicio()
    catalogo = _catalogo_servicios_tarifas()

    tarifas_por_tipo: dict[str, list[dict[str, Any]]] = {}
    for fila in catalogo:
        if filtro and filtro not in _normalizar(str(fila.get("categoria") or "")):
            continue
        tarifas_por_tipo.setdefault(str(fila["tipo_servicio"]), []).append(fila)

    filas: list[dict[str, Any]] = []
    for fila in consumo:
        tipo = str(fila["tipo_servicio"])
        tarifas = tarifas_por_tipo.get(tipo, [])
        if filtro and not tarifas:
            continue
        num_servicios = sum(int(item.get("num_servicios") or 0) for item in tarifas)
        meses = int(fila.get("meses") or 0)
        consumo_total = float(fila.get("consumo_real_kwh") or 0)
        consumo_mensual = (
            consumo_total / num_servicios / meses
            if num_servicios and meses
            else 0.0
        )
        filas.append(
            {
                **fila,
                "nombre_tipo_servicio": tarifas[0].get("nombre_tipo_servicio")
                if tarifas
                else None,
                "num_servicios": num_servicios,
                "carga_contratada_kw": round(
                    sum(float(item.get("carga_contratada_kw") or 0) for item in tarifas),
                    4,
                ),
                "consumo_mensual_promedio_kwh": round(consumo_mensual, 4),
                "tarifas": [
                    {
                        "codigo_tarifa": item.get("codigo_tarifa"),
                        "nombre_tarifa": item.get("nombre_tarifa"),
                        "categoria": item.get("categoria"),
                        "limite_dac_kwh_mes": item.get("limite_dac_kwh_mes"),
                        "num_servicios": item.get("num_servicios"),
                    }
                    for item in tarifas
                ],
            }
        )

    datos = {
        "servicios": filas,
        "filtro_categoria": filtro,
        "total_resultados": len(filas),
        "nota_metodologica": (
            "El consumo está agregado por tipo de servicio. Las tarifas y la carga "
            "contratada se adjuntan desde catálogo; no se puede atribuir consumo "
            "a un RPU individual con esta vista."
        ),
    }
    return _paquete(
        "consultar_servicios_y_tarifas",
        [
            "datamart.dm_consumo_por_servicio",
            "energia.tarifa",
            "energia.servicio",
            "energia.tipo_servicio",
        ],
        datos,
        visualizacion=_grafica(
            "barras",
            "Consumo por tipo de servicio",
            "tipo_servicio",
            [{"clave": "consumo_real_kwh", "etiqueta": "Consumo real (kWh)"}],
            filas,
        ),
    )


def consultar_alertas_y_medidores(
    zona_nombre: str | None = None,
    solo_abiertas: bool = True,
) -> dict[str, Any]:
    """Consultas alertas y medidores; el estatus se deriva de fecha_retiro."""
    zona = _texto_seguro(zona_nombre)
    parametros = {"zona": zona, "solo_abiertas": bool(solo_abiertas)}
    where = """
        FROM energia.alerta a
        JOIN energia.medidor m ON m.id_medidor = a.id_medidor
        JOIN energia.servicio s ON s.id_servicio = m.id_servicio
        JOIN energia.zona z ON z.id_zona = s.id_zona
        WHERE (CAST(:zona AS TEXT) IS NULL OR z.nombre ILIKE '%' || CAST(:zona AS TEXT) || '%')
    """
    resumen = _primero(
        f"""
        SELECT COUNT(*) AS total,
               COUNT(*) FILTER (WHERE a.ts_cierre IS NULL) AS abiertas,
               COUNT(*) FILTER (WHERE a.ts_cierre IS NOT NULL) AS cerradas,
               COUNT(*) FILTER (
                   WHERE a.ts_cierre IS NOT NULL
                     AND a.resultado = 'FALSO_POSITIVO'
               ) AS falsos_positivos,
               COUNT(*) FILTER (WHERE a.prioridad = 1) AS prioridad_1,
               COUNT(*) FILTER (WHERE a.prioridad = 2) AS prioridad_2,
               COUNT(*) FILTER (WHERE a.prioridad = 3) AS prioridad_3,
               COUNT(*) FILTER (WHERE a.prioridad = 4) AS prioridad_4
        {where}
        """,
        parametros,
    )
    cerradas = float(resumen.get("cerradas") or 0)
    falsos = float(resumen.get("falsos_positivos") or 0)
    resumen["tasa_falsos_positivos"] = round(falsos / cerradas, 4) if cerradas else 0
    resumen["tasa_falsos_positivos_pct"] = (
        round(100 * falsos / cerradas, 2) if cerradas else 0
    )

    medidores = _consultar(
        f"""
        WITH base AS (
            SELECT m.id_medidor,
                   m.numero_serie,
                   m.marca,
                   m.calidad_enlace,
                   CASE WHEN m.fecha_retiro IS NULL THEN 'activo' ELSE 'retirado' END
                       AS estatus_medidor,
                   z.nombre AS zona,
                   COUNT(a.id_alerta) AS alertas_totales,
                   COUNT(*) FILTER (WHERE a.ts_cierre IS NULL) AS alertas_abiertas
            {where}
            GROUP BY m.id_medidor, m.numero_serie, m.marca, m.calidad_enlace,
                     m.fecha_retiro, z.nombre
        )
        SELECT id_medidor,
               numero_serie,
               marca,
               calidad_enlace,
               estatus_medidor,
               zona,
               alertas_totales,
               alertas_abiertas
        FROM base
        WHERE (:solo_abiertas IS FALSE OR alertas_abiertas > 0)
        ORDER BY alertas_abiertas DESC, calidad_enlace ASC, id_medidor ASC
        LIMIT 10
        """,
        parametros,
    )
    datos = {
        "resumen_alertas": resumen,
        "medidores": medidores,
        "filtro_zona": zona,
        "solo_abiertas": bool(solo_abiertas),
        "nota_esquema": (
            "energia.medidor no expone columna estado; el estatus se deriva de "
            "fecha_retiro."
        ),
    }
    return _paquete(
        "consultar_alertas_y_medidores",
        [
            "energia.alerta",
            "energia.medidor",
            "energia.servicio",
            "energia.zona",
        ],
        datos,
        visualizacion=_grafica(
            "barras",
            "Medidores con más alertas abiertas",
            "id_medidor",
            [
                {"clave": "alertas_abiertas", "etiqueta": "Alertas abiertas"},
                {"clave": "calidad_enlace", "etiqueta": "Calidad de enlace (%)"},
            ],
            medidores,
        ),
    )


def obtener_serie_diaria_y_horaria(
    dias: int = 30,
    tipo_servicio: str | None = None,
) -> dict[str, Any]:
    """Devuelve la serie diaria del datamart y el perfil horario del catálogo."""
    try:
        horizonte = int(dias)
    except (TypeError, ValueError):
        horizonte = 30
    if horizonte not in DIAS_PERMITIDOS:
        horizonte = 30
    servicio = _texto_seguro(tipo_servicio, 14)

    diaria = _serie_diaria(horizonte)
    horaria = _perfil_horario(servicio)
    fuentes = ["datamart.dm_kpi_diarios", "energia.perfil_carga_horaria"]
    if servicio:
        fuentes.append("energia.tipo_servicio")

    datos = {
        "diaria": diaria,
        "horaria": horaria,
        "dias": horizonte,
        "tipo_servicio": servicio,
        "total_dias": len(diaria),
    }
    return _paquete(
        "obtener_serie_diaria_y_horaria",
        fuentes,
        datos,
        visualizacion=_grafica(
            "linea",
            f"Consumo diario de los últimos {horizonte} días",
            "fecha",
            [{"clave": "consumo_total_kwh", "etiqueta": "Consumo total (kWh)"}],
            diaria,
        ),
    )


MEDIDAS_AGREGADAS = {
    "consumo_total_kwh": "consumo total",
    "consumo_promedio_kwh": "consumo promedio",
    "demanda_maxima_kwh": "demanda máxima",
    "num_lecturas": "número de lecturas",
    "perdidas_comunicacion": "pérdidas de comunicación",
}

AGREGACIONES_SQL = {
    "promedio": "AVG",
    "suma": "SUM",
    "minimo": "MIN",
    "maximo": "MAX",
    "conteo": "COUNT",
}

PALABRAS_SQL_PROHIBIDAS = (
    "INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE", "TRUNCATE",
    "GRANT", "REVOKE", "COPY", "VACUUM", "ANALYZE", "REINDEX", "CLUSTER",
    "COMMENT", "CALL", "EXEC", "EXECUTE", "DO", "MERGE", "INTO",
    "RETURNING", "FOR UPDATE", "PG_SLEEP", "DB_LINK", "DBLINK",
)
SQL_MAX_CARACTERES = 2000
SQL_MAX_FILAS = 200


def validar_sql_lectura(sql: str) -> str:
    """Acepta una sola sentencia SELECT o WITH; rechaza escritura y comentarios."""
    consulta = str(sql or "").strip()
    if not consulta or len(consulta) > SQL_MAX_CARACTERES:
        raise ValueError("la consulta SQL está vacía o excede 2000 caracteres")
    consulta = consulta.rstrip().rstrip(";").strip()
    if "--" in consulta or "/*" in consulta or "*/" in consulta:
        raise ValueError("los comentarios SQL no están permitidos")
    if not re.match(r"^(SELECT|WITH)\b", consulta, re.IGNORECASE):
        raise ValueError("solo se permiten sentencias SELECT o WITH")
    sin_literales = re.sub(r"'(?:''|[^'])*'", "''", consulta)
    for palabra in PALABRAS_SQL_PROHIBIDAS:
        if re.search(rf"\b{palabra}\b", sin_literales, re.IGNORECASE):
            raise ValueError(f"operación SQL no permitida: {palabra}")
    if ";" in sin_literales:
        raise ValueError("solo se permite una sentencia por consulta")
    return consulta


def ejecutar_sql_lectura(sql: str = "") -> dict[str, Any]:
    """Ejecuta SQL de solo lectura con límite fijo y devuelve filas verificadas."""
    consulta = validar_sql_lectura(sql)
    sentencia = f"SELECT * FROM ({consulta}) AS consulta_sim LIMIT {SQL_MAX_FILAS}"
    filas = _consultar(sentencia)
    fuentes = sorted(
        set(
            re.findall(
                r"\b(?:datamart|energia)\.[A-Za-z_][A-Za-z0-9_]*",
                consulta,
                re.IGNORECASE,
            )
        )
    ) or ["datamart/energia"]
    datos = {
        "filas": filas,
        "total_filas": len(filas),
        "limite": SQL_MAX_FILAS,
    }
    return _paquete(
        "ejecutar_sql_lectura",
        fuentes,
        datos,
        metodo="SELECT de solo lectura con límite de 200 filas",
    )


def consultar_agregados(
    medida: str = "consumo_total_kwh",
    agregacion: str = "promedio",
    dias: int | None = None,
) -> dict[str, Any]:
    """Calcula promedios, sumas, mínimos, máximos y conteos sobre columnas permitidas."""
    medida_key = str(medida or "").lower()
    if medida_key not in MEDIDAS_AGREGADAS:
        raise ValueError("medida no permitida para agregados")
    agregacion_key = str(agregacion or "").lower()
    if agregacion_key not in AGREGACIONES_SQL:
        raise ValueError("agregación no permitida")

    parametros: dict[str, Any] = {}
    condiciones: list[str] = []
    if dias is not None:
        try:
            horizonte = int(dias)
        except (TypeError, ValueError) as error:
            raise ValueError("días no válidos para el agregado") from error
        if horizonte not in DIAS_PERMITIDOS:
            raise ValueError("horizonte no permitido para el agregado")
        parametros["dias"] = horizonte
        condiciones.append(
            "fecha >= (SELECT MAX(fecha) FROM datamart.dm_kpi_diarios) "
            "- CAST(:dias AS integer)"
        )

    _where = f"WHERE {' AND '.join(condiciones)}" if condiciones else ""
    sql = f"""
        SELECT {AGREGACIONES_SQL[agregacion_key]}({medida_key}) AS valor,
               COUNT(*) AS registros,
               MIN(fecha)::text AS fecha_desde,
               MAX(fecha)::text AS fecha_hasta
        FROM datamart.dm_kpi_diarios
        {_where}
    """
    fila = _primero(sql, parametros)
    valor = fila.get("valor")
    datos = {
        "medida": medida_key,
        "agregacion": agregacion_key,
        "valor": round(float(valor), 2) if valor is not None else None,
        "registros": fila.get("registros"),
        "fecha_desde": fila.get("fecha_desde"),
        "fecha_hasta": fila.get("fecha_hasta"),
        "dias": dias,
    }
    return _paquete(
        "consultar_agregados",
        ["datamart.dm_kpi_diarios"],
        datos,
        metodo="agregación SQL verificada sobre columnas permitidas",
    )


HERRAMIENTAS_SQL: dict[str, dict[str, Any]] = {
    "obtener_resumen_sistema": {
        "descripcion": (
            "Resumen general, integridad del datamart y corrida con semilla 20260103."
        ),
        "parametros": {"type": "object", "properties": {}, "additionalProperties": False},
        "funcion": obtener_resumen_sistema,
    },
    "consultar_zonas": {
        "descripcion": (
            "Filtra, compara o rankea zonas de Toluca por consumo, desviación, "
            "eventos, lecturas, medidores o nombre."
        ),
        "parametros": {
            "type": "object",
            "properties": {
                "zona_nombre": {
                    "type": "string",
                    "description": "Nombre o fragmento del nombre de zona.",
                },
                "orden_por": {
                    "type": "string",
                    "enum": list(ORDEN_ZONAS),
                    "description": "Criterio de ordenamiento.",
                },
                "limite": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 46,
                    "description": "Número máximo de zonas a devolver.",
                },
            },
            "additionalProperties": False,
        },
        "funcion": consultar_zonas,
    },
    "consultar_servicios_y_tarifas": {
        "descripcion": (
            "Consumo agregado por tipo de servicio con tarifas, límites DAC y "
            "carga contratada del catálogo."
        ),
        "parametros": {
            "type": "object",
            "properties": {
                "categoria": {
                    "type": "string",
                    "description": "Filtro opcional por categoría tarifaria.",
                }
            },
            "additionalProperties": False,
        },
        "funcion": consultar_servicios_y_tarifas,
    },
    "consultar_alertas_y_medidores": {
        "descripcion": (
            "Alertas abiertas y cerradas, falsos positivos, prioridades y medidores "
            "por zona, calidad de enlace y estatus derivado."
        ),
        "parametros": {
            "type": "object",
            "properties": {
                "zona_nombre": {
                    "type": "string",
                    "description": "Nombre o fragmento del nombre de zona.",
                },
                "solo_abiertas": {
                    "type": "boolean",
                    "description": "Limita el listado de medidores a alertas abiertas.",
                },
            },
            "additionalProperties": False,
        },
        "funcion": consultar_alertas_y_medidores,
    },
    "obtener_serie_diaria_y_horaria": {
        "descripcion": (
            "Serie diaria de consumo y perfil horario por tipo de día, opcionalmente "
            "filtrado por tipo de servicio."
        ),
        "parametros": {
            "type": "object",
            "properties": {
                "dias": {"type": "integer", "enum": list(DIAS_PERMITIDOS)},
                "tipo_servicio": {
                    "type": "string",
                    "description": "Clave opcional de tipo de servicio.",
                },
            },
            "additionalProperties": False,
        },
        "funcion": obtener_serie_diaria_y_horaria,
    },
    "consultar_agregados": {
        "descripcion": (
            "Calcula promedio, suma, mínimo, máximo o conteo de medidas verificadas "
            "del datamart, con filtro opcional por ventana de días."
        ),
        "parametros": {
            "type": "object",
            "properties": {
                "medida": {
                    "type": "string",
                    "enum": list(MEDIDAS_AGREGADAS),
                    "description": "Columna numérica permitida del datamart.",
                },
                "agregacion": {
                    "type": "string",
                    "enum": list(AGREGACIONES_SQL),
                    "description": "Operación agregada a aplicar.",
                },
                "dias": {
                    "type": "integer",
                    "enum": list(DIAS_PERMITIDOS),
                    "description": "Ventana opcional contada desde la última fecha observada.",
                },
            },
            "additionalProperties": False,
        },
        "funcion": consultar_agregados,
    },
    "ejecutar_sql_lectura": {
        "descripcion": (
            "Ejecuta una sentencia SQL de solo lectura. Acepta SELECT o WITH, rechaza "
            "escritura, comentarios y múltiples sentencias, y limita la salida a 200 filas."
        ),
        "parametros": {
            "type": "object",
            "properties": {
                "sql": {
                    "type": "string",
                    "maxLength": SQL_MAX_CARACTERES,
                    "description": "Sentencia SELECT o WITH sobre esquemas permitidos.",
                }
            },
            "additionalProperties": False,
        },
        "funcion": ejecutar_sql_lectura,
    },
}


def ejecutar_herramienta(
    nombre: str,
    parametros: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Ejecuta una herramienta declarada con argumentos validados."""
    definition = HERRAMIENTAS_SQL.get(nombre)
    if definition is None:
        raise ValueError(f"Herramienta no verificada: {nombre}")
    args = validar(parametros, definition["parametros"])
    return definition["funcion"](**args)


SUGERENCIAS: list[dict[str, str]] = [
    {
        "intent": "resumen",
        "pregunta": "¿Cuál es el consumo total y con qué semilla se generó?",
        "descripcion": "Conteos generales, integridad y semilla de la corrida",
    },
    {
        "intent": "zonas",
        "pregunta": "Ranking de las 10 zonas con mayor consumo real",
        "descripcion": "Comparativa por zona",
    },
    {
        "intent": "tarifas",
        "pregunta": "¿Qué tipo de servicio tiene mayor consumo y cómo se relaciona con DAC?",
        "descripcion": "Servicios, tarifas y límites DAC",
    },
    {
        "intent": "alertas",
        "pregunta": "¿Cuántas alertas siguen abiertas y qué medidores concentran más?",
        "descripcion": "Alertas y calidad de enlace",
    },
    {
        "intent": "tendencia",
        "pregunta": "Proyección de consumo a 15 días con intervalo de confianza",
        "descripcion": "Estimación estadística verificada",
    },
    {
        "intent": "concepto",
        "pregunta": "¿Qué significa Tarifa DAC y cuáles son sus umbrales?",
        "descripcion": "Glosario conceptual de SIMET",
    },
]
