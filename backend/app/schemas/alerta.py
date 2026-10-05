from datetime import datetime

from pydantic import BaseModel


class AlertaResponse(BaseModel):
    id_alerta: int
    id_evento: int | None
    id_tipo_evento: int

    ts_generacion: datetime
    prioridad: int
    ts_cierre: datetime | None
    resultado: str | None
    estado: str

    id_medidor: int
    medidor_numero_serie: str
    medidor_marca: str
    calidad_enlace: float

    id_servicio: int
    servicio_nombre: str
    servicio_rpu: str

    id_zona: int
    zona_nombre: str