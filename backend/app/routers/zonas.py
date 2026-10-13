from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas.zona_indicadores import ZonaIndicadoresResponse

router = APIRouter(prefix="/api/zonas", tags=["Zonas"])

def _columnas(db: Session, tabla: str) -> set[str]:
    filas = db.execute(
        text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'energia' AND table_name = :tabla
        """),
        {"tabla": tabla},
    ).scalars().all()
    return set(filas)


def _primera(columnas: set[str], opciones: list[str]) -> str | None:
    return next((nombre for nombre in opciones if nombre in columnas), None)


def _rango_mes(mes: int, referencia: datetime) -> tuple[datetime, datetime, datetime]:
    inicio = referencia.replace(
        month=mes,
        day=1,
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )
    if mes == 12:
        fin = inicio.replace(year=inicio.year + 1, month=1)
    else:
        fin = inicio.replace(month=mes + 1)

    if mes == 1:
        inicio_anterior = inicio.replace(year=inicio.year - 1, month=12)
    else:
        inicio_anterior = inicio.replace(month=mes - 1)

    return inicio, fin, inicio_anterior


@router.get("/indicadores", response_model=list[ZonaIndicadoresResponse])
def listar_indicadores_por_zona(
    mes: int = Query(default=3, ge=1, le=3),
    ahorro_pct: float = Query(default=8, ge=0, le=100),
    db: Session = Depends(get_db),
) -> list[ZonaIndicadoresResponse]:
    """Indicadores reales por zona para enero, febrero o marzo.

    El año se toma de la última lectura disponible. Cada mes usa un rango
    independiente [inicio del mes, inicio del mes siguiente), por lo que
    cambiar `mes` cambia realmente los consumos y rankings.
    """

    columnas_medidor = _columnas(db, "medidor")
    columnas_alerta = _columnas(db, "alerta")

    columna_retiro = _primera(
        columnas_medidor,
        ["fecha_retiro", "retirado_en", "fecha_baja"],
    )
    columna_estado_medidor = _primera(
        columnas_medidor,
        ["estado", "estado_operativo", "estatus"],
    )
    columna_calidad = _primera(
        columnas_medidor,
        ["calidad_enlace", "calidad_senal", "calidad_comunicacion"],
    )
    columna_fecha_alerta = _primera(
        columnas_alerta,
        ["ts_generacion", "fecha_hora", "fecha_creacion", "creada_en", "ts"],
    )
    columna_estado_alerta = _primera(
        columnas_alerta,
        ["estado", "estatus"],
    )

    if columna_retiro:
        activo_sql = f"m.{columna_retiro} IS NULL"
    elif columna_estado_medidor:
        activo_sql = (
            f"lower(coalesce(m.{columna_estado_medidor}::text, '')) "
            "IN ('activo', 'operativo', 'en servicio', 'online')"
        )
    else:
        activo_sql = "m.id_medidor IS NOT NULL"

    calidad_sql = (
        f"coalesce(avg(m.{columna_calidad}), 0)::float"
        if columna_calidad
        else "0::float"
    )
    filtro_fecha_alerta = (
        f"AND a.{columna_fecha_alerta} >= :inicio "
        f"AND a.{columna_fecha_alerta} < :fin"
        if columna_fecha_alerta
        else ""
    )
    alertas_activas_sql = (
        f"count(a.id_alerta) FILTER (WHERE lower(coalesce(a.{columna_estado_alerta}::text, '')) "
        "IN ('activa', 'activo', 'abierta', 'pendiente'))::integer"
        if columna_estado_alerta
        else "count(a.id_alerta)::integer"
    )

    referencia = db.scalar(text("SELECT max(ts) FROM energia.lectura")) or datetime.now()
    inicio, fin, inicio_anterior = _rango_mes(mes, referencia)
    duracion = fin - inicio
    horas = max(1, int(duracion.total_seconds() // 3600))

    sql = f"""
    WITH servicios AS (
        SELECT id_zona, count(*)::integer AS total_servicios
        FROM energia.servicio GROUP BY id_zona
    ),
    medidores AS (
        SELECT s.id_zona,
               count(m.id_medidor)::integer AS total_medidores,
               count(m.id_medidor) FILTER (WHERE {activo_sql})::integer AS medidores_activos,
               count(m.id_medidor) FILTER (WHERE NOT ({activo_sql}))::integer AS medidores_fuera_servicio,
               {calidad_sql} AS calidad_enlace_promedio
        FROM energia.servicio s
        LEFT JOIN energia.medidor m ON m.id_servicio = s.id_servicio
        GROUP BY s.id_zona
    ),
    actual AS (
        SELECT s.id_zona,
               coalesce(sum(l.consumo_real_kwh), 0)::float AS consumo_total_kwh,
               count(l.ts)::integer AS lecturas_recibidas
        FROM energia.servicio s
        JOIN energia.medidor m ON m.id_servicio = s.id_servicio
        LEFT JOIN energia.lectura l ON l.id_medidor = m.id_medidor
             AND l.ts >= :inicio AND l.ts < :fin
        GROUP BY s.id_zona
    ),
    anterior AS (
        SELECT s.id_zona,
               coalesce(sum(l.consumo_real_kwh), 0)::float AS consumo_anterior_kwh
        FROM energia.servicio s
        JOIN energia.medidor m ON m.id_servicio = s.id_servicio
        LEFT JOIN energia.lectura l ON l.id_medidor = m.id_medidor
             AND l.ts >= :inicio_anterior AND l.ts < :inicio
        GROUP BY s.id_zona
    ),
    alertas AS (
        SELECT s.id_zona,
               count(a.id_alerta)::integer AS total_alertas,
               {alertas_activas_sql} AS alertas_activas
        FROM energia.servicio s
        JOIN energia.medidor m ON m.id_servicio = s.id_servicio
        LEFT JOIN energia.alerta a ON a.id_medidor = m.id_medidor {filtro_fecha_alerta}
        GROUP BY s.id_zona
    )
    SELECT z.id_zona,
           coalesce(ac.consumo_total_kwh, 0)::float AS consumo_total_kwh,
           CASE WHEN coalesce(z.viviendas_habitadas, 0) > 0
                THEN coalesce(ac.consumo_total_kwh, 0) / z.viviendas_habitadas ELSE 0 END::float AS consumo_por_vivienda_kwh,
           CASE WHEN coalesce(z.poblacion_total, 0) > 0
                THEN coalesce(ac.consumo_total_kwh, 0) / z.poblacion_total ELSE 0 END::float AS consumo_por_habitante_kwh,
           CASE WHEN coalesce(an.consumo_anterior_kwh, 0) > 0
                THEN ((coalesce(ac.consumo_total_kwh, 0) - an.consumo_anterior_kwh) / an.consumo_anterior_kwh) * 100
                ELSE 0 END::float AS crecimiento_mensual_pct,
           coalesce(sv.total_servicios, 0)::integer AS total_servicios,
           CASE WHEN coalesce(z.viviendas_habitadas, 0) > 0
                THEN coalesce(sv.total_servicios, 0)::float / z.viviendas_habitadas ELSE 0 END::float AS servicios_por_vivienda,
           coalesce(md.total_medidores, 0)::integer AS total_medidores,
           coalesce(md.medidores_activos, 0)::integer AS medidores_activos,
           coalesce(md.medidores_fuera_servicio, 0)::integer AS medidores_fuera_servicio,
           CASE WHEN coalesce(md.total_medidores, 0) > 0
                THEN md.medidores_activos::float / md.total_medidores * 100 ELSE 0 END::float AS disponibilidad_pct,
           coalesce(al.total_alertas, 0)::integer AS total_alertas,
           coalesce(al.alertas_activas, 0)::integer AS alertas_activas,
           CASE WHEN coalesce(md.total_medidores, 0) > 0
                THEN coalesce(al.total_alertas, 0)::float / md.total_medidores ELSE 0 END::float AS alertas_por_medidor,
           coalesce(md.calidad_enlace_promedio, 0)::float AS calidad_enlace_promedio,
           (coalesce(md.medidores_activos, 0) * :horas)::integer AS lecturas_esperadas,
           coalesce(ac.lecturas_recibidas, 0)::integer AS lecturas_recibidas,
           greatest((coalesce(md.medidores_activos, 0) * :horas) - coalesce(ac.lecturas_recibidas, 0), 0)::integer AS lecturas_faltantes,
           (coalesce(ac.consumo_total_kwh, 0) * :ahorro_pct / 100)::float AS ahorro_potencial_kwh,
           cast(:ahorro_pct AS float) AS ahorro_pct
    FROM energia.zona z
    LEFT JOIN servicios sv ON sv.id_zona = z.id_zona
    LEFT JOIN medidores md ON md.id_zona = z.id_zona
    LEFT JOIN actual ac ON ac.id_zona = z.id_zona
    LEFT JOIN anterior an ON an.id_zona = z.id_zona
    LEFT JOIN alertas al ON al.id_zona = z.id_zona
    ORDER BY z.id_zona
    """

    filas = db.execute(text(sql), {
        "inicio": inicio,
        "fin": fin,
        "inicio_anterior": inicio_anterior,
        "horas": horas,
        "ahorro_pct": ahorro_pct,
    }).mappings().all()
    return [ZonaIndicadoresResponse(**dict(fila)) for fila in filas]


@router.get("")
def listar_zonas(db: Session = Depends(get_db)):
    return [dict(f) for f in db.execute(text("SELECT * FROM energia.zona ORDER BY id_zona")).mappings().all()]


@router.get("/{id_zona}")
def obtener_zona(id_zona: int, db: Session = Depends(get_db)):
    fila = db.execute(text("SELECT * FROM energia.zona WHERE id_zona=:id"), {"id": id_zona}).mappings().first()
    if not fila:
        raise HTTPException(status_code=404, detail="Zona no encontrada")
    return dict(fila)
