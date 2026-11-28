"""Normalización compartida por la ingesta y el resolver.

La función reproduce la normalización de `services.llm._normalizar` para que
alias y preguntas se comparen con el mismo criterio sin importar el módulo que
construya el artefacto.
"""

from __future__ import annotations

import re
import unicodedata


def normalizar(texto: str) -> str:
    sin_tildes = "".join(
        letra
        for letra in unicodedata.normalize("NFD", str(texto or "").lower())
        if unicodedata.category(letra) != "Mn"
    )
    return " ".join(sin_tildes.replace("¿", " ").replace("?", " ").split())


def slug(texto: str, limite: int = 40) -> str:
    return re.sub(r"[^a-z0-9]+", "_", normalizar(texto)).strip("_")[:limite] or "vacio"
