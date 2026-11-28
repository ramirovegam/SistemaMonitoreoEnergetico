"""Tipos y contratos del grafo derivado."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

TIPOS_NODO = (
    "concepto",
    "intencion",
    "herramienta",
    "fuente",
    "regla",
    "territorio",
    "alias",
)
TIPOS_ARISTA = (
    "ALIAS_DE",
    "RESUELVE_CON",
    "USA_HERRAMIENTA",
    "MIDE",
    "DERIVA_DE",
    "CITADO_EN",
    "RELACIONADO_CON",
    "RECHAZA",
)
RELACIONES_TRAZABLES = (
    "DERIVA_DE",
    "CITADO_EN",
    "RELACIONADO_CON",
    "RESUELVE_CON",
)


@dataclass(frozen=True)
class Evidencia:
    """Fragmento trazable extraído de una fuente verificada."""

    fuente: str
    cita: str
    localizador: str
    texto: str


@dataclass(frozen=True)
class RespuestaGrafo:
    """Respuesta local ya fundamentada, lista para el orquestador."""

    modo: Literal["conversacional", "conceptual"]
    respuesta: str
    fuentes: tuple[str, ...]
    nodo: str
    evidencia: tuple[Evidencia, ...] = ()
