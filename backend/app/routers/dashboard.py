from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, desc, func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.alerta import Alerta
from ..models.calendario import Calendario
from ..models.lectura import Lectura
from ..models.medidor import Medidor
from ..models.servicio import Servicio
from ..models.tipo_servicio import TipoServicio
from ..models.zona import Zona
from ..schemas.dashboard import (
    AlertaRecienteResponse,
    ComparacionPeriodoResponse,
    ConsumoZonaResponse,
    DashboardIndicadoresResponse,
    DashboardResponse,
    DistribucionInstalacionResponse,
    EstadoMedidoresResponse,
    MedidorFueraServicioResponse,
    MedidorMayorConsumoResponse,
    PuntoSerieResponse,
    PerfilZonaResponse,
)

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


def filtro_zona(id_zona: int | None):
    return [] if id_zona is None else [Servicio.id_zona == id_zona]


def rango_dia(fecha: date) -> tuple[datetime, datetime]:
    inicio = datetime.combine(fecha, time.min)
    fin_exclusivo = inicio + timedelta(days=1)
    return inicio, fin_exclusivo


@router.get("", response_model=DashboardResponse)
def obtener_dashboard(
    fecha: date | None = Query(default=None),
    id_zona: int | None = Query(default=None, ge=1),
    limite_top: int = Query(default=10, ge=3, le=50),
    db: Session = Depends(get_db),
):
    zona_filtros = filtro_zona(id_zona)

    if fecha is not None:
        existe_fecha = db.scalar(
            select(Calendario.fecha).where(Calendario.fecha == fecha)
        )
        if existe_fecha is None:
            raise HTTPException(
                status_code=404,
                detail=f"La fecha {fecha.isoformat()} no existe en el calendario",
            )
        fecha_referencia = fecha
    else:
        fecha_referencia = db.scalar(select(func.max(Calendario.fecha)))
        if fecha_referencia is None:
            ultima_ts = db.scalar(
                select(func.max(Lectura.ts))
                .join(Medidor, Lectura.id_medidor == Medidor.id_medidor)
                .join(Servicio, Medidor.id_servicio == Servicio.id_servicio)
                .where(*zona_filtros)
            )
            if ultima_ts is None:
                raise HTTPException(
                    status_code=404,
                    detail="No existen fechas de calendario ni lecturas disponibles",
                )
            fecha_referencia = ultima_ts.date()

    inicio, fin_exclusivo = rango_dia(fecha_referencia)
    inicio_anterior = inicio - timedelta(days=1)
    fin_anterior_exclusivo = inicio
    inicio_mes = inicio.replace(day=1)

    def agregado_lecturas(desde_x: datetime, hasta_exclusivo_x: datetime):
        return db.execute(
            select(
                func.coalesce(func.sum(Lectura.consumo_real_kwh), 0),
                func.coalesce(func.avg(Lectura.consumo_real_kwh), 0),
                func.coalesce(func.max(Lectura.consumo_real_kwh), 0),
                func.count(Lectura.ts),
            )
            .join(Medidor, Lectura.id_medidor == Medidor.id_medidor)
            .join(Servicio, Medidor.id_servicio == Servicio.id_servicio)
            .where(
                Lectura.ts >= desde_x,
                Lectura.ts < hasta_exclusivo_x,
                *zona_filtros,
            )
        ).one()

    agregado_dia = agregado_lecturas(inicio, fin_exclusivo)
    agregado_mes = agregado_lecturas(inicio_mes, fin_exclusivo)
    agregado_anterior = agregado_lecturas(
        inicio_anterior,
        fin_anterior_exclusivo,
    )

    # Ultima lectura por medidor disponible hasta finalizar el dia seleccionado.
    rank_lectura = func.row_number().over(
        partition_by=Lectura.id_medidor,
        order_by=Lectura.ts.desc(),
    ).label("rn")
    ultimas_sub = (
        select(
            Lectura.id_medidor,
            Lectura.ts,
            Lectura.consumo_real_kwh,
            rank_lectura,
        )
        .join(Medidor, Lectura.id_medidor == Medidor.id_medidor)
        .join(Servicio, Medidor.id_servicio == Servicio.id_servicio)
        .where(Lectura.ts < fin_exclusivo, *zona_filtros)
        .subquery()
    )
    ultima = db.execute(
        select(
            func.coalesce(func.sum(ultimas_sub.c.consumo_real_kwh), 0),
            func.max(ultimas_sub.c.ts),
        ).where(ultimas_sub.c.rn == 1)
    ).one()

    maximo_ts = db.scalar(
        select(Lectura.ts)
        .join(Medidor, Lectura.id_medidor == Medidor.id_medidor)
        .join(Servicio, Medidor.id_servicio == Servicio.id_servicio)
        .where(
            Lectura.ts >= inicio,
            Lectura.ts < fin_exclusivo,
            *zona_filtros,
        )
        .order_by(Lectura.consumo_real_kwh.desc())
        .limit(1)
    )

    medidores_query = (
        select(
            func.count(Medidor.id_medidor),
            func.count(case((Medidor.fecha_retiro.is_(None), 1))),
            func.count(case((Medidor.fecha_retiro.is_not(None), 1))),
            func.coalesce(func.avg(Medidor.calidad_enlace), 0),
        )
        .join(Servicio, Medidor.id_servicio == Servicio.id_servicio)
        .where(*zona_filtros)
    )
    total_medidores, activos, desconectados, calidad = db.execute(
        medidores_query
    ).one()

    alertas_activas = db.scalar(
        select(func.count(Alerta.id_alerta))
        .join(Medidor, Alerta.id_medidor == Medidor.id_medidor)
        .join(Servicio, Medidor.id_servicio == Servicio.id_servicio)
        .where(
            Alerta.ts_generacion < fin_exclusivo,
            (Alerta.ts_cierre.is_(None)) | (Alerta.ts_cierre >= inicio),
            *zona_filtros,
        )
    ) or 0

    indicadores = DashboardIndicadoresResponse(
        consumo_ultima_lectura_kwh=float(ultima[0]),
        fecha_ultima_lectura=ultima[1],
        consumo_dia_kwh=float(agregado_dia[0]),
        consumo_mes_kwh=float(agregado_mes[0]),
        demanda_maxima_lectura_kwh=float(agregado_dia[2]),
        fecha_demanda_maxima=maximo_ts,
        consumo_promedio_lectura_kwh=float(agregado_dia[1]),
        lecturas_dia=int(agregado_dia[3]),
        total_medidores=int(total_medidores),
        medidores_activos=int(activos),
        medidores_desconectados=int(desconectados),
        alertas_activas=int(alertas_activas),
        calidad_promedio_datos=(
            float(calidad) * 100 if float(calidad) <= 1 else float(calidad)
        ),
    )

    hora = func.date_trunc("hour", Lectura.ts).label("periodo")
    filas_24h = db.execute(
        select(
            hora,
            func.coalesce(func.sum(Lectura.consumo_real_kwh), 0),
            func.count(Lectura.ts),
        )
        .join(Medidor, Lectura.id_medidor == Medidor.id_medidor)
        .join(Servicio, Medidor.id_servicio == Servicio.id_servicio)
        .where(
            Lectura.ts >= inicio,
            Lectura.ts < fin_exclusivo,
            *zona_filtros,
        )
        .group_by(hora)
        .order_by(hora)
    ).all()
    ultimas_24_horas = [
        PuntoSerieResponse(
            periodo=x[0],
            consumo_kwh=float(x[1]),
            lecturas=int(x[2]),
        )
        for x in filas_24h
    ]

    top_zonas = [
        x[0]
        for x in db.execute(
            select(
                Zona.id_zona,
                func.sum(Lectura.consumo_real_kwh).label("total"),
            )
            .join(Servicio, Zona.id_zona == Servicio.id_zona)
            .join(Medidor, Servicio.id_servicio == Medidor.id_servicio)
            .join(Lectura, Medidor.id_medidor == Lectura.id_medidor)
            .where(
                Lectura.ts >= inicio,
                Lectura.ts < fin_exclusivo,
                *([Zona.id_zona == id_zona] if id_zona else []),
            )
            .group_by(Zona.id_zona)
            .order_by(desc("total"))
            .limit(3)
        ).all()
    ]

    perfil_horario_zonas = []
    if top_zonas:
        periodo_hora_zona = func.date_trunc("hour", Lectura.ts).label(
            "periodo"
        )
        filas_perfil = db.execute(
            select(
                periodo_hora_zona,
                Zona.id_zona,
                Zona.nombre,
                func.coalesce(func.sum(Lectura.consumo_real_kwh), 0),
            )
            .join(Medidor, Lectura.id_medidor == Medidor.id_medidor)
            .join(Servicio, Medidor.id_servicio == Servicio.id_servicio)
            .join(Zona, Servicio.id_zona == Zona.id_zona)
            .where(
                Lectura.ts >= inicio,
                Lectura.ts < fin_exclusivo,
                Zona.id_zona.in_(top_zonas),
            )
            .group_by(periodo_hora_zona, Zona.id_zona, Zona.nombre)
            .order_by(periodo_hora_zona, Zona.nombre)
        ).all()
        perfil_horario_zonas = [
            PerfilZonaResponse(
                periodo=x[0],
                id_zona=x[1],
                zona_nombre=x[2],
                consumo_kwh=float(x[3]),
            )
            for x in filas_perfil
        ]

    dia = func.date_trunc("day", Lectura.ts).label("periodo")
    filas_mes = db.execute(
        select(
            dia,
            func.coalesce(func.sum(Lectura.consumo_real_kwh), 0),
            func.count(Lectura.ts),
        )
        .join(Medidor, Lectura.id_medidor == Medidor.id_medidor)
        .join(Servicio, Medidor.id_servicio == Servicio.id_servicio)
        .where(
            Lectura.ts >= inicio_mes,
            Lectura.ts < fin_exclusivo,
            *zona_filtros,
        )
        .group_by(dia)
        .order_by(dia)
    ).all()
    consumo_diario_mes = [
        PuntoSerieResponse(
            periodo=x[0],
            consumo_kwh=float(x[1]),
            lecturas=int(x[2]),
        )
        for x in filas_mes
    ]

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
            Lectura.ts < fin_exclusivo,
            *([Zona.id_zona == id_zona] if id_zona else []),
        )
        .group_by(Zona.id_zona, Zona.nombre)
        .order_by(desc(func.sum(Lectura.consumo_real_kwh)))
    ).all()
    total_zonas = sum(float(x[2]) for x in filas_zona)
    consumo_por_zona = [
        ConsumoZonaResponse(
            id_zona=x[0],
            zona_nombre=x[1],
            consumo_kwh=float(x[2]),
            porcentaje=(float(x[2]) / total_zonas * 100) if total_zonas else 0,
        )
        for x in filas_zona
    ]

    actual = float(agregado_dia[0])
    anterior = float(agregado_anterior[0])
    comparacion = ComparacionPeriodoResponse(
        periodo_actual_kwh=actual,
        periodo_anterior_kwh=anterior,
        diferencia_kwh=actual - anterior,
        variacion_porcentual=(
            ((actual - anterior) / anterior * 100) if anterior else None
        ),
        inicio_actual=inicio,
        fin_actual=fin_exclusivo,
        inicio_anterior=inicio_anterior,
        fin_anterior=fin_anterior_exclusivo,
    )

    filas_tipo = db.execute(
        select(
            TipoServicio.id_tipo_servicio,
            TipoServicio.nombre,
            TipoServicio.categoria,
            func.coalesce(func.sum(Lectura.consumo_real_kwh), 0),
        )
        .join(Servicio, TipoServicio.id_tipo_servicio == Servicio.id_tipo_servicio)
        .join(Medidor, Servicio.id_servicio == Medidor.id_servicio)
        .join(Lectura, Medidor.id_medidor == Lectura.id_medidor)
        .where(
            Lectura.ts >= inicio,
            Lectura.ts < fin_exclusivo,
            *zona_filtros,
        )
        .group_by(
            TipoServicio.id_tipo_servicio,
            TipoServicio.nombre,
            TipoServicio.categoria,
        )
        .order_by(desc(func.sum(Lectura.consumo_real_kwh)))
    ).all()
    total_tipos = sum(float(x[3]) for x in filas_tipo)
    distribucion = [
        DistribucionInstalacionResponse(
            id_tipo_servicio=x[0],
            tipo_servicio_nombre=x[1],
            categoria=x[2],
            consumo_kwh=float(x[3]),
            porcentaje=(float(x[3]) / total_tipos * 100) if total_tipos else 0,
        )
        for x in filas_tipo
    ]

    filas_top = db.execute(
        select(
            Medidor.id_medidor,
            Medidor.numero_serie,
            Medidor.marca,
            Zona.nombre,
            Servicio.nombre,
            func.coalesce(func.sum(Lectura.consumo_real_kwh), 0),
        )
        .join(Servicio, Medidor.id_servicio == Servicio.id_servicio)
        .join(Zona, Servicio.id_zona == Zona.id_zona)
        .join(Lectura, Medidor.id_medidor == Lectura.id_medidor)
        .where(
            Lectura.ts >= inicio,
            Lectura.ts < fin_exclusivo,
            *zona_filtros,
        )
        .group_by(
            Medidor.id_medidor,
            Medidor.numero_serie,
            Medidor.marca,
            Zona.nombre,
            Servicio.nombre,
        )
        .order_by(desc(func.sum(Lectura.consumo_real_kwh)))
        .limit(limite_top)
    ).all()
    medidores_top = [
        MedidorMayorConsumoResponse(
            id_medidor=x[0],
            numero_serie=x[1],
            marca=x[2],
            zona_nombre=x[3],
            servicio_nombre=x[4],
            consumo_kwh=float(x[5]),
        )
        for x in filas_top
    ]

    total_m = int(total_medidores) or 1
    estados = [
        EstadoMedidoresResponse(
            estado="Activo",
            total=int(activos),
            porcentaje=int(activos) / total_m * 100,
        ),
        EstadoMedidoresResponse(
            estado="Desconectado",
            total=int(desconectados),
            porcentaje=int(desconectados) / total_m * 100,
        ),
    ]

    filas_alertas = db.execute(
        select(
            Alerta.id_alerta,
            Alerta.id_medidor,
            Medidor.numero_serie,
            Zona.nombre,
            Alerta.id_tipo_evento,
            Alerta.prioridad,
            Alerta.ts_generacion,
            Alerta.ts_cierre,
            Alerta.resultado,
        )
        .join(Medidor, Alerta.id_medidor == Medidor.id_medidor)
        .join(Servicio, Medidor.id_servicio == Servicio.id_servicio)
        .join(Zona, Servicio.id_zona == Zona.id_zona)
        .where(
            Alerta.ts_generacion < fin_exclusivo,
            *zona_filtros,
        )
        .order_by(Alerta.ts_generacion.desc())
        .limit(10)
    ).all()
    alertas_recientes = [
        AlertaRecienteResponse(
            id_alerta=x[0],
            id_medidor=x[1],
            numero_serie=x[2],
            zona_nombre=x[3],
            id_tipo_evento=x[4],
            prioridad=x[5],
            ts_generacion=x[6],
            estado="Activa" if x[7] is None else "Cerrada",
            resultado=x[8],
        )
        for x in filas_alertas
    ]

    filas_fuera = db.execute(
        select(
            Medidor.id_medidor,
            Medidor.numero_serie,
            Medidor.marca,
            Zona.nombre,
            Servicio.nombre,
            Medidor.fecha_retiro,
            Medidor.calidad_enlace,
        )
        .join(Servicio, Medidor.id_servicio == Servicio.id_servicio)
        .join(Zona, Servicio.id_zona == Zona.id_zona)
        .where(
            Medidor.fecha_retiro.is_not(None),
            Medidor.fecha_retiro < fin_exclusivo,
            *zona_filtros,
        )
        .order_by(Medidor.fecha_retiro.desc())
        .limit(25)
    ).all()
    fuera_servicio = [
        MedidorFueraServicioResponse(
            id_medidor=x[0],
            numero_serie=x[1],
            marca=x[2],
            zona_nombre=x[3],
            servicio_nombre=x[4],
            fecha_retiro=x[5],
            calidad_enlace=float(x[6]),
        )
        for x in filas_fuera
    ]

    return DashboardResponse(
        fecha_referencia=inicio,
        indicadores=indicadores,
        perfil_horario_zonas=perfil_horario_zonas,
        ultimas_24_horas=ultimas_24_horas,
        consumo_diario_mes=consumo_diario_mes,
        consumo_por_zona=consumo_por_zona,
        comparacion_periodo=comparacion,
        distribucion_por_instalacion=distribucion,
        medidores_mayor_consumo=medidores_top,
        estados_medidores=estados,
        alertas_recientes=alertas_recientes,
        medidores_fuera_servicio=fuera_servicio,
    )
