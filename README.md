# SIMET — Sistema de Monitoreo Energético

Panel web para monitorear el consumo eléctrico de hogares, medidores y zonas de una ciudad inteligente (Toluca). Proyecto de la materia *Tópicos de Tecnologías de Datos*.

## 1. Arquitectura

La aplicación se divide en tres capas que se ejecutan de forma independiente:

| Capa | Tecnología | Dirección local |
|---|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, Recharts, Leaflet, Lucide | http://localhost:8443 |
| Backend (API) | Python, FastAPI, SQLAlchemy 2 | http://127.0.0.1:8000 |
| Base de datos | PostgreSQL (esquema `energia`, luego `datamart`) | Definida en `DATABASE_URL` |

Flujo de una petición:

1. El usuario interactúa con la interfaz en React.
2. React envía una petición HTTP al backend y recibe JSON.
3. FastAPI consulta PostgreSQL mediante SQLAlchemy.
4. FastAPI devuelve los resultados y React actualiza la interfaz.

Documentación interactiva de la API (Swagger): **http://127.0.0.1:8000/docs**.

## 2. Requisitos

- Python 3.10 o superior
- Node.js 20.19 o superior (Vite 8)
- PostgreSQL

## 3. Configuración

```bash
cp .env.example .env
```

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Conexión a PostgreSQL. El backend no arranca sin ella. |
| `VITE_API_URL` | URL base de la API que usa el frontend. |

Ejemplo:

```env
DATABASE_URL=postgresql+psycopg://usuario:password@localhost:5432/energia_hsd
VITE_API_URL=http://127.0.0.1:8000
```

Crear el esquema de la base de datos:

```bash
psql "postgresql://usuario:password@localhost:5432/energia_hsd" -f backend/sql/schema.sql
```

## 4. Ejecución

Se necesitan dos terminales abiertas en la raíz del proyecto.

### Terminal 1 — Backend

```bash
python -m venv ven
.\ven\Scripts\Activate.ps1        # Windows
source ven/bin/activate           # Linux / macOS
pip install -r requirements.txt
python -m uvicorn backend.app.main:app --reload --port 8000
```

La API queda en http://127.0.0.1:8000 · Swagger en http://127.0.0.1:8000/docs

### Terminal 2 — Frontend

```bash
npm install
npm run dev
```

La interfaz queda en http://localhost:8443

### Producción (frontend estático)

```bash
npm run build
npm run preview     # sirve el build en http://localhost:8443
```

## 5. Datos y versión genérica (HSD)

El sistema usa un **datamart** con esquema `datamart` y vistas `dm_*` para consumo analítico (KPIs, consumo por zona/servicio, anomalías, validación).

El **generador HSD (Hyper-Synthetic Data) v2.0** crea datos sintéticos con técnica similar a redes neuronales (tanh), mezcla gaussiana y estacionalidad, sin depender de una base real:

- `GET /api/generador-hsd/info`
- `GET /api/generador-hsd/status`
- `GET /api/generador-hsd/perfiles-existentes`
- `POST /api/generador-hsd/generar-masivo` — genera lecturas a partir de `fecha_inicio`, `dias`, `factor_escala`, `usar_neural_like`.

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

## 6. Endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/test` | Prueba de comunicación frontend ↔ backend |
| GET | `/api/zonas` | Lista zonas registradas |
| GET | `/api/zonas/{id_zona}` | Detalle de una zona |
| GET | `/api/dashboard` | KPIs y series de consumo |
| GET | `/api/medidores` | Catálogo de medidores |
| GET | `/api/historial-lecturas` | Historial, calidad y huecos |
| GET | `/api/analisis-energetico/medidores` | Catálogo para análisis |
| GET | `/api/analisis-energetico/agregado` | Análisis agregado (mes, nivel, tipo de día) |
| GET | `/api/analisis-energetico/resumen` | Resumen de análisis |
| GET | `/api/analisis-energetico/curva-horaria` | Curva horaria |
| GET | `/api/analisis-energetico/perfil-horario` | Perfil horario |
| GET | `/api/analisis-energetico/mapa-calor` | Mapa de calor |
| GET | `/api/alertas` | Listado de alertas |
| GET | `/api/tarifas` | Catálogo tarifario |
| GET | `/api/calendario` | Calendario energético |
| GET | `/api/generador-hsd/...` | Generador de datos sintéticos |

Swagger completo: http://127.0.0.1:8000/docs

## 7. Estructura del proyecto

```text
.
├── backend/
│   ├── app/
│   │   ├── core/        Configuración transversal
│   │   ├── models/      Modelos SQLAlchemy
│   │   ├── routers/     Endpoints de FastAPI
│   │   ├── schemas/     Esquemas Pydantic
│   │   ├── services/    Lógica de negocio
│   │   ├── database.py  Motor y sesiones
│   │   └── main.py      App principal
│   └── sql/             Scripts SQL (esquema energia / datamart)
├── src/
│   ├── components/      Páginas y componentes React
│   ├── services/        Clientes HTTP hacia la API
│   ├── data/            Tipos de dominio y datos sintéticos temporales
│   └── App.tsx          Layout, navegación y topbar
├── public/              Assets estáticos (GeoJSON de zonas)
├── docs/                 Documentación del generador y HSD
├── Documentacion/       Documentación del proyecto y PDF de la API
├── backend/sql/
├── requirements.txt
├── package.json
└── ...
```

## 8. Estado actual

- Interfaz completa y funcional: Resumen, Zonas, Servicios, Medidores, Alertas, Análisis, Lecturas, Calendario, Tarifas.
- Los módulos que consumen datos reales consultan PostgreSQL; el módulo Zonas ya está conectado.
- Las demás pantallas consumen servicios del backend con estados de carga, error, vacío y reintento.
- El frontend quedó pulido en UI/UX: encabezados unificados, jerarquía tipográfica coherente, controles accesibles, estados vacíos y errores accionables, responsive sin overflow horizontal, controles táctiles mínimos de 40 px.
- Pendiente de datos: la tabla `energia.lectura` debe poblase (o regenerarse con el generador HSD) para que las gráficas de Análisis se rendericen.

## 9. Puesta en producción local

- Frontend: **http://localhost:8443** (vite dev o `npm run preview`)
- Backend: **http://127.0.0.1:8000**
- Swagger: **http://127.0.0.1:8000/docs**

## 10. Calidad verificada

- `npx tsc --noEmit` sin errores.
- `npm run build` exitoso.
- Auditoría con detector `impeccable` sin hallazgos.
- Navegación en 9 rutas con render correcto y sin errores de consola.
