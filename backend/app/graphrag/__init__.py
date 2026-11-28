"""Capa GraphRAG-lite determinista de SIMET.

El grafo es un artefacto derivado y regenerable. No forma parte de la base de
conocimiento operativa y nunca aporta cifras: solo enlaza preguntas, conceptos,
reglas y fuentes citables.
"""

from .esquema import RespuestaGrafo

__all__ = ["RespuestaGrafo"]
