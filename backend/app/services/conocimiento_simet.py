"""Base de conocimiento conceptual de SIMET, en memoria y sin acceso a BD.

El LLM recibe este texto como contexto conceptual. No contiene cifras
observadas en tiempo real: solo definiciones, alcance declarado y reglas de
negocio. Las cifras operativas deben venir siempre de las herramientas SQL.
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import Any

from ..graphrag.normalizacion import normalizar

# Alias público: la normalización la define graphrag.normalizacion para que
# artefactos, ingesta y planificador comparen con el mismo criterio.
_normalizar = normalizar

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
    "medidor": {
        "titulo": "Medidor",
        "categoria": "Conceptos de SIMET",
        "definicion": (
            "Un medidor es el equipo físico de medición asociado a un contrato o a "
            "una instalación independiente. El patrón ordinario es un medidor "
            "principal por servicio, pero el número de medidor identifica el "
            "equipo, no al cliente: puede sustituirse y conserva historial."
        ),
        "alias": ("medidores",),
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
    "Puedo presentarme, explicar conceptos de SIMET, dar la hora local y consultar "
    "datos verificados de Toluca con herramientas de solo lectura. Consulto resumen "
    "del sistema, zonas, servicios, tarifas, alertas, medidores y series diarias u "
    "horarias. Calculo promedios, sumas y fórmulas verificadas: factor de carga, "
    "proyección de tendencia, riesgo DAC, índice de pérdidas y expresiones seguras. "
    "Las definiciones salen de la Base de Conocimiento SIMET; las cifras salen de la "
    "base verificada. Cito las fuentes y separo estimaciones de datos observados."
)

FRECUENCIA_SIN_DEFINICION = (
    "No tengo una definición de 'frecuencia' en las fuentes verificadas de SIMET, "
    "así que no la improviso."
)

ACLARACION_ENLISTALO = (
    "¿Qué quieres que enliste? Puedo listar capacidades, zonas, servicios, alertas "
    "o fórmulas verificadas.\n\n*Fuente: Base de Conocimiento SIMET.*"
)

SUGERENCIAS_RESPUESTA = (
    "### Sugerencias\n\n"
    "1. **Resumen**: ¿Cuál es el consumo total y con qué semilla se generó?\n"
    "2. **Zonas**: Ranking de las 10 zonas con mayor consumo real.\n"
    "3. **Tarifas**: ¿Qué tipo de servicio tiene mayor consumo y cómo se relaciona con DAC?\n"
    "4. **Alertas**: ¿Cuántas alertas siguen abiertas y qué medidores concentran más?\n"
    "5. **Tendencia**: Proyección de consumo a 15 días con banda de predicción.\n"
    "6. **Concepto**: ¿Qué significa Tarifa DAC según SIMET?\n\n"
    "*Fuente: Base de Conocimiento SIMET.*"
)

FUERA_DE_ALCANCE = (
    "Esa información no forma parte de la base de conocimiento verificada de SIMET. "
    "Puedo ayudarte con el sistema de monitoreo energético de Toluca, sus zonas, "
    "servicios, medidores, alertas, tarifas y fórmulas verificadas."
)

SALUDOS_RESPUESTA = {
    "hola": "Hola",
    "buenos dias": "Buenos días",
    "buenas tardes": "Buenas tardes",
    "buenas noches": "Buenas noches",
    "buenas": "Buenas",
    "que tal": "Qué tal",
    "como estas": "Cómo estás",
    "saludos": "Saludos",
}

REDIRECCION = (
    "Entiendo la frustración. Dime qué necesitas y lo reviso con los datos de SIMET.\n\n"
    "*Fuente: Base de Conocimiento SIMET.*"
)

SQL_SOLO_LECTURA = (
    "SIMET solo admite consultas SELECT o WITH de solo lectura. "
    "No ejecuto DROP, DELETE, ALTER, INSERT ni UPDATE.\n\n"
    "*Fuente: Base de Conocimiento SIMET.*"
)

SIN_EVIDENCIA = (
    "No hay evidencia suficiente en los datos disponibles para responder esa pregunta."
)

SQL_NO_EJECUTABLE = (
    "No ejecuto comentarios SQL, múltiples sentencias, funciones de sistema ni "
    "catálogos internos. SIMET solo acepta una sentencia SELECT o WITH de solo "
    "lectura sobre datos verificados.\n\n"
    "*Fuente: Base de Conocimiento SIMET.*"
)

ALERTAS_ZONA_SIN_RANKING = (
    "Tengo el total de alertas abiertas y los medidores con más alertas, pero no "
    "tengo un ranking verificado por zona de alertas abiertas. Puedo darte el total "
    "global o las alertas de una zona concreta.\n\n"
    "*Fuente: Base de Conocimiento SIMET.*"
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


def es_ajeno(texto: str) -> bool:
    """Detecta temas claramente fuera del dominio verificado de SIMET."""
    normalizado = _normalizar(texto)
    ajeno = any(tema in normalizado for tema in TEMAS_AJENOS)
    if not ajeno:
        return False
    if "simet" in normalizado:
        return False
    return "energia electrica" not in normalizado and "consumo electrico" not in normalizado


def _alias_normalizados(entrada: dict[str, Any]) -> tuple[str, ...]:
    return tuple(normalizar(alias) for alias in entrada.get("alias", ()))


def _distancia_sustitucion(uno: str, otro: str) -> int:
    """Distancia de edición solo con sustituciones; longitud debe coincidir."""
    if len(uno) != len(otro):
        return 99
    return sum(1 for a, b in zip(uno, otro) if a != b)


def resolver_termino(texto: str) -> tuple[str | None, str | None]:
    """Devuelve (clave del glosario, término interpretado).

    La tolerancia a typos se aplica solo a vocabulario cerrado, con una
    sustitución y un único candidato. Nunca se adivina longitud distinta.
    """
    normalizado = normalizar(texto)
    mejor: str | None = None
    longitud = 0
    for clave, entrada in GLOSARIO.items():
        for candidato in (clave, *_alias_normalizados(entrada)):
            if not candidato or len(candidato) <= longitud:
                continue
            patron = rf"(?<!\w){re.escape(candidato)}(?!\w)"
            if re.search(patron, normalizado):
                mejor = clave
                longitud = len(candidato)
    if mejor:
        return mejor, None

    palabras = re.findall(r"\b\w+\b", normalizado)
    originales = re.findall(r"\b\w+\b", str(texto or ""))
    if not palabras or len(palabras[-1]) < 4:
        return None, None
    consultado = palabras[-1]
    candidatos = {
        (clave, candidato)
        for clave, entrada in GLOSARIO.items()
        for candidato in (clave, *_alias_normalizados(entrada))
        if candidato
        and len(candidato) == len(consultado)
        and _distancia_sustitucion(candidato, consultado) == 1
    }
    claves = {clave for clave, _ in candidatos}
    if len(claves) != 1 or len(candidatos) != 1:
        return None, None
    clave, _ = next(iter(candidatos))
    interpretado = originales[-1] if originales else consultado
    return clave, interpretado


def detectar_termino(texto: str) -> str | None:
    """Compatibilidad: devuelve solo la clave del glosario."""
    clave, _ = resolver_termino(texto)
    return clave


def explicar(termino: str, interpretacion: str | None = None) -> str:
    entrada = GLOSARIO.get(termino)
    if not entrada:
        return FUERA_DE_ALCANCE
    aviso = (
        f"Interpreté '{interpretacion}' como '{entrada['titulo']}'.\n\n"
        if interpretacion
        else ""
    )
    return (
        f"{aviso}### {entrada['titulo']}\n\n"
        f"{entrada['definicion']}\n\n"
        "*Fuente: Base de Conocimiento SIMET.*"
    )


def nombres_formulas() -> tuple[str, ...]:
    """Nombres declarados en el registro, sin lista escrita a mano."""
    from .formulas import FORMULAS

    return tuple(FORMULAS)


def respuesta_aclaracion(tipo: str) -> str:
    if tipo == "enlistalo":
        return ACLARACION_ENLISTALO
    if tipo == "frecuencia":
        return FRECUENCIA_SIN_DEFINICION
    if tipo == "formula":
        lista = ", ".join(f"`{nombre}`" for nombre in nombres_formulas())
        return (
            f"¿De cuál fórmula? Disponibles: {lista}. "
            "Dime el nombre o la magnitud que te interesa.\n\n"
            "*Fuente: Base de Conocimiento SIMET.*"
        )
    if tipo == "metricas":
        return (
            "¿De qué zona y periodo (por ejemplo, un mes)? Si prefieres, te doy el "
            "resumen acumulado de enero a marzo de 2026 con sus fuentes verificadas.\n\n"
            "*Fuente: Base de Conocimiento SIMET.*"
        )
    if tipo == "periodos":
        return (
            "¿Te refieres a cada mes por separado o a un rango continuo? Dime "
            "«enero y marzo» para dos periodos o «de enero a marzo» para el rango.\n\n"
            "*Fuente: Base de Conocimiento SIMET.*"
        )
    if tipo == "zona_numero":
        return (
            "No identifico ese número de zona en el catálogo verificado. Dime el "
            "nombre de la zona y consulto sus datos.\n\n"
            "*Fuente: Base de Conocimiento SIMET.*"
        )
    if tipo == "zona_contexto":
        return (
            "No tengo una zona previa verificada en esta conversación. Dime el "
            "nombre de la zona o escríbela en la pregunta.\n\n"
            "*Fuente: Base de Conocimiento SIMET.*"
        )
    return FUERA_DE_ALCANCE


def respuesta_conversacional(tipo: str, saludo: str | None = None) -> str:
    if tipo == "saludo":
        prefijo = SALUDOS_RESPUESTA.get(normalizar(saludo or ""), "Hola")
        return (
            f"{prefijo}. {respuesta_identidad()} ¿Qué necesitas revisar?\n\n"
            "*Fuente: Base de Conocimiento SIMET.*"
        )
    if tipo == "capacidades":
        return f"### Qué puedo hacer\n\n{CAPACIDADES}\n\n*Fuente: Base de Conocimiento SIMET.*"
    if tipo == "sugerencias":
        return SUGERENCIAS_RESPUESTA
    if tipo == "redireccion":
        return REDIRECCION
    if tipo == "sql_prohibido":
        return SQL_SOLO_LECTURA
    if tipo == "sql_no_ejecutable":
        return SQL_NO_EJECUTABLE
    if tipo == "alertas_zona_sin_ranking":
        return ALERTAS_ZONA_SIN_RANKING
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
