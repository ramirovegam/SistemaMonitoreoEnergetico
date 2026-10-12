from pydantic import BaseModel, Field


class ZonaIndicadoresResponse(BaseModel):
    id_zona: int

    consumo_total_kwh: float = 0
    consumo_por_vivienda_kwh: float = 0
    consumo_por_habitante_kwh: float = 0
    crecimiento_mensual_pct: float = 0

    total_servicios: int = 0
    servicios_por_vivienda: float = 0

    total_medidores: int = 0
    medidores_activos: int = 0
    medidores_fuera_servicio: int = 0
    disponibilidad_pct: float = 0

    total_alertas: int = 0
    alertas_activas: int = 0
    alertas_por_medidor: float = 0

    calidad_enlace_promedio: float = 0
    lecturas_esperadas: int = 0
    lecturas_recibidas: int = 0
    lecturas_faltantes: int = 0

    ahorro_potencial_kwh: float = 0
    ahorro_pct: float = Field(default=8, ge=0, le=100)
