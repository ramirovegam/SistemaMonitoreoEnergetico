from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas.calendario_energetico_schema import (
    CalendarioEnergeticoResponse,
    DetalleDiaResponse,
)

router = APIRouter(
    prefix="/api/calendario-energetico",
    tags=["Calendario energético"],
)

DIAS = {
    0: "Lunes",
    1: "Martes",
    2: "Miércoles",
    3: "Jueves",
    4: "Viernes",
    5: "Sábado",
    6: "Domingo",
}


@router.get("", response_model=CalendarioEnergeticoResponse)
def obtener_calendario(
    anio: int | None = Query(default=None),
    mes_inicio: int = Query(default=1, ge=1, le=12),
    mes_fin: int = Query(default=12, ge=1, le=12),
    db: Session = Depends(get_db),
):
    if mes_inicio > mes_fin:
        raise HTTPException(422, "mes_inicio no puede ser mayor que mes_fin")

    limites = db.execute(
        text("""
            SELECT
                EXTRACT(YEAR FROM min(fecha))::int AS anio_min,
                EXTRACT(YEAR FROM max(fecha))::int AS anio_max
            FROM energia.calendario
        """),
    ).mappings().one()

    anio_min = limites["anio_min"]
    anio_max = limites["anio_max"]
    if anio is None:
        anio = anio_max if anio_max is not None else date.today().year
    elif (
        anio_min is not None
        and anio_max is not None
        and not (anio_min <= anio <= anio_max)
    ):
        raise HTTPException(
            status_code=404,
            detail=(
                f"No hay registros para el año {anio}. "
                f"Rango disponible: {anio_min}-{anio_max}."
            ),
        )

    rows = db.execute(
        text("""
            SELECT
                fecha,
                tipo_dia,
                coalesce(es_festivo, false) AS es_festivo,
                coalesce(es_vacacional, false) AS es_vacacional,
                temp_min_c::float AS temp_min_c,
                temp_max_c::float AS temp_max_c,
                factor_estacional::float AS factor_estacional
            FROM energia.calendario
            WHERE EXTRACT(YEAR FROM fecha) = :anio
              AND EXTRACT(MONTH FROM fecha) BETWEEN :mes_inicio AND :mes_fin
            ORDER BY fecha
        """),
        {"anio": anio, "mes_inicio": mes_inicio, "mes_fin": mes_fin},
    ).mappings().all()

    summary = db.execute(
        text("""
            SELECT
                count(*)::int AS dias_registrados,
                count(*) FILTER (WHERE es_festivo)::int AS dias_festivos,
                count(*) FILTER (WHERE es_vacacional)::int AS dias_vacacionales,
                min(temp_min_c)::float AS temperatura_minima_c,
                max(temp_max_c)::float AS temperatura_maxima_c,
                avg(factor_estacional)::float AS factor_estacional_promedio
            FROM energia.calendario
            WHERE EXTRACT(YEAR FROM fecha) = :anio
              AND EXTRACT(MONTH FROM fecha) BETWEEN :mes_inicio AND :mes_fin
        """),
        {"anio": anio, "mes_inicio": mes_inicio, "mes_fin": mes_fin},
    ).mappings().one()

    return {
        "anio": anio,
        "mes_inicio": mes_inicio,
        "mes_fin": mes_fin,
        "anio_min": limites["anio_min"],
        "anio_max": limites["anio_max"],
        "resumen": dict(summary),
        "dias": [dict(row) for row in rows],
    }


@router.get("/{fecha}", response_model=DetalleDiaResponse)
def obtener_detalle_dia(
    fecha: date,
    db: Session = Depends(get_db),
):
    calendar = db.execute(
        text("""
            SELECT
                fecha,
                tipo_dia,
                coalesce(es_festivo, false) AS es_festivo,
                coalesce(es_vacacional, false) AS es_vacacional,
                temp_min_c::float AS temp_min_c,
                temp_max_c::float AS temp_max_c,
                factor_estacional::float AS factor_estacional
            FROM energia.calendario
            WHERE fecha = :fecha
        """),
        {"fecha": fecha},
    ).mappings().first()

    if not calendar:
        raise HTTPException(404, "La fecha no existe en el calendario")

    energy = db.execute(
        text("""
            WITH por_hora AS (
                SELECT
                    EXTRACT(HOUR FROM ts)::int AS hora,
                    sum(coalesce(consumo_real_kwh, 0))::float AS consumo
                FROM energia.lectura
                WHERE ts >= CAST(:fecha AS date)
                  AND ts < CAST(:fecha AS date) + INTERVAL '1 day'
                GROUP BY EXTRACT(HOUR FROM ts)
                ORDER BY consumo DESC
                LIMIT 1
            ),
            resumen AS (
                SELECT
                    coalesce(sum(consumo_real_kwh), 0)::float AS consumo_total_kwh,
                    count(*)::int AS lecturas,
                    count(DISTINCT id_medidor)::int AS medidores_con_lectura
                FROM energia.lectura
                WHERE ts >= CAST(:fecha AS date)
                  AND ts < CAST(:fecha AS date) + INTERVAL '1 day'
            )
            SELECT
                r.consumo_total_kwh,
                CASE WHEN r.medidores_con_lectura > 0
                     THEN r.consumo_total_kwh / r.medidores_con_lectura
                     ELSE 0 END::float AS consumo_promedio_medidor_kwh,
                h.hora AS hora_pico,
                r.lecturas,
                r.medidores_con_lectura
            FROM resumen r
            LEFT JOIN por_hora h ON true
        """),
        {"fecha": fecha},
    ).mappings().one()

    eventos = db.scalar(
        text("""
            SELECT count(*)::int
            FROM energia.evento
            WHERE ts_inicio >= CAST(:fecha AS date)
              AND ts_inicio < CAST(:fecha AS date) + INTERVAL '1 day'
        """),
        {"fecha": fecha},
    ) or 0

    alertas = db.scalar(
        text("""
            SELECT count(*)::int
            FROM energia.alerta
            WHERE ts_generacion >= CAST(:fecha AS date)
              AND ts_generacion < CAST(:fecha AS date) + INTERVAL '1 day'
        """),
        {"fecha": fecha},
    ) or 0

    temp_min = float(calendar["temp_min_c"])
    temp_max = float(calendar["temp_max_c"])
    factor = float(calendar["factor_estacional"])

    return {
        **dict(calendar),
        "nombre_dia": DIAS[fecha.weekday()],
        "temperatura_media_c": (temp_min + temp_max) / 2,
        "amplitud_termica_c": temp_max - temp_min,
        "ajuste_estacional_pct": (factor - 1) * 100,
        **dict(energy),
        "eventos": int(eventos),
        "alertas": int(alertas),
    }
