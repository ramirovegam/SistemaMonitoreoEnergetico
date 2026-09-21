from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.zona import Zona
from ..schemas.zona import ZonaResponse


router = APIRouter(
    prefix="/api/zonas",
    tags=["Zonas"]
)


@router.get("/", response_model=list[ZonaResponse])
def obtener_zonas(db: Session = Depends(get_db)):
    statement = select(Zona).order_by(Zona.id_zona)

    zonas = db.scalars(statement).all()

    return zonas