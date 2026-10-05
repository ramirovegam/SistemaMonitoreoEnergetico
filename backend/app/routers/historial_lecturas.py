import csv
import io
import math
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import asc, desc, func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.lectura import Lectura
from ..models.medidor import Medidor
from ..models.servicio import Servicio
from ..models.zona import Zona
from ..schemas.historial_lecturas import (
    AnalisisHuecosResponse,
    GrupoLecturasResponse,
    HistorialPaginadoResponse,
    HuecoLecturaResponse,
    LecturaHistorialResponse,
    LecturaOriginalResponse,
)

router = APIRouter(prefix="/api/historial-lecturas", tags=["Historial de lecturas"])


def filtros_historial(
    desde: datetime | None,
    hasta: datetime | None,
    id_medidor: int | None,
    id_zona: int | None,
    busqueda_medidor: str | None,
):
    filtros = []
    if desde is not None:
        filtros.append(Lectura.ts >= desde)
    if hasta is not None:
        filtros.append(Lectura.ts <= hasta)
    if id_medidor is not None:
        filtros.append(Lectura.id_medidor == id_medidor)
    if id_zona is not None:
        filtros.append(Servicio.id_zona == id_zona)
    if busqueda_medidor:
        filtros.append(Medidor.numero_serie.ilike(f"%{busqueda_medidor.strip()}%"))
    return filtros


def consulta_base():
    return (
        select(Lectura, Medidor, Servicio, Zona)
        .join(Medidor, Lectura.id_medidor == Medidor.id_medidor)
        .join(Servicio, Medidor.id_servicio == Servicio.id_servicio)
        .join(Zona, Servicio.id_zona == Zona.id_zona)
    )


def convertir_lectura(lectura, medidor, servicio, zona):
    if lectura.consumo_kwh is None:
        estado = "Sin consumo calculado"
    elif lectura.id_evento is not None:
        estado = "Con evento"
    else:
        estado = "Válida"

    return LecturaHistorialResponse(
        id_medidor=lectura.id_medidor,
        numero_serie=medidor.numero_serie,
        marca=medidor.marca,
        ts=lectura.ts,
        consumo_kwh=float(lectura.consumo_kwh) if lectura.consumo_kwh is not None else None,
        consumo_real_kwh=float(lectura.consumo_real_kwh),
        id_evento=lectura.id_evento,
        calidad_enlace=float(medidor.calidad_enlace),
        estado=estado,
        id_servicio=servicio.id_servicio,
        servicio_nombre=servicio.nombre,
        servicio_rpu=servicio.rpu,
        id_zona=zona.id_zona,
        zona_nombre=zona.nombre,
    )


@router.get("", response_model=HistorialPaginadoResponse)
def listar_historial(
    pagina: int = Query(default=1, ge=1),
    por_pagina: int = Query(default=50, ge=10, le=500),
    desde: datetime | None = None,
    hasta: datetime | None = None,
    id_medidor: int | None = None,
    id_zona: int | None = None,
    busqueda_medidor: str | None = Query(default=None, max_length=24),
    orden: str = Query(default="desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
):
    if desde and hasta and desde > hasta:
        raise HTTPException(status_code=422, detail="La fecha inicial no puede ser posterior a la final")

    filtros = filtros_historial(desde, hasta, id_medidor, id_zona, busqueda_medidor)
    total = db.scalar(
        select(func.count()).select_from(Lectura)
        .join(Medidor, Lectura.id_medidor == Medidor.id_medidor)
        .join(Servicio, Medidor.id_servicio == Servicio.id_servicio)
        .where(*filtros)
    ) or 0

    ordenar = asc(Lectura.ts) if orden == "asc" else desc(Lectura.ts)
    consulta = (
        consulta_base().where(*filtros).order_by(ordenar, Lectura.id_medidor)
        .offset((pagina - 1) * por_pagina).limit(por_pagina)
    )
    items = [convertir_lectura(*fila) for fila in db.execute(consulta).all()]

    return HistorialPaginadoResponse(
        items=items,
        total=int(total),
        pagina=pagina,
        por_pagina=por_pagina,
        total_paginas=max(1, math.ceil(total / por_pagina)),
    )


@router.get("/original", response_model=LecturaOriginalResponse)
def obtener_registro_original(
    id_medidor: int,
    ts: datetime,
    db: Session = Depends(get_db),
):
    fila = db.execute(
        consulta_base().where(Lectura.id_medidor == id_medidor, Lectura.ts == ts)
    ).first()
    if fila is None:
        raise HTTPException(status_code=404, detail="La lectura solicitada no existe")

    lectura = convertir_lectura(*fila)
    return LecturaOriginalResponse(
        **lectura.model_dump(),
        clave_registro=f"{id_medidor}|{ts.isoformat()}",
    )


@router.get("/agrupado", response_model=list[GrupoLecturasResponse])
def agrupar_lecturas(
    agrupacion: str = Query(default="dia", pattern="^(hora|dia|mes)$"),
    desde: datetime | None = None,
    hasta: datetime | None = None,
    id_medidor: int | None = None,
    id_zona: int | None = None,
    busqueda_medidor: str | None = Query(default=None, max_length=24),
    db: Session = Depends(get_db),
):
    unidad = {"hora": "hour", "dia": "day", "mes": "month"}[agrupacion]
    periodo = func.date_trunc(unidad, Lectura.ts).label("periodo")
    filtros = filtros_historial(desde, hasta, id_medidor, id_zona, busqueda_medidor)

    consulta = (
        select(
            periodo,
            func.count(Lectura.ts),
            func.coalesce(func.sum(Lectura.consumo_real_kwh), 0),
            func.coalesce(func.avg(Lectura.consumo_real_kwh), 0),
            func.coalesce(func.min(Lectura.consumo_real_kwh), 0),
            func.coalesce(func.max(Lectura.consumo_real_kwh), 0),
        )
        .join(Medidor, Lectura.id_medidor == Medidor.id_medidor)
        .join(Servicio, Medidor.id_servicio == Servicio.id_servicio)
        .where(*filtros)
        .group_by(periodo)
        .order_by(periodo)
    )

    return [
        GrupoLecturasResponse(
            periodo=fila[0], total_lecturas=int(fila[1]),
            consumo_total_kwh=float(fila[2]), consumo_promedio_kwh=float(fila[3]),
            consumo_minimo_kwh=float(fila[4]), consumo_maximo_kwh=float(fila[5]),
        )
        for fila in db.execute(consulta).all()
    ]


@router.get("/huecos", response_model=AnalisisHuecosResponse)
def detectar_huecos(
    intervalo_esperado_minutos: int = Query(default=15, ge=1, le=1440),
    desde: datetime | None = None,
    hasta: datetime | None = None,
    id_medidor: int | None = None,
    id_zona: int | None = None,
    busqueda_medidor: str | None = Query(default=None, max_length=24),
    limite: int = Query(default=500, ge=1, le=5000),
    db: Session = Depends(get_db),
):
    filtros = filtros_historial(desde, hasta, id_medidor, id_zona, busqueda_medidor)
    anterior = func.lag(Lectura.ts).over(
        partition_by=Lectura.id_medidor, order_by=Lectura.ts
    ).label("ts_anterior")
    base = (
        select(Lectura.id_medidor, Medidor.numero_serie, Lectura.ts.label("ts_actual"), anterior)
        .join(Medidor, Lectura.id_medidor == Medidor.id_medidor)
        .join(Servicio, Medidor.id_servicio == Servicio.id_servicio)
        .where(*filtros)
    ).subquery()

    segundos = func.extract("epoch", base.c.ts_actual - base.c.ts_anterior)
    consulta = (
        select(base.c.id_medidor, base.c.numero_serie, base.c.ts_anterior, base.c.ts_actual, segundos)
        .where(base.c.ts_anterior.is_not(None), segundos > intervalo_esperado_minutos * 60)
        .order_by(segundos.desc()).limit(limite)
    )

    huecos = []
    for medidor_id, serie, inicio, fin, segundos_valor in db.execute(consulta).all():
        minutos = float(segundos_valor) / 60
        faltantes = max(1, math.floor(minutos / intervalo_esperado_minutos) - 1)
        huecos.append(HuecoLecturaResponse(
            id_medidor=medidor_id, numero_serie=serie, inicio_hueco=inicio,
            fin_hueco=fin, minutos_sin_datos=minutos,
            lecturas_estimadas_faltantes=faltantes,
        ))

    return AnalisisHuecosResponse(
        intervalo_esperado_minutos=intervalo_esperado_minutos,
        total_huecos=len(huecos), huecos=huecos,
    )


@router.get("/exportar.csv")
def exportar_csv(
    desde: datetime | None = None,
    hasta: datetime | None = None,
    id_medidor: int | None = None,
    id_zona: int | None = None,
    busqueda_medidor: str | None = Query(default=None, max_length=24),
    limite: int = Query(default=100000, ge=1, le=500000),
    db: Session = Depends(get_db),
):
    filtros = filtros_historial(desde, hasta, id_medidor, id_zona, busqueda_medidor)
    filas = db.execute(
        consulta_base().where(*filtros).order_by(Lectura.ts.desc()).limit(limite)
    ).all()

    output = io.StringIO()
    output.write("\ufeff")
    writer = csv.writer(output)
    writer.writerow([
        "fecha_hora", "id_medidor", "numero_serie", "marca", "zona",
        "servicio", "rpu", "consumo_kwh", "consumo_real_kwh",
        "calidad_enlace", "id_evento", "estado",
    ])
    for fila in filas:
        item = convertir_lectura(*fila)
        writer.writerow([
            item.ts.isoformat(), item.id_medidor, item.numero_serie, item.marca,
            item.zona_nombre, item.servicio_nombre, item.servicio_rpu,
            item.consumo_kwh, item.consumo_real_kwh, item.calidad_enlace,
            item.id_evento, item.estado,
        ])

    headers = {"Content-Disposition": "attachment; filename=historial_lecturas.csv"}
    return StreamingResponse(
        iter([output.getvalue()]), media_type="text/csv; charset=utf-8", headers=headers
    )
