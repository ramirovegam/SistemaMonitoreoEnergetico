from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.lectura import Lectura
from ..models.medidor import Medidor
from ..models.perfil_carga_horaria import PerfilCargaHoraria
from ..models.periodo_facturacion import PeriodoFacturacion
from ..models.servicio import Servicio
from ..models.tarifa import Tarifa
from ..models.tipo_servicio import TipoServicio
from ..models.zona import Zona
from ..schemas.analisis_energetico import (
    LecturaResponse,
    MedidorAnalisisResponse,
    PerfilHorarioResponse,
    PeriodoFacturacionResponse,
    ResumenAnalisisResponse,
)

router = APIRouter(prefix="/api/analisis-energetico", tags=["Análisis energético"])


@router.get("/medidores", response_model=list[MedidorAnalisisResponse])
def listar_medidores_analisis(db: Session = Depends(get_db)):
    consulta = (
        select(Medidor, Servicio, Zona, TipoServicio)
        .join(Servicio, Medidor.id_servicio == Servicio.id_servicio)
        .join(Zona, Servicio.id_zona == Zona.id_zona)
        .join(TipoServicio, Servicio.id_tipo_servicio == TipoServicio.id_tipo_servicio)
        .order_by(Zona.nombre, Servicio.nombre, Medidor.numero_serie)
    )
    return [
        MedidorAnalisisResponse(
            id_medidor=m.id_medidor,
            numero_serie=m.numero_serie,
            marca=m.marca,
            id_servicio=s.id_servicio,
            servicio_nombre=s.nombre,
            servicio_rpu=s.rpu,
            id_zona=z.id_zona,
            zona_nombre=z.nombre,
            id_tipo_servicio=t.id_tipo_servicio,
            tipo_servicio_nombre=t.nombre,
        )
        for m, s, z, t in db.execute(consulta).all()
    ]


@router.get("/lecturas", response_model=list[LecturaResponse])
def listar_lecturas(
    id_medidor: int,
    desde: datetime | None = None,
    hasta: datetime | None = None,
    limite: int = Query(default=500, ge=1, le=5000),
    db: Session = Depends(get_db),
):
    consulta = select(Lectura).where(Lectura.id_medidor == id_medidor)
    if desde is not None:
        consulta = consulta.where(Lectura.ts >= desde)
    if hasta is not None:
        consulta = consulta.where(Lectura.ts <= hasta)
    consulta = consulta.order_by(Lectura.ts.desc()).limit(limite)
    lecturas = list(reversed(db.scalars(consulta).all()))
    return [
        LecturaResponse(
            id_medidor=x.id_medidor,
            ts=x.ts,
            consumo_kwh=float(x.consumo_kwh) if x.consumo_kwh is not None else None,
            consumo_real_kwh=float(x.consumo_real_kwh),
            id_evento=x.id_evento,
        )
        for x in lecturas
    ]


@router.get("/resumen", response_model=ResumenAnalisisResponse)
def obtener_resumen(
    id_medidor: int,
    desde: datetime | None = None,
    hasta: datetime | None = None,
    db: Session = Depends(get_db),
):
    filtros = [Lectura.id_medidor == id_medidor]
    if desde is not None:
        filtros.append(Lectura.ts >= desde)
    if hasta is not None:
        filtros.append(Lectura.ts <= hasta)

    resumen = db.execute(
        select(
            func.count(Lectura.ts),
            func.coalesce(func.sum(Lectura.consumo_real_kwh), 0),
            func.coalesce(func.avg(Lectura.consumo_real_kwh), 0),
            func.coalesce(func.max(Lectura.consumo_real_kwh), 0),
        ).where(*filtros)
    ).one()
    total, suma, promedio, maximo = resumen

    hora_maximo = db.scalar(
        select(Lectura.ts)
        .where(*filtros)
        .order_by(Lectura.consumo_real_kwh.desc())
        .limit(1)
    )
    return ResumenAnalisisResponse(
        total_lecturas=int(total),
        consumo_total_kwh=float(suma),
        consumo_promedio_kwh=float(promedio),
        consumo_maximo_kwh=float(maximo),
        hora_maximo=hora_maximo,
    )


@router.get(
    "/perfil-horario",
    response_model=list[PerfilHorarioResponse],
)
def obtener_perfil_horario(
    id_tipo_servicio: int,
    tipo_dia: str | None = Query(
        default=None,
        min_length=1,
        max_length=1,
    ),
    db: Session = Depends(get_db),
):
    tipo_servicio = db.get(
        TipoServicio,
        id_tipo_servicio,
    )

    if tipo_servicio is None:
        raise HTTPException(
            status_code=404,
            detail="El tipo de servicio no existe",
        )

    consulta = select(
        PerfilCargaHoraria,
    ).where(
        PerfilCargaHoraria.id_tipo_servicio
        == id_tipo_servicio,
    )

    if tipo_dia:
        consulta = consulta.where(
            func.upper(
                func.trim(
                    PerfilCargaHoraria.tipo_dia,
                ),
            )
            == tipo_dia.strip().upper(),
        )

    consulta = consulta.order_by(
        PerfilCargaHoraria.tipo_dia,
        PerfilCargaHoraria.hora,
    )

    perfiles = db.scalars(consulta).all()

    return [
        PerfilHorarioResponse(
            id_tipo_servicio=perfil.id_tipo_servicio,
            tipo_servicio_nombre=tipo_servicio.nombre,
            tipo_dia=perfil.tipo_dia.strip(),
            hora=perfil.hora,
            factor=float(perfil.factor),
        )
        for perfil in perfiles
    ]

@router.get("/periodos", response_model=list[PeriodoFacturacionResponse])
def listar_periodos(
    id_servicio: int,
    limite: int = Query(default=12, ge=1, le=100),
    db: Session = Depends(get_db),
):
    consulta = (
        select(PeriodoFacturacion, Servicio, Tarifa)
        .join(Servicio, PeriodoFacturacion.id_servicio == Servicio.id_servicio)
        .join(Tarifa, PeriodoFacturacion.id_tarifa_aplicada == Tarifa.id_tarifa)
        .where(PeriodoFacturacion.id_servicio == id_servicio)
        .order_by(PeriodoFacturacion.fecha_fin.desc())
        .limit(limite)
    )
    return [
        PeriodoFacturacionResponse(
            id_periodo=p.id_periodo,
            id_servicio=s.id_servicio,
            servicio_nombre=s.nombre,
            servicio_rpu=s.rpu,
            folio=p.folio,
            fecha_inicio=p.fecha_inicio,
            fecha_fin=p.fecha_fin,
            id_tarifa_aplicada=p.id_tarifa_aplicada,
            tarifa_codigo=t.codigo,
            tarifa_nombre=t.nombre,
            registro_inicial_kwh=float(p.registro_inicial_kwh),
            registro_final_kwh=float(p.registro_final_kwh),
            consumo_real_kwh=float(p.consumo_real_kwh),
            clasificacion_dac=p.clasificacion_dac,
        )
        for p, s, t in db.execute(consulta).all()
    ]


@router.get("/tipos-dia")
def listar_tipos_dia(
    id_tipo_servicio: int,
    db: Session = Depends(get_db),
):
    consulta = (
        select(
            PerfilCargaHoraria.tipo_dia,
        )
        .where(
            PerfilCargaHoraria.id_tipo_servicio
            == id_tipo_servicio,
        )
        .distinct()
        .order_by(
            PerfilCargaHoraria.tipo_dia,
        )
    )

    valores = db.scalars(consulta).all()

    return [
        valor.strip()
        for valor in valores
        if valor and valor.strip()
    ]