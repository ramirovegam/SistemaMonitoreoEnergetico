# SIMET — Sistema de Monitoreo Energético

Panel web para monitorear el consumo eléctrico de una ciudad inteligente. Muestra lecturas horarias, medidores, zonas, alertas y facturación del programa piloto de medición inteligente de Toluca de Lerdo.

Proyecto de la materia *Tópicos de Tecnologías de Datos* (UAEMéx). El panel no genera datos: **los consume**. Los produce el data engine del proyecto HyperDataSynthetic y este repositorio es la capa de aplicación que los hace legibles.

Para instalar SIMET en otro equipo, sigue la [puesta en marcha completa](#4-puesta-en-marcha) de PostgreSQL, la API, el panel y el asistente con RAG.

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
   -> PostgreSQL, esquemas `energia` y `datamart`
```

Frontend y backend son procesos independientes. El frontend no toca la base nunca: pide JSON a la API y la API es la única que conoce las credenciales. La URL base del backend sale de `VITE_API_URL`.

No se usa una librería de router. `src/navigation.ts` define `PAGE_ROUTES`, `getPageFromLocation()` y `routeHash()`. `App.tsx` guarda la página activa en estado, sincroniza el hash `#/<slug>` y escucha `hashchange`, de modo que la recarga funciona incluso en alojamiento estático.

---

## 3. Requisitos

- **Git**, **Python 3.14 de 64 bits** (versión usada en las comprobaciones) y **Node.js 22.12 o posterior** con npm.
- **PostgreSQL** con `psql`, `pg_dump` y `pg_restore` en el `PATH`. Para restaurar una copia, usa PostgreSQL de la misma versión mayor que el servidor de origen o posterior. **PostgreSQL 18** es la versión usada para validar esta guía.
- Conexión a internet para instalar dependencias y descargar el modelo de embeddings de Hugging Face la primera vez. Para redactar con Cerebras se necesita una **API key con acceso a generación**. La búsqueda funciona en CPU, sin GPU ni Ollama.

---

## 4. Puesta en marcha

Estos pasos instalan todos los componentes en **el mismo equipo de destino**, con PostgreSQL en `127.0.0.1:5432`. Si tu servidor usa otro puerto, sustitúyelo en los comandos y en **las dos URL de PostgreSQL** del `.env`.

### 4.1 Obtener el código

Si `final2` está publicada y tienes acceso por SSH a GitHub, clona esa rama:

```bash
git clone --branch final2 git@github.com:ramirovegam/SistemaMonitoreoEnergetico.git
cd SistemaMonitoreoEnergetico
```

Si la rama solo está en el equipo de origen, genera un archivo con `git bundle create ../SIMET.bundle final2`, cópialo al destino y ejecuta:

```bash
git clone --branch final2 SIMET.bundle SistemaMonitoreoEnergetico
cd SistemaMonitoreoEnergetico
```

El bundle transporta commits. Crea un `.env` nuevo en el destino; los datos de PostgreSQL se trasladan aparte y el índice del RAG se genera allí.

### 4.2 Preparar PostgreSQL y cargar los datos

Enciende PostgreSQL y entra a `psql` como administrador. El ejemplo usa `postgres`; sustitúyelo si tu instalación usa otro usuario administrador. Si `energia_hsd` ya está poblada, conserva esa base: usa su dueño en lugar de `simet_app` en los pasos siguientes y crea `simet_asistente` solo si no existe. Luego salta al paso 4.3.

```bash
psql -h 127.0.0.1 -p 5432 -U postgres -d postgres
```

En `psql`, crea un usuario dueño de la base y otro para el asistente. `\password` pide cada contraseña de forma interactiva:

```text
CREATE ROLE simet_app LOGIN;
\password simet_app
CREATE ROLE simet_asistente LOGIN;
\password simet_asistente
CREATE DATABASE energia_hsd OWNER simet_app;
\q
```

Elige **una** de las siguientes opciones para poblar la base nueva.

**Opción A — Restaurar los datos del equipo de origen.** Si ya tienes `energia_hsd.backup` en formato personalizado de PostgreSQL, cópialo al destino. Para crear un respaldo nuevo, ejecuta esto en el **equipo de origen**, reemplazando `USUARIO_ORIGEN` por un usuario con acceso de lectura al esquema `energia`. Si ese servidor usa un socket Unix, pasa su directorio con `-h` en lugar de `127.0.0.1`.

```bash
pg_dump -h 127.0.0.1 -p 5432 -U USUARIO_ORIGEN -d energia_hsd --format=custom --schema=energia --file=energia_hsd.backup
```

En el **equipo de destino**, desde donde copiaste el archivo, restáuralo en la base vacía. Si no conoces la versión de origen, `pg_restore --list energia_hsd.backup` la indica en el encabezado.

```bash
pg_restore -h 127.0.0.1 -p 5432 -U simet_app -d energia_hsd --no-owner --no-privileges --single-transaction energia_hsd.backup
```

Así `simet_app` será propietario de los objetos cargados y no necesitas importar los roles del equipo de origen. El datamart se prepara en el paso 4.4.

**Opción B — Generar los datos desde cero.** Desde la raíz, aplica el DDL y los catálogos de la copia incluida del data engine. El segundo archivo también carga los perfiles horarios.

```bash
psql -h 127.0.0.1 -p 5432 -U simet_app -d energia_hsd -v ON_ERROR_STOP=1 -f ENTREGA_FINAL/GENERADOR_HSD/database/sql/01_esquema.sql -f ENTREGA_FINAL/GENERADOR_HSD/database/sql/02_catalogos.sql
```

Crea `ENTREGA_FINAL/GENERADOR_HSD/.env` para el generador y sustituye la contraseña. Este archivo es independiente del `.env` de SIMET:

```env
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=energia_hsd
DB_USER=simet_app
DB_PASSWORD="CONTRASEÑA_DE_SIMET_APP"
DB_SCHEMA=energia
```

Corre el generador en un entorno separado. **Linux/macOS:**

```bash
cd ENTREGA_FINAL/GENERADOR_HSD
python3.14 -m venv ven
./ven/bin/python -m pip install -r requirements.txt
./ven/bin/python main.py
cd ../..
```

**Windows (PowerShell):**

```powershell
cd ENTREGA_FINAL/GENERADOR_HSD
py -3.14 -m venv ven
.\ven\Scripts\python.exe -m pip install -r requirements.txt
.\ven\Scripts\python.exe main.py
cd ../..
```

La corrida completa genera **10,800,000 lecturas** entre enero y marzo de 2026. Para una base de prueba más ligera, elige `main.py --demo` **en lugar** de la corrida completa (129,600 lecturas). Ejecuta el generador sobre la base nueva; `backend/sql/schema.sql` no contiene el DDL completo.

### 4.3 Instalar el backend y configurar `.env`

Desde la raíz de SIMET, **Linux/macOS**:

```bash
python3.14 -m venv ven
./ven/bin/python -m pip install -r requirements.txt -r requirements-rag.txt
cp -n .env.example .env
chmod 600 .env
```

**Windows (PowerShell):**

```powershell
py -3.14 -m venv ven
.\ven\Scripts\python.exe -m pip install -r requirements.txt -r requirements-rag.txt
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

En macOS, el paquete fijado de PyTorch requiere **Apple Silicon con macOS 14 o posterior**. Los comandos invocan el Python del entorno directamente; no hace falta activarlo.

Edita el `.env` de la raíz con las contraseñas del paso 4.2 y tu clave de Cerebras:

```env
DATABASE_URL=postgresql+psycopg://simet_app:CLAVE_SIMET_APP@127.0.0.1:5432/energia_hsd
ASISTENTE_DATABASE_URL=postgresql+psycopg://simet_asistente:CLAVE_SOLO_LECTURA@127.0.0.1:5432/energia_hsd
VITE_API_URL=http://127.0.0.1:8000
SIMET_RAG_ENABLED=1
CEREBRAS_API_KEY=TU_CLAVE_DE_CEREBRAS
CEREBRAS_MODEL=qwen-3.8-27b
```

La plantilla usa `5544` para el asistente; cámbialo a `5432` si seguiste el ejemplo. En las URL de PostgreSQL codifica los caracteres reservados de las contraseñas (por ejemplo, `@` como `%40`). `ASISTENTE_DATABASE_URL` es obligatoria para arrancar la API. `CEREBRAS_API_KEY` solo se usa en el backend; no la pongas en una variable `VITE_*` ni subas `.env` a Git.

### 4.4 Crear el datamart, los permisos y el índice RAG

Desde la raíz, ejecuta los siguientes comandos **en este orden**. La base ya debe tener el esquema `energia` poblado y `simet_asistente` debe existir con su propia contraseña.

**Linux/macOS:**

```bash
./ven/bin/python create_datamart.py
psql -h 127.0.0.1 -p 5432 -U simet_app -d energia_hsd -v ON_ERROR_STOP=1 -f docs/sql/asistente_readonly.sql
./ven/bin/python -m backend.app.services.rag
```

**Windows (PowerShell):**

```powershell
.\ven\Scripts\python.exe create_datamart.py
psql -h 127.0.0.1 -p 5432 -U simet_app -d energia_hsd -v ON_ERROR_STOP=1 -f docs/sql/asistente_readonly.sql
.\ven\Scripts\python.exe -m backend.app.services.rag
```

El primer comando debe imprimir `DATAMART_CREATED`; el segundo concede lectura en `energia` y `datamart`. El tercero descarga el modelo de Hugging Face en la primera ejecución y genera el índice local de 1,024 dimensiones. Regenera el índice si cambia el corpus, el manual o el modelo. Consulta la [sección del RAG](#156-búsqueda-documental-rag) para validar por separado la redacción en la nube.

### 4.5 Arrancar la API y el frontend

Abre **dos terminales en la raíz del repositorio**. En la primera, inicia FastAPI:

```bash
# Linux/macOS
./ven/bin/python -m uvicorn backend.app.main:app --reload --reload-dir backend --host 127.0.0.1 --port 8000
```

```powershell
# Windows
.\ven\Scripts\python.exe -m uvicorn backend.app.main:app --reload --reload-dir backend --host 127.0.0.1 --port 8000
```

En la segunda, instala el frontend con el lockfile e inicia Vite:

```bash
npm ci
npm run dev -- --host 127.0.0.1
```

Si PowerShell bloquea el script de npm, usa `npm.cmd ci` y `npm.cmd run dev -- --host 127.0.0.1`.

### 4.6 Comprobar que todo funciona

1. Abre [la salud de la API](http://127.0.0.1:8000/health) y luego [el resumen del datamart](http://127.0.0.1:8000/api/datamart/resumen). Con la corrida completa, `total_lecturas` debe ser `10800000`.
2. Abre el [panel de SIMET](http://localhost:8443) y entra al [Asistente](http://localhost:8443/#/asistente). Pregunta **«¿Dónde puedo descargar a CSV las mediciones de un medidor?»**. La respuesta debe citar el manual, indicar el filtro por medidor y fechas y mostrar `#/lecturas`. Con Cerebras operativo, la tarjeta muestra **Redacción LLM**. La API también se puede probar desde [Swagger](http://127.0.0.1:8000/docs).
3. Pregunta **«¿Cuántas lecturas hay y con qué semilla se generó?»** para comprobar la conexión de solo lectura del asistente. Con el conjunto canónico, debe devolver 10,800,000 lecturas y citar `datamart.dm_resumen_general`.

En arranques posteriores solo necesitas iniciar PostgreSQL, la API y Vite. Si cambias el `.env`, reinicia el proceso que lo usa.

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

Para instalar y arrancar el proyecto, sigue la [sección 4](#4-puesta-en-marcha). Desde la raíz, estos comandos comprueban y compilan el frontend; `npm run format` aplica el formateador del proyecto:

```powershell
npx tsc --noEmit
npm run build
```

Pruebas locales del asistente RAG (con el entorno del backend activado):

```bash
python -m unittest discover -s tests -p test_rag.py
```

Las pruebas contra la API en ejecución se activan como indica la [sección 15.6](#156-búsqueda-documental-rag).

---

## 9. Verificación rápida de la conexión

| Síntoma | Qué revisar |
|---|---|
| `/health` no responde | Que Uvicorn se ejecute desde la raíz y que `.env` tenga `DATABASE_URL` y `ASISTENTE_DATABASE_URL`. |
| `/api/zonas` devuelve 500 | Conexión de `simet_app`, puerto, contraseña y esquema `energia`. |
| `/api/datamart/resumen` devuelve 500 | Ejecuta `create_datamart.py` sobre la misma base que usa la API. |
| El chat no devuelve cifras | Prueba la conexión de `simet_asistente` y aplica `docs/sql/asistente_readonly.sql` después de crear las vistas. |
| El chat avisa que el índice documental no está disponible | Activa `SIMET_RAG_ENABLED=1`, verifica la ruta `SIMET_RAG_INDEX` si la configuraste y genera el índice con el mismo usuario que inicia la API. |
| El chat cita el manual y muestra **Verificación local** | La recuperación encontró el pasaje; mira el aviso para distinguir un fallo de embeddings de un rechazo de Cerebras. HTTP 402 indica un problema de facturación o créditos en la cuenta de la clave. |

Si la API funciona pero no carga el panel, revisa `VITE_API_URL` y CORS. Cambiar `VITE_API_URL` requiere reiniciar Vite o reconstruir el frontend.

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

Módulo informativo y desacoplado. El backend elige las herramientas y `backend/app/services/estadisticas.py` calcula los números con `SELECT` contra las vistas `datamart.dm_*` y tablas `energia` permitidas. El modelo solo redacta: no recibe la conexión a la base. El usuario puede pedir SQL de solo lectura mediante `ejecutar_sql_lectura`; están prohibidas la escritura, los comentarios, las múltiples sentencias y cualquier cambio de tablas o esquema. El cliente usa `urllib.request` de la biblioteca estándar.

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

El redactor de datos usa `REDACTOR_REDUCIDO` y un resumen del payload de hasta 4,000 caracteres con cinco filas por herramienta. Las respuestas locales no consumen tokens del proveedor. Tiempos medidos después del cambio: `Hola` 67 ms, `¿Qué puedes hacer?` 27 ms, `¿Qué significa Tarifa DAC?` 17 ms. Las consultas con datos tienen planificación local y como máximo una llamada de redacción.

El manual de uso, la guía rápida y 21 capturas están en `docs/manual_usuario`:

- `MANUAL_USUARIO.md`: fuente editable.
- `MANUAL_DE_USO_Y_GUIA_DE_USUARIO_SIMET.docx` y `.pdf`: entregables en Arial 12, blanco y negro, sin portada.
- `capturas/`: nueve pantallas, estados del asistente, vistas móviles y desplazamiento intermedio de las pantallas largas.
- `auditoria_visual.json`: métricas de ancho, desbordamiento y emulación de movimiento reducido.

No había servidor MCP `chrome-devtools` disponible. La revisión visual se hizo con Microsoft Edge 158 en modo headless controlado por CDP, en 1440x900 y 390x844x2. No se registró desbordamiento horizontal en las vistas revisadas y `prefers-reduced-motion` respondió `true` bajo emulación.

### 15.5 Paleta de acento del tema claro

Los tokens de `src/index.css` usan cinco señales vibrantes: naranja `#FF7A00` (principal, igual al logo), verde `#00C853`, azul `#0088FF`, violeta `#7C3AED` y turquesa `#00B8D9`. Alimentan `--chart-1` a `--chart-5`, el selector de acento, las barras de progreso y los rellenos de estado (`--success-fill`, `--warning-fill`, `--info-fill`, `--violet-fill`). Las variantes de texto sobre fondos claros son `#A84A00`, `#0E7A43`, `#005BB5`, `#5B21B6` y `#006B82`, todas con contraste AA verificado. El naranja, verde, azul y turquesa llevan texto `--ink` encima; el violeta lleva blanco. El rojo de `--danger-fill` se conserva por semántica de error y no forma parte de la paleta de datos.

Los identificadores internos del selector siguen siendo `orange`, `lime`, `cyan`, `violet` y `teal` para no romper preferencias guardadas en `localStorage`; las etiquetas visibles son Naranja, Esmeralda, Azul eléctrico, Violeta y Turquesa.

### 15.6 Búsqueda documental (RAG)

El asistente puede responder preguntas sobre navegación y uso del panel con secciones revisadas del [manual](MANUAL_USUARIO.md) y del [corpus operativo](docs/base_conocimiento/CORPUS_OPERATIVO_SIMET.md). Las consultas de cifras, gráficas y estimaciones siguen pasando por las herramientas de PostgreSQL de solo lectura.

La instalación de `requirements-rag.txt`, la configuración de `SIMET_RAG_ENABLED` y `CEREBRAS_API_KEY`, y la generación inicial del índice forman parte de los [pasos 4.3 y 4.4](#43-instalar-el-backend-y-configurar-env). El modelo de redacción predeterminado es `qwen-3.8-27b`; `CEREBRAS_MODEL` permite indicar otro modelo disponible para tu clave con soporte de salida estructurada.

El índice se guarda en `~/.local/share/simet/rag/indice-cpu.npz` por defecto (`$XDG_DATA_HOME/simet/rag/indice-cpu.npz` si está definido). Puedes elegir otra ruta en `SIMET_RAG_INDEX`. Si vienes de la versión de Ollama, genera el índice de CPU en un archivo nuevo. Para regenerarlo, ejecuta `python -m backend.app.services.rag` desde la raíz con el entorno del backend.

La búsqueda usa Sentence Transformers en CPU, con el modelo en caché local. Cerebras recibe la pregunta documental y hasta tres pasajes recuperados; las citas y rutas salen del índice. Si no hay pasajes relevantes, se responde sin llamar a Cerebras. Si falla la búsqueda semántica se usa coincidencia textual; si falla la redacción (también cuando Cerebras requiere créditos), se muestra el pasaje original con su fuente. El RAG no necesita Ollama; el redactor de cifras conserva su configuración `LLM_*`.

Para comprobar el recorrido completo con **la base canónica de 10.8 millones de lecturas** y la API activa, ejecuta lo siguiente. `SIMET_RAG_EXIGIR_CEREBRAS=1` hace fallar la prueba si la consulta de exportación usa el fragmento local en vez del redactor en la nube; omítelo si solo quieres comprobar la recuperación y el respaldo.

**Linux/macOS:**

```bash
SIMET_RAG_EVAL=1 SIMET_RAG_EXIGIR_CEREBRAS=1 ./ven/bin/python -m unittest discover -s tests -p test_rag.py
```

**Windows (PowerShell):**

```powershell
$env:SIMET_RAG_EVAL = '1'
$env:SIMET_RAG_EXIGIR_CEREBRAS = '1'
.\ven\Scripts\python.exe -m unittest discover -s tests -p test_rag.py
```
