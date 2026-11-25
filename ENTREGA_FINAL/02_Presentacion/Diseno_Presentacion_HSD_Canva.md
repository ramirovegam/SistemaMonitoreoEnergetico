# Presentación: Hyper-Synthetic Data (HSD)
**Sistema de Monitoreo de Consumo Energético en Ciudad Inteligente**
Tópicos de Tecnologías de Datos · UAEMéx · Ing. en Computación · 2026B
Prof. Ing. Pablo Salas Castillo · 1ra entrega: 26 de septiembre de 2026 · 18 diapositivas (16:9, 1920×1080) · duración ≈ 12–15 min

---

## A) Style Kit

| Hex | Rol | Uso |
|---|---|---|
| `#0B1F3A` | Fondo | Azul marino tecnológico — base de todas las diapositivas |
| `#1F6FEB` | Primario | Cajas, barras, iconos, tarjetas activas (nunca texto pequeño) |
| `#FFB300` | Acento | Ámbar/energía — cifras clave, encabezados, highlights |
| `#FFFFFF` | Neutro claro | Títulos y texto principal sobre fondo oscuro |
| `#B8C4D4` | Neutro gris | Texto secundario, notas, pies |

- Títulos: **Poppins** 36–40 pt bold · Cuerpo: **Open Sans** 16–18 pt · Notas: Open Sans 13–14 pt.
- Márgenes 64 px; título arriba-izquierda con línea ámbar (120×4 px) debajo; máx. 5–6 líneas por slide.
- Fotos con overlay oscuro ≥50%; portada y cierre con la misma imagen de ciudad.

## B) Storyboard

1. Portada HSD
2. Agenda (5 bloques)
3. ¿Qué es Hyper-Synthetic Data? (Gartner ~2025; normalidad simulada + anomalías inyectadas)
4. HSD vs. datos sintéticos tradicionales (tabla comparativa)
5. Casos de uso generales (visión, ciberseguridad, población, energía)
6. El problema: datos reales inaccesibles (privacidad, disponibilidad, costo, escalabilidad)
7. Caso de uso: ciudad inteligente simulada (fraude, fallas, picos)
8. Pregunta de investigación
9. Modelo de datos: 8 entidades — **DIAGRAMA** (slide crítica, 500 pts rúbrica)
10. Relaciones y cardinalidades (cadena con cardinalidades)
11. Decisión: relacional vs. grafo (relacional + TimescaleDB)
12. Estrategia de volumen: 5,000 × 24 × 90 = 10,800,000 lecturas
13. Distribución del volumen por entidad (tabla, total ≈ 11.1–11.4 M)
14. Catálogo de anomalías y severidad (tabla)
15. Stack tecnológico (Python propio + PostgreSQL/TimescaleDB + Power BI/Metabase)
16. Beneficios y limitaciones
17. Alcance y siguiente fase
18. Cierre / Gracias / Preguntas

## C) Contenido clave por slide (para redactado y armado)

**1 Portada** — "Hyper-Synthetic Data (HSD)" · "Sistema de Monitoreo de Consumo Energético en Ciudad Inteligente" · Tópicos de Tecnologías de Datos · Prof. Ing. Pablo Salas Castillo · Equipo 13 integrantes, expone Mateo Jiménez Pérez (PM) · 26 de septiembre de 2026. Foto: "smart city night aerial energy blue lights". Título Poppins Bold 72 pt blanco, subtítulo 28 pt, línea ámbar, tarjeta de metadatos Open Sans 18 pt (fecha en ámbar).

**2 Agenda** — 5 barras numeradas: Qué es HSD / HSD vs sintéticos / Problema y caso de uso / Modelo y volumen / Anomalías, stack y siguiente fase.

**3 ¿Qué es HSD?** — (1) Concepto emergente (Gartner ~2025): datos generados por IA/simulación ajustados a especificaciones precisas. (2) Datasets como muestras controladas de un espacio de características n-dimensional. (3) Combina **normalidad simulada** + **anomalías inyectadas** deliberadas. Chip ámbar "Gartner · 2025". Fotos: "abstract digital data streams dark blue technology".

**4 HSD vs sintéticos** — Tabla: Origen (remuestreo de dataset real vs simulación de dominio) / Datos reales (los requiere vs no los necesita) / Control (limitado vs total). Encabezado ámbar; columna HSD con borde azul 3 px.

**5 Casos de uso** — 2×2: Visión artificial (SKY ENGINE AI) / Ciberseguridad (tráfico con ataques etiquetados) / Comportamiento y población (Gartner) / Energía. Iconos line: eye, shield, people, lightning bolt.

**6 El problema** — Bullets: datos de medidores poco accesibles; Privacidad (información sensible); Disponibilidad (fragmentados); Costo y escalabilidad (licenciamiento, cobertura). Palabras clave en ámbar. Foto: "electricity meter close up dark industrial" (derecha 40%).

**7 Caso de uso** — Bullets: monitoreo urbano por zona/proveedor; fraude y fallas de medidor; picos de demanda; 100% simulado sin generadores externos. Franja inferior: "Fraude · Fallas de medidor · Picos de demanda". Foto: "smart city night lights network aerial" (izquierda 40%).

**8 Pregunta de investigación** — "¿Cómo diseñar un modelo de datos y una estrategia HSD que representen el consumo eléctrico urbano — con fraude, fallas de medidor y picos de demanda — sin datos reales ni generadores externos?" Tarjeta central, borde ámbar, palabras clave en ámbar, Open Sans 22 pt.

**9 Modelo de datos (DIAGRAMA — crítica)** — Jerarquía vertical de cajas conectadas con líneas finas:
- Fila superior (izq→der): Proveedores/Subestaciones → Zonas → Hogares → Medidores
- Fila media: **Lecturas** (caja ÁMBAR = entidad núcleo, etiqueta "Entidad núcleo · 10.8 M")
- Fila inferior: Alertas
- Laterales: Tarifas (conectada a Hogares) · Tipos de anomalía (conectada a Alertas), cajas `#1F6FEB` al 20% borde azul.
Cajas 260×72 px, Poppins 16 pt. Agrupar filas.

**10 Cardinalidades** — Cadena: Proveedor/Subestación (1:N) → Zona (1:N) → Hogar (N:1 Tarifa · 1:N Medidor) → Medidor (1:N) → Lectura (1:0..1 Alerta) → Alerta (N:1 Tipo de anomalía). Cardinalidades en Poppins 14 pt ámbar sobre las flechas.

**11 Relacional vs grafo** — Tarjeta descartada (Grafo: costo en agregaciones) y elegida (Relacional + TimescaleDB: agregaciones intensivas sobre jerarquía fija, check azul).

**12 Volumen** — Ecuación: 5,000 medidores × 24 lecturas/día × 90 días = **10,800,000** (Poppins Bold 64 pt ámbar). Nota: "Núcleo del dataset: lecturas de consumo eléctrico".

**13 Distribución** — Tabla: Zonas ~50 · Proveedores 15–20 · Hogares 5,000 · Medidores 5,000 · Tarifas 8–10 · Lecturas 10,800,000 · Tipos de anomalía 6–8 · Alertas ~325,000–540,000 (3–5%) · **Total ≈ 11.1–11.4 M** (fila ámbar, texto navy).

**14 Anomalías** — Tabla + chips: Fraude (Alta/Crítica), Falla de medidor (Media/Alta), Pico de demanda (Media), Consumo anómalo (Media/Alta), Pérdida de comunicación (Baja/Media), Sobrecarga (Alta/Crítica). Nota: "4 niveles: Baja · Media · Alta · Crítica". Foto: "warning alert system monitoring dashboard dark".

**15 Stack** — 3 tarjetas: Generador propio Python (NumPy/pandas; Faker solo descriptivo) / PostgreSQL + TimescaleDB (hypertables) — borde azul / BI Power BI o Metabase (datamart + dashboards). Franja ámbar: "Sin generadores externos como motor final".

**16 Beneficios y limitaciones** — Beneficios (checks azules): privacidad, disponibilidad/costo bajos, escalabilidad, etiquetado de anomalías. Limitaciones (⚠ ámbar): depende de la calidad de especificaciones; requiere validación futura con datos reales.

**17 Alcance y siguiente fase** — Fuera: simulación física de red, hardware IoT, producción. Siguiente: modelo lógico/físico + generador + app + BI (tarjeta con flecha y borde ámbar).

**18 Cierre** — "Gracias" Poppins 72 pt; "¿Preguntas?" ámbar 28 pt; crédito del equipo; misma imagen de ciudad que la portada.

## D) Checklist de consistencia (antes de exportar)
1. Solo Poppins + Open Sans. 2. Título arriba-izquierda + línea ámbar en slides 2–17. 3. Solo los 5 hex (no rojos/verdes). 4. Máx. 6 líneas por slide. 5. Tablas de slides 4/13/14 con el mismo estilo (encabezado ámbar, filas alternadas). 6. Contraste: `#1F6FEB`/`#FFB300` solo en highlights grandes. 7. Imágenes con overlay ≥50%. 8. Portada ↔ cierre misma familia visual. 9. Slide 9 (diagrama): cajas conectadas, no flechas sueltas. 10. Exposición ≈ 12–15 min.