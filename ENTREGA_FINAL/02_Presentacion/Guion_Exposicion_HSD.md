# Guion de Exposición — Presentación HSD (plantilla HYPR)
**15 diapositivas · 12–15 minutos · Reparto por integrando (todos participan — rúbrica 1.7)**
1ra entrega · Tópicos de Tecnologías de Datos · 26 de septiembre de 2026

> Instrucciones para el equipo:
> - Tiempo: cada slide ≈ 40–60 segundos. Total ≈ 13 minutos + preguntas.
> - Leer EN VOZ ALTA el guion marcado con su nombre. Ajustar con sus propias palabras, no leer literal.
> - Si el profesor interrumpe, responder y retomar el hilo de la diapositiva.
> - Slides 7, 9, 10 y 11 son las más probables de preguntas: el responsable debe dominarlas.
> - La distribución es propuesta; reasignarla en Trello según disponibilidad.

---

## Diapositiva 1 — Portada (30 s)
**Habla: Mateo (PM)**
"Buenos días profesor y compañeros. Somos el equipo CO01 de Tópicos de Tecnologías de Datos. Hoy presentamos Hyper-Synthetic Data: nuestro proyecto de un Sistema de Monitoreo de Consumo Energético en una Ciudad Inteligente, correspondiente a la primera entrega."

## Diapositiva 2 — Agenda (20 s)
**Habla: Mateo (PM)**
"La exposición tiene seis bloques: primero qué es Hyper-Synthetic Data; luego la comparación con los datos sintéticos tradicionales; el problema y las necesidades de datos; nuestro caso de uso de consumo energético; el modelo de datos en sus tres niveles —conceptual, lógico y físico—; y finalmente volumen, anomalías, tecnología y equipo."

## Diapositiva 3 — ¿Qué es HSD? (60 s)
**Habla: [Integrante 2 — Datos Sintéticos]**
"Hyper-Synthetic Data es un concepto emergente que Gartner difundió alrededor de 2025. Se trata de datos generados por completo de forma artificial, mediante modelos de IA o motores de simulación, pero ajustados a especificaciones muy precisas de un dominio. La idea clave es pensar cada característica del dominio como una dimensión de un espacio n-dimensional: el dataset es una muestra controlada de ese espacio. Y lo más importante: combina normalidad simulada con anomalías inyectadas deliberadamente, como fraude, fallas o picos de demanda, que en los datos reales son escasos."

## Diapositiva 4 — HSD vs tradicionales (60 s)
**Habla: [Integrante 3 — Base de Datos]**
"La diferencia con los sintéticos tradicionales es fundamental. Los tradicionales se obtienen remuestreando o aumentando un dataset real existente, por lo que heredan sus sesgos y no pueden crear escenarios que no existan en los datos originales. HSD, en cambio, no necesita datos reales: simula el dominio desde reglas propias, da control total sobre la normalidad y las anomalías, y es totalmente reproducible con semillas fijas. En resumen: no copiamos datos reales, simulamos el dominio."

## Diapositiva 5 — El problema / necesidades (60 s)
**Habla: [Integrante 4 — Investigación]**
"¿Por qué no usar datos reales? Los datos de medidores inteligentes son escasos, sensibles por motivos de privacidad, no los comparten las distribuidoras y son costosos de escalar. Nuestro proyecto necesita lecturas periódicas de consumo, con etiquetado de anomalías, trazabilidad completa desde zona hasta alerta, y un mínimo de diez millones de registros. Todo sin usar información personal real. De aquí surge la necesidad de generarlos nosotros mismos."

## Diapositiva 6 — Caso de uso (60 s)
**Habla: [Integrante 5 — Investigación]**
"El caso de uso es una ciudad inteligente simulada: zonas geográficas con hogares, cada hogar con un medidor inteligente, y un proveedor eléctrico con subestaciones y tarifas. Sobre el flujo normal de lecturas inyectamos tres escenarios: fraude, falla de medición y picos de demanda, y eso genera alertas. Nuestra pregunta de investigación es cómo diseñar el modelo de datos y la estrategia HSD para representar ese consumo sin datos reales ni generadores externos."

## Diapositiva 7 — Modelo conceptual (90 s — PREGUNTA PROBABLE)
**Habla: [Integrante 6 — Base de Datos]**
"El modelo conceptual tiene ocho entidades: proveedores o subestaciones, zonas, hogares, medidores, tarifas, lecturas, tipos de anomalía y alertas. La jerarquía es de proveedor que atiende zonas, cada zona tiene hogares, cada hogar tiene un medidor, y cada medidor genera lecturas; las lecturas pueden disparar alertas, y tanto el hogar como la alerta se relacionan con sus catálogos: tarifas y tipos de anomalía. La entidad núcleo son las lecturas, porque ahí está más del 95 % del volumen."

## Diapositiva 8 — Cardinalidades y decisión (45 s)
**Habla: [Integrante 7 — Base de Datos]**
"Las relaciones son en cadena uno a muchos: subestación a zonas, zona a hogares, hogar a medidores, medidor a lecturas. Evaluamos el modelo de grafo y lo descartamos: aunque es flexible, no compensa para agregaciones masivas como consumo por zona o promedio por hora. Elegimos el modelo relacional porque nuestra estructura es jerárquica y fija, y nuestras consultas son fundamentalmente agregaciones."

## Diapositiva 9 — Modelo lógico (75 s — PREGUNTA PROBABLE)
**Habla: [Integrante 8 — Base de Datos]**
"En el modelo lógico definimos ocho tablas con sus llaves. Las principales: zona con zonas por municipio; tarifa con precios por kilowatt; hogar que referencia a zona y tarifa; medidor que referencia al hogar; lectura que referencia al medidor y guarda fecha, consumo en kilowatt-hora y calidad; y alerta que referencia a la lectura y al tipo de anomalía. Por ejemplo, la tabla hogar tiene hogar_id como llave primaria y zona_id y tarifa_id como llaves foráneas."

## Diapositiva 10 — Modelo físico (75 s — PREGUNTA PROBABLE)
**Habla: [Integrante 9 — Backend/Datos]**
"La asignación de conceptual a físico es directa: cada entidad se convierte en una tabla en PostgreSQL con extensiones TimescaleDB. Las lecturas, por su volumen, se implementan como una hypertable particionada por fecha. Usamos llaves autoincrementales SERIAL y BIGSERIAL, integridad referencial con REFERENCES e índices por medidor y fecha. El poblamiento lo hará nuestro generador propio en Python, que produce un archivo con las sentencias INSERT."

## Diapositiva 11 — Estrategia de volumen (60 s — PREGUNTA PROBABLE)
**Habla: [Integrante 10 — Datos Sintéticos]**
"El volumen se calcula de forma natural: cinco mil medidores, por veinticuatro lecturas diarias, por noventa días, dan diez millones ochocientas mil lecturas. Sumando catálogos y alertas, que estimamos entre tres y cinco por ciento de las lecturas, llegamos a más de once millones de registros. Así cumplimos el requisito de diez millones sin inflar entidades secundarias, y el modelo escala linealmente."

## Diapositiva 12 — Anomalías y alertas (60 s)
**Habla: [Integrante 11 — Datos Sintéticos]**
"Las anomalías se inyectan sobre la normalidad simulada con tasas documentadas. El catálogo incluye fraude, falla de medidor, pico de demanda, consumo anómalo, pérdida de comunicación y sobrecarga, cada uno con su severidad, desde baja hasta crítica. El resultado se ve como una línea de consumo normal con picos marcados, y cada anomalía genera una alerta trazable hasta la lectura que la originó."

## Diapositiva 13 — Stack tecnológico (50 s)
**Habla: [Integrante 12 — Backend]**
"Nuestro stack es de herramientas libres: Python con NumPy y pandas para el generador, que es de lógica propia; Faker se usa solo para atributos descriptivos; PostgreSQL con TimescaleDB para la base; y para la segunda entrega, Power BI o Metabase para el análisis. Cumplimos la regla de la evaluación: sin generadores externos como motor final."

## Diapositiva 14 — Equipo (45 s)
**Habla: [Integrante 13 — BI/Documentación]**
"Somos trece integrantes y cada uno tiene más de un rol, como exige la evaluación. El PM es Mateo; las áreas son investigación, base de datos, datos sintéticos, backend, frontend y documentación, con la asignación detallada en el acta de interesados y en Trello. Trabajamos con Trello para tareas y Slack para la comunicación."

## Diapositiva 15 — Cierre (40 s)
**Habla: Mateo (PM)**
"Para cerrar: el monitoreo de consumo queda fuera de nuestro alcance la simulación física de la red y la integración con hardware. En la segunda entrega, en noviembre, tendremos el modelo físico completo, el generador funcional con la carga de los diez millones de registros, la aplicación y los dashboards de BI. Hyper-Synthetic Data nos permite construir datos realistas, etiquetados y a gran escala sin riesgos de privacidad. Gracias por su atención. ¿Preguntas?"

---

## Apoyo a preguntas frecuentes (respuestas cortas)
- **¿Por qué 5,000 medidores?** El cálculo se diseña para llegar a 10M+ registros; 5,000 × 24 × 90 = 10.8M. Escala con más medidores o más días.
- **¿Cómo se genera la normalidad?** Modelo de carga base por perfil de hogar (tarifa), más variación horaria y estacional, con semilla fija para reproducir.
- **¿Qué es una hypertable?** Tabla particionada automáticamente por tiempo en TimescaleDB: escritura y consulta eficientes con millones de filas.
- **¿Por qué no usar datos reales?** Privacidad, disponibilidad, costo y sesgo; además el concepto HSD no los requiere.
- **¿Cuál es la evidencia de poblamiento?** El generador produce un archivo INSERT; se muestran conteos por tabla (SELECT COUNT(*)) y capturas.