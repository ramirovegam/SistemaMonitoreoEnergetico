"""Validación mínima de esquemas JSON para parámetros de herramientas.

No incorpora dependencias nuevas: cubre el subconjunto de JSON Schema usado
por las herramientas de SIMET (``type``, ``enum``, ``minimum``, ``maximum``,
``maxLength`` y ``additionalProperties``). La validación ocurre en la frontera
de ejecución, antes de que un parámetro llegue a SQL o al parser de fórmulas.
"""

from __future__ import annotations

import math
from typing import Any

_LONGITUD_MAXIMA = 200
_MAX_VARIABLES = 20


def _convertir(valor: Any, propiedad: dict[str, Any]) -> Any:
    if valor is None:
        return None
    tipo = propiedad.get("type")

    if tipo == "string":
        if not isinstance(valor, str):
            valor = str(valor)
        limite = int(propiedad.get("maxLength", _LONGITUD_MAXIMA))
        if len(valor) > limite:
            raise ValueError("parámetro de texto demasiado largo")
        enum = propiedad.get("enum")
        if enum:
            coincidencia = next(
                (opcion for opcion in enum if str(opcion).lower() == valor.lower()),
                None,
            )
            if coincidencia is None:
                raise ValueError("valor fuera de la lista permitida")
            return coincidencia
        return valor

    if tipo in {"integer", "number"}:
        if isinstance(valor, bool):
            raise ValueError("booleano no permitido como número")
        try:
            numero = int(valor) if tipo == "integer" else float(valor)
        except (TypeError, ValueError, OverflowError) as error:
            raise ValueError("valor numérico no válido") from error
        if not math.isfinite(float(numero)):
            raise ValueError("valor numérico no finito")
        enum = propiedad.get("enum")
        if enum and numero not in enum:
            raise ValueError("valor fuera de la lista permitida")
        minimo = propiedad.get("minimum")
        maximo = propiedad.get("maximum")
        if minimo is not None and numero < minimo:
            raise ValueError("valor por debajo del mínimo")
        if maximo is not None and numero > maximo:
            raise ValueError("valor por encima del máximo")
        return numero

    if tipo == "boolean":
        if isinstance(valor, bool):
            return valor
        if isinstance(valor, str) and valor.strip().lower() in {"true", "false"}:
            return valor.strip().lower() == "true"
        raise ValueError("valor booleano no válido")

    if tipo == "object":
        if not isinstance(valor, dict):
            raise ValueError("se esperaba un objeto")
        adicional = propiedad.get("additionalProperties")
        if isinstance(adicional, dict):
            if len(valor) > _MAX_VARIABLES:
                raise ValueError("demasiadas propiedades en el objeto")
            return {
                str(clave): _convertir(item, adicional)
                for clave, item in valor.items()
            }
        return valor

    raise ValueError("tipo de parámetro no soportado")


def validar(
    parametros: dict[str, Any] | None,
    esquema: dict[str, Any],
) -> dict[str, Any]:
    """Filtra y valida parámetros contra un esquema declarado."""
    if parametros is None:
        return {}
    if not isinstance(parametros, dict):
        raise ValueError("los parámetros deben ser un objeto")

    propiedades: dict[str, Any] = esquema.get("properties") or {}
    desconocidos = set(parametros) - set(propiedades)
    if desconocidos and esquema.get("additionalProperties") is False:
        raise ValueError("parámetro no declarado para esta herramienta")

    resultado: dict[str, Any] = {}
    for clave, item in parametros.items():
        propiedad = propiedades.get(clave)
        if propiedad is None:
            continue
        resultado[clave] = _convertir(item, propiedad)
    return resultado
