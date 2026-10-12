from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas.alerta import AlertaResponse

router = APIRouter(prefix="/api/alertas", tags=["Alertas"])


BASE_SELECT = """
    SELECT
        a.id_alerta,
        a.id_evento,
        a.id_medidor,
        a.id_tipo_evento,
        a.ts_generacion,
        a.prioridad,
        a.ts_cierre,
        a.resultado,
        CASE WHEN a.ts_cierre IS NULL THEN 'Activa' ELSE 'Cerrada' END AS estado,

        te.clave AS tipo_evento_clave,
        te.nombre AS tipo_evento_nombre,
        te.efecto AS tipo_evento_efecto,
        te.afecta_acumulado AS tipo_evento_afecta_acumulado,
        te.regla_deteccion AS tipo_evento_regla,
        te.duracion_min_h AS tipo_evento_duracion_min_h,
        te.duracion_max_h AS tipo_evento_duracion_max_h,

        e.ts_inicio AS evento_ts_inicio,
        e.ts_fin AS evento_ts_fin,
        e.intensidad::float AS evento_intensidad,
        e.kwh_desviados::float AS evento_kwh_desviados,

        m.numero_serie AS medidor_numero_serie,
        m.marca AS medidor_marca,
        coalesce(m.calidad_enlace, 0)::float AS calidad_enlace,

        s.id_servicio,
        s.nombre AS servicio_nombre,
        s.rpu AS servicio_rpu,
        z.id_zona,
        z.nombre AS zona_nombre
    FROM energia.alerta a
    JOIN energia.tipo_evento te
      ON te.id_tipo_evento = a.id_tipo_evento
    LEFT JOIN energia.evento e
      ON e.id_evento = a.id_evento
    JOIN energia.medidor m
      ON m.id_medidor = a.id_medidor
    JOIN energia.servicio s
      ON s.id_servicio = m.id_servicio
    JOIN energia.zona z
      ON z.id_zona = s.id_zona
"""


@router.get("", response_model=list[AlertaResponse])
def listar_alertas(
    mes: int | None = Query(default=None, ge=1, le=12),
    anio: int | None = Query(default=None, ge=2000, le=2100),
    id_zona: int | None = None,
    id_servicio: int | None = None,
    id_medidor: int | None = None,
    id_tipo_evento: int | None = None,
    estado: Literal["Activa", "Cerrada"] | None = None,
    prioridad: int | None = Query(default=None, ge=1, le=10),
    db: Session = Depends(get_db),
):
    conditions: list[str] = []
    params: dict[str, object] = {}

    if mes is not None:
        conditions.append("EXTRACT(MONTH FROM a.ts_generacion) = :mes")
        params["mes"] = mes
    if anio is not None:
        conditions.append("EXTRACT(YEAR FROM a.ts_generacion) = :anio")
        params["anio"] = anio
    if id_zona is not None:
        conditions.append("z.id_zona = :id_zona")
        params["id_zona"] = id_zona
    if id_servicio is not None:
        conditions.append("s.id_servicio = :id_servicio")
        params["id_servicio"] = id_servicio
    if id_medidor is not None:
        conditions.append("a.id_medidor = :id_medidor")
        params["id_medidor"] = id_medidor
    if id_tipo_evento is not None:
        conditions.append("a.id_tipo_evento = :id_tipo_evento")
        params["id_tipo_evento"] = id_tipo_evento
    if estado == "Activa":
        conditions.append("a.ts_cierre IS NULL")
    elif estado == "Cerrada":
        conditions.append("a.ts_cierre IS NOT NULL")
    if prioridad is not None:
        conditions.append("a.prioridad = :prioridad")
        params["prioridad"] = prioridad

    where = " WHERE " + " AND ".join(conditions) if conditions else ""
    rows = db.execute(
        text(BASE_SELECT + where + " ORDER BY a.ts_generacion DESC, a.id_alerta DESC"),
        params,
    ).mappings().all()
    return [dict(row) for row in rows]


@router.get("/catalogos")
def catalogos_alertas(db: Session = Depends(get_db)):
    tipos = db.execute(text("""
        SELECT id_tipo_evento, clave, nombre, efecto, regla_deteccion
        FROM energia.tipo_evento
        ORDER BY nombre
    """)).mappings().all()
    zonas = db.execute(text("""
        SELECT id_zona, nombre FROM energia.zona ORDER BY nombre
    """)).mappings().all()
    servicios = db.execute(text("""
        SELECT id_servicio, id_zona, nombre, rpu
        FROM energia.servicio ORDER BY nombre
    """)).mappings().all()
    medidores = db.execute(text("""
        SELECT m.id_medidor, m.id_servicio, m.numero_serie
        FROM energia.medidor m ORDER BY m.numero_serie
    """)).mappings().all()
    ultima_fecha = db.scalar(text("SELECT max(ts_generacion) FROM energia.alerta"))
    return {
        "tipos_evento": [dict(row) for row in tipos],
        "zonas": [dict(row) for row in zonas],
        "servicios": [dict(row) for row in servicios],
        "medidores": [dict(row) for row in medidores],
        "anio_referencia": ultima_fecha.year if ultima_fecha else datetime.now().year,
    }


@router.get("/{id_alerta}", response_model=AlertaResponse)
def obtener_alerta(id_alerta: int, db: Session = Depends(get_db)):
    row = db.execute(
        text(BASE_SELECT + " WHERE a.id_alerta = :id_alerta"),
        {"id_alerta": id_alerta},
    ).mappings().first()
    if not row:
        raise HTTPException(404, "Alerta no encontrada")
    return dict(row)
