from datetime import datetime
from pydantic import BaseModel, Field


class LecturaHistorialResponse(BaseModel):
    id_medidor: int
    numero_serie: str
    marca: str
    ts: datetime
    consumo_kwh: float | None
    consumo_real_kwh: float
    id_evento: int | None
    calidad_enlace: float
    estado: str
    id_servicio: int
    servicio_nombre: str
    servicio_rpu: str
    id_zona: int
    zona_nombre: str
    voltaje: float | None = None
    corriente: float | None = None
    potencia: float | None = None


class HistorialPaginadoResponse(BaseModel):
    items: list[LecturaHistorialResponse]
    total: int
    pagina: int
    por_pagina: int
    total_paginas: int


class LecturaOriginalResponse(LecturaHistorialResponse):
    clave_registro: str


class GrupoLecturasResponse(BaseModel):
    periodo: datetime
    total_lecturas: int
    consumo_total_kwh: float
    consumo_promedio_kwh: float
    consumo_minimo_kwh: float
    consumo_maximo_kwh: float


class HuecoLecturaResponse(BaseModel):
    id_medidor: int
    numero_serie: str
    inicio_hueco: datetime
    fin_hueco: datetime
    minutos_sin_datos: float
    lecturas_estimadas_faltantes: int


class AnalisisHuecosResponse(BaseModel):
    intervalo_esperado_minutos: int = Field(ge=1)
    total_huecos: int
    huecos: list[HuecoLecturaResponse]
