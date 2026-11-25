# Hallazgos técnicos: data-engine-for-energy-analysis

**Fecha:** 26 de septiembre de 2026
**Repositorio:** `C:\Users\mateo\Downloads\HSD\data-engine-for-energy-analysis`
**Rama:** `dev-mateo` (commit base `8cb1058`) · **Sin commit:** los cambios de este documento están en el working tree
**Alcance:** data engine (generación, detección, alertas, datamart). **La presentación no se tocó.**

> Documento histórico de septiembre de 2026. Las cifras que aparecen en él corresponden a la corrida anterior con semilla 20260101 y quedaron sustituidas por la corrida maestra verificada con semilla 20260103. Para la defensa se usan los archivos `03_Datos_y_Evidencia/resultados_corrida_10M.csv` y `00_AUDITORIA/PENDIENTES.md`.

---

## 1. Resumen ejecutivo

Se auditó el pipeline completo contra la base de datos viva y se corrigieron **4 bugs verificados**.
El hallazgo más grave era que **el pipeline no era reproducible**: los conteos salían idénticos en
cada corrida, pero los consumos en kWh cambiaban. Los conteos exactos(mask) ocultaban el problema.

Estado actual: el pipeline corre de punta a punta, valida en PASS, y **dos corridas completas
producen agregados idénticos a cuatro decimales**.

Quedan **tres decisiones abiertas** que requieren al usuario (sección 6).

---

## 2. Bugs corregidos

### 2.1 `--dias` estaba roto (bloqueante)

`main.py` convertía las fechas a `date` **después** de aplicar los overrides, así que el override
de `--dias` hacía aritmética con un `str`:

```
TypeError: can only concatenate str (not "datetime.timedelta") to str
```

El pipeline no arrancaba con `--dias`, que es exactamente el modo que se usa para pruebas rápidas.

**Arreglo:** mover `date.fromisoformat(...)` antes del bloque de overrides.

### 2.2 Reproducibilidad rota (el grave)

`Calendario_Gen.py`, `Servicios_Gen.py` y `Dispositivos_Gen.py` usan el módulo `random` **global
sin semilla**. Sólo `Lecturas_Gen.py` usa `random.Random(semilla)`.

Consecuencia medida entre dos corridas con la misma semilla `20260101`:

| Métrica | Corrida A | Corrida B |
|---|---|---|
| Lecturas | 10,800,000 | 10,800,000 |
| Eventos | 7,296 | 7,296 |
| Alertas | 7,136 | 7,136 |
| Medidores | 5,260 | 5,260 |
| Suma `carga_contratada_kw` | 94,931.140 | 93,908.750 |
| Medidores con multiplicador 20 | 159 | 135 |
| Servicios con solar | 394 | 382 |
| Consumo real del medidor 1 | 734.80 | 3,795.43 |
| Consumo real del medidor 2 | 658.37 | 839.37 |

O sea: **los conteos eran estables y los kWh no.** Por eso el CSV de la corrida maestra "cuadraba"
con la base y daba falsa confianza.

**Arreglo:** `random.seed(config["generation"]["seed"])` en `main()` antes de generar cualquier
catálogo. `Lecturas_Gen` usa su propia instancia, así que no le afecta.

**Verificación:** dos corridas completas de 10.8M, agregados idénticos a 4 decimales
(`consumo_real` 38,098,474.9847 en ambas).

### 2.3 La validación nunca validaba una corrida completa

Condición en `validar()`:

```python
if validacion.get("expected_readings") and not (total_lecturas > 200000):
```

Una corrida real genera 10,800,000 lecturas, que es `> 200000`, así que el `not (...)` daba `False`
y **se saltaba la validación exacta**, etiquetando la corrida como `"Corrida parcial/demo"`. El
mínimo de 10,000,000 registros tampoco se comprobaba.

**Arreglo:** parámetro `es_parcial=bool(args.demo or args.servicios or args.dias)`. Sin overrides se
exige coincidencia exacta con `expected_readings` y se comprueba `minimum_total_records`.

### 2.4 `dm_alertas` contaba el ruido como `PICO_DEMANDA`

Las 339 falsas alarmas (`id_evento IS NULL`) son ruido estadístico inyectado a propósito. Se
etiquetan con `id_tipo_evento = 1`, o sea `PICO_DEMANDA`, y la vista las contaba como tales:
**1,227 alertas en vez de 888**.

**Arreglo:** `n_alertas` filtra `id_evento IS NOT NULL`, se agrega `n_falsas_alarma` como columna
aparte y `cerradas` solo cuenta alertas reales. La tasa de falsos positivos queda visible (4.75%),
que además es una métrica útil para la defensa.

---

## 3. Resultados verificados de la corrida completa

Base de pruebas `energia_hsd_prueba`, `main.py --reset`, 150 s, semilla `20260101`.

### 3.1 Conteos por tabla

| Tabla | Filas |
|---|---|
| lectura | 10,800,000 |
| periodo_facturacion | 15,000 |
| evento | 7,296 |
| alerta | 7,136 |
| medidor | 5,260 |
| servicio | 5,000 |
| perfil_carga_horaria | 1,296 |
| calendario | 90 |
| zona | 46 |
| tipo_servicio | 18 |
| tarifa | 7 |
| tipo_evento | 7 |
| **Total** | **10,839,782** |

Validación final: **PASO**.

### 3.2 Eventos por tipo

| Clave | Efecto | Eventos | % | kWh desviados |
|---|---|---|---|---|
| PERDIDA_COMUNICACION | NULIFICACION | 5,000 | 68.53% | 0.00 |
| PICO_DEMANDA | INCREMENTO | 920 | 12.61% | 28,029.70 |
| CONSUMO_ANOMALO | INCREMENTO | 583 | 7.99% | 133,288.76 |
| MANTENIMIENTO | REDUCCION | 320 | 4.39% | 7,055.69 |
| SOBRECARGA | INCREMENTO | 214 | 2.93% | 2,406.98 |
| FALLA_MEDIDOR | CONGELAMIENTO | 149 | 2.04% | 0.00 |
| MANIPULACION | REDUCCION | 110 | 1.51% | 90,626.75 |

`PERDIDA_COMUNICACION` da exactamente 5,000 eventos porque su tasa por medidor satura a 1.0 y hay
5,000 medidores activos (los 260 de reemplazo están dados de baja). No es azar: es determinista.

### 3.3 Alertas reales contra ruido

**6,797 reales + 339 falsas = 7,136.** Tasa de falsos positivos **4.75%**.

| Tipo | Prioridad | Reales | Falsas |
|---|---|---|---|
| PERDIDA_COMUNICACION | 1 | 4,898 | 0 |
| PICO_DEMANDA | 1 | 888 | 339 (p4) |
| CONSUMO_ANOMALO | 1 | 408 | 0 |
| MANTENIMIENTO | 2 | 320 | 0 |
| SOBRECARGA | 1 | 186 | 0 |
| FALLA_MEDIDOR | 3 | 59 | 0 |
| MANIPULACION | 2 | 38 | 0 |

Integridad de etiquetas verificada: **0 alertas** con `id_tipo_evento` incoherente respecto a su evento.

### 3.4 Consumo por tipo de servicio

| Tipo | Servicios | kWh reales | % |
|---|---|---|---|
| ALUMB_PUB | 339 | 11,024,351.8 | 28.94% |
| BOMBEO | 32 | 6,617,057.4 | 17.37% |
| HOSPITAL | 18 | 5,040,270.1 | 13.23% |
| POZO_AGUA | 26 | 3,591,776.3 | 9.43% |
| VIV_RESID | 985 | 3,198,794.7 | 8.40% |
| COM_LOCAL | 379 | 1,401,668.0 | 3.68% |
| MERCADO | 21 | 1,220,503.5 | 3.20% |
| CLINICA | 16 | 1,198,435.9 | 3.15% |
| VIV_UNIF | 981 | 1,136,310.3 | 2.98% |
| VIV_DEPTO | 949 | 754,842.8 | 1.98% |

Dato defendible: los **4 tipos industriales** (ALUMB_PUB, BOMBEO, HOSPITAL, POZO_AGUA) concentran
**68.97% del consumo con solo 415 servicios**. El resto son 4,585 servicios residenciales y
comerciales con 31% del consumo.

### 3.5 Consumo por zona (top 8 de 46)

| Zona | Tipo urbano | Servicios | kWh reales |
|---|---|---|---|
| Toluca de Lerdo | CENTRO | 1,468 | 12,279,456.9 |
| Crespa Floresta | RESIDENCIAL_ALTA | 211 | 2,804,026.1 |
| San Pedro Totoltepec | RESIDENCIAL_MEDIA | 131 | 1,942,790.2 |
| Sauces | RESIDENCIAL_ALTA | 186 | 1,821,805.7 |
| San Mateo Oxtotitlán | RESIDENCIAL_MEDIA | 151 | 1,540,359.6 |
| Santa Ana Tlapaltitlán | RESIDENCIAL_MEDIA | 179 | 1,469,307.1 |
| Santa María Totoltepec | RESIDENCIAL_MEDIA | 181 | 1,436,715.2 |
| San Buenaventura | RESIDENCIAL_MEDIA | 138 | 1,423,122.4 |

### 3.6 Recall de detección

499 de 7,296 eventos (6.8%) **no generan alerta**:

| Tipo | Eventos | Sin alerta | % perdido |
|---|---|---|---|
| MANIPULACION | 110 | 72 | 65% |
| FALLA_MEDIDOR | 149 | 90 | 60% |
| CONSUMO_ANOMALO | 583 | 175 | 30% |
| SOBRECARGA | 214 | 28 | 13% |
| PICO_DEMANDA | 920 | 32 | 3.5% |
| PERDIDA_COMUNICACION | 5,000 | 102 | 2% |
| MANTENIMIENTO | 320 | 0 | 0% |

Se ve más como asimetría en las ventanas de detección que como problema de datos: `MANTENIMIENTO`
no pierde ninguno y `MANIPULACION` pierde casi dos tercios.

---

## 4. Agregados: comparación antes y después

| Métrica | Base viva (sin sembrar) | Con RNG sembrado (reproducible) |
|---|---|---|
| consumo_real_kwh | 38,593,166.36 | 38,098,474.98 |
| consumo_kwh (facturado) | 38,451,823.96 | 38,613,384.12 |
| kwh_desviados | 207,517.78 | 261,407.88 |
| alertas con `id_evento` NULL | 339 | 339 |

Los conteos son idénticos en ambos casos. Sólo cambian los kWh, y sólo porque antes no había
semilla en los catálogos.

---

## 5. Cómo reproducir

```powershell
# Base de pruebas (NUNCA usar --reset contra energia_hsd, trunca datos)
$pw = ((docker inspect postgres_hsd --format '{{range .Config.Env}}{{println .}}{{end}}') |
       Where-Object { $_ -like 'POSTGRES_PASSWORD=*' }) -replace '^POSTGRES_PASSWORD=',''
$env:DB_HOST='localhost'; $env:DB_PORT='5433'
$env:DB_NAME='energia_hsd_prueba'; $env:DB_USER='equipo_hsd'
$env:DB_PASSWORD=$pw; $env:DB_SCHEMA='energia'; $env:APP_ENV='prueba'
& .\.venv\Scripts\python.exe main.py --reset
```

Prueba rápida: `main.py --servicios 200 --dias 7 --reset` (33,600 lecturas, ~10 s).
Corrida completa: 150 s, 10,839,782 registros.

El password se lee en runtime de `docker inspect`. **Nunca se escribe a disco ni a memoria.**

---

## 6. Decisiones abiertas (requieren al usuario)

### 6.1 Los kWh oficiales cambian

`resultados_corrida_10M.csv` y la base viva guardan los valores **sin sembrar**, que ya no se pueden
reproducir. Dos caminos:

- **Regenerar** los datos oficiales con RNG sembrado y actualizar el CSV. A favor: el proyecto pasa
  a ser reproducible de punta a punta, que es lo que pide la rúbrica.
- **Conservar** los actuales y documentar que no son reproducibles. Contra: si el profesor pide
  reproducir, no cuadra.

### 6.2 La etapa "analizar" no existe en el código

La clasificación `CONFIRMADA / NO_CONCLUYENTE / FALSO_POSITIVO` con `ts_cierre` **no está en el
repo**. Sólo aparece el nombre de las columnas en el `INSERT` de `Lecturas_Gen.py` y un
`count(a.ts_cierre)` en el datamart.

- Tras correr el pipeline: **7,136 alertas, 100% `(sin cerrar)`**.
- El backup `hsd17` sí trae la clasificación: 13,733 CONFIRMADA, 843 NO_CONCLUYENTE,
  414 FALSO_POSITIVO, 692 sin cerrar.
- La base viva tampoco la tiene.

Es decir, la clasificación se hizo por fuera del repositorio. La rúbrica pide **detectar, analizar
y alertar**: el paso de analizar no está en el código. **No se inventaron umbrales sin aprobación.**

### 6.3 Credenciales de Metabase hardcodeadas

`bi/dashboard_metabase.py` y `bi/aplicar_datamart.py` traen credenciales en el código. Falta
moverlas a variables de entorno. Es el punto 5 del plan de trabajo autorizado, pendiente de ejecutar.

---

## 7. Archivos modificados

```
 M bi/queries_datamart.sql   (9 líneas: dm_alertas corregida)
 M main.py                   (71 líneas: 3 arreglos + import de random)
?? Generation/Servicios/data/  (preexistente de Kalid, NO tocar)
```

Revisar con `git diff`. **No se ha hecho commit.**

---

## 8. Contexto que ya estaba verificado (no re-revisar)

- La base viva es `postgres_hsd` (PostgreSQL 16.15 alpine), rol `equipo_hsd`, DB `energia_hsd`,
  puerto `localhost:5433`. **No existe el rol `postgres`.**
- `energia_hsd.backup` es un experimento divergente: semilla 20260103, 15,839 eventos, sin datamart,
  esquema `public` fantasma, y formato PGDMP 1.16 que PG 16 rechaza (necesita PG 17). **No usar.**
- Esquema canónico de `medidor.calidad_enlace`: `SMALLINT NOT NULL` con
  `CHECK BETWEEN 50 AND 100`. Coinciden `01_esquema.sql`, el modelo físico del `.docx` y la base
  viva. **No cambiar a NUMERIC 0-1.**
- Columnas reales: `lectura(id_medidor, ts, consumo_kwh, consumo_real_kwh, id_evento)`,
  `evento(id_evento, id_medidor, id_tipo_evento, ts_inicio, ts_fin, intensidad, kwh_desviados)`,
  `alerta(id_alerta, id_evento, id_medidor, id_tipo_evento, ts_generacion, prioridad, ts_cierre,
  resultado)`. **No existen `kwh`, `flat_kwh` ni `ts_lectura`.**
- Integridad sana en la base: 0 lecturas huérfanas, 0 duplicados `(id_medidor, ts)`, 0 consumos
  negativos, 0 timestamps fuera de rango, 0 medidores sin servicio.
- Las 339 alertas con `id_evento IS NULL` son **intencionales** (`int(6797 x 0.05) = 339`). No son un
  bug de integridad referencial. El bug era que se etiquetaban como `PICO_DEMANDA`.
- Las diapositivas dicen 16,800 eventos y 12,900 alertas, y mencionan 48 zonas. Ninguna cifra
  cuadra con la base (7,296 / 7,136 / 46). **Pendiente, presentación excluida por orden del usuario.**
- `Generation/Servicios/data/` (4 JSON de Kalid) sigue untracked y respaldado en
  `C:\Users\mateo\AppData\Local\Temp\opencode\backup_devmateo_servicios`. No tocar.

---

*Documento generado por JARVIS. Sin commit. Presentación sin modificar.*
