from datetime import date, datetime
from pydantic import BaseModel


class MedidorAnalisisResponse(BaseModel):
    id_medidor: int
    numero_serie: str
    marca: str
    id_servicio: int
    servicio_nombre: str
    servicio_rpu: str
    id_zona: int
    zona_nombre: str
    id_tipo_servicio: int
    tipo_servicio_nombre: str


class LecturaResponse(BaseModel):
    id_medidor: int
    ts: datetime
    consumo_kwh: float | None
    consumo_real_kwh: float
    id_evento: int | None


class PerfilHorarioResponse(BaseModel):
    id_tipo_servicio: int
    tipo_servicio_nombre: str
    tipo_dia: str
    hora: int
    factor: float


class PeriodoFacturacionResponse(BaseModel):
    id_periodo: int
    id_servicio: int
    servicio_nombre: str
    servicio_rpu: str
    folio: str
    fecha_inicio: date
    fecha_fin: date
    id_tarifa_aplicada: int
    tarifa_codigo: str
    tarifa_nombre: str
    registro_inicial_kwh: float
    registro_final_kwh: float
    consumo_real_kwh: float
    clasificacion_dac: bool


class ResumenAnalisisResponse(BaseModel):
    total_lecturas: int
    consumo_total_kwh: float
    consumo_promedio_kwh: float
    consumo_maximo_kwh: float
    hora_maximo: datetime | None
