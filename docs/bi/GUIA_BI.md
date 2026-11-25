# Guía de explotación BI del datamart SIMET

Índice

1. Origen de la información
2. Conexión desde Power BI
3. Conexión desde Metabase
4. Vistas y métricas recomendadas
5. Dashboards sugeridos
6. Verificación de la carga

---

## 1. Origen de la información

Los datos no se inventan en el panel. El data engine genera 10,800,000 lecturas horarias del 1 de enero al 31 de marzo de 2026 sobre 5,000 servicios y 5,000 medidores en 46 zonas de Toluca. SIMET lee el esquema `energia` y construye encima el esquema analítico `datamart` con `create_datamart.py`.

La ruta de datos es:

```
Generador HSD -> esquema energia -> create_datamart.py -> esquema datamart -> Power BI / Metabase
```

El endpoint `/api/datamart/powerbi-url` devuelve la lista de vistas y los parámetros de conexión vigentes.

## 2. Conexión desde Power BI

1. Abra **Inicio > Obtener datos > Base de datos PostgreSQL**.
2. Servidor: `localhost:5432`.
3. Base de datos: la que esté en uso, por ejemplo `energia_hsd`.
4. Esquema: `datamart`.
5. Use credenciales de solo lectura. No use `service_role` ni claves de API.
6. Seleccione las vistas `dm_*` listadas en la sección 4.

También puede consumir los endpoints `/api/datamart/*` como fuente JSON si no desea exponer PostgreSQL al cliente de BI.

## 3. Conexión desde Metabase

1. Agregue una base de datos de tipo PostgreSQL con servidor `localhost:5432`.
2. Seleccione la base y el esquema `datamart`.
3. Restrinja el usuario a `SELECT` sobre las vistas.
4. Cree preguntas guardadas sobre las mismas vistas de la sección 4.

## 4. Vistas y métricas recomendadas

| Vista | Métrica principal | Uso |
|---|---|---|
| `dm_resumen_general` | Total de lecturas, servicios y medidores | Tarjeta de control general |
| `dm_kpi_diarios` | Consumo diario y variación | Serie temporal diaria |
| `dm_consumo_zona_mensual` | kWh por zona y mes | Mapa o barras por zona |
| `dm_consumo_por_servicio` | kWh por tipo de servicio | Ranking de servicios |
| `dm_anomalias_zona` | Número de anomalías por zona | Tabla de prioridades |
| `dm_validacion_integridad` | Registros válidos versus esperados | Indicador de calidad del dato |

Las vistas se pueden consultar también desde la API: `/api/datamart/resumen`, `/api/datamart/kpi-diarios`, `/api/datamart/consumo-zona-mensual`, `/api/datamart/consumo-por-servicio`, `/api/datamart/anomalias-zona` y `/api/datamart/validacion-integridad`.

## 5. Dashboards sugeridos

**Panel operativo**

- KPI: lecturas totales, medidores activos, zonas cubiertas.
- Serie: consumo diario del periodo.
- Mapa: consumo mensual por zona.
- Tabla: anomalías por zona ordenadas por severidad.

**Panel de calidad**

- Proporción de lecturas válidas.
- Huecos por medidor.
- Alertas abiertas y cerradas, usando `ts_cierre IS NOT NULL` como criterio de cierre.

**Panel de negocio**

- Consumo por tipo de servicio.
- Comparativa mensual por zona.
- Perfil de carga por tipo de día (`'H'`, `'S'`, `'D'`).

## 6. Verificación de la carga

Antes de publicar un dashboard, compruebe:

1. Que la suma de lecturas alcance el orden de 10.8 millones.
2. Que las 46 zonas aparezcan en `dm_consumo_zona_mensual`.
3. Que `dm_validacion_integridad` no reporte pérdida de filas entre `energia` y `datamart`.
4. Que las fechas cubran del 1 de enero al 31 de marzo de 2026.
5. Que `calidad_enlace` se lea en porcentaje, entre 50 y 100.

Si alguna comprobación falla, regenerar con `/api/generador-hsd/generar-masivo` y volver a ejecutar `create_datamart.py`.
