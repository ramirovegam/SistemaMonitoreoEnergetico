# Resumen técnico y funcional de SIMET

**Proyecto:** Sistema de Monitoreo Energético de Toluca  
**Nombre corto:** SIMET  
**Fecha de consolidación:** 12 de octubre de 2026  
**Stack principal:** React + TypeScript + Vite + Tailwind CSS + Recharts + FastAPI + SQLAlchemy + PostgreSQL

---

## 1. Objetivo general

SIMET se consolidó como una aplicación web para consultar, supervisar y analizar información energética asociada con zonas, servicios, medidores, lecturas, tarifas, eventos, alertas y condiciones del calendario.

El sistema está organizado en dos capas principales:

- **Frontend:** React y TypeScript.
- **Backend:** FastAPI, SQLAlchemy y PostgreSQL.

La aplicación utiliza componentes visuales, gráficas, tablas, filtros, paneles laterales y exportaciones para facilitar la interpretación de los datos.

---

## 2. Estructura general del proyecto

```text
simet
├── src
│   ├── App.tsx
│   ├── components
│   │   ├── Dashboard.tsx
│   │   ├── Zones.tsx
│   │   ├── Households.tsx
│   │   ├── Meters.tsx
│   │   ├── EnergyAnalysis.tsx
│   │   ├── ReadingHistory.tsx
│   │   ├── EnergyCalendar.tsx
│   │   ├── Alerts.tsx
│   │   └── Tariffs.tsx
│   ├── services
│   │   ├── analisisEnergeticoService.ts
│   │   ├── historialLecturasService.ts
│   │   ├── calendarioEnergeticoService.ts
│   │   ├── alertasService.ts
│   │   └── otros servicios del sistema
│   └── data
│       └── synthetic.ts
│
└── backend
    └── app
        ├── main.py
        ├── database.py
        ├── routers
        │   ├── dashboard.py
        │   ├── zonas.py
        │   ├── servicios.py
        │   ├── medidores.py
        │   ├── historial_lecturas.py
        │   ├── analisis_energetico.py
        │   ├── calendario_energetico.py
        │   ├── alertas.py
        │   └── tarifas.py
        └── schemas
            ├── calendario_energetico_schema.py
            ├── alerta_schema.py
            └── otros schemas
```

---

## 3. Navegación principal

El archivo `src/App.tsx` se reorganizó para centralizar la navegación y conservar las pantallas existentes.

### Pantallas registradas

```text
Dashboard
Zonas
Servicios
Medidores
Análisis Energético
Historial de Lecturas
Calendario Energético
Alertas
Configuración Tarifaria
```

### Funciones de navegación

- Menú lateral de escritorio.
- Menú móvil.
- Menú colapsable.
- Iconos de Lucide React.
- Indicador de alertas.
- Navegación mediante estado interno.
- Soporte para el evento global `simet:navigate`.
- Navegación hacia una zona específica mediante `idZona`.
- Encabezado con el nombre de la pantalla y fecha actual.

### Página añadida

Se agregó el identificador:

```tsx
"calendario-energetico"
```

Y el renderizado:

```tsx
case "calendario-energetico":
  return <EnergyCalendar />;
```

---

## 4. Configuración principal del backend

El archivo `backend/app/main.py` se actualizó para registrar los routers del sistema sin duplicar prefijos.

### Routers registrados

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

### CORS permitido

```text
http://localhost:8443
http://127.0.0.1:8443
http://localhost:5173
http://127.0.0.1:5173
```

### Rutas del sistema

```http
GET /
GET /health
```

### Consideración importante

Los routers nuevos ya contienen sus propios prefijos. Por ello no se debe agregar nuevamente `prefix="/api"` al registrarlos en `main.py`.

---

# 5. Módulos trabajados

## 5.1 Dashboard

El Dashboard funciona como resumen general del sistema.

Incluye o puede mostrar:

- Consumo total.
- Estado general de la infraestructura.
- Indicadores de medidores.
- Alertas activas.
- Tendencias de consumo.
- Accesos rápidos hacia otros módulos.

---

## 5.2 Zonas

El módulo de Zonas permite revisar la organización territorial y energética.

Funciones principales:

- Catálogo de zonas.
- Indicadores por zona.
- Consumo mensual.
- Navegación hacia una zona específica.
- Relación con servicios y medidores.
- Estado de carga durante consultas.

---

## 5.3 Servicios

El módulo identificado originalmente como `Households.tsx` se presenta en el menú como **Servicios**.

Funciones principales:

- Información del servicio.
- RPU.
- Zona.
- Tipo de servicio.
- Medidores asociados.
- Información contextual del suministro.

Decisión funcional importante:

- La facturación debe pertenecer al servicio, no al medidor.
- Un servicio puede tener medidor principal y medidores secundarios.

---

## 5.4 Medidores

El módulo de Medidores permite revisar la infraestructura instalada.

Información contemplada:

- Número de serie.
- Marca.
- Servicio asociado.
- Zona.
- Calidad del enlace.
- Estado instalado o retirado.
- Función principal o secundaria.
- Antigüedad.
- Alertas asociadas.

---

# 6. Análisis Energético

## 6.1 Objetivo

El módulo se replanteó para que el análisis sea exclusivamente por medidor.

La zona, el servicio, el RPU y el tipo de servicio no son filtros independientes. Esos datos se cargan automáticamente después de seleccionar el medidor.

## 6.2 Filtros reales

```text
Medidor
Mes
Tipo de día
```

### Meses disponibles

```text
Enero
Febrero
Marzo
```

### Tipo de día

```text
Todos
Laborable
Fin de semana
Festivo
```

## 6.3 Endpoints utilizados

```http
GET /api/analisis-energetico/medidores
GET /api/analisis-energetico/agregado
```

El componente dejó de depender de llamadas repetidas a:

```text
/resumen
/perfil-horario
/periodos
```

Esto corrigió errores `404` que provocaban solicitudes repetitivas.

## 6.4 Consulta agregada

Ejemplo:

```http
GET /api/analisis-energetico/agregado
    ?mes=3
    &nivel=medidor
    &tipo_dia=todos
    &id_medidor=360
```

## 6.5 Información mostrada

- Medidor seleccionado.
- ID del medidor.
- Servicio.
- RPU.
- Zona.
- Tipo de servicio.
- Periodo.
- Tipo de día.

## 6.6 Indicadores

- Consumo total.
- Variación mensual.
- Promedio diario.
- Pico horario.
- Hora pico.
- Lecturas procesadas.

## 6.7 Gráficas

- Curva horaria real.
- Curva horaria estimada.
- Comparación de enero, febrero y marzo.
- Perfil horario promedio.
- Mapa de calor de siete días por 24 horas.

## 6.8 Corrección de la variación mensual

Se corrigió el error por el cual una variación de `0%` se clasificaba como “Disminuyó”.

### Estados correctos

```text
Sin periodo anterior
Sin datos comparables
Disminuyó
Sin cambio
Aumentó moderadamente
Aumentó considerablemente
```

### Enero sin diciembre

Si enero no tiene datos de diciembre:

```text
Variación mensual: 0%
Tendencia: Sin periodo anterior
```

Esto significa que la comparación no puede calcularse. El `0%` funciona únicamente como presentación numérica segura.

### Reglas

```text
Sin periodo anterior:
    enero y consumo anterior igual a cero

Sin datos comparables:
    febrero o marzo sin consumo anterior

Disminuyó:
    variación menor a cero

Sin cambio:
    variación igual a cero, con periodo anterior válido

Aumentó moderadamente:
    variación mayor a cero y hasta 10%

Aumentó considerablemente:
    variación mayor a 10%
```

---

# 7. Historial de Lecturas

## 7.1 Objetivo

El módulo funciona como explorador técnico de registros individuales y calidad de datos.

Responde principalmente:

> ¿Qué registró el medidor, cuándo lo registró y qué información técnica acompaña a la lectura?

## 7.2 Funciones conservadas

- Consulta paginada.
- Filtros por fecha.
- Búsqueda de medidor.
- Filtro de zona.
- Orden ascendente o descendente.
- Agrupación por hora, día o mes.
- Gráfica agrupada.
- Detección de huecos.
- Exportación CSV.
- Consulta del registro original.
- Panel de detalle.
- Paginación configurable.

## 7.3 Indicadores actuales

Se eliminaron las tarjetas:

```text
Lecturas estimadas
Lecturas faltantes
```

Se eliminaron porque no podían determinarse con total certeza a partir de los datos disponibles.

Los indicadores restantes son:

1. Lecturas encontradas.
2. Lecturas válidas en la página.
3. Consumo acumulado en la página.
4. Promedio por lectura.
5. Lectura máxima y hora.
6. Calidad promedio.

## 7.4 Información técnica

La tabla puede mostrar:

- Fecha y hora.
- Medidor.
- Zona.
- Consumo real.
- Voltaje.
- Corriente.
- Potencia.
- Calidad.
- Estado.
- Acción para abrir detalle.

## 7.5 Huecos

El módulo utiliza la función del backend para detectar intervalos sin información.

Información mostrada:

- Medidor.
- Inicio del hueco.
- Fin del hueco.
- Minutos sin datos.
- Lecturas faltantes estimadas por el análisis de huecos.

---

# 8. Alertas

## 8.1 Problema original

La interfaz mostraba solamente:

```text
Tipo de evento #1
Tipo de evento #2
Tipo de evento #3
```

Esto ocurría porque el router no hacía la relación con la tabla `tipo_evento`.

## 8.2 Relación solucionada

```text
alerta.id_tipo_evento
    → tipo_evento.id_tipo_evento

alerta.id_evento
    → evento.id_evento

evento.id_tipo_evento
    → tipo_evento.id_tipo_evento
```

No fue necesario modificar las tablas ni los modelos SQLAlchemy principales. La corrección se hizo en:

- Schema.
- Router.
- Servicio TypeScript.
- Componente React.

## 8.3 Datos del tipo de evento

El backend devuelve:

```text
tipo_evento_clave
tipo_evento_nombre
tipo_evento_efecto
tipo_evento_afecta_acumulado
tipo_evento_regla
tipo_evento_duracion_min_h
tipo_evento_duracion_max_h
```

## 8.4 Categorías existentes

```text
PICO_DEMANDA
Pico de demanda
INCREMENTO
UMBRAL_PICO

CONSUMO_ANOMALO
Consumo anómalo sostenido
INCREMENTO
DESVIACION_PERSISTENTE

MANIPULACION
Manipulación de medidor
REDUCCION
BRECHA_REAL_REPORTADA

FALLA_MEDIDOR
Falla de medidor
CONGELAMIENTO
VALOR_CONGELADO

PERDIDA_COMUNICACION
Pérdida de comunicación
NULIFICACION
LECTURA_AUSENTE

SOBRECARGA
Sobrecarga de capacidad
INCREMENTO
CARGA_CONTRATADA

MANTENIMIENTO
Mantenimiento programado
REDUCCION
VENTANA_PROGRAMADA
```

## 8.5 Filtros agregados

```text
Mes
Zona
Servicio
Medidor
Categoría de evento
Estado
Prioridad
Buscador
```

Los filtros de zona, servicio y medidor son encadenados:

```text
Zona
  → Servicios de la zona
      → Medidores del servicio
```

## 8.6 Tarjetas superiores

- Alertas registradas.
- Alertas activas.
- Prioridad alta.
- Medidores afectados.
- Alertas cerradas como dato complementario.

## 8.7 Tarjetas de alertas

Ahora muestran:

- ID de alerta.
- Nombre legible de la categoría.
- Clave técnica.
- Efecto.
- Estado.
- Fecha.
- Medidor.
- Servicio.
- Zona.
- Prioridad.

## 8.8 Panel lateral

Incluye:

- Prioridad.
- Estado.
- Fecha de generación.
- Fecha de cierre.
- Resultado.
- ID del evento.
- Nombre del tipo.
- Clave.
- Efecto.
- Regla de detección.
- Duración esperada.
- Si afecta acumulados.
- Inicio y fin del evento.
- Intensidad.
- kWh desviados.
- Medidor.
- Calidad del enlace.
- Servicio.
- RPU.
- Zona.

## 8.9 Endpoints

```http
GET /api/alertas
GET /api/alertas/catalogos
GET /api/alertas/{id_alerta}
```

Filtros aceptados por el backend:

```text
mes
anio
id_zona
id_servicio
id_medidor
id_tipo_evento
estado
prioridad
```

---

# 9. Calendario Energético

## 9.1 Objetivo

Se creó una pantalla visual de enero, febrero y marzo para consultar:

- Tipo de día.
- Festivos.
- Vacaciones.
- Temperatura mínima.
- Temperatura máxima.
- Factor estacional.
- Datos energéticos diarios.
- Eventos y alertas del día.

## 9.2 Tabla utilizada

```text
energia.calendario
```

Columnas utilizadas:

```text
fecha
tipo_dia
es_festivo
es_vacacional
temp_min_c
temp_max_c
factor_estacional
```

## 9.3 Vista de tres meses

La pantalla muestra:

```text
Enero 2026
Febrero 2026
Marzo 2026
```

Cada día muestra:

- Número.
- Iconos.
- Temperatura mínima.
- Temperatura máxima.
- Código de tipo de día.
- Factor estacional resumido.

## 9.4 Iconos y colores

```text
Pastel: día festivo
Palmera: día vacacional
Azul claro: sábado
Violeta claro: domingo
Naranja: festivo
Turquesa: vacacional
Gradiente: festivo y vacacional
```

## 9.5 Consideración sobre tipo_dia

Los códigos `H`, `S` y `D` se muestran sin interpretación automática.

Esto evita asumir incorrectamente que `D` significa domingo, dado que el 1 de enero de 2026 aparece con `tipo_dia = D` aunque corresponde a jueves.

## 9.6 Indicadores superiores

- Días registrados.
- Días festivos.
- Días vacacionales.
- Temperatura mínima del periodo.
- Temperatura máxima del periodo.
- Factor estacional promedio.

## 9.7 Filtros visuales

```text
Todos los días
Solo festivos
Solo vacacionales
```

## 9.8 Detalle lateral

Al presionar un día se muestra:

### Clasificación

- Fecha completa.
- Código de tipo de día.
- Festivo.
- Vacacional.

### Temperatura

- Temperatura mínima.
- Temperatura máxima.
- Temperatura media.
- Amplitud térmica.

### Estacionalidad

- Factor estacional.
- Ajuste porcentual respecto a 1.0000.

Fórmula:

```text
(factor_estacional - 1) × 100
```

### Actividad energética

- Consumo total del día.
- Promedio por medidor.
- Hora pico.
- Lecturas recibidas.
- Medidores con lectura.

### Operación

- Eventos detectados.
- Alertas generadas.

## 9.9 Endpoints

```http
GET /api/calendario-energetico
GET /api/calendario-energetico/{fecha}
```

Ejemplo:

```http
GET /api/calendario-energetico?anio=2026&mes_inicio=1&mes_fin=3
```

```http
GET /api/calendario-energetico/2026-01-01
```

---

# 10. Configuración Tarifaria

El sistema ya cuenta con una pantalla de tarifas.

Su función conceptual es definir:

- Tipos de tarifa.
- Cargos.
- Rangos.
- Importes.
- Condiciones aplicables a servicios.

Decisión funcional:

- Tarifas define reglas de cobro.
- Facturación usará esas reglas para calcular importes.
- Una factura histórica deberá conservar los valores tarifarios aplicados en su periodo.

---

# 11. Facturación propuesta

La pantalla de Facturación todavía se considera una etapa posterior.

## 11.1 Ubicación propuesta

```text
Energía
├── Análisis energético
├── Historial de lecturas
├── Calendario energético
├── Tarifas
└── Facturación
```

## 11.2 Entidad principal

La factura debe pertenecer al **servicio**, no al medidor.

## 11.3 Filtros sugeridos

```text
Periodo
Servicio
Estado
Tipo de servicio
Tarifa
Zona
```

## 11.4 Indicadores sugeridos

- Facturas emitidas.
- Consumo facturado.
- Importe total.
- Facturas pagadas.
- Facturas pendientes.
- Facturas vencidas.
- Saldo pendiente.

## 11.5 Tabla sugerida

```text
Folio
Periodo
RPU
Servicio
Tarifa
Consumo
Subtotal
Impuestos
Total
Vencimiento
Estado
Acciones
```

## 11.6 Estados sugeridos

```text
Calculada
Emitida
Pendiente
Pagada
Vencida
Cancelada
Con observaciones
```

## 11.7 Tablas conceptuales

```text
factura
detalle_factura
pago
```

Facturación no se implementó todavía. Se dejó como siguiente módulo después del Calendario Energético.

---

# 12. Reportes propuestos

También se recomendó una pantalla de Reportes para cerrar funcionalmente el sistema.

Reportes sugeridos:

```text
Reporte mensual general
Reporte por zona
Reporte por servicio
Reporte por medidor
Reporte de alertas
Reporte de calidad de lecturas
```

Formatos sugeridos:

```text
PDF
Excel
CSV
```

---

# 13. Configuración propuesta

Se sugirió una pantalla administrativa para:

- Tipos de evento.
- Reglas de detección.
- Umbrales.
- Tipos de servicio.
- Parámetros de calidad.
- Intervalo esperado de lecturas.
- Metas de ahorro.
- Preferencias generales.

Esta pantalla permitiría evitar valores fijos dentro de React o Python.

---

# 14. Correcciones técnicas importantes

## 14.1 Separación correcta de archivos

Se presentó un error donde código Python fue copiado dentro de un archivo TSX:

```python
from datetime import datetime
```

Se corrigió asegurando:

```text
Los archivos .tsx contienen React y TypeScript.
Los archivos .py contienen FastAPI y Python.
```

## 14.2 Nombre correcto del router energético

El archivo utilizado en el proyecto es:

```text
backend/app/routers/analisis_energetico.py
```

No debe importarse como `analisis_energeticorouter` si ese archivo no existe en el proyecto.

## 14.3 Rutas duplicadas

No se deben registrar simultáneamente routers antiguos y nuevos con el mismo prefijo.

Ejemplo de prefijo compartido:

```text
/api/analisis-energetico
```

## 14.4 Evitar doble prefijo

Si un router contiene:

```python
prefix="/api/calendario-energetico"
```

Se registra así:

```python
app.include_router(calendario_energetico_router)
```

No así:

```python
app.include_router(
    calendario_energetico_router,
    prefix="/api",
)
```

## 14.5 Fechas en PostgreSQL

Para parámetros de fecha se empleó:

```sql
CAST(:fecha AS date)
```

Esto evita problemas de interpretación con expresiones como:

```sql
:fecha::date
```

## 14.6 Código HTML escapado

El código que aparece en el chat con:

```text
&lt;
&gt;
<br>
```

no debe copiarse directamente al archivo TSX.

En React deben utilizarse caracteres normales:

```tsx
<
>
&&
```

---

# 15. Endpoints principales consolidados

## Sistema

```http
GET /
GET /health
```

## Análisis energético

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

## Calendario energético

```http
GET /api/calendario-energetico
GET /api/calendario-energetico/{fecha}
```

## Otros módulos registrados

```text
Dashboard
Zonas
Servicios
Medidores
Historial de lecturas
Tarifas
```

Las rutas exactas de estos módulos dependen de sus routers correspondientes.

---

# 16. Archivos generados o actualizados durante el trabajo

## Frontend

```text
src/App.tsx
src/components/EnergyAnalysis.tsx
src/components/ReadingHistory.tsx
src/components/Alerts.tsx
src/components/EnergyCalendar.tsx
src/services/alertasService.ts
src/services/calendarioEnergeticoService.ts
```

## Backend

```text
backend/app/main.py
backend/app/routers/analisis_energetico.py
backend/app/routers/alertas.py
backend/app/routers/calendario_energetico.py
backend/app/schemas/alerta_schema.py
backend/app/schemas/calendario_energetico_schema.py
```

---

# 17. Comandos de validación

## Backend

```powershell
python -m py_compile `
  .\backend\app\main.py `
  .\backend\app\routers\analisis_energetico.py `
  .\backend\app\routers\alertas.py `
  .\backend\app\routers\calendario_energetico.py `
  .\backend\app\schemas\alerta_schema.py `
  .\backend\app\schemas\calendario_energetico_schema.py
```

## Limpiar caché de Python

```powershell
Get-ChildItem `
  -Path .\backend `
  -Directory `
  -Recurse `
  -Filter __pycache__ |
Remove-Item -Recurse -Force
```

## Iniciar FastAPI

```powershell
python -m uvicorn backend.app.main:app `
  --reload `
  --port 8000
```

## Documentación

```text
http://127.0.0.1:8000/docs
```

## Salud del backend

```text
http://127.0.0.1:8000/health
```

## Limpiar Vite

```powershell
Remove-Item `
  .\node_modules\.vite `
  -Recurse `
  -Force `
  -ErrorAction SilentlyContinue
```

## Compilar frontend

```powershell
npm run build
```

## Ejecutar frontend

```powershell
npm run dev
```

## Recarga sin caché

```text
Ctrl + Shift + R
```

---

# 18. Pruebas recomendadas

## Análisis energético

1. Seleccionar un medidor.
2. Cambiar enero, febrero y marzo.
3. Verificar “Sin periodo anterior” en enero sin diciembre.
4. Cambiar tipo de día.
5. Verificar curva horaria, barras y mapa de calor.

## Lecturas

1. Filtrar por fecha.
2. Buscar un medidor.
3. Cambiar paginación.
4. Abrir registro original.
5. Exportar CSV.
6. Detectar huecos.

## Alertas

1. Probar filtro mensual.
2. Seleccionar zona.
3. Confirmar que servicios se reduzcan.
4. Seleccionar servicio.
5. Confirmar que medidores se reduzcan.
6. Filtrar por categoría.
7. Abrir una alerta.
8. Confirmar nombre, clave, efecto y regla.
9. Confirmar datos del evento asociado.

## Calendario energético

1. Confirmar enero, febrero y marzo.
2. Revisar iconos festivos.
3. Revisar iconos vacacionales.
4. Probar “Solo festivos”.
5. Probar “Solo vacacionales”.
6. Abrir el 1 de enero.
7. Confirmar temperaturas y factor.
8. Confirmar consumo, lecturas, eventos y alertas.

---

# 19. Estado actual del proyecto

## Funcionalidades principales cubiertas

```text
Dashboard
Zonas
Servicios
Medidores
Análisis por medidor
Historial de lecturas
Alertas con categorías reales
Calendario energético
Tarifas
Mapa y contexto territorial
```

## Módulos pendientes recomendados

```text
Facturación
Reportes
Configuración administrativa
Usuarios y permisos
Bitácora
Pagos y cobranza, si el alcance lo requiere
```

## Prioridad sugerida

```text
1. Terminar pruebas integrales.
2. Corregir cualquier diferencia de nombres de columnas en PostgreSQL.
3. Implementar Facturación.
4. Implementar Reportes.
5. Implementar Configuración.
6. Agregar autenticación si el proyecto la necesita.
```

---

# 20. Decisiones funcionales consolidadas

1. El análisis energético trabaja por medidor.
2. Zona, servicio, RPU y tipo de servicio se derivan del medidor.
3. Las facturas pertenecerán al servicio.
4. Las tarifas definen las reglas de cobro.
5. Las alertas deben mostrar la categoría de `tipo_evento`, no solo el ID.
6. Los eventos representan ocurrencias concretas.
7. Las alertas representan avisos operativos derivados de eventos.
8. El calendario se usa como contexto energético y estacional.
9. Los códigos de `tipo_dia` no se interpretan sin confirmar su catálogo.
10. Las métricas inciertas no deben mostrarse como hechos.
11. Los periodos sin base de comparación deben mostrar “Sin periodo anterior”.
12. Los routers deben registrarse una sola vez y sin prefijos duplicados.

---

# 21. Próximo paso recomendado

Antes de comenzar Facturación, conviene ejecutar una prueba integral completa:

```text
Zona
  → Servicio
      → Medidor
          → Lecturas
              → Análisis energético
                  → Evento
                      → Alerta
                          → Calendario del día
```

Después de esa prueba, el siguiente módulo recomendado es **Facturación por servicio**, seguido de **Reportes**.
