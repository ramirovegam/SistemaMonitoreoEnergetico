from datetime import date

from pydantic import BaseModel


class MedidorResponse(BaseModel):
    id_medidor: int
    numero_serie: str
    marca: str
    multiplicador: int
    fecha_instalacion: date
    fecha_retiro: date | None
    calidad_enlace: float
    estado: str

    id_servicio: int
    servicio_nombre: str
    servicio_rpu: str

    id_zona: int
    zona_nombre: str

    id_tipo_servicio: int
    tipo_servicio_nombre: str
    tipo_servicio_categoria: str