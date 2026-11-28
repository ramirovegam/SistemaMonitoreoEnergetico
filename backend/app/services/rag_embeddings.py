"""Embeddings locales del RAG, con el modelo y la revisión fijados."""

from __future__ import annotations

import os
from functools import lru_cache
from threading import Lock

import numpy as np

MODELO = "Qwen/Qwen3-Embedding-0.6B"
REVISION = "97b0c614be4d77ee51c0cef4e5f07c00f9eb65b3"
DIMENSIONES = 1024
FIRMA = f"{MODELO}@{REVISION}:sentence-transformers:float32:last-token:{DIMENSIONES}"
_MAX_TOKENS = 1024
_INFERENCIA = Lock()


@lru_cache(maxsize=1)
def _modelo(descargar: bool):
    import torch
    from sentence_transformers import SentenceTransformer

    torch.set_num_threads(min(4, os.cpu_count() or 1))
    modelo = SentenceTransformer(
        MODELO,
        revision=REVISION,
        device="cpu",
        local_files_only=not descargar,
        trust_remote_code=False,
        model_kwargs={"dtype": torch.float32},
    )
    modelo.max_seq_length = _MAX_TOKENS
    return modelo


def validar_vectores(datos: object, filas: int) -> np.ndarray:
    vectores = np.asarray(datos, dtype=np.float32)
    if vectores.shape != (filas, DIMENSIONES) or not np.isfinite(vectores).all():
        raise ValueError(f"Se esperaban {filas} vectores de {DIMENSIONES} dimensiones.")
    if not np.allclose(np.linalg.norm(vectores, axis=1), 1.0, atol=1e-3):
        raise ValueError("El índice requiere vectores normalizados.")
    return vectores


def codificar(textos: list[str], *, descargar: bool = False) -> np.ndarray:
    # Evita cargar copias concurrentes del modelo y saturar la CPU con PyTorch.
    with _INFERENCIA:
        modelo = _modelo(descargar)
        longitudes = modelo.tokenizer(textos, truncation=False, return_length=True)["length"]
        if any(longitud > _MAX_TOKENS for longitud in longitudes):
            raise ValueError("Divida el texto antes de vectorizarlo; supera el contexto permitido.")
        vectores = modelo.encode(
            textos,
            prompt="",
            batch_size=8,
            normalize_embeddings=True,
            show_progress_bar=False,
        )
    return validar_vectores(vectores, len(textos))
