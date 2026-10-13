from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, desc, func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.calendario import Calendario
from ..models.lectura import Lectura
from ..models.medidor import Medidor
from ..models.servicio import Servicio
from ..models.zona import Zona
from ..schemas.dashboard import (
    ComparacionPeriodoResponse,
    ConsumoZonaResponse,
    DashboardIndicadoresResponse,
    DashboardResponse,
)

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


def rango_dia(fecha: date) -> tuple[datetime, datetime]:
    inicio = datetime.combine(fecha, time.min)
    return inicio, inicio + timedelta(days=1)


@router.get("", response_model=DashboardResponse)
def obtener_dashboard(
    fecha: date | None = Query(default=None),
    id_zona: int | None = Query(default=None, ge=1),
    limite_top: int = Query(default=10, ge=3, le=50),
    db: Session = Depends(get_db),
):
    del limite_top

    if fecha is None:
        fecha = db.scalar(select(func.max(Calendario.fecha)))
    elif db.scalar(select(Calendario.fecha).where(Calendario.fecha == fecha)) is None:
        raise HTTPException(status_code=404, detail=f"La fecha {fecha} no existe en el calendario")

    if fecha is None:
        raise HTTPException(status_code=404, detail="No existen fechas en el calendario")

    inicio, fin = rango_dia(fecha)
    inicio_anterior = inicio - timedelta(days=1)
    zona_filtros = [] if id_zona is None else [Servicio.id_zona == id_zona]

    # Una consulta obtiene todos los indicadores de lecturas del día.
    agregado_dia = db.execute(
        select(
            func.coalesce(func.sum(Lectura.consumo_real_kwh), 0),
            func.coalesce(func.avg(Lectura.consumo_real_kwh), 0),
            func.coalesce(func.max(Lectura.consumo_real_kwh), 0),
            func.count(Lectura.ts),
            func.max(Lectura.ts),
        )
        .join(Medidor, Lectura.id_medidor == Medidor.id_medidor)
        .join(Servicio, Medidor.id_servicio == Servicio.id_servicio)
        .where(Lectura.ts >= inicio, Lectura.ts < fin, *zona_filtros)
    ).one()

    consumo_anterior = db.scalar(
        select(func.coalesce(func.sum(Lectura.consumo_real_kwh), 0))
        .join(Medidor, Lectura.id_medidor == Medidor.id_medidor)
        .join(Servicio, Medidor.id_servicio == Servicio.id_servicio)
        .where(Lectura.ts >= inicio_anterior, Lectura.ts < inicio, *zona_filtros)
    ) or 0

    total_medidores, activos, desconectados, calidad = db.execute(
        select(
            func.count(Medidor.id_medidor),
            func.count(case((Medidor.fecha_retiro.is_(None), 1))),
            func.count(case((Medidor.fecha_retiro.is_not(None), 1))),
            func.coalesce(func.avg(Medidor.calidad_enlace), 0),
        )
        .join(Servicio, Medidor.id_servicio == Servicio.id_servicio)
        .where(*zona_filtros)
    ).one()

    filas_zona = db.execute(
        select(
            Zona.id_zona,
            Zona.nombre,
            func.coalesce(func.sum(Lectura.consumo_real_kwh), 0),
        )
        .join(Servicio, Zona.id_zona == Servicio.id_zona)
        .join(Medidor, Servicio.id_servicio == Medidor.id_servicio)
        .join(Lectura, Medidor.id_medidor == Lectura.id_medidor)
        .where(
            Lectura.ts >= inicio,
            Lectura.ts < fin,
            *([Zona.id_zona == id_zona] if id_zona else []),
        )
        .group_by(Zona.id_zona, Zona.nombre)
        .order_by(desc(func.sum(Lectura.consumo_real_kwh)))
    ).all()

    total_zonas = sum(float(fila[2]) for fila in filas_zona)
    consumo_por_zona = [
        ConsumoZonaResponse(
            id_zona=fila[0],
            zona_nombre=fila[1],
            consumo_kwh=float(fila[2]),
            porcentaje=(float(fila[2]) / total_zonas * 100) if total_zonas else 0,
        )
        for fila in filas_zona
    ]

    actual = float(agregado_dia[0])
    anterior = float(consumo_anterior)
    comparacion = ComparacionPeriodoResponse(
        periodo_actual_kwh=actual,
        periodo_anterior_kwh=anterior,
        diferencia_kwh=actual - anterior,
        variacion_porcentual=((actual - anterior) / anterior * 100) if anterior else None,
        inicio_actual=inicio,
        fin_actual=fin,
        inicio_anterior=inicio_anterior,
        fin_anterior=inicio,
    )

    indicadores = DashboardIndicadoresResponse(
        consumo_ultima_lectura_kwh=actual,
        fecha_ultima_lectura=agregado_dia[4],
        consumo_dia_kwh=actual,
        consumo_mes_kwh=0.0,
        demanda_maxima_lectura_kwh=float(agregado_dia[2]),
        fecha_demanda_maxima=None,
        consumo_promedio_lectura_kwh=float(agregado_dia[1]),
        lecturas_dia=int(agregado_dia[3]),
        total_medidores=int(total_medidores),
        medidores_activos=int(activos),
        medidores_desconectados=int(desconectados),
        alertas_activas=0,
        calidad_promedio_datos=float(calidad) * 100 if float(calidad) <= 1 else float(calidad),
    )

    return DashboardResponse(
        fecha_referencia=inicio,
        indicadores=indicadores,
        perfil_horario_zonas=[],
        ultimas_24_horas=[],
        consumo_diario_mes=[],
        consumo_por_zona=consumo_por_zona,
        comparacion_periodo=comparacion,
        distribucion_por_instalacion=[],
        medidores_mayor_consumo=[],
        estados_medidores=[],
        alertas_recientes=[],
        medidores_fuera_servicio=[],
    )
