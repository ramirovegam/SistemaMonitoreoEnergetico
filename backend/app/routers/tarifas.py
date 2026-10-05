from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
)
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.servicio import Servicio
from ..models.tarifa import Tarifa
from ..schemas.tarifa import (
    MensajeResponse,
    TarifaCreate,
    TarifaResponse,
    TarifaUpdate,
)


router = APIRouter(
    prefix="/api/tarifas",
    tags=["Tarifas"],
)


def normalizar_texto(value: str) -> str:
    return value.strip()


def normalizar_codigo(value: str) -> str:
    return value.strip().upper()


def normalizar_categoria(value: str) -> str:
    return (
        value
        .strip()
        .upper()
        .replace(" ", "_")
    )


def construir_respuesta(
    tarifa: Tarifa,
    total_servicios: int,
) -> TarifaResponse:
    return TarifaResponse(
        id_tarifa=tarifa.id_tarifa,
        codigo=tarifa.codigo,
        nombre=tarifa.nombre,
        categoria=tarifa.categoria,
        limite_dac_kwh_mes=tarifa.limite_dac_kwh_mes,
        total_servicios=total_servicios,
    )


@router.get(
    "",
    response_model=list[TarifaResponse],
)
def listar_tarifas(
    busqueda: str | None = Query(
        default=None,
        max_length=60,
    ),
    db: Session = Depends(get_db),
):
    total_servicios = (
        select(
            Servicio.id_tarifa.label("id_tarifa"),
            func.count(
                Servicio.id_servicio,
            ).label("total"),
        )
        .group_by(
            Servicio.id_tarifa,
        )
        .subquery()
    )

    consulta = (
        select(
            Tarifa,
            func.coalesce(
                total_servicios.c.total,
                0,
            ),
        )
        .outerjoin(
            total_servicios,
            Tarifa.id_tarifa
            == total_servicios.c.id_tarifa,
        )
        .order_by(
            Tarifa.codigo.asc(),
        )
    )

    if busqueda:
        patron = f"%{busqueda.strip()}%"

        consulta = consulta.where(
            Tarifa.codigo.ilike(patron)
            | Tarifa.nombre.ilike(patron)
            | Tarifa.categoria.ilike(patron)
        )

    resultados = db.execute(
        consulta,
    ).all()

    return [
        construir_respuesta(
            tarifa=tarifa,
            total_servicios=int(
                cantidad_servicios,
            ),
        )
        for tarifa, cantidad_servicios
        in resultados
    ]


@router.get(
    "/{id_tarifa}",
    response_model=TarifaResponse,
)
def obtener_tarifa(
    id_tarifa: int,
    db: Session = Depends(get_db),
):
    tarifa = db.get(
        Tarifa,
        id_tarifa,
    )

    if tarifa is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La tarifa solicitada no existe",
        )

    total_servicios = db.scalar(
        select(
            func.count(
                Servicio.id_servicio,
            ),
        ).where(
            Servicio.id_tarifa == id_tarifa,
        ),
    )

    return construir_respuesta(
        tarifa=tarifa,
        total_servicios=int(
            total_servicios or 0,
        ),
    )


@router.post(
    "",
    response_model=TarifaResponse,
    status_code=status.HTTP_201_CREATED,
)
def crear_tarifa(
    datos: TarifaCreate,
    db: Session = Depends(get_db),
):
    tarifa_existente = db.get(
        Tarifa,
        datos.id_tarifa,
    )

    if tarifa_existente is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Ya existe una tarifa con ese "
                "identificador"
            ),
        )

    codigo = normalizar_codigo(
        datos.codigo,
    )

    codigo_existente = db.scalar(
        select(Tarifa).where(
            func.upper(Tarifa.codigo)
            == codigo,
        ),
    )

    if codigo_existente is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Ya existe una tarifa con ese código"
            ),
        )

    tarifa = Tarifa(
        id_tarifa=datos.id_tarifa,
        codigo=codigo,
        nombre=normalizar_texto(
            datos.nombre,
        ),
        categoria=normalizar_categoria(
            datos.categoria,
        ),
        limite_dac_kwh_mes=(
            datos.limite_dac_kwh_mes
        ),
    )

    db.add(tarifa)

    try:
        db.commit()
        db.refresh(tarifa)
    except IntegrityError as error:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "No se pudo crear la tarifa "
                "porque sus datos entran en "
                "conflicto con otro registro"
            ),
        ) from error

    return construir_respuesta(
        tarifa=tarifa,
        total_servicios=0,
    )


@router.put(
    "/{id_tarifa}",
    response_model=TarifaResponse,
)
def actualizar_tarifa(
    id_tarifa: int,
    datos: TarifaUpdate,
    db: Session = Depends(get_db),
):
    tarifa = db.get(
        Tarifa,
        id_tarifa,
    )

    if tarifa is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La tarifa solicitada no existe",
        )

    codigo = normalizar_codigo(
        datos.codigo,
    )

    codigo_existente = db.scalar(
        select(Tarifa).where(
            func.upper(Tarifa.codigo) == codigo,
            Tarifa.id_tarifa != id_tarifa,
        ),
    )

    if codigo_existente is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Otra tarifa ya utiliza ese código"
            ),
        )

    tarifa.codigo = codigo
    tarifa.nombre = normalizar_texto(
        datos.nombre,
    )
    tarifa.categoria = normalizar_categoria(
        datos.categoria,
    )
    tarifa.limite_dac_kwh_mes = (
        datos.limite_dac_kwh_mes
    )

    try:
        db.commit()
        db.refresh(tarifa)
    except IntegrityError as error:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "No se pudo actualizar la tarifa"
            ),
        ) from error

    total_servicios = db.scalar(
        select(
            func.count(
                Servicio.id_servicio,
            ),
        ).where(
            Servicio.id_tarifa == id_tarifa,
        ),
    )

    return construir_respuesta(
        tarifa=tarifa,
        total_servicios=int(
            total_servicios or 0,
        ),
    )


@router.delete(
    "/{id_tarifa}",
    response_model=MensajeResponse,
)
def eliminar_tarifa(
    id_tarifa: int,
    db: Session = Depends(get_db),
):
    tarifa = db.get(
        Tarifa,
        id_tarifa,
    )

    if tarifa is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La tarifa solicitada no existe",
        )

    total_servicios = db.scalar(
        select(
            func.count(
                Servicio.id_servicio,
            ),
        ).where(
            Servicio.id_tarifa == id_tarifa,
        ),
    )

    if total_servicios and total_servicios > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "No se puede eliminar esta tarifa "
                f"porque está asignada a "
                f"{total_servicios} servicio(s)"
            ),
        )

    db.delete(tarifa)

    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "La tarifa está relacionada con "
                "otros registros y no puede eliminarse"
            ),
        ) from error

    return MensajeResponse(
        mensaje="Tarifa eliminada correctamente",
    )