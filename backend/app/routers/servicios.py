from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.servicio import Servicio
from ..models.tipo_servicio import TipoServicio
from ..models.zona import Zona
from ..schemas.servicio import ServicioResponse


router = APIRouter(
    prefix="/api/servicios",
    tags=["Servicios"],
)


def convertir_servicio(
    servicio: Servicio,
    zona: Zona,
    tipo: TipoServicio,
) -> ServicioResponse:
    return ServicioResponse(
        id_servicio=servicio.id_servicio,
        rpu=servicio.rpu,

        id_zona=servicio.id_zona,
        zona_nombre=zona.nombre,

        id_tipo_servicio=servicio.id_tipo_servicio,
        tipo_servicio_clave=tipo.clave,
        tipo_servicio_nombre=tipo.nombre,
        tipo_servicio_categoria=tipo.categoria,
        consumo_base_kwh_h=float(tipo.consumo_base_kwh_h),
        factor_dispersion=float(tipo.factor_dispersion),
        sensibilidad_temp=float(tipo.sensibilidad_temp),

        id_tarifa=servicio.id_tarifa,

        nombre=servicio.nombre,
        latitud=float(servicio.latitud),
        longitud=float(servicio.longitud),
        ocupacion_estimada=servicio.ocupacion_estimada,
        carga_contratada_kw=float(servicio.carga_contratada_kw),
        tiene_solar=servicio.tiene_solar,
    )


@router.get("", response_model=list[ServicioResponse])
def listar_servicios(
    db: Session = Depends(get_db),
):
    consulta = (
        select(
            Servicio,
            Zona,
            TipoServicio,
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
        .order_by(Servicio.id_servicio.asc())
    )

    resultados = db.execute(consulta).all()

    return [
        convertir_servicio(
            servicio=servicio,
            zona=zona,
            tipo=tipo,
        )
        for servicio, zona, tipo in resultados
    ]


@router.get(
    "/{id_servicio}",
    response_model=ServicioResponse,
)
def obtener_servicio(
    id_servicio: int,
    db: Session = Depends(get_db),
):
    consulta = (
        select(
            Servicio,
            Zona,
            TipoServicio,
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
            Servicio.id_servicio == id_servicio,
        )
    )

    resultado = db.execute(consulta).first()

    if resultado is None:
        raise HTTPException(
            status_code=404,
            detail="El servicio solicitado no existe",
        )

    servicio, zona, tipo = resultado

    return convertir_servicio(
        servicio=servicio,
        zona=zona,
        tipo=tipo,
    )