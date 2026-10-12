from datetime import date

from pydantic import BaseModel, ConfigDict


class DiaCalendario(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    fecha: date
    tipo_dia: str
    es_festivo: bool
    es_vacacional: bool
    temp_min_c: float
    temp_max_c: float
    factor_estacional: float


class ResumenCalendario(BaseModel):
    dias_registrados: int
    dias_festivos: int
    dias_vacacionales: int
    temperatura_minima_c: float | None
    temperatura_maxima_c: float | None
    factor_estacional_promedio: float | None


class CalendarioEnergeticoResponse(BaseModel):
    anio: int
    mes_inicio: int
    mes_fin: int
    resumen: ResumenCalendario
    dias: list[DiaCalendario]


class DetalleDiaResponse(DiaCalendario):
    nombre_dia: str
    temperatura_media_c: float
    amplitud_termica_c: float
    ajuste_estacional_pct: float
    consumo_total_kwh: float
    consumo_promedio_medidor_kwh: float
    hora_pico: int | None
    lecturas: int
    medidores_con_lectura: int
    eventos: int
    alertas: int
