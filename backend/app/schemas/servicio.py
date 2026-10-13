from pydantic import BaseModel


class ServicioResponse(BaseModel):
    id_servicio: int
    rpu: str

    id_zona: int
    zona_nombre: str

    id_tipo_servicio: int
    tipo_servicio_clave: str
    tipo_servicio_nombre: str
    tipo_servicio_categoria: str
    consumo_base_kwh_h: float
    factor_dispersion: float
    sensibilidad_temp: float

    id_tarifa: int

    nombre: str
    latitud: float
    longitud: float
    ocupacion_estimada: int | None
    carga_contratada_kw: float
    tiene_solar: bool