# SIMET — Sistema de Monitoreo Energético

Panel web para monitorear el consumo eléctrico de una ciudad inteligente. Muestra lecturas horarias, medidores, zonas, alertas y facturación del programa piloto de medición inteligente de Toluca de Lerdo.

Proyecto de la materia *Tópicos de Tecnologías de Datos* (UAEMéx). El panel no genera datos: **los consume**. Los produce el data engine del proyecto HyperDataSynthetic y este repositorio es la capa de aplicación que los hace legibles.

Documentación adicional: [Manual de usuario](MANUAL_USUARIO.md), [Documentación técnica](DOCUMENTACION_TECNICA.md), [Guía de explotación BI](docs/bi/GUIA_BI.md), [verificación de datos](docs/evidencia/verificacion_datos.sql) y entregables DOCX/PDF en `entregables/`.

Presentación de la primera entrega, 51 diapositivas: [versión HTML](https://www.canva.com/design/DAHVsrHdw5Y/qyx19e2tr4fa1vqefyudrg/edit) · archivo autocontenido en `C:\Users\mateo\Documents\HSD_Deck.html` (ábrelo en navegador; flechas/espacio para navegar, `E` para editar texto). Respaldo editable en Canva: https://www.canva.com/design/DAHVsrHdw5Y/qyx19e2tr4fa1vqefyudrg/edit

---

## 1. De dónde salen los datos

Este repositorio **no es dueño del esquema de la base**. Es dueño de la interfaz y de la API.

| Repositorio | Papel | Qué es la fuente de verdad |
|---|---|---|
| [`KrC234/data-engine-for-energy-analysis`](https://github.com/KrC234/data-engine-for-energy-analysis) | Genera e inserta los datos sintéticos | **El esquema `energia`**, sus catálogos y el volumen de las tablas |
| Este repositorio | Lee ese esquema y lo expone en una API y un panel | Los nombres de columna que consulta la API |

La consecuencia práctica: **el DDL que se aplica a PostgreSQL es el del data engine** (`database/sql/01_esquema.sql` y `database/sql/02_catalogos.sql`), no `backend/sql/schema.sql`. El archivo de este repositorio se conserva como referencia del modelo ORM y no debe usarse para crear la base (ver sección 11).

### Contrato de datos esperado

| Concepto | Valor canónico |
|---|---|
| Periodo simulado | 1 de enero a 31 de marzo de 2026 (90 días) |
| Intervalo de lectura | 60 minutos |
| Puntos de consumo (servicios) | 5,000 |
| Medidores activos | 5,000 (+ 260 de reemplazo) |
| Lecturas | 10,800,000 |
| Total de filas | ≈ 10,839,782 |
| Zonas | 46 localidades reales de Toluca |
| Tipos de servicio | 18 |
| Tarifas | 7 |
| Tipos de evento | 7 |
| Perfiles de carga horaria | 1,296 (18 tipos × 3 tipos de día × 24 horas) |
| Semilla de la corrida | 20260103 |

Tablas del esquema `energia` (13): `corrida_generacion`, `zona`, `tarifa`, `tipo_servicio`, `tipo_evento`, `calendario`, `perfil_carga_horaria`, `servicio`, `medidor`, `evento`, `alerta`, `periodo_facturacion`, `lectura`.

`lectura` está particionada por rango mensual (`lectura_2026_01`, `_02`, `_03`). La llave primaria es `(id_medidor, ts)` y no hay índice sobre `ts` solo. Ese detalle explica casi todo lo de la sección 10.

---

## 2. Arquitectura

```
Navegador
  -> Frontend: React 19 + TypeScript + Vite 8 + Tailwind 4     http://localhost:8443
       -> HTTP/JSON
  -> Backend:  Python + FastAPI + SQLAlchemy 2                 http://127.0.0.1:8000
       -> SQL (psycopg 3)
  -> PostgreSQL 16, esquema `energia`
```

Frontend y backend son procesos independientes. El frontend no toca la base nunca: pide JSON a la API y la API es la única que conoce las credenciales. La URL base del backend sale de `VITE_API_URL`.

No se usa una librería de router. `src/navigation.ts` define `PAGE_ROUTES`, `getPageFromLocation()` y `routeHash()`. `App.tsx` guarda la página activa en estado, sincroniza el hash `#/<slug>` y escucha `hashchange`, de modo que la recarga funciona incluso en alojamiento estático.

---

## 3. Requisitos

- Python 3.10 o superior
- Node.js 20.19 o superior (lo exige Vite 8)
- PostgreSQL 16 con el esquema `energia` ya poblado (ver sección 1)

---

## 4. Puesta en marcha

### 4.1 Base de datos

Hay dos caminos y conviene saber cuál se está usando.

**Camino A — datos canónicos del data engine (recomendado).** Clonar el data engine y seguir su README: aplica `database/sql/01_esquema.sql`, después `database/sql/02_catalogos.sql`, genera los perfiles de carga y ejecuta `python main.py` con su `.env` configurado. Al final quedan las 13 tablas con 10.8 millones de lecturas.

**Camino B — datos de desarrollo.** Útil para trabajar en la interfaz sin cargar diez millones de filas. Sirve cualquier juego coherente de datos, pero debe respetar los tipos canónicos: `medidor.calidad_enlace` es un entero entre 50 y 100 (porcentaje), no una fracción de 0 a 1, y `perfil_carga_horaria.tipo_dia` vale `'H'`, `'S'` o `'D'`.

### 4.2 Backend

```powershell
python -m venv ven
.\ven\Scripts\Activate.ps1

pip install -r requirements.txt

# Crear .env en la raíz a partir de la plantilla
Copy-Item .env.example .env

python -m uvicorn backend.app.main:app --reload --port 8000
```

La API queda en http://127.0.0.1:8000 y Swagger en http://127.0.0.1:8000/docs.

Los imports internos son relativos (`from ..database import ...`), así que el servidor se lanza **desde la raíz del repositorio**, no desde `backend/`.

### 4.3 Frontend

```powershell
npm install
npm run dev
```

Queda en http://localhost:8443. El servidor escucha en `0.0.0.0:8443` con `strictPort`, es decir, si el puerto está ocupado Vite falla en vez de buscar otro.

### 4.4 Variables de entorno

| Variable | Uso | Dónde se lee |
|---|---|---|
| `DATABASE_URL` | Cadena de conexión con el prefijo del driver. El backend no arranca sin ella. | `backend/app/database.py` |
| `VITE_API_URL` | URL base de la API para el navegador. | `src/services/*.ts` |

```env
DATABASE_URL=postgresql+psycopg://usuario:password@localhost:5432/energia_hsd
VITE_API_URL=http://127.0.0.1:8000
```

`psql` no entiende el prefijo `+psycopg`; para la línea de comandos se quita: `postgresql://usuario:password@localhost:5432/energia_hsd`.

`VITE_API_URL` se incrusta en el bundle al compilar. Cambiarla exige reiniciar Vite o reconstruir.

---

## 5. API

Base: `/api`. Documentación interactiva en `/docs`.

### 5.1 Diagnóstico

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Mensaje de salud del servicio |
| GET | `/health` | Estado de la API |

### 5.2 Zonas

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/zonas` | Catálogo de las 46 zonas con datos demográficos |
| GET | `/api/zonas/{id_zona}` | Detalle de una zona |
| GET | `/api/zonas/indicadores` | Indicadores de las 46 zonas en un solo cálculo. Parámetros: `mes` (1–3), `ahorro_pct` |

`/api/zonas/indicadores` devuelve el arreglo completo de zonas, no una por petición. El mes se limita a enero, febrero y marzo porque ésos son los meses que existen en el periodo simulado.

### 5.3 Dashboard, servicios y medidores

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/dashboard` | KPIs del día, mapa, consumo por zona y alertas recientes. Parámetros: `fecha`, `id_zona`, `limite_top` |
| GET | `/api/servicios` | Lista de servicios con filtros |
| GET | `/api/servicios/{id_servicio}` | Detalle de un servicio |
| GET | `/api/medidores` | Inventario de medidores con calidad de enlace y estado |
| GET | `/api/medidores/{id_medidor}` | Detalle de un medidor |

### 5.4 Lecturas

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/historial-lecturas` | Listado paginado. Parámetros: `pagina`, `por_pagina`, `desde`, `hasta`, `id_medidor`, `id_zona`, `busqueda_medidor`, `orden` |
| GET | `/api/historial-lecturas/original` | Registro puntual por `id_medidor` y `ts` |
| GET | `/api/historial-lecturas/agrupado` | Agregados por hora, día o mes |
| GET | `/api/historial-lecturas/huecos` | Detección de intervalos sin lectura. Parámetro clave: `intervalo_esperado_minutos` |
| GET | `/api/historial-lecturas/exportar.csv` | Exportación CSV con los mismos filtros |

El parámetro `intervalo_esperado_minutos` **tiene que ir en 60** con los datos canónicos. El valor por defecto del backend es 15, y como las lecturas son horarias, con 15 toda lectura cuenta como hueco. El panel siempre manda 60; solo afecta a quien llame la API a mano.

### 5.5 Análisis energético

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/analisis-energetico/medidores` | Medidores disponibles para el selector |
| GET | `/api/analisis-energetico/lecturas` | Lecturas de un medidor en un rango |
| GET | `/api/analisis-energetico/resumen` | Resumen de un medidor. Requiere `id_medidor` |
| GET | `/api/analisis-energetico/perfil-horario` | Curva de 24 horas. Requiere `id_tipo_servicio` |
| GET | `/api/analisis-energetico/periodos` | Periodos de facturación |
| GET | `/api/analisis-energetico/agregado` | Comparación agregada |
| GET | `/api/analisis-energetico/tipos-dia` | Catálogo de tipos de día para el filtro |

### 5.6 Calendario

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/calendario-energetico` | Calendario del periodo. Parámetros: `anio`, `mes_inicio`, `mes_fin`. |
| GET | `/api/calendario-energetico/{fecha}` | Detalle de un día |

El módulo `backend/app/routers/calendario.py` existe en el repositorio pero **no está registrado** en `main.py`, así que las rutas `/api/calendario` devuelven 404. Quedó de una versión anterior del recurso. O se borra el archivo o se registra; lo que no conviene es registrar los dos, porque duplican el mismo recurso.

### 5.7 Alertas y tarifas

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/alertas` | Listado con filtros. Parámetros: `mes`, `anio`, `prioridad`, `estado`, `id_zona`, paginación |
| GET | `/api/alertas/{id_alerta}` | Detalle de una alerta |
| GET | `/api/alertas/catalogos` | Catálogos para los filtros de la pantalla |
| GET | `/api/tarifas` | Catálogo tarifario con conteo de servicios |
| POST | `/api/tarifas` | Alta de tarifa |
| GET | `/api/tarifas/{id_tarifa}` | Detalle de una tarifa |
| PUT | `/api/tarifas/{id_tarifa}` | Modificación de tarifa |
| DELETE | `/api/tarifas/{id_tarifa}` | Baja de tarifa |

Una alerta está cerrada cuando `ts_cierre` no es nulo. No existe una columna `estado`: el estado se deriva. Cualquier filtro que invente una columna de estado está mal.

---

## 6. Pantallas

Nueve páginas, agrupadas en tres bloques del menú lateral (`src/navigation.ts`).

| Clave | Componente | Grupo | Qué muestra | Endpoint principal |
|---|---|---|---|---|
| `dashboard` | `Dashboard.tsx` | Operación | KPIs del día, selector de fecha, mapa Leaflet, consumo por zona, alertas recientes | `/api/dashboard` |
| `zonas` | `Zones.tsx` | Operación | Indicadores por zona, ranking, catálogo, estado de medición | `/api/zonas` + `/api/zonas/indicadores` |
| `hogares` | `Households.tsx` | Operación | Servicios registrados, medidores asociados, carga contratada, solar | `/api/servicios` |
| `medidores` | `Meters.tsx` | Operación | Inventario, estado, calidad de enlace | `/api/medidores` |
| `alertas` | `Alerts.tsx` | Operación | Alertas activas y cerradas, prioridad, medidor y servicio afectado | `/api/alertas` |
| `analisis-energetico` | `EnergyAnalysis.tsx` | Análisis | Curva horaria, comparación mensual, perfil por tipo de día | `/api/analisis-energetico/*` |
| `historial-lecturas` | `ReadingHistory.tsx` | Análisis | Registros, calidad del dato, huecos, exportación CSV | `/api/historial-lecturas/*` |
| `calendario-energetico` | `EnergyCalendar.tsx` | Análisis | Días festivos, vacacionales, temperatura, factor estacional | `/api/calendario-energetico` |
| `tarifas` | `Tariffs.tsx` | Administración | Catálogo tarifario, límite DAC, servicios asignados | `/api/tarifas` |

Toda la interfaz consume datos reales de la API. No queda ningún componente alimentado por datos simulados en el frontend.

### Tema

`src/theme/ThemeProvider.tsx` expone modo claro/oscuro y acento de color. El tema se aplica con el atributo `data-theme` en `<html>` y tokens en `src/index.css`. Arranca en oscuro cuando el sistema operativo no declara preferencia. Los contrastes medidos de los tokens base van de 15.80:1 a 17.22:1, por encima de AAA.

---

## 7. Estructura del repositorio

```
.
├── backend/
│   ├── app/
│   │   ├── main.py              App FastAPI, CORS y registro de los 9 routers
│   │   ├── database.py          Engine, SessionLocal, Base declarativa, get_db()
│   │   ├── models/              13 modelos SQLAlchemy, uno por tabla de energia.*
│   │   ├── routers/             9 routers con las rutas de la sección 5
│   │   └── schemas/             Esquemas Pydantic de cada respuesta
│   └── sql/schema.sql           DDL de referencia del ORM. NO crear la base con él (sección 11)
├── src/
│   ├── App.tsx                  Layout, sidebar, topbar y cambio de página
│   ├── navigation.ts            Catálogo de páginas: clave, etiqueta, grupo, icono
│   ├── index.css                Tailwind, tokens de tema y clases propias
│   ├── theme/ThemeProvider.tsx  Modo claro/oscuro y acento
│   ├── hooks/useAutoRefresh.ts  Refresco periódico de datos
│   ├── components/              Una página por archivo + ui/ con los componentes base
│   ├── services/                Un cliente HTTP por recurso de la API
│   └── data/synthetic.ts        Tipos del dominio heredados. Sin uso, ver sección 11
├── .env.example                 Plantilla de variables de entorno
├── vite.config.ts               Alias @ -> src, servidor 0.0.0.0:8443 con strictPort
├── tsconfig.json                Modo strict
├── package.json                 Scripts: dev, build, preview, format
└── requirements.txt             Dependencias de Python
```

---

## 8. Comandos

```powershell
# Backend
pip install -r requirements.txt
python -m uvicorn backend.app.main:app --reload --port 8000

# Frontend
npm install
npm run dev
npm run build
npm run format        # oxfmt
```

En PowerShell corporativo `npm` puede estar bloqueado por la política de ejecución. En ese caso: `cmd /c npm run dev`.

No hay pruebas automatizadas, linter ni integración continua. La verificación es manual:

```powershell
npx tsc --noEmit      # TypeScript, debe salir sin salida y con código 0
npm run build         # build de producción
```

---

## 9. Verificación rápida de la conexión

Si la API responde pero el panel muestra errores, el problema está en la cadena y se localiza en orden:

1. `http://127.0.0.1:8000/health` — si falla, el backend no arrancó o no encontró `DATABASE_URL`.
2. `http://127.0.0.1:8000/api/zonas` — si falla con 500, la conexión a PostgreSQL o el esquema están mal.
3. `http://127.0.0.1:8000/api/dashboard` — si falla aquí pero zonas funciona, faltan las tablas de hechos.
4. Consola del navegador — si todo lo anterior responde, revisar CORS y `VITE_API_URL`.

CORS solo autoriza `http://localhost:8443`, `http://127.0.0.1:8443`, `http://localhost:5173` y `http://127.0.0.1:5173`. Cambiar el puerto del frontend obliga a editar `backend/app/main.py`, `vite.config.ts`, `.env.example` y este documento.

---

## 10. Rendimiento con el volumen canónico

Medido contra una base con las 5,000 cuentas y 10,800,000 lecturas, con los 10.8 millones de filas ya en las tres particiones:

| Endpoint | Tiempo |
|---|---|
| `/api/tarifas` | 0.03 s |
| `/api/calendario-energetico` | 0.02 s |
| `/api/zonas` | 0.12 s |
| `/api/alertas?limit=50` | 0.48 s |
| `/api/dashboard` | 0.57 s |
| `/api/servicios` | 0.65 s |
| `/api/medidores` | 0.87 s |
| `/api/zonas/indicadores` | 4.60 s |
| `/api/historial-lecturas?por_pagina=50` | 6.89 s |
| `/api/historial-lecturas/huecos` | 18.18 s |

Los dos últimos son el techo actual y tienen causa identificada, no son un misterio del motor de base de datos:

- **`/api/historial-lecturas`** ejecuta un `count(*)` sobre 10.8 millones de filas antes de paginar, y ordena por `ts` sin índice que lo cubra. Con `id_medidor` el tiempo baja a 0.05 s, porque entra por la llave primaria.
- **`/api/historial-lecturas/huecos`** usa una función de ventana `lag()` sobre `(id_medidor, ts)` de toda la tabla cuando no se filtra por medidor. El panel lo llama sin filtro al pulsar "Detectar huecos".
- **`/api/zonas/indicadores`** empieza con `SELECT max(ts) FROM energia.lectura`, que sin índice sobre `ts` obliga a recorrer las tres particiones completas: 0.65–0.97 s de los 4.6 s salen de ahí. El resto son dos agregados mensuales.

Ninguno rompe la aplicación; el panel responde. Pero conviene saberlo antes de la defensa: pulsar "Detectar huecos" contra el volumen completo tarda cerca de veinte segundos.

---

## 11. Problemas conocidos

**`backend/sql/schema.sql` no sirve para crear la base.** Son doce líneas: crean el esquema `energia` y una sola tabla, `zona`, de las trece que consulta la API. No hay particiones, no hay CHECK, y a `zona` le faltan las cuatro columnas demográficas que el data engine agrega con `ALTER TABLE` en `02_catalogos.sql` (`poblacion_total`, `viviendas_habitadas`, `grado_rezago_representativo`, `id_referencia`). Aplicarlo deja doce tablas sin existir: todo lo que no sea `/api/zonas` falla. El DDL se toma del data engine, punto.

**El ORM declara un tipo que no es el canónico.** `models/medidor.py` tipa `calidad_enlace` como `Numeric(5,4)`; el data engine la define `SMALLINT` con CHECK entre 50 y 100. Con `NUMERIC(5,4)` el valor canónico 82 no cabe: PostgreSQL responde `numeric field overflow`, porque el máximo es 9.9999. La lectura no se rompe, porque el motor devuelve el entero y SQLAlchemy lo convierte sin validar; escribir por el ORM sí falla. La interfaz sobrevive a las dos convenciones porque `Meters.tsx` normaliza (`value <= 1 ? value * 100 : value`). Es una línea a corregir cuando se alinee el modelo.

**`synthetic.ts` es código muerto.** 9 KB de tipos y datos inventados que ningún componente importa desde el rediseño. Se conserva solo por los tipos del dominio; conviene extraer los tipos a un archivo propio y borrar los datos.

**`Reports.tsx` no se renderiza.** No está en `navigation.ts` ni en el bloque de `App.tsx`. O se integra o se elimina.

**`testBackend()` en `src/services/api.ts` apunta a `/api/test`, que no existe.** La ruta real es `/health`. La función no la importa nadie.

**`alertas_activas` quedó corregido en `/api/zonas/indicadores` y `/api/dashboard`.** Ambos derivan el estado de `ts_cierre IS NULL`, igual que `/api/alertas`, en vez de buscar una columna `estado` inexistente o devolver cero fijo. Verificado contra la base: `/api/zonas/indicadores?mes=3` informa 284 abiertas de 5,311 alertas de marzo, y `/api/dashboard` informa 692 abiertas en total.

**`mes` en `/api/zonas/indicadores` solo acepta 1, 2 y 3.** Coincide con el periodo simulado, pero si el data engine amplía el rango de fechas, el endpoint hay que ajustarlo.

---

## 12. Convenciones

- Idioma español en la interfaz, en los nombres de dominio, en los mensajes de la API y en los commits.
- Un cliente HTTP por recurso en `src/services/`; los componentes no llaman `fetch` a mano salvo casos justificados.
- Para agregar un recurso: modelo en `models/`, esquema Pydantic con `from_attributes=True` en `schemas/`, router con `prefix="/api/<recurso>"` en `routers/` y `app.include_router(...)` en `main.py`.
- SQLAlchemy 2 en estilo declarativo: `Mapped`, `mapped_column`, `select()` y `db.scalars()`.
- Consultas con `text()` se usan en `zonas.py` y `analisis_energetico.py` porque la API tolera variantes de columnas. Es una decisión de compatibilidad, no un patrón a extender.
- No commitear `.env`, `ven/`, `node_modules/` ni `dist/`.
- Solo npm como gestor de paquetes (`package-lock.json`). Al regenerar `requirements.txt` en PowerShell, forzar UTF-8: `pip freeze | Out-File -Encoding utf8 requirements.txt`.

---

## 13. Integración develop-v3: HSD, datamart y BI

Esta sección incorpora el aporte de la rama `develop-v3` de los compañeros al release local v2.5.

### 13.1 Datamart y generador HSD

El sistema usa un **datamart** con esquema `datamart` y vistas `dm_*` para consumo analítico (KPIs, consumo por zona/servicio, anomalías y validación).

El **generador HSD (Hyper-Synthetic Data) v2.0** crea datos sintéticos con técnica similar a redes neuronales (tanh), mezcla gaussiana y estacionalidad, sin depender de una base real:

- `GET /api/generador-hsd/info`
- `GET /api/generador-hsd/status`
- `GET /api/generador-hsd/perfiles-existentes`
- `POST /api/generador-hsd/generar-masivo` — genera lecturas a partir de `fecha_inicio`, `dias`, `factor_escala` y `usar_neural_like`.

Ejemplo:

```json
POST /api/generador-hsd/generar-masivo
{
  "fecha_inicio": "2024-01-01",
  "dias": 730,
  "factor_escala": 50,
  "usar_neural_like": true
}
```

Con esta vía se preparan los datos para alcanzar escalas de **10M+ registros** y la conexión con **Power BI**.

### 13.2 Estado funcional incorporado

- Interfaz completa y funcional: Resumen, Zonas, Servicios, Medidores, Alertas, Análisis, Lecturas, Calendario y Tarifas.
- Navegación por hash estable en las nueve rutas; recarga segura en alojamiento estático.
- Encabezados unificados, jerarquía tipográfica coherente, controles accesibles, estados vacíos y errores accionables, responsive sin overflow horizontal y controles táctiles mínimos de 40 px.
- Calendario energético con navegación por año y todos los meses con registros.
- Dependencia de datos: `energia.lectura` debe poblarse o regenerarse con el generador HSD para que las gráficas de Análisis se rendericen.

### 13.3 Verificación de calidad reportada por develop-v3

- `npx tsc --noEmit` sin errores.
- `npm run build` exitoso.
- Navegación en 9 rutas con render correcto y sin errores de consola.

La verificación de esta fusión se documenta al cierre de la integración.

---

## 14. Entrega final

La rama `final` contiene el paquete completo de entrega en `ENTREGA_FINAL`: documentación, presentación, evidencia, insumo de Power BI y una copia limpia del generador en `ENTREGA_FINAL/GENERADOR_HSD`. El generador se incluye solo como referencia de reproducción; el esquema `energia` sigue siendo propiedad del data engine.

El índice del paquete está en `ENTREGA_FINAL/INDICE_ENTREGA.md`. La auditoría vigente es 29 `SI` y 0 `NO`. La única tarea abierta es la captura de la autocalificación individual de 6.2.

La presentación de defensa es la copia corregida de Canva `DAHb7o_LRYc`. El PPTX incluido se conserva intacto como respaldo. Metabase no quedó desplegado: el criterio de BI se cierra con el reporte y el archivo PBIX.

---

## 15. Asistente plus con LLM

Módulo informativo y desacoplado. El LLM solo redacta; los números los calcula `backend/app/services/estadisticas.py` con `SELECT` contra las vistas `datamart.dm_*` y tablas `energia` permitidas. El modelo no recibe la conexión a la base: elige herramientas declaradas y Python ejecuta la consulta validada. El usuario puede pedir SQL de solo lectura mediante `ejecutar_sql_lectura`; están prohibidas la escritura, los comentarios, las múltiples sentencias y cualquier cambio de tablas o esquema. No se agregó ninguna dependencia nueva de Python: el cliente usa `urllib.request` de la biblioteca estándar.

### 15.1 Variables de entorno

Copiar de `.env.example` a `.env`. Nunca subir `.env` ni credenciales reales.

| Variable | Uso |
|---|---|
| `ASISTENTE_DATABASE_URL` | Conexión obligatoria del asistente con rol de solo lectura. No existe fallback a `DATABASE_URL`. |
| `ASISTENTE_STATEMENT_TIMEOUT_MS` | Tiempo máximo por consulta. Valor por defecto `30000`; `dm_validacion_integridad` tardó 20.5 s en medición real. |
| `ASISTENTE_RATE_LIMIT` / `ASISTENTE_RATE_WINDOW` | Límite por IP y sesión. Por defecto 30 consultas por 60 s. |
| `LLM_PROVIDER` | `openai`, `groq`, `ollama` o un proveedor compatible con `/chat/completions`. |
| `LLM_MODEL` | Modelo a invocar. Para Ollama: `qwen2.5:3b`. |
| `LLM_API_KEY` | Secreto del proveedor. Vacío solo es válido con base loopback; si no, desactiva la redacción. |
| `LLM_BASE_URL` | Base de la API compatible. Opcional para OpenAI, Groq y Ollama. |
| `LLM_TIMEOUT` | Segundos máximos por llamada al modelo. Por defecto `25`; rango permitido 5–180. |

Con `LLM_PROVIDER=ollama` el backend usa `http://127.0.0.1:11434/v1`. El plan se resuelve siempre en local; Ollama solo redacta el payload verificado. Las cifras siguen saliendo de PostgreSQL y las definiciones de `Base de Conocimiento SIMET`.

El rol de solo lectura se crea con `docs/sql/asistente_readonly.sql`. Concede `USAGE` y `SELECT` en `energia` y `datamart`, quita `CREATE` y no toca otros esquemas.

### 15.2 Endpoints

- `GET /api/asistente/sugerencias`: seis atajos opcionales.
- `POST /api/asistente/consultar`: cuerpo `{"pregunta": "...", "historial": [...]}`; pregunta y cada mensaje del historial tienen entre 1 y 800 caracteres. Se conservan los últimos seis turnos, es decir doce mensajes.

Cada respuesta trae `respuesta`, `fuentes`, `formulas_aplicadas`, `datos_visualizacion`, `modo`, `origen` y `aviso`, más los campos de compatibilidad `fuente`, `metodo`, `datos` y `grafica`. Las consultas repetidas se cachean 10 minutos en memoria.

Saludos, capacidades, definiciones del glosario y consultas que nombran una fórmula, semilla, integridad o alertas abiertas se resuelven sin llamar al proveedor: `origen` es `local`. Las respuestas conceptuales citan `Base de Conocimiento SIMET` y nunca exponen rutas internas como `payload.resultado.respuesta_base`. Las consultas con datos usan el proveedor solo para redactar un payload ya verificado; si el proveedor no está configurado o falla, `origen` cambia a `local` y el endpoint sigue funcionando.

El navegador guarda los últimos seis turnos en `localStorage` con la clave `simet-asistente-historial-v1`. Al cargar se sanitan los roles, el número de mensajes y los 800 caracteres por mensaje. PostgreSQL permanece de solo lectura para el asistente.

### 15.2.1 Reglas de honestidad y SQL verificable

- `consultar_agregados` devuelve promedio, suma, mínimo, máximo y conteo sobre columnas permitidas de `datamart.dm_kpi_diarios`, con ventana opcional de 7, 15 o 30 días contada desde la última fecha observada.
- `ejecutar_sql_lectura` acepta una sola sentencia `SELECT` o `WITH` de hasta 2,000 caracteres, sin comentarios y sin palabras de escritura; devuelve hasta 200 filas y cita los esquemas detectados.
- SIMET no almacena pronósticos oficiales. `proyeccion_tendencia` produce una estimación derivada con banda de predicción y siempre añade `aviso`. Si preguntan por un pronóstico oficial o registrado, la respuesta es local y usa `SIN_PRONOSTICO_OFICIAL`.
- «Pronóstico», «predicción» y «proyección» sin calificador activan `proyeccion_tendencia`. Un mes como «abril» se traduce a 30 días desde la última fecha observada, no a datos de abril medidos.
- Las fórmulas nuevas se revisan y registran en `backend/app/services/formulas.py`. No se extraen de internet ni se ejecutan en caliente.
- Las preguntas básicas de hora y fecha se resuelven en local con `respuesta_reloj`, sin llamar al proveedor. La cita es `reloj local del servidor SIMET`; no se presentan como datos del dominio. La identidad se responde con `respuesta_identidad` y la cita es `Base de Conocimiento SIMET`. Una pregunta combinada, como `Hola, dime quien eres y que hora es?`, se responde en un solo turno con ambas fuentes.
- El corpus operativo editable está en `docs/base_conocimiento/CORPUS_OPERATIVO_SIMET.md`. El archivo `.docx` se regenera desde ese Markdown; no se edita a mano. No se generan ni copian PDFs sin petición explícita.
- Los PDFs de SIMET se eliminaron el 25/11/2026 para liberar espacio. Quedan cinco respaldos `.pdf.bak_*`; no se borraron porque no terminan en `.pdf` y la confirmación cubrió solo los 30 archivos `.pdf`.
- La base de datos es la fuente de cifras; la `Base de Conocimiento SIMET` solo contiene definiciones. El plan local reconoce «métricas de <zona>» y `consultar_zonas` filtra la zona antes de agregar lecturas y eventos. Los parámetros opcionales de zona usan `CAST(:zona AS TEXT)` para evitar el error `AmbiguousParameter` de psycopg.
- En `modo=datos`, las citas son tablas verificadas. `_corregir_citas` elimina cualquier mención a `Base de Conocimiento SIMET` añadida por el redactor.
- Las respuestas de zonas indican `Periodo: Acumulado enero–marzo de 2026 (90 días). No es promedio mensual.` La cifra es el acumulado de lecturas y eventos, no un promedio. El promedio mensual no está almacenado.
- La gráfica de zonas compara consumo total contra consumo reportado. No mezcla `kwh_desviados` con consumo porque su escala es tres órdenes menor. Con una sola zona, el título nombra la zona y el subtítulo muestra el periodo.

### 15.3 Prueba rápida

```powershell
$env:PYTHONPATH='.'
ven\Scripts\python.exe -m py_compile backend/app/services/parametros.py backend/app/services/formulas.py backend/app/services/conocimiento_simet.py backend/app/services/estadisticas.py backend/app/services/llm.py backend/app/schemas/asistente.py backend/app/routers/asistente.py
cmd /c npx tsc --noEmit
cmd /c npm run build
ven\Scripts\python.exe -m uvicorn backend.app.main:app --port 8000
```

Con la API levantada:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/asistente/sugerencias | Select-Object intent,pregunta
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/api/asistente/consultar -ContentType 'application/json' -Body '{"pregunta":"¿Cuántas lecturas hay y con qué semilla se generó?"}' | ConvertTo-Json -Depth 6
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/api/asistente/consultar -ContentType 'application/json' -Body '{"pregunta":"¿Cuál es la proyección de consumo para los próximos 7 días?"}' | ConvertTo-Json -Depth 6
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/api/asistente/consultar -ContentType 'application/json' -Body '{"pregunta":"¿Cuál es el promedio de consumo en 7 días?"}' | ConvertTo-Json -Depth 6
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/api/asistente/consultar -ContentType 'application/json' -Body '{"pregunta":"Ejecuta este SQL: SELECT fecha, consumo_total_kwh FROM datamart.dm_kpi_diarios ORDER BY fecha DESC LIMIT 3"}' | ConvertTo-Json -Depth 6
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/api/asistente/consultar -ContentType 'application/json' -Body '{"pregunta":"¿Tienes un pronóstico oficial?"}' | ConvertTo-Json -Depth 6
```

La interfaz queda en `#/asistente`. Los botones rápidos son atajos opcionales; el campo acepta preguntas abiertas sobre SIMET.

### 15.4 Consumo de tokens y documentación

El redactor dejó de recibir el glosario completo: usa `REDACTOR_REDUCIDO`, de 460 caracteres, y un resumen del payload de hasta 4,000 caracteres con cinco filas por herramienta. Las respuestas locales no consumen tokens del proveedor. Tiempos medidos después del cambio: `Hola` 67 ms, `¿Qué puedes hacer?` 27 ms, `¿Qué significa Tarifa DAC?` 17 ms. Las consultas con datos siguen usando dos llamadas como máximo: una de planeación solo cuando la pregunta no es nominal, y una de redacción.

El manual de uso, la guía rápida y 21 capturas están en `docs/manual_usuario`:

- `MANUAL_USUARIO.md`: fuente editable.
- `MANUAL_DE_USO_Y_GUIA_DE_USUARIO_SIMET.docx` y `.pdf`: entregables en Arial 12, blanco y negro, sin portada.
- `capturas/`: nueve pantallas, estados del asistente, vistas móviles y desplazamiento intermedio de las pantallas largas.
- `auditoria_visual.json`: métricas de ancho, desbordamiento y emulación de movimiento reducido.

No había servidor MCP `chrome-devtools` disponible. La revisión visual se hizo con Microsoft Edge 158 en modo headless controlado por CDP, en 1440x900 y 390x844x2. No se registró desbordamiento horizontal en las vistas revisadas y `prefers-reduced-motion` respondió `true` bajo emulación.

### 15.5 Paleta de acento del tema claro

Los tokens de `src/index.css` usan cinco señales vibrantes: naranja `#FF7A00` (principal, igual al logo), verde `#00C853`, azul `#0088FF`, violeta `#7C3AED` y turquesa `#00B8D9`. Alimentan `--chart-1` a `--chart-5`, el selector de acento, las barras de progreso y los rellenos de estado (`--success-fill`, `--warning-fill`, `--info-fill`, `--violet-fill`). Las variantes de texto sobre fondos claros son `#A84A00`, `#0E7A43`, `#005BB5`, `#5B21B6` y `#006B82`, todas con contraste AA verificado. El naranja, verde, azul y turquesa llevan texto `--ink` encima; el violeta lleva blanco. El rojo de `--danger-fill` se conserva por semántica de error y no forma parte de la paleta de datos.

Los identificadores internos del selector siguen siendo `orange`, `lime`, `cyan`, `violet` y `teal` para no romper preferencias guardadas en `localStorage`; las etiquetas visibles son Naranja, Esmeralda, Azul eléctrico, Violeta y Turquesa.
