from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class CalendarioResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    fecha: date
    tipo_dia: str
    es_festivo: bool
    es_vacacional: bool
    temp_min_c: Decimal
    temp_max_c: Decimal
    factor_estacional: Decimal


class CalendarioListaResponse(BaseModel):
    total: int
    fecha_inicio: date | None = None
    fecha_fin: date | None = None
    registros: list[CalendarioResponse]