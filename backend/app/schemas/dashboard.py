from datetime import date, datetime
from pydantic import BaseModel


class DashboardIndicadoresResponse(BaseModel):
    consumo_ultima_lectura_kwh: float
    fecha_ultima_lectura: datetime | None
    consumo_dia_kwh: float
    consumo_mes_kwh: float
    demanda_maxima_lectura_kwh: float
    fecha_demanda_maxima: datetime | None
    consumo_promedio_lectura_kwh: float
    lecturas_dia: int
    total_medidores: int
    medidores_activos: int
    medidores_desconectados: int
    alertas_activas: int
    calidad_promedio_datos: float


class PuntoSerieResponse(BaseModel):
    periodo: datetime
    consumo_kwh: float
    lecturas: int


class PerfilZonaResponse(BaseModel):
    periodo: datetime
    id_zona: int
    zona_nombre: str
    consumo_kwh: float


class ConsumoZonaResponse(BaseModel):
    id_zona: int
    zona_nombre: str
    consumo_kwh: float
    porcentaje: float


class ComparacionPeriodoResponse(BaseModel):
    periodo_actual_kwh: float
    periodo_anterior_kwh: float
    diferencia_kwh: float
    variacion_porcentual: float | None
    inicio_actual: datetime
    fin_actual: datetime
    inicio_anterior: datetime
    fin_anterior: datetime


class DistribucionInstalacionResponse(BaseModel):
    id_tipo_servicio: int
    tipo_servicio_nombre: str
    categoria: str
    consumo_kwh: float
    porcentaje: float


class MedidorMayorConsumoResponse(BaseModel):
    id_medidor: int
    numero_serie: str
    marca: str
    zona_nombre: str
    servicio_nombre: str
    consumo_kwh: float


class EstadoMedidoresResponse(BaseModel):
    estado: str
    total: int
    porcentaje: float


class AlertaRecienteResponse(BaseModel):
    id_alerta: int
    id_medidor: int
    numero_serie: str
    zona_nombre: str
    id_tipo_evento: int
    prioridad: int
    ts_generacion: datetime
    estado: str
    resultado: str | None


class MedidorFueraServicioResponse(BaseModel):
    id_medidor: int
    numero_serie: str
    marca: str
    zona_nombre: str
    servicio_nombre: str
    fecha_retiro: date | None
    calidad_enlace: float


class DashboardResponse(BaseModel):
    fecha_referencia: datetime
    indicadores: DashboardIndicadoresResponse
    perfil_horario_zonas: list[PerfilZonaResponse]
    ultimas_24_horas: list[PuntoSerieResponse]
    consumo_diario_mes: list[PuntoSerieResponse]
    consumo_por_zona: list[ConsumoZonaResponse]
    comparacion_periodo: ComparacionPeriodoResponse
    distribucion_por_instalacion: list[DistribucionInstalacionResponse]
    medidores_mayor_consumo: list[MedidorMayorConsumoResponse]
    estados_medidores: list[EstadoMedidoresResponse]
    alertas_recientes: list[AlertaRecienteResponse]
    medidores_fuera_servicio: list[MedidorFueraServicioResponse]
