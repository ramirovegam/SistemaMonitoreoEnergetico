from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.calendario import Calendario
from ..schemas.calendario import (
    CalendarioListaResponse,
    CalendarioResponse,
)


router = APIRouter(
    prefix="/calendario",
    tags=["Calendario"],
)


@router.get(
    "",
    response_model=CalendarioListaResponse,
)
def listar_calendario(
    fecha_inicio: date | None = Query(default=None),
    fecha_fin: date | None = Query(default=None),
    db: Session = Depends(get_db),
) -> CalendarioListaResponse:
    if (
        fecha_inicio is not None
        and fecha_fin is not None
        and fecha_inicio > fecha_fin
    ):
        raise HTTPException(
            status_code=400,
            detail="fecha_inicio no puede ser mayor que fecha_fin",
        )

    consulta = select(Calendario)

    if fecha_inicio is not None:
        consulta = consulta.where(
            Calendario.fecha >= fecha_inicio,
        )

    if fecha_fin is not None:
        consulta = consulta.where(
            Calendario.fecha <= fecha_fin,
        )

    consulta = consulta.order_by(
        Calendario.fecha.asc(),
    )

    registros = list(
        db.scalars(consulta).all()
    )

    return CalendarioListaResponse(
        total=len(registros),
        fecha_inicio=registros[0].fecha if registros else None,
        fecha_fin=registros[-1].fecha if registros else None,
        registros=[
            CalendarioResponse.model_validate(registro)
            for registro in registros
        ],
    )


@router.get(
    "/{fecha}",
    response_model=CalendarioResponse,
)
def obtener_calendario_por_fecha(
    fecha: date,
    db: Session = Depends(get_db),
) -> CalendarioResponse:
    consulta = select(Calendario).where(
        Calendario.fecha == fecha,
    )

    registro = db.scalar(consulta)

    if registro is None:
        raise HTTPException(
            status_code=404,
            detail=f"No existe información para la fecha {fecha}",
        )

    return CalendarioResponse.model_validate(registro)