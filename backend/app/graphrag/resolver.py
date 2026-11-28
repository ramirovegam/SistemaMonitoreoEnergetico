"""Resolver público del grafo derivado.

Se usa solo cuando el planificador declara `FUERA_DE_ALCANCE`. Nunca sustituye
a las herramientas SQL ni envía este contenido al proveedor LLM.
"""

from __future__ import annotations

import json
import re
from functools import lru_cache

from ..services import conocimiento_simet
from .esquema import RespuestaGrafo
from .indice import IndiceGrafo
from .normalizacion import normalizar

_VERBOS_DATOS = (
    "dame",
    "da me",
    "muéstrame",
    "muestrame",
    "muestra",
    "consulta",
    "consultar",
    "calcula",
    "calculame",
    "cuantas",
    "cuantos",
)
_SUSTANTIVOS_DATOS = (
    "metrica",
    "indicador",
    "consumo",
    "kwh",
    "zona",
    "alerta",
    "medidor",
    "serie",
    "sql",
    "promedio",
    "suma",
    "total",
)
_PATRONES_INYECCION_GRAFO = (
    "ignora",
    "olvida",
    "instrucciones anteriores",
    "directivas anteriores",
    "instrucciones previas",
    "system prompt",
    "prompt del sistema",
    "developer mode",
    "jailbreak",
    "revela tus instrucciones",
    "muestra tu prompt",
    "tool choice",
    "herramienta no verificada",
)


@lru_cache(maxsize=1)
def _indice() -> IndiceGrafo:
    return IndiceGrafo.cargar()


def _es_consulta_de_datos(texto: str) -> bool:
    """Evita que una definición absorba una petición de cifras."""
    verbo = any(re.search(rf"(?<!\w){re.escape(item)}(?!\w)", texto) for item in _VERBOS_DATOS)
    sustantivo = any(item in texto for item in _SUSTANTIVOS_DATOS)
    return verbo and sustantivo


def _es_inyeccion_grafo(texto: str, patrones_base: tuple[str, ...]) -> bool:
    """Cierre estricto: reutiliza el denylist del plan y añade variantes."""
    patrones = (*_PATRONES_INYECCION_GRAFO, *patrones_base)
    return any(patron in texto for patron in patrones)


def _es_ajeno_estricto(texto: str) -> bool:
    """A diferencia del planificador, `simet` no compensa un tema ajeno."""
    return any(tema in texto for tema in conocimiento_simet.TEMAS_AJENOS)


def resolver(pregunta: str) -> RespuestaGrafo | None:
    """Devuelve una respuesta local fundamentada o `None` para fallo cerrado."""
    try:
        from ..services import llm
    except Exception:
        return None

    texto = llm._normalizar(pregunta)
    if (
        not texto
        or texto != normalizar(pregunta)
        or _es_inyeccion_grafo(texto, llm.PATRONES_INYECCION)
        or _es_ajeno_estricto(texto)
        or _es_consulta_de_datos(texto)
    ):
        return None

    try:
        indice = _indice()
        respuesta = indice.resolver(texto)
    except (OSError, ValueError, TypeError, json.JSONDecodeError, KeyError):
        return None

    if respuesta is None or len(respuesta.respuesta) > 800:
        return None
    if "Fuente" not in respuesta.respuesta or not respuesta.fuentes:
        return None
    if not respuesta.evidencia:
        return None
    return respuesta
