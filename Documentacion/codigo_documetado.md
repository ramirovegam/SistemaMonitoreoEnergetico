# Documentación técnica del código de SIMET

**Sistema:** Sistema de Monitoreo Energético de una Ciudad Inteligente  
**Nombre corto:** SIMET  
**Tipo de documento:** Documentación técnica del código fuente  
**Versión documental:** 2.0  
**Fecha:** 12 de octubre de 2026  
**Repositorio:** [https://github.com/ramirovegam/SistemaMonitoreoEnergetico.git](https://github.com/ramirovegam/SistemaMonitoreoEnergetico.git)

---

## Propósito del documento

Este documento explica el proyecto SIMET desde el punto de vista del código fuente. Está dirigido al departamento de documentación, al equipo de desarrollo, al personal de soporte técnico y a cualquier persona encargada de mantener, desplegar o ampliar la aplicación.

La documentación describe:

- Qué problema resuelve SIMET.
- Cómo está organizada la arquitectura.
- Qué responsabilidad tiene cada carpeta.
- Cómo inicia el frontend.
- Cómo inicia el backend.
- Cómo se realiza la conexión con PostgreSQL.
- Cómo se relacionan los componentes React con los servicios TypeScript.
- Cómo se relacionan los servicios TypeScript con los routers FastAPI.
- Cómo se relacionan los routers con schemas, modelos y tablas.
- Cómo funcionan los módulos principales.
- Cómo ejecutar el proyecto.
- Cómo validar una instalación.
- Cómo agregar una pantalla o endpoint nuevo.
- Qué decisiones técnicas se tomaron y por qué.
- Qué módulos todavía pueden desarrollarse.

Este archivo no sustituye un manual de usuario. El objetivo principal es documentar la implementación y facilitar la continuidad técnica del proyecto.

---

# 1. Descripción general

SIMET es una aplicación web para consultar, supervisar y analizar información energética de una ciudad inteligente.

El sistema integra:

- Zonas geográficas.
- Servicios eléctricos.
- Medidores.
- Lecturas energéticas.
- Calidad de comunicación.
- Tarifas.
- Tipos de evento.
- Eventos detectados.
- Alertas operativas.
- Calendario energético.
- Temperaturas.
- Factores estacionales.

El flujo funcional principal es:

```text
Zona
  -> Servicio
      -> Medidor
          -> Lecturas
              -> Análisis energético
                  -> Evento
                      -> Alerta
```

El calendario energético añade contexto temporal:

```text
Fecha
  -> tipo de día
  -> festivo o vacacional
  -> temperatura
  -> factor estacional
  -> lecturas, eventos y alertas del día
```

---

# 2. Repositorio

## 2.1 Dirección

```text
https://github.com/ramirovegam/SistemaMonitoreoEnergetico.git
```

Enlace:

[Repositorio SistemaMonitoreoEnergetico](https://github.com/ramirovegam/SistemaMonitoreoEnergetico.git)

## 2.2 Clonar el repositorio

```powershell
git clone https://github.com/ramirovegam/SistemaMonitoreoEnergetico.git
cd SistemaMonitoreoEnergetico
```

## 2.3 Archivos raíz importantes

La raíz contiene archivos de configuración para el frontend y backend:

```text
backend/app/
src/
.gitignore
index.html
package.json
package-lock.json
pnpm-lock.yaml
requirements.txt
tsconfig.json
vite.config.ts
```

### `package.json`

Define:

- Dependencias JavaScript.
- Dependencias de desarrollo.
- Scripts de Vite.
- Librerías utilizadas por React.

### `package-lock.json`

Fija versiones exactas cuando se instala con npm.

### `pnpm-lock.yaml`

Es el archivo de bloqueo de pnpm. El equipo debe elegir un administrador principal de paquetes para evitar diferencias. En esta documentación se utilizan comandos npm.

### `requirements.txt`

Define las dependencias Python utilizadas por el backend.

### `tsconfig.json`

Configura el compilador de TypeScript.

### `vite.config.ts`

Configura Vite, que se encarga del servidor de desarrollo y la compilación del frontend.

### `index.html`

Es el documento HTML base donde React monta la aplicación.

---

# 3. Arquitectura

## 3.1 Capas

SIMET utiliza una arquitectura en tres capas:

```text
Presentación
    React + TypeScript

Aplicación y API
    FastAPI + Pydantic + SQLAlchemy

Persistencia
    PostgreSQL
```

## 3.2 Flujo de una solicitud

Ejemplo: cargar el calendario energético.

```text
EnergyCalendar.tsx
    |
    | llama una función
    v
calendarioEnergeticoService.ts
    |
    | GET /api/calendario-energetico
    v
calendario_energetico.py
    |
    | ejecuta SQL parametrizado
    v
PostgreSQL / energia.calendario
    |
    | devuelve filas
    v
calendario_energetico_schema.py
    |
    | valida la respuesta
    v
JSON
    |
    v
Servicio TypeScript
    |
    v
Componente React
```

## 3.3 Regla de separación

Cada capa tiene una responsabilidad concreta:

### Componentes React

Se encargan de:

- Interfaz.
- Estado local.
- Filtros.
- Navegación.
- Gráficas.
- Tablas.
- Paneles de detalle.
- Indicadores de carga y error.

### Servicios TypeScript

Se encargan de:

- Definir interfaces TypeScript.
- Construir parámetros HTTP.
- Ejecutar `fetch`.
- Validar `response.ok`.
- Convertir la respuesta a un tipo.
- Centralizar las URLs de la API.

### Routers FastAPI

Se encargan de:

- Definir rutas.
- Validar parámetros.
- Consultar la base.
- Aplicar filtros del backend.
- Combinar tablas mediante `JOIN`.
- Realizar agregaciones.
- Retornar estructuras predecibles.

### Schemas Pydantic

Se encargan de:

- Definir la forma de la respuesta.
- Validar tipos.
- Documentar automáticamente la API.
- Evitar respuestas inconsistentes.

### Modelos SQLAlchemy

Se encargan de representar las tablas y sus relaciones cuando el módulo utiliza ORM.

### PostgreSQL

Se encarga de conservar los datos y ejecutar operaciones relacionales y agregadas.

---

# 4. Estructura general

```text
SistemaMonitoreoEnergetico/
|
|-- src/
|   |-- App.tsx
|   |-- components/
|   |-- services/
|   |-- data/
|   `-- otros archivos de arranque y estilos
|
|-- backend/
|   `-- app/
|       |-- main.py
|       |-- database.py
|       |-- routers/
|       |-- schemas/
|       `-- models/
|
|-- package.json
|-- requirements.txt
|-- tsconfig.json
|-- vite.config.ts
`-- index.html
```

---

# 5. Frontend

## 5.1 Tecnologías

- React.
- TypeScript.
- Vite.
- Tailwind CSS.
- Recharts.
- Lucide React.

## 5.2 Punto de entrada

Vite carga `index.html`. El archivo de arranque de React monta el componente principal en el elemento raíz del documento.

El componente central es:

```text
src/App.tsx
```

## 5.3 `App.tsx`

`App.tsx` administra:

- Página activa.
- Sidebar de escritorio.
- Sidebar móvil.
- Menú colapsado.
- Etiqueta de la pantalla actual.
- Navegación entre módulos.
- Evento global `simet:navigate`.
- Contexto de zona seleccionada.

### Tipo `Page`

El tipo limita las páginas válidas:

```typescript
type Page =
  | "dashboard"
  | "zonas"
  | "hogares"
  | "medidores"
  | "analisis-energetico"
  | "historial-lecturas"
  | "calendario-energetico"
  | "alertas"
  | "tarifas";
```

TypeScript detecta errores si se intenta navegar a una página no declarada.

### `NAV_ITEMS`

El arreglo de navegación relaciona:

- Clave.
- Etiqueta.
- Icono.
- Badge opcional.

Ejemplo conceptual:

```typescript
{
  key: "calendario-energetico",
  label: "Calendario Energético",
  icon: CalendarDays,
}
```

### `NavButton`

Renderiza una opción del menú. Maneja:

- Estado activo.
- Modo colapsado.
- Badge.
- Icono.
- Etiqueta.

### `Sidebar`

Renderiza la navegación de escritorio.

### `MobileSidebar`

Renderiza el menú lateral para dispositivos pequeños.

### `PageContent`

Centraliza el renderizado:

```typescript
switch (page) {
  case "dashboard":
    return <Dashboard />;
  case "calendario-energetico":
    return <EnergyCalendar />;
}
```

### Evento `simet:navigate`

Permite que un componente solicite la navegación sin recibir directamente una función del padre.

Ejemplo:

```typescript
window.dispatchEvent(
  new CustomEvent("simet:navigate", {
    detail: {
      page: "zonas",
      idZona: 4,
    },
  }),
);
```

El listener de `App.tsx` recibe el evento y cambia de pantalla.

---

# 6. Componentes React

## 6.1 `Dashboard.tsx`

### Responsabilidad

Mostrar un resumen ejecutivo.

### Contenido esperado

- Indicadores globales.
- Consumo.
- Medidores.
- Alertas.
- Tendencias.
- Accesos a detalle.

### Relaciones

El Dashboard utiliza un servicio dedicado para consultar endpoints agregados del backend.

---

## 6.2 `Zones.tsx`

### Responsabilidad

Mostrar información por zona.

### Datos

- Identificador.
- Nombre.
- Totales.
- Servicios.
- Medidores.
- Consumo.
- Carga.

### Propiedad importante

```typescript
initialZonaId
```

Permite abrir una zona concreta desde otra pantalla.

---

## 6.3 `Households.tsx`

El nombre histórico del archivo es `Households.tsx`, pero su etiqueta funcional en la navegación es **Servicios**.

### Responsabilidad

Mostrar los suministros eléctricos.

### Datos

- Servicio.
- RPU.
- Zona.
- Tipo de servicio.
- Medidores relacionados.

### Decisión de negocio

La futura factura debe pertenecer al servicio.

---

## 6.4 `Meters.tsx`

### Responsabilidad

Mostrar el catálogo de medidores.

### Datos

- Número de serie.
- Marca.
- Servicio.
- Zona.
- Calidad de enlace.
- Estado.
- Función principal o secundaria.

---

## 6.5 `EnergyAnalysis.tsx`

### Responsabilidad

Analizar el consumo de un medidor.

### Filtros

- Medidor.
- Mes.
- Tipo de día.

Zona, servicio, RPU y tipo de servicio no son filtros editables. Se derivan del medidor seleccionado.

### Estado principal

El componente maneja:

- Catálogo de medidores.
- ID seleccionado.
- Mes.
- Tipo de día.
- Respuesta del análisis.
- Búsqueda.
- Carga.
- Actualización.
- Error.

### Carga del catálogo

Al montar el componente se llama:

```http
GET /api/analisis-energetico/medidores
```

Se selecciona el primer medidor cuando existe resultado.

### Carga del análisis

Cuando cambia medidor, mes o tipo de día se llama:

```http
GET /api/analisis-energetico/agregado
```

Parámetros:

```text
mes
nivel=medidor
tipo_dia
id_medidor
```

### Datos transformados

Los datos se adaptan para Recharts:

- Hora numérica a `HH:00`.
- Curva real.
- Curva estimada.
- Mes activo.
- Mapa de calor.

### Variación mensual

La función de clasificación recibe:

- Variación.
- Consumo anterior.
- Mes seleccionado.

Reglas:

```text
consumo anterior <= 0 y enero
    -> Sin periodo anterior

consumo anterior <= 0 y otro mes
    -> Sin datos comparables

variación < 0
    -> Disminuyó

variación = 0 con base válida
    -> Sin cambio

0 < variación <= 10
    -> Aumentó moderadamente

variación > 10
    -> Aumentó considerablemente
```

### Subcomponentes

- Tooltip.
- Heatmap.
- LoadingScreen.
- UpdatingOverlay.
- InfoCard.
- KpiCard.
- SummaryCard.

---

## 6.6 `ReadingHistory.tsx`

### Responsabilidad

Consultar lecturas individuales.

### Estado

- Resultado paginado.
- Página.
- Tamaño de página.
- Fechas.
- Medidor.
- Zona.
- Orden.
- Agrupación.
- Huecos.
- Registro seleccionado.
- Carga y error.

### Servicio

Usa funciones como:

```typescript
obtenerHistorial()
obtenerLecturasAgrupadas()
detectarHuecos()
obtenerLecturaOriginal()
descargarHistorialCsv()
```

### Indicadores actuales

- Lecturas encontradas.
- Lecturas válidas en página.
- Consumo acumulado en página.
- Promedio por lectura.
- Lectura máxima.
- Calidad promedio.

### Métricas retiradas

Se retiraron “Lecturas estimadas” y “Lecturas faltantes” porque no existía una columna o cálculo global suficientemente confiable.

### Detección de huecos

El frontend no inventa huecos. Llama al backend y muestra:

- Inicio.
- Fin.
- Duración.
- Estimación de intervalos faltantes.

---

## 6.7 `Alerts.tsx`

### Responsabilidad

Mostrar alertas operativas con información del tipo de evento.

### Filtros

- Mes.
- Zona.
- Servicio.
- Medidor.
- Categoría.
- Estado.
- Prioridad.
- Búsqueda.

### Filtros encadenados

```text
Zona seleccionada
    -> limita servicios
        -> servicio seleccionado
            -> limita medidores
```

### Catálogos

El componente carga:

```http
GET /api/alertas/catalogos
```

La respuesta contiene:

- Tipos de evento.
- Zonas.
- Servicios.
- Medidores.
- Año de referencia.

### Alertas

El componente llama:

```http
GET /api/alertas
```

El backend aplica filtros.

### Diferencia entre entidades

```text
Tipo de evento
    categoría, efecto y regla

Evento
    ocurrencia concreta

Alerta
    aviso operativo
```

### Corrección principal

Antes se mostraba:

```text
Tipo de evento #3
```

Ahora se muestra:

```text
Manipulación de medidor
MANIPULACION
REDUCCION
```

### Panel de detalle

Muestra:

- Datos de alerta.
- Clasificación.
- Regla.
- Duración.
- Evento asociado.
- Medidor.
- Calidad.
- Servicio.
- RPU.
- Zona.

---

## 6.8 `EnergyCalendar.tsx`

### Responsabilidad

Mostrar enero, febrero y marzo de 2026 con contexto energético diario.

### Carga inicial

```typescript
obtenerCalendarioEnergetico(year, 1, 3)
```

### Filtros

- Todos los días.
- Solo festivos.
- Solo vacacionales.

### Organización

Los días se agrupan por mes mediante `useMemo`.

### Celda diaria

Muestra:

- Día.
- Icono de festivo.
- Icono vacacional.
- Temperatura mínima.
- Temperatura máxima.
- Código `tipo_dia`.
- Factor estacional.

### Colores

- Sábado: azul.
- Domingo: violeta.
- Festivo: naranja.
- Vacacional: turquesa.
- Festivo y vacacional: gradiente.

### Selección de fecha

Al presionar un día:

```typescript
obtenerDetalleDia(day.fecha)
```

### Detalle

- Clasificación.
- Temperaturas.
- Media.
- Amplitud térmica.
- Factor estacional.
- Ajuste porcentual.
- Consumo.
- Hora pico.
- Lecturas.
- Medidores.
- Eventos.
- Alertas.

---

## 6.9 `Tariffs.tsx`

### Responsabilidad

Mostrar y administrar la configuración tarifaria disponible.

### Uso futuro

El módulo de facturación tomará tarifas para calcular cargos, pero deberá conservar una copia de los valores aplicados en cada periodo.

---

# 7. Servicios TypeScript

## 7.1 Patrón

```typescript
const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
```

Esto permite cambiar la API con una variable de entorno.

### Patrón de consulta

```typescript
const response = await fetch(url);

if (!response.ok) {
  throw new Error(`HTTP ${response.status}`);
}

return response.json();
```

## 7.2 `analisisEnergeticoService.ts`

Define tipos y funciones del análisis energético.

## 7.3 `historialLecturasService.ts`

Define:

- Tipos de lectura.
- Filtros.
- Paginación.
- Agrupación.
- Huecos.
- Exportación.

## 7.4 `alertasService.ts`

Define:

- `Alerta`.
- `CatalogosAlertas`.
- `FiltrosAlertas`.
- `obtenerAlertas()`.
- `obtenerCatalogosAlertas()`.

## 7.5 `calendarioEnergeticoService.ts`

Define:

- `DiaCalendario`.
- `ResumenCalendario`.
- `CalendarioEnergeticoResponse`.
- `DetalleDia`.
- `obtenerCalendarioEnergetico()`.
- `obtenerDetalleDia()`.

---

# 8. Backend

## 8.1 `main.py`

### Responsabilidad

- Crear `FastAPI`.
- Configurar título y versión.
- Configurar CORS.
- Registrar routers.
- Exponer `/` y `/health`.

### Routers

```python
app.include_router(dashboard_router)
app.include_router(zonas_router)
app.include_router(servicios_router)
app.include_router(medidores_router)
app.include_router(historial_lecturas_router)
app.include_router(analisis_energetico_router)
app.include_router(calendario_energetico_router)
app.include_router(alertas_router)
app.include_router(tarifas_router)
```

### CORS

Durante desarrollo se permiten puertos de Vite y otros orígenes locales.

En producción deben limitarse a dominios autorizados.

---

## 8.2 `database.py`

### Responsabilidad

- Crear el motor SQLAlchemy.
- Crear sesiones.
- Proporcionar `get_db`.

Patrón típico:

```python
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

Los routers reciben una sesión mediante:

```python
db: Session = Depends(get_db)
```

---

# 9. Routers

## 9.1 Regla de nombres

Cada archivo de router debe coincidir con su import.

Correcto:

```text
backend/app/routers/analisis_energetico.py
```

```python
from .routers.analisis_energetico import router
```

Incorrecto si el archivo no existe:

```python
from .routers.analisis_energeticorouter import router
```

---

## 9.2 `analisis_energetico.py`

### Prefijo

```text
/api/analisis-energetico
```

### Función principal

Consultar y agregar lecturas por medidor y periodo.

### Endpoint principal del componente

```http
GET /api/analisis-energetico/agregado
```

### Parámetros

- Mes.
- Nivel.
- Tipo de día.
- ID de medidor.

### Respuesta

- Resumen.
- Curva horaria.
- Comparación mensual.
- Mapa de calor.

---

## 9.3 `historial_lecturas.py`

### Función

Consultar registros paginados y agrupados.

### Operaciones

- Historial.
- Agrupación.
- Registro original.
- Huecos.
- CSV.

---

## 9.4 `alertas.py`

### Prefijo

```text
/api/alertas
```

### Consulta principal

Une:

```text
energia.alerta
energia.tipo_evento
energia.evento
energia.medidor
energia.servicio
energia.zona
```

### JOIN esencial

```sql
JOIN energia.tipo_evento te
  ON te.id_tipo_evento = a.id_tipo_evento
```

Sin ese JOIN, el frontend solo conoce el número del tipo.

### Catálogos

```http
GET /api/alertas/catalogos
```

### Detalle

```http
GET /api/alertas/{id_alerta}
```

---

## 9.5 `calendario_energetico.py`

### Prefijo

```text
/api/calendario-energetico
```

### Calendario

```http
GET /api/calendario-energetico
```

Parámetros:

- Año.
- Mes inicial.
- Mes final.

### Detalle

```http
GET /api/calendario-energetico/{fecha}
```

### Fuentes

- `energia.calendario`.
- `energia.lectura`.
- `energia.evento`.
- `energia.alerta`.

### Cálculos

```text
Temperatura media
    (mínima + máxima) / 2

Amplitud térmica
    máxima - mínima

Ajuste estacional
    (factor - 1) * 100
```

### Conversión de fecha

Se utiliza:

```sql
CAST(:fecha AS date)
```

Esto evita problemas de PostgreSQL con parámetros seguidos de `::date`.

---

# 10. Schemas Pydantic

## 10.1 Propósito

Los schemas definen contratos entre backend y frontend.

## 10.2 `alerta_schema.py`

Incluye:

- Datos de alerta.
- Tipo de evento.
- Evento asociado.
- Medidor.
- Servicio.
- Zona.

## 10.3 `calendario_energetico_schema.py`

Clases:

```text
DiaCalendario
ResumenCalendario
CalendarioEnergeticoResponse
DetalleDiaResponse
```

### `DiaCalendario`

Representa una fila de `energia.calendario`.

### `ResumenCalendario`

Representa indicadores agregados.

### `DetalleDiaResponse`

Extiende los datos base con métricas energéticas.

---

# 11. Modelos y relaciones

## 11.1 Relación territorial

```text
Zona
  1 -> N Servicios

Servicio
  1 -> N Medidores

Medidor
  1 -> N Lecturas
```

## 11.2 Relación de eventos

```text
TipoEvento
  1 -> N Eventos

TipoEvento
  1 -> N Alertas

Evento
  0..1 -> N Alertas
```

## 11.3 Alerta

Contiene:

- `id_alerta`.
- `id_evento` opcional.
- `id_medidor`.
- `id_tipo_evento`.
- Fecha de generación.
- Prioridad.
- Fecha de cierre.
- Resultado.

## 11.4 Tipo de evento

Contiene:

- Clave.
- Nombre.
- Efecto.
- Estado activo.
- Duración mínima.
- Duración máxima.
- Factores.
- Umbral.
- Regla.

## 11.5 Evento

Representa la ocurrencia concreta:

- Inicio.
- Fin.
- Intensidad.
- kWh desviados.
- Medidor.
- Tipo.

---

# 12. Base de datos

## 12.1 Esquema

```text
energia
```

## 12.2 Tablas relevantes

```text
energia.zona
energia.servicio
energia.medidor
energia.lectura
energia.calendario
energia.tipo_evento
energia.evento
energia.alerta
```

## 12.3 Índices recomendados

```sql
CREATE INDEX IF NOT EXISTS ix_lectura_medidor_ts
ON energia.lectura (id_medidor, ts);

CREATE INDEX IF NOT EXISTS ix_alerta_generacion
ON energia.alerta (ts_generacion);

CREATE INDEX IF NOT EXISTS ix_alerta_medidor
ON energia.alerta (id_medidor);

CREATE INDEX IF NOT EXISTS ix_alerta_tipo
ON energia.alerta (id_tipo_evento);

CREATE INDEX IF NOT EXISTS ix_evento_inicio
ON energia.evento (ts_inicio);

CREATE INDEX IF NOT EXISTS ix_calendario_fecha
ON energia.calendario (fecha);
```

Estos índices deben validarse contra los índices ya existentes antes de ejecutarlos.

---

# 13. Endpoints documentados

## Sistema

```http
GET /
GET /health
```

## Análisis

```http
GET /api/analisis-energetico/medidores
GET /api/analisis-energetico/lecturas
GET /api/analisis-energetico/resumen
GET /api/analisis-energetico/perfil-horario
GET /api/analisis-energetico/periodos
GET /api/analisis-energetico/tipos-dia
GET /api/analisis-energetico/agregado
```

## Alertas

```http
GET /api/alertas
GET /api/alertas/catalogos
GET /api/alertas/{id_alerta}
```

## Calendario

```http
GET /api/calendario-energetico
GET /api/calendario-energetico/{fecha}
```

## Ejemplos

```http
GET /api/analisis-energetico/agregado?mes=3&nivel=medidor&tipo_dia=todos&id_medidor=360
```

```http
GET /api/alertas?mes=3&id_zona=2&id_servicio=15
```

```http
GET /api/calendario-energetico?anio=2026&mes_inicio=1&mes_fin=3
```

```http
GET /api/calendario-energetico/2026-01-01
```

---

# 14. Variables de entorno

## Frontend

```env
VITE_API_URL=http://127.0.0.1:8000
```

El código tiene un fallback local, pero en despliegue debe definirse la variable.

## Backend

La cadena de PostgreSQL debe manejarse mediante variables de entorno.

Ejemplo conceptual:

```env
DATABASE_URL=postgresql+psycopg://usuario:contrasena@host:5432/base
```

No se deben guardar credenciales reales en Git.

---

# 15. Instalación

## 15.1 Clonar

```powershell
git clone https://github.com/ramirovegam/SistemaMonitoreoEnergetico.git
cd SistemaMonitoreoEnergetico
```

## 15.2 Entorno Python

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## 15.3 Dependencias frontend

```powershell
npm install
```

## 15.4 Configurar PostgreSQL

1. Crear o restaurar la base.
2. Verificar el esquema `energia`.
3. Configurar `DATABASE_URL`.
4. Probar conexión.

## 15.5 Iniciar backend

```powershell
python -m uvicorn backend.app.main:app --reload --port 8000
```

## 15.6 Iniciar frontend

```powershell
npm run dev
```

## 15.7 Validar

```text
API:      http://127.0.0.1:8000
Swagger:  http://127.0.0.1:8000/docs
Health:   http://127.0.0.1:8000/health
Frontend: URL indicada por Vite
```

---

# 16. Compilación y validación

## Frontend

```powershell
npm run build
```

## Backend

```powershell
python -m py_compile `
  .\backend\app\main.py `
  .\backend\app\routers\analisis_energetico.py `
  .\backend\app\routers\alertas.py `
  .\backend\app\routers\calendario_energetico.py
```

## Limpiar caché Vite

```powershell
Remove-Item `
  .\node_modules\.vite `
  -Recurse `
  -Force `
  -ErrorAction SilentlyContinue
```

## Limpiar caché Python

```powershell
Get-ChildItem `
  -Path .\backend `
  -Directory `
  -Recurse `
  -Filter __pycache__ |
Remove-Item -Recurse -Force
```

---

# 17. Cómo agregar una pantalla

## Paso 1. Componente

Crear:

```text
src/components/NuevaPantalla.tsx
```

Debe manejar:

- Carga.
- Error.
- Vacío.
- Datos.
- Diseño responsivo.

## Paso 2. Servicio

Crear:

```text
src/services/nuevaPantallaService.ts
```

Definir interfaces y funciones HTTP.

## Paso 3. Schema

Crear:

```text
backend/app/schemas/nueva_pantalla_schema.py
```

## Paso 4. Router

Crear:

```text
backend/app/routers/nueva_pantalla.py
```

## Paso 5. Registrar router

En `main.py`:

```python
from .routers.nueva_pantalla import router as nueva_pantalla_router

app.include_router(nueva_pantalla_router)
```

## Paso 6. Registrar página

En `App.tsx`:

1. Importar componente.
2. Agregar clave a `Page`.
3. Agregar `NAV_ITEMS`.
4. Agregar `case` en `PageContent`.

## Paso 7. Probar

- Swagger.
- Endpoint.
- Servicio.
- Componente.
- Navegación.
- Build.

---

# 18. Cómo modificar un contrato de API

Los cambios deben hacerse en este orden:

```text
1. Tabla o consulta SQL
2. Router FastAPI
3. Schema Pydantic
4. Interface TypeScript
5. Servicio TypeScript
6. Componente React
7. Pruebas
8. Documentación
```

No cambiar solamente el backend o solamente el frontend.

---

# 19. Estados de interfaz

## Carga inicial

Usar skeleton o indicador.

## Actualización

Mostrar overlay contextual y bloquear temporalmente controles.

## Error

Mostrar un mensaje comprensible y conservar la pantalla.

## Vacío

Explicar que no existen registros para los filtros.

## Éxito

Mostrar datos y permitir interacción.

---

# 20. Seguridad

La versión actual se concentra en monitoreo y consulta. Deben considerarse estas mejoras:

- Autenticación.
- Roles.
- Permisos.
- HTTPS.
- CORS restringido.
- Secretos en variables de entorno.
- Auditoría.
- Validación de entradas.
- Límites de paginación.
- Control de exportaciones.

Roles sugeridos:

```text
Administrador
Supervisor
Analista
Operador
Consulta
```

---

# 21. Rendimiento

## Backend

- Usar paginación.
- Índices adecuados.
- Evitar N+1.
- Agregar límites.
- Medir consultas agregadas.
- Cachear catálogos estables.

## Frontend

- Usar `useMemo` para datos derivados.
- Evitar solicitudes duplicadas.
- No cargar todos los registros si existe paginación.
- Mantener componentes pequeños.
- Cancelar solicitudes obsoletas como mejora.

---

# 22. Errores corregidos

## Python dentro de TSX

Un componente contenía:

```python
from datetime import datetime
```

Los archivos `.tsx` deben contener React y TypeScript.

## Nombre incorrecto de router

El archivo real es:

```text
analisis_energetico.py
```

El import debe coincidir.

## Doble prefijo

Si el router ya contiene `/api`, no se agrega otro `/api` en `main.py`.

## 404 repetitivos

El componente antiguo llamaba endpoints no sincronizados. Se centralizó el análisis en `/agregado`.

## Tipo de evento numérico

Se agregó el JOIN con `tipo_evento`.

## Variación de enero

Se distingue ausencia de periodo anterior de una reducción real.

## Métricas no comprobables

Se retiraron tarjetas de lecturas estimadas y faltantes cuando no existía una base confiable.

---

# 23. Pruebas

## Prueba básica de backend

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
```

## Prueba de calendario

```powershell
Invoke-RestMethod "http://127.0.0.1:8000/api/calendario-energetico?anio=2026&mes_inicio=1&mes_fin=3"
```

## Prueba de alertas

```powershell
Invoke-RestMethod "http://127.0.0.1:8000/api/alertas?mes=3"
```

## Prueba de análisis

```powershell
Invoke-RestMethod "http://127.0.0.1:8000/api/analisis-energetico/agregado?mes=3&nivel=medidor&tipo_dia=todos&id_medidor=360"
```

## Matriz mínima

- Navegación.
- Carga.
- Error.
- Filtros.
- Paginación.
- Paneles.
- Exportación.
- Responsividad.
- Consistencia de contratos.

---

# 24. Despliegue

## Checklist

- [ ] Repositorio actualizado.
- [ ] Variables configuradas.
- [ ] Base restaurada.
- [ ] Dependencias Python instaladas.
- [ ] Dependencias npm instaladas.
- [ ] Backend compila.
- [ ] Frontend compila.
- [ ] Health responde.
- [ ] Swagger disponible o protegido.
- [ ] CORS restringido.
- [ ] HTTPS activo.
- [ ] Logs configurados.
- [ ] Respaldo disponible.
- [ ] Pruebas ejecutadas.

---

# 25. Mantenimiento

## Agregar campo

Actualizar:

- SQL.
- Schema.
- Interface.
- Componente.
- Documentación.

## Renombrar archivo

Actualizar todos los imports.

## Renombrar endpoint

Actualizar router, servicio, documentación y pruebas.

## Modificar una tabla

Evaluar impacto en:

- Modelos.
- Routers.
- Schemas.
- Servicios.
- Componentes.
- Reportes futuros.

---

# 26. Módulos futuros

## Facturación

Debe pertenecer al servicio.

Entidades sugeridas:

```text
factura
detalle_factura
pago
```

## Reportes

- Mensual.
- Zona.
- Servicio.
- Medidor.
- Alertas.
- Calidad.

## Configuración

- Tipos de evento.
- Umbrales.
- Intervalos.
- Metas.
- Reglas.

## Usuarios

- Autenticación.
- Roles.
- Permisos.
- Auditoría.

---

# 27. Glosario

**Alerta:** aviso operativo.  
**API:** interfaz HTTP del backend.  
**Evento:** ocurrencia detectada.  
**Factor estacional:** multiplicador de referencia diario.  
**Hueco:** intervalo sin lectura esperada.  
**Lectura:** medición almacenada.  
**Medidor:** equipo de medición.  
**RPU:** identificador del servicio.  
**Schema:** contrato de datos del backend.  
**Servicio:** suministro al que pertenecen medidores.  
**Tipo de evento:** categoría y regla.  
**Zona:** agrupación territorial.

---

# 28. Inventario principal

## Frontend

```text
src/App.tsx
src/components/Dashboard.tsx
src/components/Zones.tsx
src/components/Households.tsx
src/components/Meters.tsx
src/components/EnergyAnalysis.tsx
src/components/ReadingHistory.tsx
src/components/Alerts.tsx
src/components/EnergyCalendar.tsx
src/components/Tariffs.tsx
src/services/analisisEnergeticoService.ts
src/services/historialLecturasService.ts
src/services/alertasService.ts
src/services/calendarioEnergeticoService.ts
```

## Backend

```text
backend/app/main.py
backend/app/database.py
backend/app/routers/dashboard.py
backend/app/routers/zonas.py
backend/app/routers/servicios.py
backend/app/routers/medidores.py
backend/app/routers/historial_lecturas.py
backend/app/routers/analisis_energetico.py
backend/app/routers/alertas.py
backend/app/routers/calendario_energetico.py
backend/app/routers/tarifas.py
backend/app/schemas/alerta_schema.py
backend/app/schemas/calendario_energetico_schema.py
```

---

# 29. Criterios de aceptación

SIMET se considera correctamente instalado cuando:

- El backend inicia.
- `/health` responde.
- Swagger lista rutas.
- El frontend compila.
- Las pantallas abren.
- Los filtros funcionan.
- No hay 404 repetitivos.
- Las alertas muestran categorías.
- Enero muestra “Sin periodo anterior” cuando corresponde.
- El calendario muestra los datos de los tres meses.
- El detalle diario consulta información real.
- Los errores se muestran de manera controlada.

---

# 30. Entrega documental

El paquete de documentación debería contener:

1. Este archivo `codigo_documetado.md`.
2. `RESUMEN_PROYECTO_SIMET.md`.
3. README actualizado.
4. Diagrama de arquitectura.
5. Diagrama entidad-relación.
6. OpenAPI exportado.
7. Script de base de datos.
8. Manual de instalación.
9. Manual de usuario.
10. Matriz de pruebas.
11. Capturas de pantalla.
12. Registro de versiones.

---

# Anexo A. Flujo completo de un módulo

Ejemplo del calendario:

```text
Usuario abre Calendario Energético
    |
    v
App.tsx renderiza EnergyCalendar.tsx
    |
    v
useEffect llama obtenerCalendarioEnergetico()
    |
    v
calendarioEnergeticoService.ts ejecuta fetch
    |
    v
FastAPI recibe GET /api/calendario-energetico
    |
    v
calendario_energetico.py valida parámetros
    |
    v
PostgreSQL consulta energia.calendario
    |
    v
Pydantic valida CalendarioEnergeticoResponse
    |
    v
El frontend recibe JSON
    |
    v
React agrupa días por mes
    |
    v
Se renderizan enero, febrero y marzo
```

Detalle:

```text
Usuario presiona un día
    |
    v
obtenerDetalleDia(fecha)
    |
    v
GET /api/calendario-energetico/{fecha}
    |
    v
Consultas a calendario, lectura, evento y alerta
    |
    v
DetalleDiaResponse
    |
    v
Panel lateral
```

---

# Anexo B. Flujo completo de alertas

```text
Alerts.tsx
    |
    | carga catálogos
    v
GET /api/alertas/catalogos
    |
    v
zonas + servicios + medidores + tipos_evento
    |
    v
usuario selecciona filtros
    |
    v
obtenerAlertas(filtros)
    |
    v
GET /api/alertas?...parámetros
    |
    v
JOIN alerta + tipo_evento + evento + medidor + servicio + zona
    |
    v
AlertaResponse[]
    |
    v
tarjetas y panel lateral
```

---

# Anexo C. Regla de documentación

Cada módulo nuevo debe documentar:

- Objetivo.
- Archivo de componente.
- Archivo de servicio.
- Archivo de router.
- Archivo de schema.
- Tablas consultadas.
- Endpoints.
- Parámetros.
- Respuesta.
- Estados de interfaz.
- Errores posibles.
- Pruebas.
- Consideraciones de seguridad.

---

# Referencia final

Repositorio oficial:

[https://github.com/ramirovegam/SistemaMonitoreoEnergetico.git](https://github.com/ramirovegam/SistemaMonitoreoEnergetico.git)
