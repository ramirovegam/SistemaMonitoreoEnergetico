from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.zona import Zona
from ..schemas.zona import ZonaResponse


router = APIRouter(
    prefix="/api/zonas",
    tags=["Zonas"],
)


@router.get("", response_model=list[ZonaResponse])
def listar_zonas(db: Session = Depends(get_db)):
    consulta = select(Zona).order_by(Zona.nombre.asc())
    zonas = db.scalars(consulta).all()

    return zonas


@router.get("/{id_zona}", response_model=ZonaResponse)
def obtener_zona(
    id_zona: int,
    db: Session = Depends(get_db),
):
    zona = db.get(Zona, id_zona)

    if zona is None:
        raise HTTPException(
            status_code=404,
            detail="La zona solicitada no existe",
        )

    return zona