# Documentación técnica — SIMET

Índice

1. Propósito y utilidad
2. Requerimientos de hardware y software
3. Arquitectura
4. Modelo de datos
5. Generación Hyper-Synthetic Data
6. Datamart y explotación analítica
7. API
8. Codificación y convenciones
9. Ciclo de vida de desarrollo
10. Verificación
11. Referencias

---

## 1. Propósito y utilidad

SIMET es la capa de aplicación del proyecto HyperDataSynthetic. Presenta el consumo eléctrico de una ciudad inteligente en nueve pantallas y expone un datamart para análisis. El repositorio es dueño de la API y de la interfaz; el esquema `energia`, sus catálogos y el volumen de datos pertenecen al data engine `KrC234/data-engine-for-energy-analysis`.

La aplicación resuelve dos problemas: hacer legible un volumen de 10.8 millones de lecturas horarias y servirlo a herramientas de BI sin exponer credenciales en el navegador.

### 1.1 Descripción del problema

Los historiales eléctricos individuales son difíciles de obtener por privacidad, disponibilidad y costo. Sin datos no hay modelo de datos que probar, no hay ocurrencias raras para evaluar detectores y no hay volumen que justifique un diseño de base particionada. Al mismo tiempo, un juego de datos sintético sin control produce curvas poco creíbles y anomalías imposibles de verificar.

El caso de estudio necesita tres cosas a la vez: un territorio real como referencia, telemetría reproducible con verdad de campo conocida y una capa de presentación que permita explorar el resultado sin exponer la base.

### 1.2 Propuesta de solución

Se propone generar los datos con reglas propias del dominio: calibración territorial con estadísticas públicas agregadas de CONEVAL e INEGI, simulación de normalidad con semillas fijas e inyección etiquetada de siete tipos de anomalía. El resultado se persiste en PostgreSQL con particionamiento mensual de la tabla `lectura`.

Sobre esa base se construyen una API FastAPI, un panel React con nueve pantallas y un esquema analítico `datamart` consumible desde Power BI o Metabase. Anomalía y alerta permanecen en tablas distintas para poder medir falsos positivos y omisiones.

### 1.3 Validación de campos

La validación vigente tiene cuatro capas: esquemas Pydantic en `backend/app/schemas/`, restricciones del esquema `energia` definidas en el data engine, reglas versionadas en `Rules/Rules.json` consumidas por el generador y el endpoint `/api/datamart/validacion-integridad`.

Convenciones que conviene recordar: `calidad_enlace` se expresa como porcentaje entre 50 y 100; `prioridad` de alerta va de 1 a 4; `tipo_dia` vale `'H'`, `'S'` o `'D'`; una alerta cerrada se identifica por `ts_cierre IS NOT NULL`, no por una columna de estado.

No existen los módulos `services/validation.py` ni `routers/validacion.py` que una versión anterior de la documentación anunciaba como implementados. El detalle está en `docs/data-engine/ANALISIS_Y_MEJORAS.md`.

## 2. Requerimientos de hardware y software

- Python 3.10 o superior.
- Node.js 20.19 o superior, exigido por Vite 8.
- PostgreSQL 16 con el esquema `energia` poblado.
- Navegador moderno con soporte para ES2022.
- Memoria suficiente para el juego de datos: la generación masiva de 10M+ filas se ejecuta en el backend, no en el navegador.

Variables necesarias: `DATABASE_URL` en el backend y `VITE_API_URL` en el frontend. La plantilla es `.env.example`. Nunca se versiona `.env`.

## 3. Arquitectura

```
Navegador
  -> Frontend: React 19 + TypeScript + Vite 8 + Tailwind 4     http://localhost:8443
       -> HTTP/JSON
  -> Backend:  Python + FastAPI + SQLAlchemy 2                 http://127.0.0.1:8000
       -> SQL (psycopg 3)
  -> PostgreSQL 16, esquemas `energia` y `datamart`
```

Frontend y backend son procesos independientes. El frontend nunca toca la base. La navegación es por hash (`#/<slug>`) y se resuelve en `src/navigation.ts` con `PAGE_ROUTES`, `getPageFromLocation()` y `routeHash()`.

El backend registra doce routers: zonas, servicios, medidores, dashboard, historial_lecturas, analisis_energetico, calendario, calendario_energetico, alertas, tarifas, datamart y generador_hsd. Ambos routers de calendario son necesarios: `/api/calendario` alimenta al Dashboard y `/api/calendario-energetico` a la pantalla Calendario.

## 4. Modelo de datos

El modelo conceptual y lógico se documenta en el data engine. Este repositorio consume sus trece tablas del esquema `energia`:

`corrida_generacion`, `zona`, `tarifa`, `tipo_servicio`, `tipo_evento`, `calendario`, `perfil_carga_horaria`, `servicio`, `medidor`, `evento`, `alerta`, `periodo_facturacion` y `lectura`.

Volumen canónico: 46 zonas, 5,000 servicios, 5,000 medidores activos, 18 tipos de servicio, 7 tarifas, 1,296 perfiles de carga horaria y 10,800,000 lecturas entre el 1 de enero y el 31 de marzo de 2026. `lectura` está particionada por mes y su llave primaria es `(id_medidor, ts)`.

El modelo físico no se define aquí. `backend/sql/schema.sql` es solo una referencia incompleta y no debe aplicarse para crear la base.

Convenciones que cambian el resultado de una consulta:

| Tabla | Convención |
|---|---|
| `alerta` | No existe columna `estado`; cerrada equivale a `ts_cierre IS NOT NULL` |
| `medidor` | `calidad_enlace` es `SMALLINT` entre 50 y 100 |
| `perfil_carga_horaria` | `tipo_dia` vale `'H'`, `'S'` o `'D'` |
| `calendario` | El festivo es el booleano `es_festivo`, no un tipo de día |

## 5. Generación Hyper-Synthetic Data

El generador v2.0 reside en `backend/app/routers/generador_hsd.py` y usa mezcla gaussiana, estacionalidad y una aproximación tipo red neuronal con `tanh`. No depende de una base real ni de utilería externa.

Endpoints:

- `GET /api/generador-hsd/info`
- `GET /api/generador-hsd/status`
- `GET /api/generador-hsd/perfiles-existentes`
- `POST /api/generador-hsd/generar-masivo`

Cuerpo de ejemplo:

```json
{
  "fecha_inicio": "2024-01-01",
  "dias": 730,
  "factor_escala": 50,
  "usar_neural_like": true
}
```

Las reglas versionadas del generador están en `Rules/Rules.json`. El script `create_datamart.py` crea el esquema analítico sobre los datos generados.

## 6. Datamart y explotación analítica

Esquema: `datamart`. Vistas principales:

- `dm_consumo_zona_mensual`
- `dm_kpi_diarios`
- `dm_anomalias_zona`
- `dm_resumen_general`
- `dm_consumo_por_servicio`
- `dm_validacion_integridad`

Endpoints de consumo: `/api/datamart/resumen`, `/api/datamart/consumo-zona-mensual`, `/api/datamart/kpi-diarios`, `/api/datamart/anomalias-zona`, `/api/datamart/consumo-por-servicio`, `/api/datamart/validacion-integridad` y `/api/datamart/powerbi-url`.

La guía de conexión a Power BI o Metabase está en `docs/bi/GUIA_BI.md`.

## 7. API

Swagger está disponible en `/docs`. Los clientes HTTP del frontend viven en `src/services/`, un archivo por recurso. Los componentes no lanzan `fetch` directo salvo `Zones.tsx`, que combina catálogo e indicadores con `Promise.all`.

El backend exige `DATABASE_URL` al importar y registra 18 rutas, de las cuales doce pertenecen a routers de recurso. `numpy` es dependencia directa del router `generador_hsd` y debe figurar en `requirements.txt`; sin ella el import de `backend.app.main` falla. Los imports son relativos y el servidor se lanza desde la raíz:

```powershell
python -m uvicorn backend.app.main:app --reload --port 8000
```

## 8. Codificación y convenciones

- Español en interfaz, dominio, mensajes de API y commits.
- Formato `es-MX` para fechas y números.
- Componentes de UI reutilizables en `src/components/ui/`.
- Un cliente HTTP por recurso; no ampliar `api.ts` para recursos nuevos.
- Solo npm. No introducir otros lockfiles.
- No commitear `.env`, `ven/`, `node_modules/` ni `dist/`.
- Al regenerar `requirements.txt` en PowerShell, forzar UTF-8.

## 9. Ciclo de vida de desarrollo

1. **Análisis de datos:** identificación del caso de uso, volumen y convenciones del data engine.
2. **Modelado:** modelo conceptual y lógico en el data engine; modelo físico aplicado con sus migraciones SQL.
3. **Generación:** programa propio de datos sintéticos y reglas versionadas.
4. **Implementación:** API FastAPI, esquemas Pydantic y panel React.
5. **Integración:** fusión de ramas, resolución de conflictos y verificación de tipos y compilación.
6. **Explotación:** datamart y conexión con BI.
7. **Documentación:** manual de usuario y esta memoria técnica.

## 10. Verificación

```powershell
# Frontend
cmd /c npx tsc --noEmit
cmd /c npm run build

# Backend
python -m compileall -q backend create_datamart.py extract_pdfs.py test_dm_routes.py
python -m uvicorn backend.app.main:app --reload --port 8000
```

La verificación de la fusión quedó registrada al cierre de la integración: `tsc` sin errores, `build` exitoso y `compileall` sin errores de sintaxis. La reperificación del 24 de noviembre de 2026 produjo:

| Comprobación | Resultado |
|---|---|
| `cmd /c npx tsc --noEmit` | Código 0, sin salida |
| `cmd /c npm run build` | Código 0; Vite 8.3.0, 2,522 módulos |
| `python -m compileall` sobre backend y scripts | Código 0 |
| Import de `backend.app.main:app` | 18 rutas; `/docs` presente |
| `GET /docs` | HTTP 200 |
| Instalación limpia del backend | Requirió añadir `numpy==2.4.4` a `requirements.txt` |

El entorno de auditoría empleó PostgreSQL 17.12. La arquitectura documentada del proyecto declara PostgreSQL 16; la diferencia no afectó la compilación ni el arranque, pero debe registrarse como desviación del entorno.

## 11. Referencias

- Data engine: https://github.com/KrC234/data-engine-for-energy-analysis
- RAMA integrada: `origin/develop-v3` de `ramirovegam/SistemaMonitoreoEnergetico`
- Documentación local: `README.md`, `AGENTS.md`, `docs/data-engine/ANALISIS_Y_MEJORAS.md`
- Rúbrica y evaluación práctica: `Rubrica2026b.pdf` y `evaluacionpractica2026btopicos.pdf`
- PostgreSQL: https://www.postgresql.org/docs/16/
- FastAPI: https://fastapi.tiangolo.com/
- SQLAlchemy 2: https://docs.sqlalchemy.org/en/20/
- React: https://react.dev/
- TypeScript: https://www.typescriptlang.org/docs/
- Vite: https://vite.dev/guide/
- Tailwind CSS: https://tailwindcss.com/docs
- Power BI, conector de PostgreSQL: https://learn.microsoft.com/power-bi/connect-data/desktop-connect-postgresql
- Metabase, conexión a PostgreSQL: https://www.metabase.com/docs/latest/databases/connections/postgresql
