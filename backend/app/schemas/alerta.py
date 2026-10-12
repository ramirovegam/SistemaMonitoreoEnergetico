from datetime import datetime
from pydantic import BaseModel, ConfigDict


class AlertaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_alerta: int
    id_evento: int | None
    id_medidor: int
    id_tipo_evento: int
    ts_generacion: datetime
    prioridad: int
    ts_cierre: datetime | None
    resultado: str | None
    estado: str

    tipo_evento_clave: str
    tipo_evento_nombre: str
    tipo_evento_efecto: str
    tipo_evento_afecta_acumulado: bool
    tipo_evento_regla: str
    tipo_evento_duracion_min_h: int
    tipo_evento_duracion_max_h: int

    evento_ts_inicio: datetime | None
    evento_ts_fin: datetime | None
    evento_intensidad: float | None
    evento_kwh_desviados: float | None

    medidor_numero_serie: str
    medidor_marca: str
    calidad_enlace: float

    id_servicio: int
    servicio_nombre: str
    servicio_rpu: str
    id_zona: int
    zona_nombre: str
