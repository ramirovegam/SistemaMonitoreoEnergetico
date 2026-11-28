"""Renderizador determinista de respuestas verificadas de SIMET.

Convierte el resultado de las herramientas en prosa acotada. No llama a un LLM,
no inventa cifras y nunca recorta una línea a mitad de fórmula o de cita.
"""

from __future__ import annotations

import re
from typing import Any

from ..graphrag.normalizacion import normalizar as _normalizar

LIMITE = 800
AVISO_ESTIMACION = "Estimación derivada; SIMET no almacena pronósticos oficiales."
SIN_ALERTAS_ABIERTAS = (
    "No hay alertas abiertas con ts_cierre IS NULL en el periodo verificado."
)

_FUENTES_CONOCIDAS = (
    "RAE_Definiciones.pdf (DLE, consulta 26-nov-2026)",
    "Base de Conocimiento SIMET",
    "CFE_Suministro.pdf",
    "reloj local del servidor SIMET",
)
_MAX_FILAS_ZONAS = 3
_MAX_FILAS_SQL = 3
_MAX_FUENTES = 5


def _numero(valor: Any, decimales: int = 0) -> str:
    if isinstance(valor, bool):
        return str(valor)
    if isinstance(valor, (int, float)):
        return f"{valor:,.{decimales}f}"
    return str(valor or "sin dato")


def _pares(datos: Any, maximo: int = 6) -> list[tuple[str, Any]]:
    if isinstance(datos, dict):
        return [
            (clave, valor)
            for clave, valor in datos.items()
            if not isinstance(valor, (list, dict)) and valor is not None
        ][:maximo]
    if isinstance(datos, list) and datos and isinstance(datos[0], dict):
        return [
            (clave, valor)
            for clave, valor in datos[0].items()
            if not isinstance(valor, (list, dict)) and valor is not None
        ][:maximo]
    return []


_ETIQUETAS: dict[str, str] = {
    "disponible": "disponibilidad",
    "pendiente_kwh_dia": "Tendencia",
    "r2": "R²",
    "media_movil_7_dias_kwh": "Media móvil de 7 días",
    "desviacion_residual_kwh": "σ residual",
    "dias_observados": "Días observados",
    "total_filas": "Filas",
    "limite": "Límite",
    "total_medidores": "Medidores",
    "total_lecturas": "Lecturas",
    "total_servicios": "Servicios",
    "total_zonas": "Zonas",
}


def _etiqueta(clave: str) -> str:
    return _ETIQUETAS.get(clave, str(clave).replace("_", " "))


def _filas_de_sql(datos: Any) -> Any:
    if isinstance(datos, dict) and "filas" in datos:
        return datos.get("filas")
    return datos


def _es_conteo_medidores(pregunta: str) -> bool:
    texto = _normalizar(pregunta)
    return bool(
        re.search(r"\bmedidor(?:es)?\b", texto)
        and re.search(r"cuant|numero|total", texto)
    )


def _lineas_resultado(resultado: dict[str, Any], pregunta: str = "") -> list[str]:
    nombre = str(resultado.get("herramienta") or "herramienta")
    datos = resultado.get("datos")
    lineas: list[str] = []

    if nombre == "ejecutar_sql_lectura" and _es_conteo_medidores(pregunta):
        pares = _pares(_filas_de_sql(datos))
        total = next(
            (valor for clave, valor in pares if "medidor" in str(clave).lower()),
            None,
        )
        if total is not None:
            return [f"- **Total de medidores**: {_numero(total)}."]

    if nombre == "ejecutar_sql_lectura":
        filas = _filas_de_sql(datos)
        filas = filas if isinstance(filas, list) else []
        total = datos.get("total_filas") if isinstance(datos, dict) else None
        registros = _numero(total if total is not None else len(filas))
        lineas_sql = [f"- **Consulta de solo lectura**: {registros} registro(s)."]
        for fila in filas[:_MAX_FILAS_SQL]:
            if not isinstance(fila, dict):
                continue
            pares = _pares(fila, maximo=4)
            lineas_sql.append(
                "  - " + "; ".join(
                    f"{_etiqueta(clave)}: {_numero(valor)}" for clave, valor in pares
                )
            )
        return lineas_sql

    if nombre == "obtener_resumen_sistema" and isinstance(datos, dict):
        if _es_conteo_medidores(pregunta):
            return [f"- **Total de medidores**: {_numero(datos.get('total_medidores'))}."]
        claves = (
            ("total_lecturas", "Lecturas"),
            ("total_servicios", "Servicios"),
            ("total_medidores", "Total de medidores"),
            ("total_zonas", "Zonas"),
            ("consumo_total_acumulado", "Consumo acumulado"),
            ("semilla", "Semilla"),
            ("fecha_desde", "Desde"),
            ("fecha_hasta", "Hasta"),
        )
        for clave, etiqueta in claves:
            valor = datos.get(clave)
            if valor is None:
                continue
            if clave == "semilla":
                texto_valor = str(valor)
            elif clave == "consumo_total_acumulado":
                texto_valor = f"{_numero(valor, 2)} kWh"
            else:
                texto_valor = _numero(valor)
            lineas.append(f"- **{etiqueta}**: {texto_valor}.")

    elif nombre == "consultar_zonas" and isinstance(datos, dict):
        filas = datos.get("zonas") or []
        if datos.get("periodo"):
            lineas.append(f"- {datos['periodo']}")
        lineas.append(f"- **Zonas consultadas**: {len(filas)} resultado(s).")
        for fila in filas[:_MAX_FILAS_ZONAS]:
            if not isinstance(fila, dict):
                continue
            lineas.append(
                f"  - `{fila.get('zona')}` ({fila.get('tipo_urbano')}): "
                f"{_numero(fila.get('num_medidores'))} medidores, "
                f"{_numero(fila.get('num_lecturas'))} lecturas, "
                f"{_numero(fila.get('num_eventos'))} eventos, "
                f"{_numero(fila.get('consumo_total_kwh'), 2)} kWh."
            )

    elif nombre == "consultar_servicios_y_tarifas" and isinstance(datos, dict):
        filas = datos.get("servicios") or []
        lineas.append(f"- **Servicios y tarifas**: {len(filas)} tipo(s).")
        for fila in filas[:3]:
            if isinstance(fila, dict):
                lineas.append(
                    f"  - `{fila.get('tipo_servicio')}`: "
                    f"{_numero(fila.get('num_servicios'))} servicios, "
                    f"{_numero(fila.get('consumo_real_kwh'), 2)} kWh."
                )

    elif nombre == "consultar_alertas_y_medidores" and isinstance(datos, dict):
        resumen = datos.get("resumen_alertas") or {}
        medidores = datos.get("medidores") or []
        if resumen.get("abiertas") == 0 and not medidores:
            return [SIN_ALERTAS_ABIERTAS]
        partes = [
            f"{_numero(resumen.get('total'))} totales",
            f"{_numero(resumen.get('abiertas'))} abiertas",
        ]
        if (
            re.search(r"\bcerradas\b", _normalizar(pregunta))
            and resumen.get("cerradas") is not None
        ):
            partes.append(f"{_numero(resumen.get('cerradas'))} cerradas")
        partes.append(
            f"{_numero(resumen.get('tasa_falsos_positivos_pct'), 2)}% falsos positivos"
        )
        lineas.append("- **Alertas**: " + ", ".join(partes) + ".")
        if medidores and isinstance(medidores[0], dict):
            lineas.append(
                f"  - Medidor `{medidores[0].get('id_medidor')}` con "
                f"{_numero(medidores[0].get('alertas_abiertas'))} alertas abiertas."
            )

    elif nombre == "obtener_serie_diaria_y_horaria" and isinstance(datos, dict):
        diaria = datos.get("diaria") or []
        lineas.append(f"- **Serie diaria**: {len(diaria)} días observados.")
        if diaria and isinstance(diaria[0], dict):
            lineas.append(
                f"  - Del {diaria[0].get('fecha')} al {diaria[-1].get('fecha')}."
            )

    elif nombre == "validar_integridad_datamart" and isinstance(datos, dict):
        pares = _pares(datos, maximo=4)
        lineas.append(
            "- **Integridad**: "
            + "; ".join(f"{clave} {_numero(valor)}" for clave, valor in pares)
            + "."
        )

    else:
        pares = _pares(datos)
        if pares:
            lineas.append(f"- **{nombre}**")
            lineas.extend(
                f"  - {_etiqueta(clave)}: {_numero(valor, 2)}"
                for clave, valor in pares
                if str(clave) != "disponible"
            )

    return lineas


def _lineas_formula(formula: dict[str, Any]) -> list[str]:
    nombre = str(formula.get("nombre") or "fórmula")
    resultado = formula.get("resultado")
    if not isinstance(resultado, dict) or resultado.get("disponible") is not True:
        return [f"- **{nombre}**: sin evidencia suficiente."]

    def cifra(valor: Any) -> str:
        if valor is None:
            return "sin dato"
        try:
            return _numero(float(valor), 2)
        except (TypeError, ValueError):
            return str(valor)

    if nombre == "riesgo_dac":
        evaluados = [
            fila
            for fila in (resultado.get("evaluados") or [])
            if isinstance(fila, dict)
        ]
        if evaluados:
            mejor = max(
                evaluados,
                key=lambda fila: float(fila.get("razon_limite") or 0),
            )
            detalle = (
                f"{len(evaluados)} tipo(s) evaluados; mayor razón "
                f"{cifra(mejor.get('razon_limite'))} en "
                f"{mejor.get('tipo_servicio')} ({mejor.get('estatus')})."
            )
        else:
            detalle = "sin tipos evaluados con límite tarifario verificable."
        lineas = [f"- **riesgo_dac**: {detalle}"]
    elif nombre == "proyeccion_tendencia":
        filas = [
            fila
            for fila in (resultado.get("proyeccion") or [])
            if isinstance(fila, dict)
        ]
        dias = int(resultado.get("dias_observados") or 0)
        lineas = [
            f"- **Proyección de consumo**: regresión lineal sobre {dias} días observados.",
            f"  - Tendencia {cifra(resultado.get('pendiente_kwh_dia'))} kWh/día; "
            f"R² {cifra(resultado.get('r2'))}. "
            f"Media móvil de 7 días {cifra(resultado.get('media_movil_7_dias_kwh'))} kWh.",
        ]
        if filas:
            primera, ultima = filas[0], filas[-1]
            lineas.append(
                "  - Día 1: "
                f"{cifra(primera.get('consumo_proyectado_kwh'))} kWh "
                f"(banda {cifra(primera.get('limite_inferior_kwh'))}–"
                f"{cifra(primera.get('limite_superior_kwh'))})."
            )
            if len(filas) > 1:
                lineas.append(
                    f"  - Día {len(filas)}: "
                    f"{cifra(ultima.get('consumo_proyectado_kwh'))} kWh "
                    f"(banda {cifra(ultima.get('limite_inferior_kwh'))}–"
                    f"{cifra(ultima.get('limite_superior_kwh'))})."
                )
        lineas.append(
            "  - La banda de predicción usa σ residual "
            f"{cifra(resultado.get('desviacion_residual_kwh'))} kWh; "
            "describe la dispersión observada, no la incertidumbre de la media."
        )
    else:
        pares = _pares(resultado, maximo=4)
        detalle = "; ".join(
            f"{_etiqueta(clave)} {cifra(valor)}"
            for clave, valor in pares
            if str(clave) != "disponible"
        )
        lineas = [f"- **{nombre}**: {detalle}."]
        if formula.get("interpretacion"):
            lineas.append(f"  - {str(formula['interpretacion']).strip()}")

    if formula.get("fuentes"):
        lineas.append("  - Fuentes: " + ", ".join(str(f) for f in formula["fuentes"]) + ".")
    return lineas


def _lineas_formula_compacta(formula: dict[str, Any]) -> list[str]:
    """Resume cada fórmula en una línea cuando hay varias en la misma respuesta."""
    nombre = str(formula.get("nombre") or "fórmula")
    resultado = formula.get("resultado")
    if not isinstance(resultado, dict) or resultado.get("disponible") is not True:
        return [f"- **{nombre}**: sin evidencia suficiente."]

    def cifra(valor: Any) -> str:
        try:
            return _numero(float(valor), 2)
        except (TypeError, ValueError):
            return "sin dato"

    if nombre == "riesgo_dac":
        evaluados = [
            fila for fila in (resultado.get("evaluados") or []) if isinstance(fila, dict)
        ]
        if evaluados:
            mejor = max(
                evaluados,
                key=lambda fila: float(fila.get("razon_limite") or 0),
            )
            detalle = (
                f"{len(evaluados)} tipo(s); mayor razón "
                f"{cifra(mejor.get('razon_limite'))} en {mejor.get('tipo_servicio')}"
            )
        else:
            detalle = "sin tipos evaluados"
    elif nombre == "proyeccion_tendencia":
        filas = [
            fila for fila in (resultado.get("proyeccion") or []) if isinstance(fila, dict)
        ]
        if filas:
            primera = filas[0]
            detalle = (
                f"{cifra(resultado.get('pendiente_kwh_dia'))} kWh/día; "
                f"R² {cifra(resultado.get('r2'))}; banda día 1 "
                f"{cifra(primera.get('limite_inferior_kwh'))}–"
                f"{cifra(primera.get('limite_superior_kwh'))} kWh (predicción)"
            )
        else:
            detalle = "sin días observados suficientes"
    elif nombre == "factor_carga":
        detalle = (
            f"{cifra(resultado.get('factor_carga'))} = "
            f"{cifra(resultado.get('demanda_media_kwh'))} kWh medios / "
            f"{cifra(resultado.get('demanda_maxima_kwh'))} kWh máximos"
        )
    elif nombre == "indice_perdidas_y_anomalias":
        detalle = (
            f"desviación {cifra(resultado.get('desviacion_pct'))}%; "
            f"{cifra(resultado.get('zonas'))} zonas; "
            f"{cifra(resultado.get('eventos'))} eventos"
        )
    else:
        detalle = "; ".join(
            f"{_etiqueta(clave)} {cifra(valor)}"
            for clave, valor in _pares(resultado, maximo=3)
        )
    return [f"- **{nombre}**: {detalle}."]


def _linea_fuentes(fuentes: list[str]) -> str:
    visibles = list(dict.fromkeys(fuentes))[:_MAX_FUENTES]
    if not visibles:
        return ""
    excedente = len(fuentes) - len(visibles)
    sufijo = f" y {excedente} más" if excedente > 0 else ""
    return f"*Fuentes: {', '.join(visibles)}{sufijo}.*"


def _recortar_por_lineas(lineas: list[str], fuentes: str, limite: int = LIMITE) -> str:
    while len("\n".join([*lineas, "", fuentes])) > limite and len(lineas) > 3:
        lineas.pop()
    texto = "\n".join([*lineas, "", fuentes]).strip()
    if len(texto) <= limite:
        return texto
    # Una sola línea extensa no se corta a mitad: se sustituye por un aviso.
    cabecera = lineas[0] if lineas else "### Respuesta verificada"
    return f"{cabecera}\n\nDetalle disponible en las herramientas consultadas.\n\n{fuentes}".strip()


def render_datos(
    ejecucion: dict[str, Any],
    pregunta: str = "",
    aviso_estimacion: str | None = None,
) -> str:
    """Devuelve una respuesta en Markdown con fuentes verificadas."""
    herramientas = [
        item for item in (ejecucion.get("herramientas") or []) if isinstance(item, dict)
    ]
    formulas = [
        item
        for item in (ejecucion.get("formulas_aplicadas") or [])
        if isinstance(item, dict)
    ]
    fuentes = sorted(
        {
            str(fuente)
            for item in [*herramientas, *formulas]
            for fuente in (item.get("fuentes") or [])
            if fuente
        }
    )
    util = bool(fuentes) or any(
        isinstance(item.get("resultado"), dict)
        and item["resultado"].get("disponible") is True
        for item in formulas
    )
    if not util:
        from .conocimiento_simet import SIN_EVIDENCIA

        return SIN_EVIDENCIA

    lineas: list[str] = ["### Respuesta verificada", ""]
    if aviso_estimacion:
        lineas.append(f"> {aviso_estimacion}")
        lineas.append("")
    for resultado in herramientas:
        # calcular_formula aparece también en `formulas_aplicadas`; duplicarlo
        # producía una lista de claves internas en lugar de la prosa de la fórmula.
        if str(resultado.get("herramienta") or "") == "calcular_formula":
            continue
        lineas.extend(_lineas_resultado(resultado, pregunta))
    if formulas:
        lineas.extend(["", "### Fórmulas aplicadas", ""])
        renderer = _lineas_formula_compacta if len(formulas) > 1 else _lineas_formula
        for formula in formulas:
            lineas.extend(renderer(formula))
    fuentes_linea = _linea_fuentes(fuentes)
    if fuentes_linea:
        return _recortar_por_lineas(lineas, fuentes_linea)
    return _recortar_por_lineas(lineas, "*Fuente: datos verificados.*")


def fuentes_de_texto(texto: str) -> list[str]:
    """Extrae citas canónicas de una respuesta conceptual local."""
    encontradas: list[str] = []

    def agregar(valor: str) -> None:
        if valor and valor not in encontradas:
            encontradas.append(valor)

    for coincidencia in re.finditer(r"\*Fuentes?:\s*(.+?)\.\*", texto, re.I | re.S):
        grupo = coincidencia.group(1)
        for candidata in _FUENTES_CONOCIDAS:
            if candidata.lower() in grupo.lower():
                agregar(candidata)
        for pdf in re.findall(r"[\w.-]+\.pdf(?:\s*\([^)]*\))?", grupo):
            if not any(pdf.lower() in conocida.lower() for conocida in encontradas):
                agregar(pdf)

    if not encontradas and "Base de Conocimiento SIMET" in texto:
        agregar("Base de Conocimiento SIMET")
    if not encontradas and "reloj local del servidor SIMET" in texto:
        agregar("reloj local del servidor SIMET")
    return encontradas[:_MAX_FUENTES]


def aplicar_estilo(texto: str, estilo: dict[str, Any] | None) -> str:
    """Aplica preferencias declaradas sin alterar cifras, fórmulas ni citas."""
    if not estilo:
        return texto
    if estilo.get("detalle") != "breve" and estilo.get("formato") != "tabla":
        return texto

    lineas = texto.splitlines()
    citas = [
        linea for linea in lineas
        if re.match(r"^\*Fuentes?:", linea.strip(), re.I)
    ]
    cuerpo = [
        linea for linea in lineas
        if linea.strip() and not re.match(r"^\*Fuentes?:", linea.strip(), re.I)
    ]
    if estilo.get("detalle") == "breve":
        utiles = [
            linea for linea in cuerpo
            if not linea.startswith("  - ") and not linea.startswith("- Método:")
        ][:3]
        cuerpo = utiles or cuerpo[:2]
    if estilo.get("formato") == "tabla":
        filas = [
            linea for linea in cuerpo
            if re.match(r"^  - ", linea)
        ]
        if filas:
            cuerpo = [
                "| Concepto | Valor |",
                "|---|---|",
                *[
                    "| " + fila.strip()[2:].replace("**", "").replace("`", "")
                    .split(": ", 1)[0]
                    + " | "
                    + (fila.strip()[2:].replace("**", "").replace("`", "")
                       .split(": ", 1)[-1])
                    + " |"
                    for fila in filas
                ],
            ]
    resultado = "\n".join([*cuerpo, "", *citas]).strip()
    return resultado if len(resultado) <= LIMITE else texto
