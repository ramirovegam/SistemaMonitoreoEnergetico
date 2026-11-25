# Análisis y mejoras: SIMET frente a data-engine-for-energy-analysis

**Fecha:** 2025-10-27  
**Revisado:** 2026-11-18 después de la fusión con `develop-v3`  
**Objetivo:** Comparar SIMET con el data engine de HyperDataSynthetic y separar lo que está implementado de lo que solo estaba planeado.

## Comparativa

| Aspecto | SIMET | HSD (referencia) | Estado real |
|---|---|---|---|
| Generación de datos | Generador propio en `backend/app/routers/generador_hsd.py` | Pipeline de 8 etapas | Implementado en v2.0; mezcla gaussiana, estacionalidad y aproximación `tanh` |
| Reglas | `Rules/Rules.json`, versión 1.0.0 | Rules versionado con semver y hash | Parcial: el archivo existe y se consume; no hay módulo `core/rules.py` con API propia |
| Reproducibilidad | Semillas por zona y hash de parámetros en el generador | `corrida_generacion` con metadata | Implementado en el generador |
| Validación | Esquemas Pydantic, restricciones del data engine y `/api/datamart/validacion-integridad` | Validación sistemática con criterios medibles | Parcial: no existe `services/validation.py` ni `routers/validacion.py` |
| Concepto energético | Anomalías y alertas en tablas distintas | Reportado vs real, eventos y alertas desacoplados | Implementado en el esquema `energia` |
| Trabajo en equipo | Documentación y ramas por integrante | División por zonas y roles | Evidencia de equipo pendiente de entrega |
| Persistencia | Inserción directa | Por lotes con checkpoints y reanudación | Pendiente |

## Mejoras implementadas y verificadas

### 1. Generador HSD v2.0 (`backend/app/routers/generador_hsd.py`)

- Mezcla gaussiana por categoría, estacionalidad y aproximación tipo red neuronal con `tanh`.
- Semilla por zona derivada de una semilla raíz; hash de parámetros para trazabilidad.
- Perfiles existentes en `GET /api/generador-hsd/perfiles-existentes`.
- Generación masiva con `POST /api/generador-hsd/generar-masivo`.

### 2. Reglas versionadas (`Rules/Rules.json`)

- Versión `1.0.0`, cuatro categorías de servicio con curvas base y modificadores por tipo de día.
- El generador consume el archivo; no hay una capa `core/rules.py` independiente.

### 3. Datamart (`create_datamart.py` y `backend/app/routers/datamart.py`)

- Esquema `datamart` con vistas `dm_consumo_zona_mensual`, `dm_kpi_diarios`, `dm_anomalias_zona`, `dm_resumen_general`, `dm_consumo_por_servicio` y `dm_validacion_integridad`.
- Siete endpoints de consulta más `/api/datamart/powerbi-url`, que devuelve la guía de conexión a Power BI.
- Guía de explotación en `docs/bi/GUIA_BI.md`.

### 4. Validación disponible hoy

- Esquemas Pydantic en `backend/app/schemas/`: validan tipos, rangos y forma de las respuestas.
- Restricciones del esquema `energia`, propiedad del data engine: `calidad_enlace` entre 50 y 100, `prioridad` entre 1 y 4, `tipo_dia` en `'H'`, `'S'`, `'D'`, `resultado` en tres valores permitidos.
- `GET /api/datamart/validacion-integridad`: compara registros esperados contra registrados.
- Reglas de generación con semillas fijas y hash de parámetros.

## Mejoras planeadas que NO están en el árbol de código

Esta sección corrige una versión anterior del presente documento. Los archivos siguientes se describieron como implementados, pero no existen en el repositorio después de la fusión. No citarlos como evidencia ante la rúbrica.

| Elemento | Estado | Alternativa real |
|---|---|---|
| `backend/app/core/rules.py` | No existe | `Rules/Rules.json` se consume desde el generador |
| `backend/app/services/validation.py` | No existe | Validación vía Pydantic, restricciones SQL y `/api/datamart/validacion-integridad` |
| `backend/app/routers/validacion.py` | No existe y no está registrado | Seis endpoints bajo `/api/datamart` cubren la integridad |
| `backend/app/generator/` con 8 etapas | No existe | `generador_hsd.py` implementa el ciclo de generación |

## Mejoras pendientes

### Alta prioridad

1. Poblar `energia.lectura` con el volumen canónico de 10,800,000 registros y dejar evidencia del conteo.
2. Generar el artefacto de BI: `.pbix` o dashboard publicado en Metabase sobre las vistas `dm_*`.
3. Levantar la API con PostgreSQL real y recorrer las nueve pantallas.
4. Registrar roles, activities y autoevaluación de los siete integrantes.

### Media prioridad

5. Métricas reportado versus real en el dashboard.
6. Panel de validación en frontend sobre los endpoints del datamart.
7. Índices y pruebas de rendimiento sobre 10.8 millones de lecturas.
8. Logging estructurado y pruebas automatizadas.

### Baja prioridad

9. Soporte para corridas múltiples en la interfaz.
10. Materialized views para los dashboards pesados.
11. CI/CD y orquestación de corridas.

## Verificación de la fusión

Tras integrar `origin/develop-v3` en `redesign-ui-v2.5`:

- `npx tsc --noEmit`: sin errores.
- `npm run build`: exitoso.
- `python -m compileall` sobre backend y scripts: sin errores de sintaxis.
- Importación de FastAPI en caliente: no verificada; el entorno local carece de `psycopg2`.

## Conclusión

La fusión incorporó generador HSD, datamart y explotación analítica. El código está integrado y compila. Lo que falta para la entrega no es código nuevo, sino evidencia: base poblada, conteo de registros, artefacto de BI, presentación de segunda entrega y registro del trabajo en equipo.
