"""Extracción determinista de periodos en preguntas de SIMET.

No consulta la base. El año por defecto y la última fecha observada son los del
juego de datos documentado en el corpus operativo, enero a marzo de 2026.
"""

from __future__ import annotations

import re
from datetime import date, timedelta
from typing import Any

_ANIO_CORPUS = 2026
_FIN_CORPUS = date(2026, 3, 31)

_MESES: dict[str, int] = {
    "enero": 1,
    "febrero": 2,
    "marzo": 3,
    "abril": 4,
    "mayo": 5,
    "junio": 6,
    "julio": 7,
    "agosto": 8,
    "septiembre": 9,
    "octubre": 10,
    "noviembre": 11,
    "diciembre": 12,
}

_DIAS_POR_PALABRA = {"siete": 7, "quince": 15, "treinta": 30}

_PATRON_MES = re.compile(
    r"\b(" + "|".join(_MESES) + r")\b",
    re.IGNORECASE,
)
_PATRON_ANIO = re.compile(r"\b(20\d{2})\b")
_PATRON_RELATIVO = re.compile(r"\b(?:ultimos|últimos)\b", re.IGNORECASE)
_PATRON_DIAS = re.compile(
    r"\b(?:(\d{1,2})|(" + "|".join(_DIAS_POR_PALABRA) + r"))\s+d[ií]as?\b",
    re.IGNORECASE,
)


def _mes_siguiente(anio: int, mes: int) -> date:
    return date(anio + 1, 1, 1) if mes == 12 else date(anio, mes + 1, 1)


def _quitar_meses(original: str, coincidencias: list[re.Match[str]]) -> str:
    """Elimina cada mes y una preposición contigua sin tocar nombres de zona."""
    partes: list[str] = []
    cursor = 0
    for coincidencia in coincidencias:
        partes.append(original[cursor : coincidencia.start()])
        cursor = coincidencia.end()
        sufijo = original[cursor:]
        preposicion = re.match(r"\s+(?:de|del|a|al|hasta|y)\b", sufijo, re.IGNORECASE)
        if preposicion:
            cursor += preposicion.end()
    partes.append(original[cursor:])
    return " ".join(" ".join(partes).split())


def extraer_periodo(texto: str) -> tuple[dict[str, Any] | None, str]:
    """Devuelve ``(periodo, texto_sin_periodo)``.

    Un mes suelto produce un rango mensual. Varios meses unidos por «a», «al»,
    «hasta» o «-» producen un rango continuo; unidos por «y» se marcan como
    ambiguos para que el planificador pida aclaración. Un año solo acota al
    corpus verificado. «Últimos N días» se ancla en la última fecha observada.
    """
    original = str(texto or "")
    coincidencias = list(_PATRON_MES.finditer(original))
    anio_encontrado = _PATRON_ANIO.search(original)
    anio = int(anio_encontrado.group(1)) if anio_encontrado else _ANIO_CORPUS

    if len(coincidencias) > 1:
        nombres = [coincidencia.group(1).lower() for coincidencia in coincidencias]
        meses = [_MESES[nombre] for nombre in nombres]
        entre = original[coincidencias[0].end() : coincidencias[-1].start()].lower()
        restante = _quitar_meses(original, coincidencias)
        if not re.search(r"\b(?:a|al|hasta)\b|-", entre):
            return (
                {
                    "ambiguo": True,
                    "meses": nombres,
                    "etiqueta": " y ".join(nombre.capitalize() for nombre in nombres),
                },
                restante,
            )
        desde = date(anio, meses[0], 1)
        hasta = _mes_siguiente(anio, meses[-1])
        return (
            {
                "desde": desde.isoformat(),
                "hasta": hasta.isoformat(),
                "etiqueta": f"{nombres[0].capitalize()}–{nombres[-1].capitalize()} {anio}",
                "mes": nombres[0],
                "anio": anio,
            },
            restante,
        )

    if coincidencias:
        coincidencia = coincidencias[0]
        nombre = coincidencia.group(1).lower()
        mes = _MESES[nombre]
        desde = date(anio, mes, 1)
        hasta = _mes_siguiente(anio, mes)
        return (
            {
                "desde": desde.isoformat(),
                "hasta": hasta.isoformat(),
                "etiqueta": f"{nombre.capitalize()} {anio}",
                "mes": nombre,
                "anio": anio,
            },
            _quitar_meses(original, [coincidencia]),
        )

    if _PATRON_RELATIVO.search(original):
        dias_coincidencia = _PATRON_DIAS.search(original)
        if dias_coincidencia:
            if dias_coincidencia.group(1):
                dias = int(dias_coincidencia.group(1))
            else:
                dias = _DIAS_POR_PALABRA[dias_coincidencia.group(2).lower()]
            if dias in _DIAS_POR_PALABRA.values():
                desde = _FIN_CORPUS - timedelta(days=dias - 1)
                hasta = _FIN_CORPUS + timedelta(days=1)
                restante = _PATRON_DIAS.sub("", original, count=1)
                restante = _PATRON_RELATIVO.sub("", restante, count=1)
                return (
                    {
                        "desde": desde.isoformat(),
                        "hasta": hasta.isoformat(),
                        "etiqueta": f"Últimos {dias} días observados",
                        "dias": dias,
                        "anio": _ANIO_CORPUS,
                    },
                    " ".join(restante.split()),
                )

    if anio_encontrado:
        if anio == _ANIO_CORPUS:
            desde, hasta = date(anio, 1, 1), date(anio, 4, 1)
            etiqueta = "2026 (enero–marzo)"
        else:
            desde, hasta = date(anio, 1, 1), date(anio + 1, 1, 1)
            etiqueta = str(anio)
        restante = _PATRON_ANIO.sub("", original, count=1)
        return (
            {
                "desde": desde.isoformat(),
                "hasta": hasta.isoformat(),
                "etiqueta": etiqueta,
                "anio": anio,
                "anio_solo": True,
            },
            " ".join(restante.split()),
        )

    return None, original
