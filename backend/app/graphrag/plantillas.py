"""Copywriting local del grafo derivado.

Las respuestas son plantillas cerradas. El resolver no usa LLM y no introduce
cifras: solo devuelve una de estas piezas cuando hay evidencia enlazada.
"""

from __future__ import annotations

PLANTILLAS: dict[str, str] = {
    "intencion:saludo": (
        "Hola. Soy el agente analítico de SIMET. Puedo explicar el sistema, "
        "sus conceptos y consultar datos verificados de Toluca. "
        "¿Qué necesitas revisar?\n\n"
        "*Fuente: Base de Conocimiento SIMET.*"
    ),
    "concepto:identidad": (
        "Soy el agente analítico de SIMET. Respondo preguntas sobre el sistema, "
        "explico sus conceptos y consulto datos verificados del datamart. "
        "Las definiciones salen de la Base de Conocimiento SIMET; las cifras salen "
        "de PostgreSQL, nunca de memoria.\n\n"
        "*Fuente: Base de Conocimiento SIMET.*"
    ),
    "concepto:arquitectura": (
        "La arquitectura de SIMET es local: React 19 + TypeScript + Vite 8 + Tailwind 4 "
        "en `127.0.0.1:8443`; FastAPI + SQLAlchemy 2 en `127.0.0.1:8000`; PostgreSQL "
        "con los esquemas `energia` y `datamart`. El panel consume la API por HTTP/JSON "
        "y la API consulta PostgreSQL con psycopg 3. El agente solo usa herramientas "
        "de lectura verificadas.\n\n"
        "*Fuente: Base de Conocimiento SIMET (`CORPUS_OPERATIVO_SIMET.md`).*"
    ),
    "concepto:metrica": (
        "En SIMET, una métrica es la regla operacional que define cómo cuantificar "
        "una magnitud. El indicador presenta o señala el valor; la métrica describe "
        "el sistema de medida. Las cifras del panel salen de vistas verificadas de "
        "`datamart`, nunca de memoria ni de fuentes externas.\n\n"
        "*Fuentes: RAE_Definiciones.pdf (DLE, acepción 3); Base de Conocimiento SIMET.*"
    ),
    "concepto:indicador": (
        "Un indicador es una entidad que señala un valor o estado. En SIMET puede ser "
        "un dato observado o un indicador calculado, siempre con variable, unidad, "
        "instante, fuente y calidad declarados. La métrica describe la regla de "
        "cuantificación; el indicador muestra el resultado.\n\n"
        "*Fuentes: RAE_Definiciones.pdf (DLE, acepción 1); Base de Conocimiento SIMET.*"
    ),
    "concepto:luz": (
        "En SIMET, «luz» se entiende en sentido coloquial de suministro o corriente "
        "eléctrica. No equivale a la magnitud física energía ni a la corriente medida "
        "en amperios. El consumo se consulta en kWh desde las vistas verificadas del "
        "datamart.\n\n"
        "*Fuentes: RAE_Definiciones.pdf (DLE, luz acepción 3); Base de Conocimiento SIMET.*"
    ),
    "concepto:energia_electrica": (
        "Energía eléctrica es una clase de energía, es decir, una magnitud física "
        "relacionada con la capacidad de realizar trabajo. No debe confundirse con "
        "potencia, corriente ni tensión. En SIMET el consumo se expresa en kWh y se "
        "obtiene de las vistas verificadas del datamart.\n\n"
        "*Fuentes: RAE_Definiciones.pdf (DLE, energía acepción 2); Base de Conocimiento SIMET.*"
    ),
    "concepto:rpu": (
        "RPU significa Registro Permanente de Usuario. Es el identificador operativo "
        "de CFE para un cliente o servicio. SIMET lo conserva como "
        "`energia.servicio.rpu` y no lo confunde con el número de medidor, que "
        "identifica un activo sustituible.\n\n"
        "*Fuentes: CFE_Suministro.pdf; Base de Conocimiento SIMET.*"
    ),
    "concepto:demanda_contratada": (
        "La demanda contratada es la suma de potencias, en kW, de los equipos que el "
        "usuario declara conectados. Es un parámetro contractual, no consumo medido. "
        "SIMET la usa como referencia de capacidad en `carga_contratada_kw`.\n\n"
        "*Fuentes: CFE_Suministro.pdf; Base de Conocimiento SIMET.*"
    ),
    "concepto:medidor": (
        "Un medidor es el equipo físico de medición asociado a un contrato o a una "
        "instalación independiente. El patrón ordinario es un medidor principal por "
        "servicio, pero el número de medidor identifica el equipo, no al cliente: "
        "puede sustituirse y conserva historial.\n\n"
        "*Fuentes: CFE_Suministro.pdf; Base de Conocimiento SIMET.*"
    ),
    "regla:tarifa_dac": (
        "DAC significa Doméstica de Alto Consumo. `CFE_Tarifas.pdf` documenta que el "
        "límite depende de la tarifa doméstica y la localidad. SIMET declara 250 y "
        "850 kWh/mes en `energia.tarifa.limite_dac_kwh_mes`; `riesgo_dac` compara el "
        "promedio del tipo de servicio contra cada límite, sin atribuir consumo a un "
        "RPU ni a una tarifa individual.\n\n"
        "*Fuentes: CFE_Tarifas.pdf; Base de Conocimiento SIMET.*"
    ),
    "regla:prediccion": (
        "SIMET no almacena pronósticos oficiales. `proyeccion_tendencia` estima con "
        "regresión lineal sobre la serie diaria y entrega banda de predicción a 7, 15 "
        "o 30 días. Los valores posteriores al 31 de marzo de 2026 son estimaciones "
        "etiquetadas con aviso de estimación derivada.\n\n"
        "*Fuentes: Banco_Memoria_Analitica_SQL_Guardrails.pdf; Base de Conocimiento SIMET.*"
    ),
    "regla:guardrails": (
        "El asistente aplica guardrails deterministas: usa solo campos del payload "
        "verificado; trata NULL, faltante y cero como estados distintos; bloquea "
        "tendencias con cobertura insuficiente; y etiqueta toda extrapolación como "
        "estimación derivada. PostgreSQL calcula y valida; el modelo explica.\n\n"
        "*Fuentes: Banco_Memoria_Analitica_SQL_Guardrails.pdf; Base de Conocimiento SIMET.*"
    ),
    "relacion:indicador_metrica": (
        "La métrica define cómo se cuantifica; el indicador muestra el valor o estado "
        "resultante. En SIMET una métrica se apoya en vistas verificadas de "
        "`datamart` y el indicador se presenta con unidad, periodo y fuente.\n\n"
        "*Fuentes: RAE_Definiciones.pdf; Base de Conocimiento SIMET.*"
    ),
}
