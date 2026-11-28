"""Motor de fórmulas energéticas y estadísticas del agente analítico.

Python puro: ``math``, ``statistics`` y ``ast``. No ejecuta SQL y no usa
``eval``. El LLM solo conoce los nombres y esquemas expuestos en
``HERRAMIENTA_FORMULAS``; la ejecución ocurre en este módulo.
"""

from __future__ import annotations

import ast
import math
from datetime import date, timedelta
from statistics import mean, stdev
from typing import Any, Callable

from .parametros import validar

DIAS_PERMITIDOS = (7, 15, 30)
LONGITUD_MAX_EXPRESION = 200
MAX_NODOS_AST = 100
BASE_MAX_POTENCIA = 1_000_000


def _numero(valor: Any) -> float | None:
    if isinstance(valor, bool) or valor is None:
        return None
    try:
        numero = float(valor)
    except (TypeError, ValueError):
        return None
    return numero if math.isfinite(numero) else None


def _redondear(valor: float, decimales: int = 4) -> float:
    return round(valor, decimales)


def _serie_diaria(datos: Any) -> list[dict[str, Any]]:
    if isinstance(datos, dict):
        serie = datos.get("diaria") or datos.get("datos") or []
    else:
        serie = datos or []
    if not isinstance(serie, list):
        return []
    filas = [fila for fila in serie if isinstance(fila, dict)]
    filas.sort(key=lambda fila: str(fila.get("fecha") or ""))
    return filas


def _valores(serie: list[dict[str, Any]], clave: str) -> list[float]:
    valores: list[float] = []
    for fila in serie:
        numero = _numero(fila.get(clave))
        if numero is not None:
            valores.append(numero)
    return valores


def _resultado(
    nombre: str,
    expresion: str,
    resultado: Any,
    interpretacion: str,
    metodo: str,
    grafica: dict[str, Any] | None = None,
) -> dict[str, Any]:
    respuesta: dict[str, Any] = {
        "nombre": nombre,
        "expresion": expresion,
        "resultado": resultado,
        "interpretacion": interpretacion,
        "metodo": metodo,
    }
    if grafica is not None:
        respuesta["grafica"] = grafica
    return respuesta


def factor_carga(datos: Any, **_: Any) -> dict[str, Any]:
    """FC = demanda media / demanda máxima."""
    serie = _serie_diaria(datos)
    medias = _valores(serie, "consumo_promedio_kwh")
    maximas = _valores(serie, "demanda_maxima_kwh")
    if not medias or not maximas:
        return _resultado(
            "factor_carga",
            "FC = demanda media / demanda máxima",
            {"disponible": False},
            "No hay serie con consumo promedio y demanda máxima para calcular el factor de carga.",
            "sin evidencia suficiente",
        )

    demanda_media = mean(medias)
    demanda_maxima = max(maximas)
    if demanda_maxima <= 0:
        return _resultado(
            "factor_carga",
            "FC = demanda media / demanda máxima",
            {"disponible": False},
            "La demanda máxima observada es cero; el factor no es calculable.",
            "sin evidencia suficiente",
        )

    fc = demanda_media / demanda_maxima
    if fc >= 0.7:
        interpretacion = (
            "Uso sostenido alto de la capacidad: la demanda media se acerca a la demanda máxima."
        )
    elif fc >= 0.4:
        interpretacion = "Uso moderado de la capacidad, con margen operativo intermedio."
    else:
        interpretacion = "Uso bajo de la capacidad: hay margen frente al pico de demanda."

    return _resultado(
        "factor_carga",
        "FC = demanda media / demanda máxima",
        {
            "disponible": True,
            "factor_carga": _redondear(fc),
            "demanda_media_kwh": _redondear(demanda_media, 2),
            "demanda_maxima_kwh": _redondear(demanda_maxima, 2),
            "dias_observados": min(len(medias), len(maximas)),
        },
        interpretacion,
        "cálculo sobre datamart.dm_kpi_diarios; estimación derivada, no dato observado directo",
    )


def proyeccion_tendencia(
    datos: Any,
    dias: int = 7,
    **_: Any,
) -> dict[str, Any]:
    """Regresión lineal simple + media móvil + banda de predicción por residuales."""
    horizonte = dias if dias in DIAS_PERMITIDOS else 7
    serie = _serie_diaria(datos)
    valores = _valores(serie, "consumo_total_kwh")[-60:]
    if len(valores) < 3:
        return _resultado(
            "proyeccion_tendencia",
            "ŷ = a + b·t; banda = ŷ ± 1.96·σ_residual·sqrt(1 + 1/n + h)",
            {"disponible": False},
            "Se requieren al menos tres días observados para proyectar.",
            "sin evidencia suficiente",
        )

    n = len(valores)
    x = list(range(n))
    x_media = mean(x)
    y_media = mean(valores)
    denominador = sum((valor - x_media) ** 2 for valor in x)
    pendiente = (
        sum((x[i] - x_media) * (valores[i] - y_media) for i in range(n)) / denominador
    )
    intercepto = y_media - pendiente * x_media

    residuos = [
        valores[i] - (intercepto + pendiente * x[i]) for i in range(n)
    ]
    suma_residuos = sum(residuo**2 for residuo in residuos)
    suma_total = sum((valor - y_media) ** 2 for valor in valores)
    r2 = 1 - suma_residuos / suma_total if suma_total else 1.0

    ventana = valores[-7:]
    media_movil = mean(ventana)
    desviacion = stdev(residuos) if n > 2 else 0.0

    fecha_texto = str(serie[-1].get("fecha") or "")
    try:
        ultima_fecha = date.fromisoformat(fecha_texto[:10])
    except ValueError:
        ultima_fecha = None
    filas: list[dict[str, Any]] = []
    for indice in range(1, horizonte + 1):
        tendencia = intercepto + pendiente * (n + indice - 1)
        proyectado = max(0.0, tendencia)
        margen = 1.96 * desviacion * math.sqrt(1 + 1 / n + indice)
        filas.append(
            {
                "fecha": (ultima_fecha + timedelta(days=indice)).isoformat()
                if ultima_fecha
                else f"estimado+{indice}",
                "dia_proyectado": indice,
                "consumo_proyectado_kwh": _redondear(proyectado, 2),
                "limite_inferior_kwh": _redondear(max(0.0, proyectado - margen), 2),
                "limite_superior_kwh": _redondear(proyectado + margen, 2),
            }
        )

    return _resultado(
        "proyeccion_tendencia",
        "ŷ = a + b·t; banda = ŷ ± 1.96·σ_residual·sqrt(1 + 1/n + h); media móvil = media(últimos 7 días)",
        {
            "disponible": True,
            "pendiente_kwh_dia": _redondear(pendiente, 4),
            "r2": _redondear(r2, 4),
            "media_movil_7_dias_kwh": _redondear(media_movil, 2),
            "desviacion_residual_kwh": _redondear(desviacion, 2),
            "dias_observados": n,
            "proyeccion": filas,
        },
        (
            "Estimación, no dato observado. La banda usa la desviación de los residuales "
            "de la regresión y crece con el horizonte; es una banda de predicción, no un "
            "intervalo de confianza para la media."
        ),
        "estimación estadística sobre datamart.dm_kpi_diarios",
        {
            "tipo": "linea",
            "titulo": f"Estimación de consumo a {horizonte} días",
            "eje_x": "dia_proyectado",
            "series": [
                {"clave": "consumo_proyectado_kwh", "etiqueta": "Estimado (kWh)"},
                {"clave": "limite_inferior_kwh", "etiqueta": "Límite inferior"},
                {"clave": "limite_superior_kwh", "etiqueta": "Límite superior"},
            ],
            "datos": filas,
        },
    )


def riesgo_dac(datos: Any, **_: Any) -> dict[str, Any]:
    """Riesgo DAC por tipo de servicio y tarifa, sin atribución por RPU."""
    if isinstance(datos, list):
        filas = datos
    elif isinstance(datos, dict):
        # La herramienta verificada entrega `servicios`, no `datos`.
        filas = datos.get("servicios") or datos.get("datos") or []
    else:
        filas = []
    evaluados: list[dict[str, Any]] = []

    def evaluar(fila: dict[str, Any], tarifa: dict[str, Any]) -> None:
        consumo_mensual = _numero(fila.get("consumo_mensual_promedio_kwh"))
        if consumo_mensual is None:
            consumo_total = _numero(fila.get("consumo_real_kwh"))
            cantidad = _numero(fila.get("num_servicios"))
            meses = _numero(fila.get("meses")) or 3
            if consumo_total is None or not cantidad or meses <= 0:
                return
            consumo_mensual = consumo_total / cantidad / meses
        limite = _numero(tarifa.get("limite_dac_kwh_mes"))
        if not limite:
            return
        razon = consumo_mensual / limite
        evaluados.append(
            {
                "tipo_servicio": fila.get("tipo_servicio"),
                "categoria": tarifa.get("categoria"),
                "codigo_tarifa": tarifa.get("codigo_tarifa"),
                "servicios_del_tipo": fila.get("num_servicios"),
                "limite_dac_kwh_mes": _redondear(limite, 2),
                "consumo_mensual_promedio_kwh": _redondear(consumo_mensual, 2),
                "razon_limite": _redondear(razon, 4),
                "estatus": (
                    "supera" if razon >= 1 else "cerca" if razon >= 0.8 else "normal"
                ),
            }
        )

    for fila in filas:
        if not isinstance(fila, dict):
            continue
        tarifas = fila.get("tarifas")
        if isinstance(tarifas, list) and tarifas:
            for tarifa in tarifas:
                if isinstance(tarifa, dict):
                    evaluar(fila, tarifa)
        else:
            evaluar(fila, fila)

    evaluados.sort(key=lambda fila: fila["razon_limite"], reverse=True)
    return _resultado(
        "riesgo_dac",
        "promedio mensual del tipo = total / servicios del tipo / meses; razón = promedio / límite DAC",
        {
            "disponible": bool(evaluados),
            "evaluados": evaluados,
            "umbrales_declarados_kwh_mes": [250, 850],
        },
        (
            "Compara el promedio del tipo de servicio contra cada límite tarifario. "
            "No atribuye consumo a una tarifa individual ni a un RPU: "
            "datamart.dm_consumo_por_servicio solo expone consumo por tipo de servicio."
        ),
        "promedio derivado de datamart.dm_consumo_por_servicio, energia.servicio y energia.tarifa",
        {
            "tipo": "barras",
            "titulo": "Razón de consumo mensual frente al límite DAC",
            "eje_x": "tipo_servicio",
            "series": [{"clave": "razon_limite", "etiqueta": "Consumo / límite DAC"}],
            "datos": evaluados,
        }
        if evaluados
        else None,
    )


def indice_perdidas_y_anomalias(datos: Any, **_: Any) -> dict[str, Any]:
    """Desviación porcentual y densidad de eventos de anomalía por zona."""
    if isinstance(datos, list):
        filas = datos
    elif isinstance(datos, dict) and isinstance(datos.get("zonas"), list):
        filas = datos["zonas"]
    else:
        filas = []
    consumo = sum(
        _numero(fila.get("consumo_total_kwh"))
        or _numero(fila.get("consumo_real_kwh"))
        or 0
        for fila in filas
        if isinstance(fila, dict)
    )
    desviados = sum(
        _numero(fila.get("kwh_desviados")) or 0
        for fila in filas
        if isinstance(fila, dict)
    )
    eventos = sum(
        _numero(fila.get("num_eventos")) or 0
        for fila in filas
        if isinstance(fila, dict)
    )
    zonas = len(
        {
            str(fila.get("zona"))
            for fila in filas
            if isinstance(fila, dict) and fila.get("zona")
        }
    )
    porcentaje = 100 * desviados / consumo if consumo else 0.0
    densidad = eventos / zonas if zonas else 0.0
    return _resultado(
        "indice_perdidas_y_anomalias",
        "desviación % = (kWh desviados / consumo total) × 100; densidad = eventos / zonas",
        {
            "disponible": bool(filas),
            "consumo_total_kwh": _redondear(consumo, 2),
            "kwh_desviados": _redondear(desviados, 2),
            "desviacion_pct": _redondear(porcentaje, 4),
            "eventos": int(eventos),
            "zonas": zonas,
            "eventos_por_zona": _redondear(densidad, 4),
        },
        (
            "Magnitud de la desviación y densidad de eventos de anomalía por zona. "
            "Los eventos provienen de datamart.dm_anomalias_zona; no son alertas de energia.alerta."
        ),
        "cálculo sobre datamart.dm_consumo_zona_mensual y datamart.dm_anomalias_zona",
    )


def evaluar_expresion_segura(
    expresion: str,
    variables: dict[str, Any] | None = None,
    **_: Any,
) -> dict[str, Any]:
    """Evalúa aritmética con AST acotado; sin eval, llamadas ni atributos."""
    permitidos_bin = (ast.Add, ast.Sub, ast.Mult, ast.Div, ast.FloorDiv, ast.Mod, ast.Pow)
    permitidos_un = (ast.UAdd, ast.USub)
    texto = str(expresion)[:LONGITUD_MAX_EXPRESION]

    try:
        if not isinstance(expresion, str):
            raise ValueError("expresión no válida")
        texto = expresion.strip()
        if not texto or len(texto) > LONGITUD_MAX_EXPRESION:
            raise ValueError("expresión vacía o demasiado larga")
        if not isinstance(variables, dict):
            raise ValueError("variables no válidas")
        contexto = {
            clave: numero
            for clave, valor in variables.items()
            if (numero := _numero(valor)) is not None
        }
        if len(contexto) > 20:
            raise ValueError("demasiadas variables")

        def visitar(nodo: ast.AST) -> float:
            if isinstance(nodo, ast.Expression):
                return visitar(nodo.body)
            if isinstance(nodo, ast.Constant) and isinstance(nodo.value, (int, float)):
                if isinstance(nodo.value, bool):
                    raise ValueError("booleanos no permitidos")
                return float(nodo.value)
            if isinstance(nodo, ast.Name):
                if nodo.id not in contexto:
                    raise ValueError(f"variable no verificada: {nodo.id}")
                return contexto[nodo.id]
            if isinstance(nodo, ast.BinOp) and isinstance(nodo.op, permitidos_bin):
                izquierda = visitar(nodo.left)
                derecha = visitar(nodo.right)
                if isinstance(nodo.op, ast.Pow):
                    if abs(derecha) > 10 or abs(izquierda) > BASE_MAX_POTENCIA:
                        raise ValueError("operandos de potencia fuera de rango")
                    return izquierda**derecha
                if isinstance(nodo.op, (ast.Div, ast.FloorDiv, ast.Mod)) and derecha == 0:
                    raise ValueError("división por cero")
                if isinstance(nodo.op, ast.Add):
                    return izquierda + derecha
                if isinstance(nodo.op, ast.Sub):
                    return izquierda - derecha
                if isinstance(nodo.op, ast.Mult):
                    return izquierda * derecha
                if isinstance(nodo.op, ast.Div):
                    return izquierda / derecha
                if isinstance(nodo.op, ast.FloorDiv):
                    return izquierda // derecha
                return izquierda % derecha
            if isinstance(nodo, ast.UnaryOp) and isinstance(nodo.op, permitidos_un):
                valor = visitar(nodo.operand)
                return valor if isinstance(nodo.op, ast.UAdd) else -valor
            raise ValueError("expresión no permitida")

        arbol = ast.parse(texto, mode="eval")
        if sum(1 for _ in ast.walk(arbol)) > MAX_NODOS_AST:
            raise ValueError("expresión demasiado compleja")
        valor = visitar(arbol)
        if not math.isfinite(valor):
            raise ValueError("resultado no finito")
    except (
        SyntaxError,
        ValueError,
        TypeError,
        ZeroDivisionError,
        OverflowError,
        RecursionError,
        MemoryError,
    ) as error:
        return _resultado(
            "evaluar_expresion_segura",
            texto,
            {"disponible": False},
            f"La fórmula no se pudo calcular de forma segura: {error}.",
            "parser AST acotado con lista blanca de operadores",
        )

    return _resultado(
        "evaluar_expresion_segura",
        texto,
        {"disponible": True, "resultado": _redondear(valor, 4)},
        "Resultado calculado solo con variables verificadas del payload.",
        "parser AST acotado con lista blanca de operadores; sin eval",
    )


FORMULAS: dict[str, Callable[..., dict[str, Any]]] = {
    "factor_carga": factor_carga,
    "proyeccion_tendencia": proyeccion_tendencia,
    "riesgo_dac": riesgo_dac,
    "indice_perdidas_y_anomalias": indice_perdidas_y_anomalias,
    "evaluar_expresion_segura": evaluar_expresion_segura,
}

HERRAMIENTA_FORMULAS = {
    "nombre": "calcular_formula",
    "descripcion": (
        "Ejecuta una fórmula energética o estadística verificada. "
        "Para usar datos de otra herramienta, pasa datos_desde con el id de esa herramienta."
    ),
    "parametros": {
        "type": "object",
        "properties": {
            "nombre": {
                "type": "string",
                "enum": list(FORMULAS),
                "description": "Nombre de la fórmula a ejecutar.",
            },
            "datos_desde": {
                "type": "string",
                "description": "Id del resultado previo cuyos datos se usarán.",
            },
            "expresion": {
                "type": "string",
                "maxLength": LONGITUD_MAX_EXPRESION,
                "description": "Solo para evaluar_expresion_segura.",
            },
            "variables": {
                "type": "object",
                "description": "Variables numéricas verificadas para la expresión.",
                "additionalProperties": {"type": "number"},
            },
            "dias": {
                "type": "integer",
                "enum": list(DIAS_PERMITIDOS),
                "description": "Horizonte de proyección en días.",
            },
        },
        "required": ["nombre"],
        "additionalProperties": False,
    },
}


def calcular_formula(
    nombre: str,
    datos: Any = None,
    parametros: dict[str, Any] | None = None,
) -> dict[str, Any]:
    funcion = FORMULAS.get(nombre)
    if funcion is None:
        return _resultado(
            "calcular_formula",
            "",
            {"disponible": False},
            f"La fórmula '{nombre}' no forma parte del motor verificado de SIMET.",
            "sin evidencia suficiente",
        )
    args = validar(parametros or {}, HERRAMIENTA_FORMULAS["parametros"])
    if nombre == "evaluar_expresion_segura":
        return funcion(args.get("expresion", ""), args.get("variables") or {})
    if datos is not None:
        args["datos"] = datos
    return funcion(**args)
