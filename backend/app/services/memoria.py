"""Memoria local de preferencias declaradas de estilo.

No es un modelo de lenguaje ni un perfil de usuario: guarda únicamente
preferencias explícitas, con claves enumeradas, caducidad y auditoría. Nunca
modifica el plan, las herramientas, las cifras ni las citas.
"""

from __future__ import annotations

import hashlib
import os
from contextlib import contextmanager
import re
import sqlite3
import threading
import time
import unicodedata
from pathlib import Path
from typing import Any

_DEFAULT_DB = Path(__file__).resolve().parents[1] / ".memoria" / "preferencias.sqlite3"
_RUTA = Path(os.getenv("SIMET_MEMORIA_DB") or _DEFAULT_DB)
_TTL = int(os.getenv("SIMET_MEMORIA_TTL_SECONDS", str(30 * 24 * 3600)))
_BLOQUEO = threading.RLock()

CLAVES: dict[str, frozenset[str]] = {
    "detalle": frozenset({"breve", "detallado"}),
    "formato": frozenset({"prosa", "tabla"}),
}

_DECLARACIONES = (
    (r"olvida|olvidar|borra mi preferencia|no recuerdes", None, "olvido"),
    (
        r"prefiero|me gusta|quiero que|siempre|de ahora en adelante|recuerda|aprende",
        None,
        "marca",
    ),
)


def _normalizar(texto: str) -> str:
    sin_tildes = "".join(
        letra
        for letra in unicodedata.normalize("NFD", str(texto or "").lower())
        if unicodedata.category(letra) != "Mn"
    )
    return " ".join(sin_tildes.replace("¿", " ").replace("?", " ").split())


def _hash(texto: str) -> str:
    return hashlib.sha256(str(texto or "").encode("utf-8")).hexdigest()[:16]


def _conexion() -> sqlite3.Connection:
    _RUTA.parent.mkdir(parents=True, exist_ok=True)
    conexion = sqlite3.connect(_RUTA, timeout=5)
    conexion.execute(
        """
        CREATE TABLE IF NOT EXISTS preferencias (
            clave TEXT PRIMARY KEY,
            valor TEXT NOT NULL,
            actualizado INTEGER NOT NULL,
            expira INTEGER NOT NULL,
            hash_origen TEXT NOT NULL
        )
        """
    )
    conexion.execute(
        """
        CREATE TABLE IF NOT EXISTS auditoria (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ts INTEGER NOT NULL,
            accion TEXT NOT NULL,
            clave TEXT NOT NULL,
            valor TEXT NOT NULL,
            hash_origen TEXT NOT NULL
        )
        """
    )
    return conexion


@contextmanager
def _transaccion():
    conexion = _conexion()
    try:
        with conexion:
            yield conexion
    finally:
        conexion.close()


def _validar(clave: str, valor: str) -> tuple[str, str]:
    clave_limpia = str(clave or "").strip().lower()
    valor_limpio = str(valor or "").strip().lower()
    if clave_limpia not in CLAVES or valor_limpio not in CLAVES[clave_limpia]:
        raise ValueError("preferencia no reconocida")
    return clave_limpia, valor_limpio


def leer() -> dict[str, str]:
    """Devuelve solo preferencias vigentes."""
    ahora = int(time.time())
    with _BLOQUEO, _transaccion() as conexion:
        filas = conexion.execute(
            "SELECT clave, valor FROM preferencias WHERE expira > ? ORDER BY clave",
            (ahora,),
        ).fetchall()
    return {str(clave): str(valor) for clave, valor in filas}


def registrar(clave: str, valor: str, texto_origen: str = "") -> dict[str, str]:
    """Registra o actualiza una preferencia declarada."""
    clave_limpia, valor_limpio = _validar(clave, valor)
    ahora = int(time.time())
    origen = _hash(texto_origen)
    with _BLOQUEO, _transaccion() as conexion:
        conexion.execute(
            """
            INSERT INTO preferencias (clave, valor, actualizado, expira, hash_origen)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(clave) DO UPDATE SET
                valor = excluded.valor,
                actualizado = excluded.actualizado,
                expira = excluded.expira,
                hash_origen = excluded.hash_origen
            """,
            (clave_limpia, valor_limpio, ahora, ahora + _TTL, origen),
        )
        conexion.execute(
            "INSERT INTO auditoria (ts, accion, clave, valor, hash_origen) VALUES (?, ?, ?, ?, ?)",
            (ahora, "registrar", clave_limpia, valor_limpio, origen),
        )
    return leer()


def olvidar(clave: str | None = None) -> dict[str, str]:
    """Olvídalo todo o una clave enumerada. Conserva el rastro en auditoría."""
    ahora = int(time.time())
    clave_limpia = str(clave or "").strip().lower()
    if clave_limpia and clave_limpia not in CLAVES:
        raise ValueError("preferencia no reconocida")
    with _BLOQUEO, _transaccion() as conexion:
        if clave_limpia:
            conexion.execute("DELETE FROM preferencias WHERE clave = ?", (clave_limpia,))
        else:
            conexion.execute("DELETE FROM preferencias")
        conexion.execute(
            "INSERT INTO auditoria (ts, accion, clave, valor, hash_origen) VALUES (?, ?, ?, ?, ?)",
            (ahora, "olvidar", clave_limpia or "todas", "", _hash(str(clave_limpia))),
        )
    return leer()


def detectar_declaracion(texto: str) -> dict[str, Any] | None:
    """Reconoce preferencias explícitas; no infiere nada de preguntas normales."""
    normalizado = _normalizar(texto)
    if not normalizado:
        return None

    if re.search(_DECLARACIONES[0][0], normalizado):
        if re.search(r"\bformato\b|\btabla\b|\bprosa\b", normalizado):
            return {"accion": "olvidar", "clave": "formato"}
        if re.search(r"\bdetalle\b|\bbreve\b|\blarga\b", normalizado):
            return {"accion": "olvidar", "clave": "detalle"}
        return {"accion": "olvidar", "clave": None}

    if not re.search(_DECLARACIONES[1][0], normalizado):
        return None

    if re.search(r"sin tablas|en prosa|como texto|no me pongas tablas", normalizado):
        return {"accion": "registrar", "clave": "formato", "valor": "prosa"}
    if re.search(r"tablas|en tabla|formato tabla", normalizado):
        return {"accion": "registrar", "clave": "formato", "valor": "tabla"}

    if re.search(
        r"breve|corto|corta|solo lo esencial|menos detalle|no tan larg", normalizado
    ):
        return {"accion": "registrar", "clave": "detalle", "valor": "breve"}
    if re.search(r"detallad|mas detalle|mas explicacion|explicate mas", normalizado):
        return {"accion": "registrar", "clave": "detalle", "valor": "detallado"}
    return None


def confirmar(declaracion: dict[str, Any]) -> str:
    """Texto corto para confirmar la acción sin exponer la base interna."""
    if declaracion.get("accion") == "olvidar":
        clave = declaracion.get("clave")
        return (
            f"He olvidado la preferencia de {clave}."
            if clave
            else "He olvidado tus preferencias de estilo."
        )
    clave = str(declaracion.get("clave") or "")
    valor = str(declaracion.get("valor") or "")
    return f"Preferencia registrada: {clave}={valor}. La aplicaré al redactar."


def aplicar(texto: str, estilo: dict[str, str] | None = None) -> str:
    """Aplica estilo vigente sin afectar el contenido verificado."""
    from .render import aplicar_estilo

    return aplicar_estilo(texto, estilo if estilo is not None else leer())
