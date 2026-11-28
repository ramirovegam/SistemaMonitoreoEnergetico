from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


class Mensaje(BaseModel):
    rol: Literal["usuario", "asistente"]
    contenido: str = Field(min_length=1, max_length=800)


class ConsultaRequest(BaseModel):
    pregunta: str = Field(min_length=1, max_length=800)
    historial: list[Mensaje] = Field(default_factory=list)

    @field_validator("historial")
    @classmethod
    def conservar_ultimos_turnos(cls, valor: list[Mensaje]) -> list[Mensaje]:
        return valor[-12:]


class Sugerencia(BaseModel):
    intent: str
    pregunta: str
    descripcion: str


class SerieVisualizacion(BaseModel):
    clave: str
    etiqueta: str


class GraficaVisualizacion(BaseModel):
    tipo: Literal["linea", "barras"]
    titulo: str
    subtitulo: str | None = None
    eje_x: str
    series: list[SerieVisualizacion]
    datos: list[dict[str, Any]] = Field(default_factory=list)


class FormulaAplicada(BaseModel):
    nombre: str
    expresion: str
    resultado: Any
    interpretacion: str
    metodo: str
    fuentes: list[str] = Field(default_factory=list)


class ConsultaResponse(BaseModel):
    pregunta: str
    respuesta: str = Field(min_length=1, max_length=800)
    fuentes: list[str] = Field(default_factory=list)
    formulas_aplicadas: list[FormulaAplicada] = Field(default_factory=list)
    datos_visualizacion: list[GraficaVisualizacion] = Field(default_factory=list)
    modo: Literal["conversacional", "conceptual", "datos"]
    origen: Literal["llm", "local"]
    aviso: str | None = None
    preferencias_aplicadas: list[str] = Field(default_factory=list)

    # Campos conservados para clientes anteriores del panel.
    fuente: list[str] = Field(default_factory=list)
    metodo: str | None = None
    datos: Any = None
    grafica: GraficaVisualizacion | None = None
