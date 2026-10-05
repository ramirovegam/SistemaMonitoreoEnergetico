from pydantic import BaseModel, ConfigDict, Field


class TarifaBase(BaseModel):
    codigo: str = Field(
        min_length=1,
        max_length=6,
    )

    nombre: str = Field(
        min_length=1,
        max_length=60,
    )

    categoria: str = Field(
        min_length=1,
        max_length=18,
    )

    limite_dac_kwh_mes: int | None = Field(
        default=None,
        ge=0,
    )


class TarifaCreate(TarifaBase):
    id_tarifa: int = Field(
        ge=1,
        le=32767,
    )


class TarifaUpdate(TarifaBase):
    pass


class TarifaResponse(TarifaBase):
    id_tarifa: int
    total_servicios: int = 0

    model_config = ConfigDict(
        from_attributes=True,
    )


class MensajeResponse(BaseModel):
    mensaje: str