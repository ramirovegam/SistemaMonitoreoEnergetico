from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class ZonaResponse(BaseModel):
    id_zona: int
    nombre: str
    tipo_urbano: str
    superficie_km2: Decimal
    factor_socioeconomico: Decimal

    model_config = ConfigDict(from_attributes=True)