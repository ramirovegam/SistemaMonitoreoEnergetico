"""Base de conocimiento conceptual de SIMET, en memoria y sin acceso a BD.

El LLM recibe este texto como contexto conceptual. No contiene cifras
observadas en tiempo real: solo definiciones, alcance declarado y reglas de
negocio. Las cifras operativas deben venir siempre de las herramientas SQL.
"""

from __future__ import annotations

import re
import unicodedata
from datetime import datetime
from typing import Any

ALCANCE = {
    "nombre": "SIMET",
    "significado": "Sistema de Monitoreo Energético Territorial de Toluca",
    "zonas": 46,
    "servicios": 5000,
    "medidores": 5260,
    "periodo": "enero a marzo de 2026",
}

GLOSARIO: dict[str, dict[str, Any]] = {
    "simet": {
        "titulo": "SIMET",
        "categoria": "Conceptos de SIMET",
        "definicion": (
            "SIMET es el Sistema de Monitoreo Energético Territorial de Toluca. "
            "Es la capa de aplicación que consulta el esquema `energia` y el datamart "
            "para presentar consumo, servicios, medidores, alertas y proyecciones "
            "del periodo enero a marzo de 2026. El alcance declarado cubre 46 zonas "
            "reales de Toluca, 5,000 servicios y 5,260 medidores."
        ),
        "alias": ("sistema", "panel", "plataforma", "monitoreo energetico"),
    },
    "alcance": {
        "titulo": "Alcance de SIMET",
        "categoria": "Conceptos de SIMET",
        "definicion": (
            "El alcance declarado de SIMET cubre 46 zonas reales de Toluca, "
            "5,000 servicios y 5,260 medidores, con lecturas horarias de enero a "
            "marzo de 2026. Cualquier cifra distinta debe verificarse con las "
            "herramientas de datos; el glosario describe el alcance, no el estado "
            "actual de la base."
        ),
        "alias": ("46 zonas", "5000 servicios", "5260 medidores", "periodo"),
    },
    "calidad_enlace": {
        "titulo": "Calidad de enlace",
        "categoria": "Conceptos de SIMET",
        "definicion": (
            "`calidad_enlace` mide la calidad de comunicación de un medidor en una "
            "escala de 50 a 100, en porcentaje. No es una fracción entre 0 y 1. "
            "Valores más bajos indican peor enlace. SIMET muestra los medidores con "
            "menor calidad de enlace para priorizar revisión."
        ),
        "alias": ("enlace", "calidad del enlace", "medidores con peor enlace"),
    },
    "prioridad_alerta": {
        "titulo": "Niveles de prioridad de alertas",
        "categoria": "Conceptos de SIMET",
        "definicion": (
            "Las alertas usan `prioridad` de 1 a 4. No existe columna `estado`: una "
            "alerta está abierta cuando `ts_cierre IS NULL` y cerrada cuando "
            "`ts_cierre IS NOT NULL`. El campo `resultado` solo admite `CONFIRMADA`, "
            "`FALSO_POSITIVO` y `NO_CONCLUYENTE`."
        ),
        "alias": ("prioridad", "alertas abiertas", "alertas cerradas", "ts_cierre"),
    },
    "consumo_real_vs_reportado": {
        "titulo": "consumo_real_kwh frente a consumo_kwh",
        "categoria": "Conceptos de SIMET",
        "definicion": (
            "`consumo_real_kwh` es la magnitud reconstruida por el data engine y se "
            "usa como referencia analítica. `consumo_kwh` es el consumo reportado por "
            "el medidor. Cuando difieren, SIMET interpreta la diferencia como "
            "desviación o anomalía. Un `consumo_kwh` nulo o cero con "
            "`consumo_real_kwh` positivo cuenta como pérdida de comunicación en "
            "`datamart.dm_kpi_diarios`."
        ),
        "alias": (
            "consumo real",
            "consumo reportado",
            "desviacion",
            "anomalia",
            "perdidas de comunicacion",
        ),
    },
    "kwh": {
        "titulo": "kWh",
        "categoria": "Términos eléctricos y tarifarios",
        "definicion": (
            "El kilovatio-hora (kWh) es una unidad de energía. Un kWh equivale al "
            "consumo de 1 kW durante una hora. En SIMET, las lecturas y los "
            "acumulados de consumo se expresan en kWh."
        ),
        "alias": ("kilovatio hora", "energia", "consumo"),
    },
    "kw": {
        "titulo": "kW y carga contratada",
        "categoria": "Términos eléctricos y tarifarios",
        "definicion": (
            "El kilovatio (kW) es una unidad de potencia. `carga_contratada_kw` es "
            "la potencia contratada por un servicio ante CFE. SIMET la usa como "
            "referencia de capacidad, no como consumo medido."
        ),
        "alias": ("kilovatio", "potencia", "carga contratada"),
    },
    "tarifa_dac": {
        "titulo": "Tarifa DAC",
        "categoria": "Términos eléctricos y tarifarios",
        "definicion": (
            "DAC significa Doméstica de Alto Consumo. Es una categoría tarifaria de "
            "CFE para servicios domésticos con consumo elevado. En la base de "
            "conocimiento de SIMET los umbrales declarados son 250 kWh/mes y "
            "850 kWh/mes, según `energia.tarifa.limite_dac_kwh_mes`. El riesgo DAC "
            "se evalúa comparando consumo mensual promedio contra esos límites."
        ),
        "alias": ("dac", "domestica de alto consumo", "250 kwh", "850 kwh", "umbral dac"),
    },
    "codigos_tarifa": {
        "titulo": "Códigos de tarifa del catálogo",
        "categoria": "Términos eléctricos y tarifarios",
        "definicion": (
            "El catálogo `energia.tarifa` usa los códigos `1`, `1C`, `APBT`, `DAC`, "
            "`GDBT`, `GDMTH` y `PDBT`. `DAC` corresponde a Doméstica de Alto Consumo. "
            "Los demás son categorías del catálogo de CFE representadas en SIMET; "
            "su significado operativo se consulta en `energia.tarifa`."
        ),
        "alias": ("1c", "apbt", "gdbt", "gdmth", "pdbt", "codigo de tarifa", "tarifas"),
    },
    "factor_carga": {
        "titulo": "Factor de carga",
        "categoria": "Fórmulas verificadas",
        "definicion": (
            "El factor de carga es `demanda media / demanda máxima`. Indica qué tan "
            "sostenido es el uso de la capacidad instalada. Un valor cercano a 1 "
            "significa uso sostenido; un valor bajo indica presencia de picos con "
            "margen operativo. SIMET lo calcula con `calcular_formula` sobre la serie "
            "de `datamart.dm_kpi_diarios`. Es un indicador derivado, no un dato "
            "observado directo."
        ),
        "alias": ("fc", "factor de carga", "eficiencia operativa"),
    },
    "pico_demanda": {
        "titulo": "Pico de demanda",
        "categoria": "Términos eléctricos y tarifarios",
        "definicion": (
            "El pico de demanda es el valor máximo de demanda observado en una serie. "
            "En SIMET se toma de `demanda_maxima_kwh` en `datamart.dm_kpi_diarios` y "
            "sirve de denominador para el factor de carga."
        ),
        "alias": ("demanda maxima", "pico", "maximo de demanda"),
    },
    "rpu": {
        "titulo": "RPU",
        "categoria": "Términos eléctricos y tarifarios",
        "definicion": (
            "RPU significa Registro Permanente de Usuario. Es el identificador "
            "asignado por CFE a un servicio. SIMET lo usa como referencia de cliente "
            "en `energia.servicio.rpu`."
        ),
        "alias": ("registro permanente de usuario", "numero de servicio"),
    },
    "proyeccion_tendencia": {
        "titulo": "Proyección de tendencia",
        "categoria": "Fórmulas verificadas",
        "definicion": (
            "La proyección de tendencia usa regresión lineal simple sobre la serie "
            "diaria. Devuelve pendiente, R², media móvil de 7 días y una banda de "
            "predicción de ±1.96·σ_residual·sqrt(1 + 1/n + h) a 7, 15 o 30 días. "
            "Es una estimación, no un dato observado."
        ),
        "alias": (
            "proyeccion",
            "proyecta",
            "regresion",
            "tendencia",
            "prediccion",
            "pronostico",
            "pronosticar",
            "banda de prediccion",
        ),
    },
    "riesgo_dac_formula": {
        "titulo": "Índice de riesgo DAC",
        "categoria": "Fórmulas verificadas",
        "definicion": (
            "El riesgo DAC compara el consumo mensual promedio del tipo de servicio "
            "contra el `limite_dac_kwh_mes` de cada tarifa. La vista "
            "`datamart.dm_consumo_por_servicio` no expone consumo por RPU ni por tarifa "
            "individual, por lo que SIMET no atribuye el consumo a una tarifa concreta."
        ),
        "alias": ("riesgo dac", "limite dac", "supera dac"),
    },
    "indice_perdidas_anomalias": {
        "titulo": "Índice de pérdidas y anomalías",
        "categoria": "Fórmulas verificadas",
        "definicion": (
            "La desviación porcentual se calcula como "
            "`(kwh_desviados / consumo_total) × 100`. La densidad de eventos se "
            "calcula como `eventos / zonas`. Ambos son indicadores derivados de "
            "`datamart.dm_anomalias_zona` y `datamart.dm_consumo_zona_mensual`; los "
            "eventos no son alertas de `energia.alerta`."
        ),
        "alias": ("perdidas", "desviacion porcentual", "densidad de eventos"),
    },
    "expresion_segura": {
        "titulo": "Evaluación de expresiones seguras",
        "categoria": "Fórmulas verificadas",
        "definicion": (
            "`evaluar_expresion_segura` calcula fórmulas aritméticas con un parser "
            "AST y una lista blanca de operadores. No usa `eval`, no admite llamadas "
            "a funciones y solo acepta variables numéricas verificadas del payload."
        ),
        "alias": ("formula personalizada", "calcular", "expresion", "costo estimado"),
    },
}

DIAS_ES = (
    "lunes",
    "martes",
    "miércoles",
    "jueves",
    "viernes",
    "sábado",
    "domingo",
)
MESES_ES = (
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
)


def respuesta_identidad() -> str:
    """Presentación del agente, derivada del alcance declarado de SIMET."""
    return (
        "Soy el agente analítico de SIMET. Puedo responder preguntas abiertas "
        "sobre el sistema, explicar sus conceptos y consultar datos verificados "
        "de Toluca."
    )


def respuesta_reloj(tipo: str, prefijo: str | None = None) -> str:
    """Hora y fecha del reloj local del servidor, sin fuentes externas."""
    ahora = datetime.now()
    fecha = (
        f"{DIAS_ES[ahora.weekday()]} {ahora.day} de "
        f"{MESES_ES[ahora.month - 1]} de {ahora.year}"
    )
    if tipo == "hora":
        texto = f"Son las {ahora:%H:%M} del {fecha}."
    else:
        texto = f"Hoy es {fecha}, y son las {ahora:%H:%M}."
    if prefijo:
        return (
            f"{prefijo.strip()} {texto}\n\n"
            "*Fuentes: Base de Conocimiento SIMET; reloj local del servidor SIMET.*"
        )
    return f"{texto}\n\n*Fuente: reloj local del servidor SIMET.*"


CAPACIDADES = (
    "Puedo presentarme, responder preguntas abiertas sobre SIMET, explicar conceptos "
    "del sistema, decir la hora y fecha local del servidor y ejecutar herramientas "
    "de solo lectura sobre el datamart y los catálogos. "
    "Las definiciones salen de la Base de Conocimiento SIMET; las cifras salen de la "
    "base de datos verificada de SIMET, nunca de memoria ni de fuentes externas. "
    "Puedo consultar resumen del sistema, zonas, servicios y tarifas, alertas y "
    "medidores, series diarias y horarias, calcular agregados como promedio o suma "
    "y ejecutar consultas SELECT de solo lectura. También aplico fórmulas verificadas "
    "como factor de carga, proyección de tendencia, riesgo DAC, índice de pérdidas "
    "y expresiones seguras. Menciono las fuentes consultadas y separo estimaciones "
    "de datos observados."
)

FUERA_DE_ALCANCE = (
    "Esa información no forma parte de la base de conocimiento verificada de SIMET. "
    "Puedo ayudarte con el sistema de monitoreo energético de Toluca, sus zonas, "
    "servicios, medidores, alertas, tarifas y fórmulas verificadas."
)

SIN_EVIDENCIA = (
    "No hay evidencia suficiente en los datos disponibles para responder esa pregunta."
)

SIN_PRONOSTICO_OFICIAL = (
    "SIMET no almacena pronósticos oficiales. Los valores posteriores al 31 de marzo "
    "de 2026 son estimaciones derivadas de la serie observada, no datos registrados. "
    "Puedo mostrarte la serie observada o una estimación etiquetada con su banda.\n\n"
    "*Fuente: Base de Conocimiento SIMET.*"
)

TEMAS_AJENOS = (
    "deporte",
    "futbol",
    "receta",
    "clima",
    "lluvia",
    "temperatura",
    "humedad",
    "tiempo atm",
    "pronostico del tiempo",
    "politica",
    "historia universal",
    "pelicula",
    "musica",
    "medico",
    "salud",
    "criptomoneda",
    "bolsa de valores",
    "gas natural",
    "agua potable",
    "consumo de agua",
    "telefonia",
    "paris",
    "madrid",
    "nueva york",
)


def _normalizar(texto: str) -> str:
    sin_tildes = "".join(
        letra
        for letra in unicodedata.normalize("NFD", texto.lower())
        if unicodedata.category(letra) != "Mn"
    )
    return " ".join(sin_tildes.replace("?", " ").replace("¿", " ").split())


def es_ajeno(texto: str) -> bool:
    """Detecta temas claramente fuera del dominio verificado de SIMET."""
    normalizado = _normalizar(texto)
    ajeno = any(tema in normalizado for tema in TEMAS_AJENOS)
    if not ajeno:
        return False
    if "simet" in normalizado:
        return False
    return "energia electrica" not in normalizado and "consumo electrico" not in normalizado


def detectar_termino(texto: str) -> str | None:
    """Devuelve la clave del glosario más afín, sin consultar la base."""
    normalizado = _normalizar(texto)
    mejor: str | None = None
    longitud = 0
    for clave, entrada in GLOSARIO.items():
        candidatos = (clave, *_alias_normalizados(entrada))
        for candidato in candidatos:
            if not candidato or len(candidato) <= longitud:
                continue
            patron = rf"(?<!\w){re.escape(candidato)}(?!\w)"
            if re.search(patron, normalizado):
                mejor = clave
                longitud = len(candidato)
    return mejor


def _alias_normalizados(entrada: dict[str, Any]) -> tuple[str, ...]:
    return tuple(_normalizar(alias) for alias in entrada.get("alias", ()))


def explicar(termino: str) -> str:
    entrada = GLOSARIO.get(termino)
    if not entrada:
        return FUERA_DE_ALCANCE
    return (
        f"### {entrada['titulo']}\n\n"
        f"{entrada['definicion']}\n\n"
        "*Fuente: Base de Conocimiento SIMET.*"
    )


def respuesta_conversacional(tipo: str) -> str:
    if tipo == "saludo":
        return f"Hola. {respuesta_identidad()} ¿Qué necesitas revisar?"
    if tipo == "capacidades":
        return f"### Qué puedo hacer\n\n{CAPACIDADES}\n\n*Fuente: Base de Conocimiento SIMET.*"
    if tipo == "sin_pronostico":
        return SIN_PRONOSTICO_OFICIAL
    if tipo == "agradecimiento":
        return "Con gusto. Si necesitas otra consulta sobre SIMET, estoy disponible."
    return FUERA_DE_ALCANCE


def contexto_para_llm() -> str:
    lineas = [
        f"{entrada['titulo']} ({clave}): {entrada['definicion']}"
        for clave, entrada in GLOSARIO.items()
    ]
    return (
        "BASE DE CONOCIMIENTO SIMET (conceptual, sin cifras operativas)\n"
        + "\n".join(lineas)
        + f"\n\nCAPACIDADES: {CAPACIDADES}\n"
        + f"RESPUESTA FUERA DE ALCANCE: {FUERA_DE_ALCANCE}\n"
        + f"SIN EVIDENCIA: {SIN_EVIDENCIA}\n"
        + f"SIN PRONÓSTICO OFICIAL: {SIN_PRONOSTICO_OFICIAL}"
    )


CONTEXTO_LLM = contexto_para_llm()
