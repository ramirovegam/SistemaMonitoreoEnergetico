# Manual de usuario — SIMET

Índice

1. Acceso
2. Navegación
3. Pantallas
4. Filtros y acciones
5. Temas y preferencias
6. Estados de carga, error y datos vacíos
7. Resolución de problemas

---

## 1. Acceso

El panel se abre en `http://localhost:8443` cuando el frontend está en ejecución. La API debe estar disponible en `http://127.0.0.1:8000`; la documentación interactiva de la API está en `http://127.0.0.1:8000/docs`.

La API necesita PostgreSQL con el esquema `energia` ya cargado. El DDL canónico no está en este repositorio: pertenece al data engine `KrC234/data-engine-for-energy-analysis`. La conexión se toma de `DATABASE_URL` en `.env`; si falta, el backend no importa.

Si la URL base del backend es otra, se define en `VITE_API_URL` antes de construir el frontend.

## 2. Navegación

El menú lateral agrupa nueve pantallas en tres bloques: Operación, Análisis y Administración. La navegación usa rutas `#/<slug>` estables. Puede copiar la URL, recargar la página o abrirla en otra pestaña: la pantalla correcta se restaura desde el hash.

- **Paleta de comandos:** use el atajo `Ctrl + K` o `Cmd + K` para abrir la paleta de comandos. Escriba el nombre de una pantalla para buscarla y abrirla.
- **Campana de alertas:** muestra el número de alertas.
- **Selector de tema:** permite elegir modo claro, modo oscuro o tema del sistema, y cambiar el acento de color.

## 3. Pantallas

| Clave | Qué muestra | Endpoint principal |
|---|---|---|
| `dashboard` | KPIs del día, selector de fecha, mapa Leaflet, consumo por zona y alertas recientes | `/api/dashboard` |
| `zonas` | Indicadores por zona, ranking, catálogo y estado de medición | `/api/zonas` y `/api/zonas/indicadores` |
| `hogares` | Servicios registrados, medidores asociados, carga contratada y solar | `/api/servicios` |
| `medidores` | Inventario, estado y calidad de enlace | `/api/medidores` |
| `alertas` | Alertas activas y cerradas, prioridad, medidor y servicio afectado | `/api/alertas` |
| `analisis-energetico` | Curva horaria, comparación mensual y perfil por tipo de día | `/api/analisis-energetico/*` |
| `historial-lecturas` | Registros, calidad del dato, huecos y exportación CSV | `/api/historial-lecturas/*` |
| `calendario-energetico` | Días festivos, vacacionales, temperatura y factor estacional | `/api/calendario-energetico` |
| `tarifas` | Catálogo tarifario, límite DAC y servicios asignados | `/api/tarifas` |

Toda la interfaz consume los datos que sirve la API. El volumen servido es sintético y fue generado por HSD; el frontend no fabrica gráficas ni valores por su cuenta.

## 4. Filtros y acciones

- **Zonas:** seleccione zona, mes de análisis y criterio de ordenamiento. El ranking y los indicadores se recalculan al cambiar el mes.
- **Medidores:** busque un medidor por ID, serie, marca, RPU o servicio en el campo de búsqueda. Los filtros son por zona, marca y estado. Puede cambiar entre vista de lista y cuadrícula.
- **Calendario:** navegue por año y seleccione meses. Al abrir un día se muestran temperatura, tipo de día y factor estacional.
- **Análisis energético:** seleccione un medidor. La zona, el servicio y el RPU se cargan de forma automática.
- **Historial de lecturas:** filtre por medidor y rango de fechas, y pulse **Exportar CSV** para descargar las lecturas. Use **Detectar huecos** para ver los intervalos sin lectura.
- **Alertas y tarifas:** revise prioridad, estado y servicios asignados.

Los controles tienen un área táctil mínima de 40 px y etiquetas accesibles. Las tablas y listas conservan el foco de teclado al actualizarse.

## 5. Temas y preferencias

El tema se aplica con el atributo `data-theme` en `<html>` y se guarda en almacenamiento local. Arranca en oscuro cuando el sistema operativo no declara preferencia. Los tokens de color están en `src/index.css`.

## 6. Estados de carga, error y datos vacíos

- **Cargando:** aparecen esqueletos en KPIs y tablas; el encabezado indica qué recurso se está actualizando.
- **Sin datos:** se muestra un mensaje explícito, no una tabla vacía sin contexto.
- **Error:** el panel explica la causa probable y ofrece botones de reintento, cambio de periodo o descarte del aviso.
- **Datos insuficientes:** si `energia.lectura` no está poblada, Análisis y Calendario no pueden dibujar curvas; el generador HSD permite regenerar el juego de datos desde la API.
- **Base de datos caída:** si la API está arriba pero PostgreSQL no responde, la petición puede quedar pendiente y la pantalla permanece en «Cargando». Compruebe el servicio de base antes de atribuir el fallo al frontend. Con la API inalcanzable, la pantalla muestra el error y el botón **Reintentar**.

## 7. Resolución de problemas

| Síntoma | Causa probable | Acción |
|---|---|---|
| Pantallas vacías o `fetch failed` | Backend apagado o `VITE_API_URL` incorrecto | Levantar uvicorn y revisar la variable de entorno |
| Error 404 en `/api/calendario` | Router no registrado | Verificar `backend/app/main.py` |
| Gráficas sin curvas | Tabla `lectura` sin datos | Poblar con el data engine o usar `/api/generador-hsd/generar-masivo` |
| Datos con calidad de enlace fuera de rango | Convención incorrecta (0–1 en vez de 50–100) | Usar el tipo canónico del data engine |
| Campos de formulario rechazados | Validación de esquema | Consultar `docs/data-engine/ANALISIS_Y_MEJORAS.md` y los esquemas Pydantic |
| «Cargando» de forma indefinida con `API operativa` | PostgreSQL apagado o `DATABASE_URL` inválida | Verificar el servicio de base y su puerto antes de recargar la página |

## 8. Verificación de la instalación

Ejecutada el 24 de noviembre de 2026 en el entorno de auditoría:

| Comprobación | Resultado |
|---|---|
| `cmd /c npx tsc --noEmit` | Código 0, sin salida |
| `cmd /c npm run build` | Código 0; Vite 8.3.0, 2,522 módulos |
| Importación `backend.app.main:app` | 18 rutas registradas, `/docs` incluido |
| `GET /docs` | HTTP 200 |
| Nueve rutas del panel con backend caído | Títulos correctos, sin desbordamiento horizontal a 1280 px, mensaje de error y opción de reintento |

El backend compila con `python -m compileall` sobre `backend` y los scripts de la raíz. `requirements.txt` declara `numpy==2.4.4`, necesario para importar el router del generador HSD.
