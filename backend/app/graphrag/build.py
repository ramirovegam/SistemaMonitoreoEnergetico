"""Constructor del artefacto GraphRAG derivado.

Dos ejecuciones con las mismas fuentes producen bytes idénticos. No hay
marcas de tiempo ni valores derivados del estado del sistema.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from .ingesta import DIRECTORIO, construir_grafo

RUTA_ARTEFACTOS = DIRECTORIO / "artifacts"
NOMBRE_GRAFO = "grafo_derivado.json"
NOMBRE_MANIFIESTO = "manifiesto.json"


def _json_canonico(datos: Any) -> str:
    return json.dumps(
        datos,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )


def construir_manifiesto(grafo: dict[str, Any]) -> dict[str, Any]:
    fuentes = [
        nodo
        for nodo in grafo["nodos"]
        if nodo.get("tipo") == "fuente"
    ]
    return {
        "version": 1,
        "grafo_version": grafo["version"],
        "hash_grafo": hashlib.sha256(_json_canonico(grafo).encode("utf-8")).hexdigest(),
        "nodos": len(grafo["nodos"]),
        "aristas": len(grafo["aristas"]),
        "fuentes": [
            {
                "id": str(fuente["id"]).removeprefix("fuente:"),
                "sha256": fuente["sha256"],
                "disponible": bool(fuente["disponible"]),
            }
            for fuente in fuentes
        ],
    }


def _serializar(datos: Any) -> str:
    return json.dumps(datos, ensure_ascii=False, indent=2, sort_keys=True) + "\n"


def escribir(destino: Path | None = None) -> tuple[Path, Path]:
    """Escribe grafo y manifiesto. Destino es opcional para pruebas."""
    directorio = Path(destino) if destino else RUTA_ARTEFACTOS
    directorio.mkdir(parents=True, exist_ok=True)
    grafo = construir_grafo()
    manifiesto = construir_manifiesto(grafo)
    ruta_grafo = directorio / NOMBRE_GRAFO
    ruta_manifiesto = directorio / NOMBRE_MANIFIESTO
    # Bytes explícitos: sin traducción de saltos de línea entre sistemas.
    ruta_grafo.write_bytes(_serializar(grafo).encode("utf-8"))
    ruta_manifiesto.write_bytes(_serializar(manifiesto).encode("utf-8"))
    return ruta_grafo, ruta_manifiesto


if __name__ == "__main__":
    grafo, manifiesto = escribir()
    print(f"grafo={grafo}")
    print(f"manifiesto={manifiesto}")
