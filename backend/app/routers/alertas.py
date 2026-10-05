from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.alerta import Alerta
from ..models.medidor import Medidor
from ..models.servicio import Servicio
from ..models.zona import Zona
from ..schemas.alerta import AlertaResponse


router = APIRouter(
    prefix="/api/alertas",
    tags=["Alertas"],
)


def convertir_alerta(
    alerta: Alerta,
    medidor: Medidor,
    servicio: Servicio,
    zona: Zona,
) -> AlertaResponse:
    estado = (
        "Activa"
        if alerta.ts_cierre is None
        else "Cerrada"
    )

    return AlertaResponse(
        id_alerta=alerta.id_alerta,
        id_evento=alerta.id_evento,
        id_tipo_evento=alerta.id_tipo_evento,

        ts_generacion=alerta.ts_generacion,
        prioridad=alerta.prioridad,
        ts_cierre=alerta.ts_cierre,
        resultado=alerta.resultado,
        estado=estado,

        id_medidor=medidor.id_medidor,
        medidor_numero_serie=medidor.numero_serie,
        medidor_marca=medidor.marca,
        calidad_enlace=float(medidor.calidad_enlace),

        id_servicio=servicio.id_servicio,
        servicio_nombre=servicio.nombre,
        servicio_rpu=servicio.rpu,

        id_zona=zona.id_zona,
        zona_nombre=zona.nombre,
    )


@router.get(
    "",
    response_model=list[AlertaResponse],
)
def listar_alertas(
    db: Session = Depends(get_db),
):
    consulta = (
        select(
            Alerta,
            Medidor,
            Servicio,
            Zona,
        )
        .join(
            Medidor,
            Alerta.id_medidor == Medidor.id_medidor,
        )
        .join(
            Servicio,
            Medidor.id_servicio == Servicio.id_servicio,
        )
        .join(
            Zona,
            Servicio.id_zona == Zona.id_zona,
        )
        .order_by(
            Alerta.ts_generacion.desc(),
        )
    )

    resultados = db.execute(consulta).all()

    return [
        convertir_alerta(
            alerta=alerta,
            medidor=medidor,
            servicio=servicio,
            zona=zona,
        )
        for alerta, medidor, servicio, zona in resultados
    ]


@router.get(
    "/{id_alerta}",
    response_model=AlertaResponse,
)
def obtener_alerta(
    id_alerta: int,
    db: Session = Depends(get_db),
):
    consulta = (
        select(
            Alerta,
            Medidor,
            Servicio,
            Zona,
        )
        .join(
            Medidor,
            Alerta.id_medidor == Medidor.id_medidor,
        )
        .join(
            Servicio,
            Medidor.id_servicio == Servicio.id_servicio,
        )
        .join(
            Zona,
            Servicio.id_zona == Zona.id_zona,
        )
        .where(
            Alerta.id_alerta == id_alerta,
        )
    )

    resultado = db.execute(consulta).first()

    if resultado is None:
        raise HTTPException(
            status_code=404,
            detail="La alerta solicitada no existe",
        )

    alerta, medidor, servicio, zona = resultado

    return convertir_alerta(
        alerta=alerta,
        medidor=medidor,
        servicio=servicio,
        zona=zona,
    )