"""Pasajes de las secciones revisadas de la documentación de SIMET."""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from pathlib import Path

_RAIZ = Path(__file__).resolve().parents[3]
_CORPUS = _RAIZ / "docs/base_conocimiento/CORPUS_OPERATIVO_SIMET.md"
_MANUAL = _RAIZ / "MANUAL_USUARIO.md"
_SECCIONES_MANUAL = {
    "Navegación": ("- **",),
    "Filtros y acciones": ("- **",),
    "Temas y preferencias": ("El tema",),
    "Estados de carga, error y datos vacíos": (
        "- **Cargando:**",
        "- **Sin datos:**",
        "- **Error:**",
    ),
}


@dataclass(frozen=True)
class Pasaje:
    id: str
    documento: str
    seccion: str
    tema: str
    texto: str
    ruta: str | None = None

    @property
    def fuente(self) -> str:
        return f"{self.documento} · {self.seccion} · {self.tema}"

    @property
    def contenido(self) -> str:
        return f"{self.tema} ({self.seccion})\n{self.texto}"


def _secciones(contenido: str) -> dict[str, str]:
    partes = re.split(r"^## \d+\. ([^\n]+)\n", contenido, flags=re.MULTILINE)
    return dict(zip(partes[1::2], partes[2::2], strict=True))


def _pasaje(documento: str, seccion: str, tema: str, texto: str, ruta: str | None) -> Pasaje:
    clave = f"{documento}/{seccion}/{tema}".encode()
    return Pasaje(hashlib.sha256(clave).hexdigest()[:16], documento, seccion, tema, texto, ruta)


def cargar_corpus() -> tuple[list[Pasaje], str]:
    corpus, manual = _CORPUS.read_bytes(), _MANUAL.read_bytes()
    huella = hashlib.sha256(corpus + b"\0" + manual).hexdigest()
    seccion = "Reglas de rutas"
    rutas_md = _secciones(corpus.decode("utf-8"))[seccion]
    pasajes: list[Pasaje] = []
    rutas: dict[str, str] = {}
    for linea in rutas_md.splitlines():
        fila = re.fullmatch(r"\| `([\w-]+)` \| `(#/[\w-]+)` \| ([^|]+) \| ([^|]+) \|", linea)
        if not fila:
            continue
        clave, ruta, grupo, descripcion = fila.groups()
        tema = {
            "hogares": "Servicios",
            "historial-lecturas": "Historial de lecturas",
            "calendario-energetico": "Calendario",
            "analisis-energetico": "Análisis energético",
            "dashboard": "Resumen",
        }.get(clave, clave.capitalize())
        rutas[tema] = ruta
        texto = f"Pantalla {tema} (menú {grupo.strip()}): {descripcion.strip()}."
        pasajes.append(_pasaje("Corpus operativo SIMET", seccion, tema, texto, ruta))
    if not rutas:
        raise ValueError("No se encontró la tabla de pantallas del corpus operativo.")

    secciones = _secciones(manual.decode("utf-8"))
    for seccion, prefijos in _SECCIONES_MANUAL.items():
        bloques = re.split(r"\n\s*\n|\n(?=- \*\*)", secciones[seccion].strip())
        for prefijo in prefijos:
            seleccion = [bloque.strip() for bloque in bloques if bloque.strip().startswith(prefijo)]
            if not seleccion:
                raise ValueError(f"Falta contenido revisado en «{seccion}»: {prefijo}")
            for bloque in seleccion:
                elemento = re.fullmatch(r"- \*\*([^*]+):\*\*\s*(.+)", bloque, flags=re.DOTALL)
                tema, texto = elemento.groups() if elemento else (prefijo, bloque)
                if len(texto) > 1800:
                    raise ValueError(f"Divida el pasaje «{tema}» antes de indexarlo.")
                pasajes.append(_pasaje("Manual de usuario", seccion, tema, texto, rutas.get(tema)))

    if len({pasaje.id for pasaje in pasajes}) != len(pasajes):
        raise ValueError("Hay pasajes duplicados en la documentación seleccionada.")
    return pasajes, huella
