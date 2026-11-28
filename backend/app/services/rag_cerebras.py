"""Redacción documental en Cerebras; el resultado se valida en el RAG."""

from __future__ import annotations

import json
import os
from urllib.error import HTTPError
from urllib.request import Request, urlopen

_ENDPOINT = "https://api.cerebras.ai/v1/chat/completions"
_MODELO = "qwen-3.8-27b"
_RAZONAMIENTO = {"qwen-3.8-27b": "none", "gpt-oss-120b": "low"}
_AVISOS_HTTP = {
    401: "Cerebras rechazó la autenticación.",
    402: "Cerebras requiere créditos para generar respuestas.",
    403: "Cerebras denegó el acceso al modelo.",
    429: "Cerebras alcanzó su límite de solicitudes.",
}


class CerebrasNoDisponible(RuntimeError):
    """Fallo del proveedor con un aviso apto para mostrar al usuario."""


def redactar(mensajes: list[dict[str, str]], esquema: dict) -> str:
    clave = os.getenv("CEREBRAS_API_KEY", "").strip()
    if not clave:
        raise CerebrasNoDisponible("Cerebras no está configurado.")
    modelo = os.getenv("CEREBRAS_MODEL", "").strip() or _MODELO
    datos = {
        "model": modelo,
        "messages": mensajes,
        "stream": False,
        "temperature": 0,
        "max_completion_tokens": 320,
        "response_format": {
            "type": "json_schema",
            "json_schema": {"name": "respuesta_documental", "strict": True, "schema": esquema},
        },
    }
    if modelo in _RAZONAMIENTO:
        datos["reasoning_effort"] = _RAZONAMIENTO[modelo]

    peticion = Request(
        _ENDPOINT,
        data=json.dumps(datos, ensure_ascii=False).encode(),
        headers={"Authorization": f"Bearer {clave}", "Content-Type": "application/json"},
    )
    try:
        with urlopen(peticion, timeout=12) as respuesta:
            opcion = json.load(respuesta)["choices"][0]
        contenido = opcion["message"]["content"]
        if opcion.get("finish_reason") != "stop" or not isinstance(contenido, str):
            raise ValueError("Respuesta incompleta.")
        return contenido
    except HTTPError as error:
        error.close()
        raise CerebrasNoDisponible(
            _AVISOS_HTTP.get(error.code, "La redacción con Cerebras no está disponible.")
        ) from None
    except (OSError, ValueError, TypeError, KeyError, IndexError, AttributeError):
        raise CerebrasNoDisponible("La redacción con Cerebras no está disponible.") from None
