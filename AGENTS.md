# AGENTS.md

Guía de contexto para agentes de código (Claude Code, Codex, etc.) y colaboradores que trabajen en este repositorio.

## Qué es el proyecto

**SIMET** (Sistema de Monitoreo Energético) es un panel web para monitorear el consumo eléctrico de hogares, medidores y zonas de una ciudad inteligente (Toluca). Es un proyecto académico de la materia *Tópicos de Tecnologías de Datos*.

Estado actual: la interfaz está completa a nivel visual, pero casi toda funciona con **datos sintéticos generados en el frontend**. El backend apenas empieza: expone un único recurso real (`zonas`) leído desde PostgreSQL.

## Arquitectura

```
Navegador
  -> Frontend: React 19 + TypeScript + Vite 8 + Tailwind CSS 4   (puerto 8443)
       -> HTTP/JSON
  -> Backend: Python + FastAPI + SQLAlchemy 2                     (puerto 8000)
       -> SQL (psycopg 3)
  -> PostgreSQL, esquema `energia`
```

Frontend y backend son servidores independientes. El frontend llama al backend con `fetch` desde `src/services/api.ts`; la URL base sale de `VITE_API_URL` (por defecto `http://127.0.0.1:8000`).

## Estructura del repositorio

```
.
├── backend/app/
│   ├── main.py            App FastAPI, CORS, rutas raíz y /api/test, registra routers
│   ├── database.py        Engine, SessionLocal, Base declarativa y dependencia get_db()
│   ├── models/zona.py     Modelo ORM Zona  -> tabla energia.zona
│   ├── schemas/zona.py    Esquema Pydantic ZonaResponse
│   └── routers/zonas.py   GET /api/zonas/
├── backend/sql/schema.sql DDL del esquema energia (crear tablas a mano con psql)
├── src/
│   ├── main.tsx           Punto de entrada de React
│   ├── App.tsx            Layout (sidebar, topbar) y navegación entre páginas
│   ├── index.css          Tailwind, tokens de tema (@theme) y clases utilitarias propias
│   ├── services/api.ts    Cliente HTTP hacia el backend (testBackend, obtenerZonas)
│   ├── data/synthetic.ts  Tipos del dominio y datos simulados
│   └── components/        Una página por archivo (ver tabla abajo)
├── .env.example         Variables de entorno de backend y frontend
├── index.html
├── package.json           Scripts: dev, build, preview, format (oxfmt)
├── vite.config.ts         Alias @ -> src, servidor en 0.0.0.0:8443 (strictPort)
├── tsconfig.json          Modo strict, alias @/*
└── requirements.txt       Dependencias de Python (UTF-8)
```

## Backend

- **Configuración**: `database.py` carga `.env` con `python-dotenv` y exige `DATABASE_URL`; si falta, lanza `RuntimeError` al importar. La plantilla está en `.env.example`.
- **CORS**: solo permite `http://localhost:8443` y `http://127.0.0.1:8443`. Si cambia el puerto del frontend hay que actualizar `main.py`.
- **Endpoints**:

  | Método | Ruta          | Descripción                                        |
  |--------|---------------|----------------------------------------------------|
  | GET    | `/`           | Mensaje de salud                                   |
  | GET    | `/api/test`   | Prueba de comunicación con el frontend             |
  | GET    | `/api/zonas/` | Lista de zonas ordenadas por `id_zona`             |

- **Tabla `energia.zona`**: `id_zona` (smallint, PK), `nombre` (varchar 60, único), `tipo_urbano` (varchar 20), `superficie_km2` (numeric 6,3), `factor_socioeconomico` (numeric 4,3). No hay migraciones ni `create_all`: el DDL vive en `backend/sql/schema.sql` y se aplica con `psql`. Si cambias un modelo, actualiza también ese archivo.
- **Patrón para agregar un recurso**: modelo en `models/`, esquema Pydantic con `from_attributes=True` en `schemas/`, router con `prefix="/api/<recurso>"` en `routers/` y `app.include_router(...)` en `main.py`. Usar el estilo SQLAlchemy 2 (`Mapped`, `mapped_column`, `select()` + `db.scalars()`).
- Los imports internos son relativos (`from ..database import ...`), por eso el servidor se lanza desde la raíz del repo: `uvicorn backend.app.main:app --reload`.

## Frontend

- **Navegación**: no hay router. `App.tsx` guarda la página activa en `useState<Page>` y renderiza el componente correspondiente. Para agregar una página: extender el tipo `Page`, añadirla a `navItems` y al bloque de renderizado en `<main>`.
- **Páginas** (`src/components/`):

  | Clave         | Componente           | Fuente de datos                          |
  |---------------|----------------------|------------------------------------------|
  | `dashboard`   | `Dashboard.tsx`      | `synthetic.ts` + llamada a `/api/test` (solo `console.log`) |
  | `zonas`       | `Zones.tsx`          | `synthetic.ts`                           |
  | `hogares`     | `Households.tsx`     | `synthetic.ts`                           |
  | `medidores`   | `Meters.tsx`         | `synthetic.ts`                           |
  | `activos`     | `AssetManagement.tsx`| Datos locales en el componente           |
  | `alertas`     | `Alerts.tsx`         | `synthetic.ts`                           |
  | `analitica`   | `Analytics.tsx`      | `synthetic.ts`                           |
  | `tarifas`     | `Tariffs.tsx`        | Datos locales en el componente           |
  | `reportes`    | `Reports.tsx`        | Datos locales en el componente           |
  | `eficiencia`  | `Efficiency.tsx`     | Datos locales en el componente           |
  | `admin`       | `Admin.tsx`          | Datos locales en el componente           |

  `MapModule.tsx` no es una página: es el mapa Leaflet de Toluca (polígonos de zonas y medidores simulados) que se incrusta en el Dashboard.
- **Datos sintéticos**: `src/data/synthetic.ts` define los tipos del dominio (`Zone`, `Household`, `Meter`, `Alert`, `ZoneData`, tarifas, estados) y genera 80 hogares, sus medidores, 35 alertas, series mensuales/diarias y `summaryStats`. Las zonas del frontend son `Norte | Centro | Sur | Industrial`; aún no están alineadas con la tabla `energia.zona`.
- **Librerías**: `recharts` (gráficas), `react-leaflet` / `leaflet` (mapa), `lucide-react` (iconos).
- **Estilos**: Tailwind 4 vía `@tailwindcss/vite`. Los tokens de color y fuentes están en `@theme` dentro de `index.css`; los componentes además usan muchos colores hex en línea (`text-[#9098b1]`, acento naranja `#ff8a1f`). Hay clases propias como `card`, `blob`, `nav-item`, `gradient-orange`, `pulse-dot`.
- **Idioma**: toda la interfaz, los nombres de dominio y los mensajes están en español (formato `es-MX`). Mantenerlo así.

## Comandos

```bash
# Backend (desde la raíz del repo, con el entorno virtual activo)
pip install -r requirements.txt
uvicorn backend.app.main:app --reload     # http://127.0.0.1:8000, Swagger en /docs

psql "postgresql://usuario:password@localhost:5432/simet" -f backend/sql/schema.sql   # crear el esquema (sin "+psycopg")

# Frontend (npm es el gestor oficial; no agregar otros lockfiles)
npm install
npm run dev        # http://localhost:8443
npm run build
npm run format     # oxfmt
```

No hay tests, linter ni CI configurados. Para validar cambios de TypeScript usar `npx tsc --noEmit`; para el backend, levantar uvicorn y probar en `/docs`.

## Pendientes

- El frontend todavía no consume `/api/zonas/`. La función `obtenerZonas()` ya existe en `src/services/api.ts`, pero `Zones.tsx` depende del modelo sintético (`Norte | Centro | Sur | Industrial`, perfiles horarios, consumos), que no coincide con las columnas de `energia.zona`. Antes de conectarla hay que decidir cómo mapear un modelo al otro.
- No hay datos semilla para `energia.zona`; `backend/sql/schema.sql` solo crea la estructura.

## Convenciones para agentes

- Mantener el idioma español en código de dominio, UI y mensajes de commit (el historial está en español).
- Al conectar una página al backend, crear la función en `src/services/api.ts` y reemplazar gradualmente el import de `synthetic.ts`, conservando los tipos del dominio.
- No commitear `.env`, `ven/` ni `node_modules/`.
- Si se cambia el puerto de cualquiera de los servidores, actualizar en conjunto `vite.config.ts`, CORS en `backend/app/main.py`, `VITE_API_URL` en `.env.example`, el README y este archivo.
- Usar solo npm (`package-lock.json`). Al regenerar `requirements.txt` con `pip freeze` en PowerShell, forzar UTF-8: `pip freeze | Out-File -Encoding utf8 requirements.txt`.
