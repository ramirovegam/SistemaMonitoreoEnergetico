# AGENTS.md

Contexto para agentes de código y colaboradores. Léase antes de tocar el repositorio.
Para instalación y referencia de la API, ver `README.md`.

## Qué es este proyecto

**SIMET** es la capa de aplicación del proyecto HyperDataSynthetic: un panel web que lee el consumo eléctrico de una ciudad inteligente desde PostgreSQL y lo presenta en nueve pantallas.

Reparto de responsabilidades, que es la regla más importante de este repositorio:

- **El data engine** ([`KrC234/data-engine-for-energy-analysis`](https://github.com/KrC234/data-engine-for-energy-analysis)) es dueño del esquema `energia`, de los catálogos y del volumen de datos. Genera 5,000 servicios, 5,000 medidores y 10,800,000 lecturas horarias entre el 1 de enero y el 31 de marzo de 2026.
- **Este repositorio** es dueño de la API y de la interfaz. Consume el esquema, no lo define.

Si una tarea implica cambiar una tabla, la pregunta correcta no es "¿cómo lo cambio aquí?" sino "¿el data engine ya lo tiene así?".

## Estado actual

La aplicación está completa y funciona de punta a punta: nueve pantallas y doce routers registrados. La fusión con `develop-v3` añadió el datamart (esquema `datamart`, vistas `dm_*`) y el generador HSD v2.0 para escalar a 10M+ registros. Las pantallas usan servicios HTTP con estados de carga, error, vacío y reintento.

Lo que falta o está mal está listado en la sección 11 del `README.md`. Los dos puntos que más afectan al trabajo diario:

1. `backend/sql/schema.sql` **no** es el DDL canónico: son doce líneas que solo crean la tabla `zona`. No usarlo para crear la base.
2. `src/data/synthetic.ts` y `src/components/Reports.tsx` son código muerto.

## Arquitectura

```
Navegador
  -> React 19 + TypeScript + Vite 8 + Tailwind 4        localhost:8443
       -> HTTP/JSON
  -> FastAPI + SQLAlchemy 2                            127.0.0.1:8000
       -> psycopg 3
  -> PostgreSQL 16, esquema `energia`
```

## Backend

- **`database.py`** carga `.env` y exige `DATABASE_URL`. Sin ella, `RuntimeError` al importar. La plantilla está en `.env.example`.
- **Imports relativos** (`from ..database import ...`). El servidor se lanza desde la raíz: `python -m uvicorn backend.app.main:app --reload --port 8000`.
- **CORS** solo autoriza los puertos 8443 y 5173 en localhost y 127.0.0.1. Cambiar el puerto del frontend exige editar `main.py`, `vite.config.ts` y `.env.example` a la vez.
- **12 routers** registrados en `main.py`: zonas, servicios, medidores, dashboard, historial_lecturas, analisis_energetico, calendario, calendario_energetico, alertas, tarifas, datamart y generador_hsd. Ambos routers de calendario están registrados porque son recursos distintos: `/api/calendario` alimenta al Dashboard y `/api/calendario-energetico` alimenta la pantalla Calendario.
- **Sin migraciones ni `create_all`.** El esquema se aplica con `psql` y vive en el data engine.

### Patrón para agregar un recurso

1. Modelo en `backend/app/models/` con `__table_args__ = {"schema": "energia"}`, estilo SQLAlchemy 2 (`Mapped`, `mapped_column`).
2. Esquema Pydantic en `backend/app/schemas/` con `model_config = ConfigDict(from_attributes=True)`.
3. Router en `backend/app/routers/` con `prefix="/api/<recurso>"`.
4. `app.include_router(...)` en `main.py`.
5. Cliente HTTP en `src/services/<recurso>Service.ts`.

### Trampas del esquema

Estas columnas no son las que uno espera. Equivocarse aquí produce pantallas que mienten sin lanzar error.

| Tabla | Realidad |
|---|---|
| `alerta` | No hay columna `estado`. Abierta = `ts_cierre IS NULL`; cerrada = `ts_cierre IS NOT NULL`. `/api/zonas/indicadores` y `/api/dashboard` derivan `alertas_activas` de `ts_cierre`, no de una columna `estado` inexistente. El conteo de `/api/dashboard` respeta el filtro por zona. `resultado` solo admite `'CONFIRMADA'`, `'FALSO_POSITIVO'`, `'NO_CONCLUYENTE'`. `prioridad` va de 1 a 4. |
| `medidor` | `calidad_enlace` es `SMALLINT` de 50 a 100, en porcentaje. No es una fracción de 0 a 1. `multiplicador` solo admite 1, 20, 40 u 80. |
| `perfil_carga_horaria` | `tipo_dia` es `CHAR(1)`: `'H'` hábil, `'S'` sábado, `'D'` domingo. No existe `'LABORABLE'` ni `'FESTIVO'`. |
| `calendario` | El festivo es un booleano `es_festivo`, no un tipo de día. `tipo_dia` sigue siendo H/S/D. |
| `lectura` | Particionada por mes. PK `(id_medidor, ts)`, sin índice sobre `ts` solo. Filtrar por `id_medidor` es 100 veces más rápido que filtrar por rango de fechas. |

El tipo de cambio `'H'`/`'S'`/`'D'` aparece en tres lugares que deben moverse juntos: `models/perfil_carga_horaria.py`, `models/calendario.py` y el parámetro `tipo_dia` de `analisis_energetico.py`, que traduce `laborable` a un `EXTRACT(ISODOW)` en vez de usar la columna.

### Rendimiento

Con 10.8 millones de lecturas, tres endpoints pasan de 3 segundos: `/api/historial-lecturas` (6.9 s), `/api/historial-lecturas/huecos` (18.2 s) y `/api/zonas/indicadores` (4.6 s). Las causas están en la sección 10 del `README.md`. Antes de "optimizar", medir contra el volumen real: el juego de datos de desarrollo con 276 medidores esconde el problema.

`/api/zonas/indicadores` ejecuta `information_schema` en cada petición para tolerar variantes de columnas. Es deliberado, pero no es un patrón que convenga copiar a endpoints nuevos.

## Frontend

- **Enrutamiento por hash.** `src/navigation.ts` declara `PAGE_ROUTES`, `getPageFromLocation()` y `routeHash()`. `App.tsx` mantiene la página en `useState<Page>`, sincroniza `#/<slug>` con la navegación y escucha `hashchange` para soportar recarga en alojamiento estático. Las páginas se declaran en el mismo archivo con clave, etiqueta, descripción, grupo e icono.
- **Para agregar una página:** extender el tipo `Page` en `navigation.ts`, añadir la entrada a `NAV_ITEMS`, agregar su slug a `PAGE_ROUTES` y el caso al `switch` de `App.tsx`.
- **Servicios:** un archivo por recurso en `src/services/`. Los componentes no llaman `fetch` a mano salvo en `Zones.tsx`, que combina catálogo e indicadores en un `Promise.all`.
- **Componentes base:** `src/components/ui/`. En uso: `Button`, `CommandPalette`, `ThemeMenu`, `Feedback` (esqueletos de carga), `cn` y `PageHeader` (encabezados unificados en las nueve pantallas). Los archivos `Badge`, `Card`, `Drawer`, `Field`, `LiveStatus` y `Tabs` quedaron como heredados sin uso; no eliminarlos sin autorización. No agregar componentes sin uso.
- **Tema:** `src/theme/ThemeProvider.tsx` con el atributo `data-theme` en `<html>` y tokens en `src/index.css`. Arranca en oscuro.
- **Librerías:** `recharts` para gráficas, `leaflet` y `react-leaflet` para el mapa, `lucide-react` para iconos.
- **Idioma:** todo en español, formato `es-MX`. Fechas como `31 de mar de 2026`.

## Comandos

```powershell
# Backend
pip install -r requirements.txt
python -m uvicorn backend.app.main:app --reload --port 8000

# Frontend
npm install
npm run dev        # http://localhost:8443, strictPort
npm run build
npm run format     # oxfmt
```

En PowerShell con política de ejecución restringida, `npm` se invoca como `cmd /c npm run dev`.

No hay pruebas, linter ni CI. La verificación es `npx tsc --noEmit` (debe terminar con código 0 y sin salida) más `npm run build`, y para el backend, levantar uvicorn y probar en `/docs`.

## Convenciones

- Español en interfaz, dominio, mensajes de API y commits. El historial está en español.
- Al conectar una pantalla al backend, crear el cliente en `src/services/` en vez de ampliar `api.ts`.
- No commitear `.env`, `ven/`, `node_modules/` ni `dist/`.
- No copiar PDFs al Escritorio ni regenerarlos sin petición explícita. Los PDFs de SIMET se eliminaron el 25/11/2026 para liberar espacio; se conservan solo los respaldos `.pdf.bak_*`.
- Solo npm. No introducir otros lockfiles.
- Al regenerar `requirements.txt` en PowerShell, forzar UTF-8: `pip freeze | Out-File -Encoding utf8 requirements.txt`.
- No cambiar el DDL local para que coincida con un modelo nuevo. El DDL pertenece al data engine.

## Agente analítico: decisiones que no deben revertirse

- El asistente exige `ASISTENTE_DATABASE_URL` con rol de solo lectura. No existe fallback a `DATABASE_URL`.
- El LLM nunca recibe la conexión. Solo puede elegir herramientas declaradas; los parámetros se validan en `backend/app/services/parametros.py` antes de ejecutarse.
- El usuario puede pedir SQL. `ejecutar_sql_lectura` solo acepta una sentencia `SELECT` o `WITH`, sin comentarios ni múltiples sentencias, y limita la salida a 200 filas. `DELETE`, `DROP`, `ALTER`, `INSERT` y `UPDATE` están prohibidos. No se permite cambiar tablas ni esquema desde el asistente.
- `consultar_agregados` calcula promedio, suma, mínimo, máximo o conteo sobre columnas permitidas de `datamart.dm_kpi_diarios`, con ventana opcional de 7, 15 o 30 días.
- SIMET no almacena pronósticos oficiales. Toda extrapolación posterior a la última fecha observada debe incluir `aviso = "Estimación derivada; SIMET no almacena pronósticos oficiales."`. Ante un pronóstico oficial o registrado se responde en local con `SIN_PRONOSTICO_OFICIAL`.
- Las fórmulas nuevas entran por revisión y registro en `backend/app/services/formulas.py`. No se buscan ni ejecutan fórmulas externas en caliente.
- El corpus operativo editable está en `docs/base_conocimiento/CORPUS_OPERATIVO_SIMET.md`. El entregable DOCX se regenera desde ese archivo; no se edita a mano. No se generan ni copian PDFs sin petición explícita.
- `riesgo_dac` compara el promedio del **tipo de servicio** contra cada límite tarifario. No divide el consumo total entre el número de servicios de una tarifa: la vista no permite atribuir consumo por tarifa ni por RPU.
- `proyeccion_tendencia` produce una **banda de predicción** con σ de residuales y crecimiento por horizonte. No la describas como intervalo de confianza de la media.
- `indice_perdidas_y_anomalias` cuenta **eventos** de `datamart.dm_anomalias_zona`, no alertas de `energia.alerta`.
- `evaluar_expresion_segura` usa AST acotado sin `eval` y sus variables se derivan del payload verificado de un paso previo.
- Seis turnos de historial son doce mensajes; el límite de 800 caracteres aplica a pregunta, cada mensaje y la respuesta devuelta.
- Groq rechaza con Cloudflare 1010 las peticiones sin `User-Agent`; `_chat` envía `curl/8.10.1` para que el proveedor responda.
- Saludos, capacidades, definiciones y consultas nominales se responden en local. No se redactan con LLM y su cita es `Base de Conocimiento SIMET`.
- Hora y fecha se responden en local con `respuesta_reloj` y se citan como `reloj local del servidor SIMET`. No son hechos del dominio y no se envían al proveedor.
- La identidad se responde en local con `respuesta_identidad` y se cita como `Base de Conocimiento SIMET`. Si la pregunta combina identidad y hora, `_plan_determinista` devuelve un solo turno con ambas fuentes.
- El redactor usa `REDACTOR_REDUCIDO` y un payload resumido de 4,000 caracteres. No se le envía el glosario completo.
- El historial de la interfaz se guarda en `localStorage` con `simet-asistente-historial-v1`; se sanita a doce mensajes de 800 caracteres. No se escribe en PostgreSQL.
- `_perfil_horario` omite el parámetro cuando no hay filtro: `WHERE (:tipo_servicio IS NULL OR ...)` produce un parámetro `$1` ambiguo con psycopg.
- Los filtros opcionales de zona se escriben `CAST(:zona AS TEXT) IS NULL OR ...`. La forma `:zona IS NULL` también es ambigua en `consultar_zonas` y `consultar_alertas_y_medidores`.
- `consultar_zonas` filtra primero `energia.zona` y luego agrega `energia.lectura` y `energia.evento`. Usar `datamart.dm_*` para una zona puntual agregaba los 10.8 M registros antes del filtro y agotaba el timeout.
- El plan local extrae el nombre de zona de «métricas/indicadores/datos/resumen de <zona>», además de «zona <nombre>». `La` cuenta como palabra válida en el nombre.
- Las respuestas con cifras citan tablas verificadas; `_corregir_citas` elimina `Base de Conocimiento SIMET` cuando `modo=datos`. El glosario no es fuente de cifras.
- El redactor no añade citas `*(fuente: ...)*` por cifra en `modo=datos`: solo la línea final `Fuentes:` con las tablas del payload. `_corregir_citas` elimina cualquier línea con `Base de Conocimiento SIMET` en ese modo y normaliza `energía.` a `energia.`. El narrador local de `consultar_zonas` incluye tipo urbano, lecturas, medidores, eventos y desviación, así que la respuesta sigue siendo completa si el proveedor no responde.
- Toda respuesta de `consultar_zonas` incluye de forma determinista `Periodo: Acumulado enero–marzo de 2026 (90 días). No es promedio mensual.` `_finalizar` reserva 100 caracteres para esa línea antes del recorte de 800.
- La gráfica de `consultar_zonas` compara solo `consumo_total_kwh` contra `consumo_reportado_kwh`. `kwh_desviados` no se grafica junto al consumo: 703 kWh contra 387 336 kWh deja la barra invisible. Con una sola zona el título es «Consumo total y reportado en <zona>», no «Ranking…».
- `DatosVisualizacion` admite `subtitulo`. El campo también está declarado en `GraficaVisualizacion`; si falta en el schema, Pydantic lo descarta. La interfaz lo inyecta bajo el título de la gráfica con los tokens existentes.
- `_respuesta_util` exige las siete cifras de `consultar_zonas` con todos sus dígitos y separadores válidos. Ollama escribió `10,368` lecturas en vez de `103,680` y la validación anterior de cinco dígitos lo aceptó; ahora cualquier cifra alterada o ausente fuerza el narrador local.
- Ollama está instalado con `qwen2.5:3b` y se configura con `LLM_PROVIDER=ollama`, `LLM_BASE_URL=http://127.0.0.1:11434/v1` y `LLM_API_KEY` vacía. La clave vacía solo es válida cuando el host de `LLM_BASE_URL` es loopback; con base remota desactiva la redacción. `LLM_TIMEOUT` fija el máximo de segundos por llamada.
- Ollama no cambia el grounding: `planificar` siempre devuelve `_plan_determinista`, las cifras salen de PostgreSQL y las definiciones de `Base de Conocimiento SIMET`. Un modelo local de 3B sobrescribió un plan de zona válido con una respuesta conceptual; por eso el proveedor solo redacta un payload verificado.
- «Pronostico», «pronostica», «pronosticar» y «pronosticame» activan `proyeccion_tendencia`. Los temas ajenos `lluvia`, `temperatura` y `humedad` siguen saliendo del alcance aunque lleven la palabra pronóstico.
- Con `proyeccion_tendencia` disponible, `aviso_estimacion` prevalece sobre los avisos técnicos del plan o la redacción. Un fallback local no puede borrar la regla de dominio.
