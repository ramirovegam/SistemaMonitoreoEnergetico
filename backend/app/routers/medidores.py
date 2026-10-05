from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.medidor import Medidor
from ..models.servicio import Servicio
from ..models.tipo_servicio import TipoServicio
from ..models.zona import Zona
from ..schemas.medidor import MedidorResponse


router = APIRouter(
    prefix="/api/medidores",
    tags=["Medidores"],
)


def convertir_medidor(
    medidor: Medidor,
    servicio: Servicio,
    zona: Zona,
    tipo_servicio: TipoServicio,
) -> MedidorResponse:
    estado = (
        "Instalado"
        if medidor.fecha_retiro is None
        else "Retirado"
    )

    return MedidorResponse(
        id_medidor=medidor.id_medidor,
        numero_serie=medidor.numero_serie,
        marca=medidor.marca,
        multiplicador=medidor.multiplicador,
        fecha_instalacion=medidor.fecha_instalacion,
        fecha_retiro=medidor.fecha_retiro,
        calidad_enlace=float(medidor.calidad_enlace),
        estado=estado,

        id_servicio=servicio.id_servicio,
        servicio_nombre=servicio.nombre,
        servicio_rpu=servicio.rpu,

        id_zona=zona.id_zona,
        zona_nombre=zona.nombre,

        id_tipo_servicio=tipo_servicio.id_tipo_servicio,
        tipo_servicio_nombre=tipo_servicio.nombre,
        tipo_servicio_categoria=tipo_servicio.categoria,
    )


@router.get(
    "",
    response_model=list[MedidorResponse],
)
def listar_medidores(
    db: Session = Depends(get_db),
):
    consulta = (
        select(
            Medidor,
            Servicio,
            Zona,
            TipoServicio,
        )
        .join(
            Servicio,
            Medidor.id_servicio == Servicio.id_servicio,
        )
        .join(
            Zona,
            Servicio.id_zona == Zona.id_zona,
        )
        .join(
            TipoServicio,
            Servicio.id_tipo_servicio
            == TipoServicio.id_tipo_servicio,
        )
        .order_by(Medidor.id_medidor.asc())
    )

    resultados = db.execute(consulta).all()

    return [
        convertir_medidor(
            medidor=medidor,
            servicio=servicio,
            zona=zona,
            tipo_servicio=tipo_servicio,
        )
        for (
            medidor,
            servicio,
            zona,
            tipo_servicio,
        ) in resultados
    ]


@router.get(
    "/{id_medidor}",
    response_model=MedidorResponse,
)
def obtener_medidor(
    id_medidor: int,
    db: Session = Depends(get_db),
):
    consulta = (
        select(
            Medidor,
            Servicio,
            Zona,
            TipoServicio,
        )
        .join(
            Servicio,
            Medidor.id_servicio == Servicio.id_servicio,
        )
        .join(
            Zona,
            Servicio.id_zona == Zona.id_zona,
        )
        .join(
            TipoServicio,
            Servicio.id_tipo_servicio
            == TipoServicio.id_tipo_servicio,
        )
        .where(
            Medidor.id_medidor == id_medidor,
        )
    )

    resultado = db.execute(consulta).first()

    if resultado is None:
        raise HTTPException(
            status_code=404,
            detail="El medidor solicitado no existe",
        )

    medidor, servicio, zona, tipo_servicio = resultado

    return convertir_medidor(
        medidor=medidor,
        servicio=servicio,
        zona=zona,
        tipo_servicio=tipo_servicio,
    )