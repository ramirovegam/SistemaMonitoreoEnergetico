# Presentación HYPR — Hyper-Synthetic Data (HSD)
**Contenido completo para las 15 diapositivas de la plantilla "hypr" (Canva)**
Proyecto: Sistema de Monitoreo de Consumo Energético en Ciudad Inteligente
Tópicos de Tecnologías de Datos 2026B · Prof. Ing. Pablo Salas Castillo · 1ra entrega: 26 de septiembre de 2026

> Cómo usar: cada diapositiva indica el texto EXACTO (redactado y listo para pegar en Canva),
> el elemento visual a poner (tabla, diagrama, imagen) y qué criterio de la rúbrica cubre.
> Paleta del template HYPR: respetar los colores de la plantilla y usar acento ámbar/amarillo
> (#FFB300) para cifras clave si el template lo permite. Fuentes: mantener las de la plantilla.

---

## Slide 1 — Portada
**Texto para pegar:**
- Título grande: **Hyper-Synthetic Data (HSD)**
- Subtítulo: Sistema de Monitoreo de Consumo Energético en Ciudad Inteligente
- Línea institucional: Tópicos de Tecnologías de Datos · UAEMéx · Facultad de Ingeniería · Ing. en Computación · 2026B
- Profesor: Ing. Pablo Salas Castillo
- Equipo CO01 — 13 integrantes · Expone: Mateo Jiménez Pérez (Project Manager) y compañeros
- Fecha: 26 de septiembre de 2026 · Primera entrega

**Visual:** imagen de ciudad inteligente de noche con red eléctrica (buscar en Canva Fotos: "smart city night energy blue lights"), overlay oscuro 60%, título en blanco. Si el template HYPR usa portada con patrón geométrico, dejar el diseño del template y solo cambiar el texto.
**Rúbrica:** (identificación del trabajo).

---

## Slide 2 — Agenda
**Título:** Agenda
**Texto para pegar (6 bloques):**
1. ¿Qué es Hyper-Synthetic Data? (concepto y origen)
2. HSD frente a los datos sintéticos tradicionales
3. El problema: las necesidades de datos del proyecto
4. Caso de uso: monitoreo de consumo energético en ciudad inteligente
5. Modelo de datos: conceptual, lógico y físico
6. Volumen, anomalías, tecnología y equipo

**Visual:** 6 barras numeradas apiladas (usar el layout de lista del template HYPR).
**Rúbrica:** (estructura/índice — evaluación general).

---

## Slide 3 — ¿Qué es Hyper-Synthetic Data? *(teoría)*
**Título:** ¿Qué es Hyper-Synthetic Data?
**Subtítulo:** Concepto emergente, popularizado por Gartner hacia 2025

**Texto para pegar (3 tarjetas):**
1. **Definición.** Datos generados de forma completamente artificial por modelos de IA o motores de simulación avanzados, ajustados a especificaciones muy precisas para un caso de uso determinado.
2. **Enfoque.** Cada característica relevante del dominio se trata como una dimensión de un espacio n-dimensional; el dataset se genera como una muestra controlada (proyección) de ese espacio.
3. **Clave.** Combina **normalidad simulada** (patrón base realista) con **anomalías inyectadas** de forma deliberada (escenarios que en la realidad son raros: fraude, fallas, picos de demanda).

**Visual:** 3 tarjetas apiladas con iconos (brain/network, cube/dimensions, syringe/alert). Chip destacado: "Gartner · 2025".
**Rúbrica:** 1.4 (presentación del tema adecuada y suficiente) y 1.6 (concepto HSD claro).

---

## Slide 4 — HSD frente a los datos sintéticos tradicionales *(teoría)*
**Título:** HSD vs. datos sintéticos tradicionales

**Tabla para pegar:**

| Criterio | Sintéticos tradicionales | Hyper-Synthetic Data |
|---|---|---|
| Origen | Remuestreo/aumento estadístico de un dataset REAL existente | Simulación de dominio con IA o motores, desde reglas propias |
| Datos reales | Los requiere (y hereda sus sesgos) | No los necesita en absoluto |
| Control | Limitado al dataset disponible | Total: normalidad + anomalías deliberadas |
| Escenarios raros | Ausentes o poco representados | Inyectados a demanda (fraude, fallas, picos) |
| Reproducibilidad | Parcial | Total (reglas + semillas fijas) |

**Conclusión redactada (para pie de slide):** "HSD no copia datos reales: SIMULA el dominio y permite explorar escenarios que los datos reales no pueden cubrir."

**Visual:** tabla del template; columna HSD resaltada con borde o color de acento.
**Rúbrica:** 1.4 y 1.6.

---

## Slide 5 — El problema: las necesidades de datos *(análisis)*
**Título:** El problema: datos reales inaccesibles

**Texto para pegar (4 bullets):**
- Los datos de medidores inteligentes son escasos y difíciles de conseguir.
- **Privacidad:** el consumo individual es información sensible protegida por ley.
- **Disponibilidad:** las distribuidoras no comparten lecturas individuales; los datasets certificados son costosos.
- **Escalabilidad:** crecer un dataset real a millones de registros es caro y complejo.

**Necesidades de datos identificadas (caja destacada):**
- Lecturas periódicas de consumo (por hora) por medidor, con marca de tiempo.
- Etiquetado de anomalías (fraude, falla de medidor, pico de demanda).
- Trazabilidad completa: zona → hogar → medidor → lectura → alerta.
- Volumen mínimo: **10 millones de registros**.
- Cero datos personales reales: todo sintético.

**Visual:** 4 tarjetas de bullets; caja de "necesidades" con fondo de acento.
**Rúbrica:** 1.1 (análisis y necesidades de datos documentadas).

---

## Slide 6 — Caso de uso: ciudad inteligente simulada
**Título:** Caso de uso: monitoreo de consumo en ciudad inteligente

**Texto para pegar:**
- **Descripción.** Un conjunto de zonas geográficas agrupa hogares equipados con medidores inteligentes que reportan lecturas periódicas; sobre ese flujo se inyectan anomalías controladas que generan alertas.
- **Actores:** distribuidora/proveedor eléctrico (subestaciones y facturación) · hogares/consumidores (tarifa y medidores) · sistema IoT de medición (lecturas) · equipo analista/BI (explota el dataset).
- **Escenarios simulados:** fraude (manipulación del medidor) · falla de medición o comunicación · picos de demanda.
- **Valor:** alerta temprana y análisis sin arriesgar información real de nadie.

**Pregunta de investigación (caja destacada):**
"¿Cómo diseñar un modelo de datos y una estrategia HSD que representen el consumo eléctrico urbano —con fraude, fallas y picos— sin datos reales ni generadores externos?"

**Visual:** imagen de ciudad (40%) + texto; franja inferior con "Fraude · Falla de medidor · Pico de demanda".
**Rúbrica:** 1.1 y 1.6.

---

## Slide 7 — Modelo conceptual: 8 entidades *(rúbrica 1.2)*
**Título:** Modelo conceptual — 8 entidades
**Subtítulo:** Modelo de base de datos conceptual (diagrama entidad-relación simplificado)

**Entidades (redactado para el diagrama):**
1. **Proveedores / Subestaciones** — contexto de abastecimiento eléctrico
2. **Zonas** — división geográfica de la ciudad (colonias/distritos)
3. **Hogares** — unidades residenciales con perfil de consumo
4. **Medidores** — smart meters asociados a un hogar
5. **Tarifas** — planes de consumo vigentes por periodo
6. **Lecturas** — registro periódico del consumo (ENTIDAD NÚCLEO)
7. **Tipos de anomalía** — catálogo (fraude, falla, pico…)
8. **Alertas** — incidencias generadas ante anomalías

**Diagrama a armar en el template (jerarquía):**
```
Proveedor/Subestación ──1:N──▶ Zona ──1:N──▶ Hogar ──1:N──▶ Medidor ──1:N──▶ Lectura ──1:0..1──▶ Alerta
                                                     ▲                          ▲
                                                  N:1│ Tarifa            N:1│ Tipo de anomalía
```
- Usar cajas del template conectadas con líneas; Lecturas en color de acento (es el 95% del volumen).

**Rúbrica:** 1.2 (modelo de BD conceptual desarrollado).

---

## Slide 8 — Cardinalidades y decisiones de diseño
**Título:** Relaciones, cardinalidades y decisión de modelo

**Cadena con cardinalidades (para pegar como diagrama de 6 cajas):**
Proveedor/Subestación (1:N) → Zona (1:N) → Hogar (N:1 Tarifa; 1:N Medidor) → Medidor (1:N) → Lectura (1:0..1 Alerta) → Alerta (N:1 Tipo de anomalía)

**Decisión: modelo RELACIONAL (2 tarjetas):**
- ❌ **Grafo (descartado):** aporta valor con relaciones libres y recorridos variables; costoso para agregaciones masivas.
- ✅ **Relacional (elegido):** estructura jerárquica fija + agregaciones intensivas (consumo por zona, alertas por severidad, promedios por franja horaria).

**Nota:** se documentó el porqué (comparativa relacional vs grafo) en el Entregable 1.
**Visual:** 6 cajas con flechas y cardinalidades; tarjeta "Relacional" marcada con check.
**Rúbrica:** 1.2/1.3 (modelo adecuado al proyecto).

---

## Slide 9 — Modelo lógico *(rúbrica 1.3)*
**Título:** Modelo lógico de la base de datos

**Tabla de tablas (resumen lógico):**

| Tabla | Clave primaria | Claves foráneas | Campos principales |
|---|---|---|---|
| zona | zona_id | — | nombre, municipio |
| proveedor | proveedor_id | — | nombre, capacidad_mw |
| tarifa | tarifa_id | — | nombre, precio_kwh, vigencia |
| hogar | hogar_id | zona_id, tarifa_id | dirección, perfil_consumo |
| medidor | medidor_id | hogar_id | modelo, estado |
| lectura | lectura_id | medidor_id | fecha, kwh, calidad |
| tipo_anomalia | tipo_id | — | nombre, severidad |
| alerta | alerta_id | lectura_id, tipo_id | fecha, descripcion, estado |

**Ejemplo SQL (para slide o nota):**
```sql
CREATE TABLE zona (zona_id SERIAL PRIMARY KEY, nombre VARCHAR(50) NOT NULL);
CREATE TABLE hogar (
  hogar_id SERIAL PRIMARY KEY,
  zona_id INTEGER NOT NULL REFERENCES zona(zona_id),
  tarifa_id INTEGER REFERENCES tarifa(tarifa_id)
);
CREATE TABLE lectura (
  lectura_id BIGSERIAL PRIMARY KEY,
  medidor_id INTEGER NOT NULL REFERENCES medidor(medidor_id),
  fecha DATE NOT NULL, kwh NUMERIC(8,3) NOT NULL, calidad VARCHAR(20)
);
```

**Visual:** tabla + bloque de código (template puede tener layout "code").
**Rúbrica:** 1.3 (modelos lógicos desarrollados).

---

## Slide 10 — Modelo físico *(rúbrica 1.5)*
**Título:** Modelo físico y asignación conceptual → físico

**Asignación (tabla de correspondencia — requisito 1.5):**

| Conceptual | Físico (PostgreSQL + TimescaleDB) |
|---|---|
| Zonas | tabla `zona` — SERIAL, PK |
| Proveedores/Subestaciones | tabla `proveedor` — SERIAL, PK |
| Hogares | tabla `hogar` — FK zona_id, FK tarifa_id |
| Medidores | tabla `medidor` — FK hogar_id |
| Tarifas | tabla `tarifa` — SERIAL, PK |
| Lecturas | **hypertable** `lectura` particionada por fecha (TimescaleDB) — BIGSERIAL, FK medidor_id |
| Tipos de anomalía | tabla `tipo_anomalia` — catálogo con severidad |
| Alertas | tabla `alerta` — FK lectura_id, FK tipo_id |

**Decisiones físicas redactadas:**
- Motor: **PostgreSQL** con extensión **TimescaleDB** (hypertables particionadas por tiempo para las lecturas → escritura y consulta eficientes con millones de filas).
- Llaves **SERIAL/BIGSERIAL** (autoincrementales); integridad referencial con `REFERENCES`; índices por medidor+fecha.
- **Generador propio en Python** (NumPy/pandas) que produce un archivo con sentencias **INSERT** para poblar las tablas (prohibido descargar utilerías).

**Visual:** tabla de correspondencia + íconos de servidor/base de datos.
**Rúbrica:** 1.5 (modelos conceptuales asignados a modelos físicos).

---

## Slide 11 — Estrategia de volumen *(10M+ registros)*
**Título:** Estrategia de volumen

**Ecuación destacada:**
5,000 medidores × 24 lecturas/día × 90 días = **10,800,000 lecturas**

**Tabla de distribución:**

| Entidad | Registros |
|---|---|
| Zonas | ~50 |
| Proveedores / Subestaciones | 15–20 |
| Hogares | 5,000 |
| Medidores | 5,000 |
| Tarifas | 8–10 |
| Lecturas de consumo | **10,800,000** |
| Tipos de anomalía | 6–8 |
| Alertas (3–5 % de lecturas) | ~325,000–540,000 |
| **Total** | **≈ 11.1–11.4 M** |

**Nota redactada:** "Las lecturas representan más del 95 % del volumen: el mínimo de 10 M se cumple de forma orgánica, sin inflar entidades secundarias. El modelo escala linealmente (más medidores, más frecuencia o más días = más lecturas)."

**Visual:** ecuación en grande (acento) + tabla; fila total resaltada.
**Rúbrica:** 1.1 y 1.3 (volumen exigido por la evaluación práctica).

---

## Slide 12 — Anomalías y alertas *(aplicación de HSD)*
**Título:** Anomalías inyectadas y alertas

**Tabla de catálogo:**

| Tipo de anomalía | Qué representa | Severidad |
|---|---|---|
| Fraude | Manipulación del medidor (menor consumo reportado) | Alta / Crítica |
| Falla de medidor | El medidor deja de registrar correctamente | Media / Alta |
| Pico de demanda | Incremento repentino sobre lo habitual | Media |
| Consumo anómalo | Fuera de los rangos esperados | Media / Alta |
| Pérdida de comunicación | Sin lecturas durante un periodo | Baja / Media |
| Sobrecarga | Consumo sobre la capacidad máxima | Alta / Crítica |

**Regla de inyección redactada:** "Las anomalías se inyectan sobre el patrón de normalidad simulada con tasas fijadas y documentadas (≈3–5 % de las lecturas generan alerta), con severidad Baja · Media · Alta · Crítica."

**Visual:** tabla con chips de severidad (gris/azul/ámbar); diagrama de señal: línea normal con picos marcados.
**Rúbrica:** 1.6 (concepto HSD claro y aplicado al modelo).

---

## Slide 13 — Stack tecnológico y evidencias
**Título:** Tecnología y plan de ejecución

**3 tarjetas:**
- **Generador de datos (propio):** Python + NumPy/pandas. Lógica y reglas propias; Faker solo para atributos descriptivos. Semillas fijas → reproducible. Prohibidos generadores externos como motor final.
- **Base de datos:** PostgreSQL + TimescaleDB (hypertables). Poblamiento con archivo de sentencias INSERT generado por el programa.
- **Explotación (BI):** Power BI o Metabase — datamart + dashboards de consumo, alertas y anomalías (2da entrega).

**Pie destacado:** "Sin generadores externos como motor final (regla de la evaluación práctica)."

**Visual:** 3 tarjetas con iconos; pie con borde de acento.
**Rúbrica:** 1.1–1.3 (viabilidad técnica) y alineación con la evaluación práctica.

---

## Slide 14 — Equipo y participación *(todos los integrantes)*
**Título:** Equipo de trabajo — 13 integrantes

**Tabla de roles (según asignación en Trello/Excel; llenar áreas pendientes):**

| Área | Encargado(s) |
|---|---|
| Project Manager | Mateo Jiménez Pérez |
| Investigación | (asignar) |
| Base de Datos (modelo + poblamiento) | (asignar) |
| Datos Sintéticos (generador) | (asignar) |
| Backend / Frontend (app) | (asignar) |
| BI — Analista de Datos | (asignar) |
| Documentación | (asignar) |

**Texto de compromiso (redactado):**
- "Cada integrante desempeña **más de un rol** (requisito obligatorio de la evaluación) para respaldar las áreas que lo requieran."
- "Gestión con **Trello** (tareas) y **Slack** (reuniones); control de asistencia por sesión; el PM evalúa a los interesados (minuta 22/08/2026)."
- "TODOS participamos en esta primera entrega: investigación, modelos y exposición."

**Visual:** tabla de roles + fotos/íconos del equipo (usar layout del template).
**Rúbrica:** 1.7 (todos los integrantes participaron en la primera parte).

---

## Slide 15 — Cierre: alcance y siguientes pasos
**Título:** Alcance y siguientes pasos

**2 tarjetas:**
- **Fuera del alcance:** simulación física de la red (flujo de potencia), integración con hardware IoT, despliegue en producción.
- **Siguiente fase (2da entrega, 28 nov):** modelo físico definitivo + generador funcional + carga de 10M registros + aplicación sencilla + datamart y dashboards en BI con explotación de información.

**Cierre redactado:**
"Hyper-Synthetic Data permite construir datos de consumo eléctrico a escala, realistas y etiquetados, sin datos reales ni riesgos de privacidad. Gracias por su atención — **¿Preguntas?**"

**Visual:** foto de ciudad (misma familia visual que la portada) + tarjeta de próximos pasos.
**Rúbrica:** cierre y línea de continuidad hacia la 2da entrega.

---

## Checklist antes de presentar (26/09/2026)
1. Ortografía revisada y texto en español correcto.
2. Slide 7 (conceptual), 9 (lógico) y 10 (físico) completos y coherentes entre sí.
3. Slide 11 con la ecuación 10.8M visible (requisito de ≥10M registros).
4. Slide 3–4 con el concepto HSD bien explicado (pregunta probable del profesor).
5. Slide 14 con TODOS los integrantes y sus roles (más de un rol por persona).
6. Tiempo de exposición: 15 slides ≈ 12–15 minutos + preguntas.
7. Evidencia de poblamiento (queries INSERT y conteos) lista para mostrar si la piden — tener capturas a mano.