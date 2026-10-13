from pydantic import BaseModel, ConfigDict


class ZonaResponse(BaseModel):
    id_zona: int
    nombre: str
    tipo_urbano: str
    superficie_km2: float
    factor_socioeconomico: float
    poblacion_total: int | None
    viviendas_habitadas: int | None
    grado_rezago_representativo: str | None
    id_referencia: int | None

    model_config = ConfigDict(from_attributes=True)