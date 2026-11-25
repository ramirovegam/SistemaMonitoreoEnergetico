-- Verificación de datos para la segunda entrega de SIMET.
-- Ejecutar con psql contra la base que alimenta la API:
--   psql "$DATABASE_URL" -f docs/evidencia/verificacion_datos.sql
--
-- Objetivo: dejar evidencia verificable de volumen, periodo, cobertura territorial,
-- convenciones de campos e integridad del datamart. Guardar la salida como
-- docs/evidencia/resultado_verificacion.txt y adjuntarla a la entrega.

\echo '=== 1. Volumen total de lecturas (rubrica 3.4: >= 10,000,000) ==='
SELECT count(*) AS total_lecturas,
       count(DISTINCT id_medidor) AS medidores_con_lecturas,
       min(ts) AS primera_lectura,
       max(ts) AS ultima_lectura
FROM energia.lectura;

\echo '=== 2. Conteo por tabla canonica del esquema energia ==='
SELECT 'corrida_generacion' AS tabla, count(*) AS registros FROM energia.corrida_generacion
UNION ALL SELECT 'zona', count(*) FROM energia.zona
UNION ALL SELECT 'tarifa', count(*) FROM energia.tarifa
UNION ALL SELECT 'tipo_servicio', count(*) FROM energia.tipo_servicio
UNION ALL SELECT 'tipo_evento', count(*) FROM energia.tipo_evento
UNION ALL SELECT 'calendario', count(*) FROM energia.calendario
UNION ALL SELECT 'perfil_carga_horaria', count(*) FROM energia.perfil_carga_horaria
UNION ALL SELECT 'servicio', count(*) FROM energia.servicio
UNION ALL SELECT 'medidor', count(*) FROM energia.medidor
UNION ALL SELECT 'evento', count(*) FROM energia.evento
UNION ALL SELECT 'alerta', count(*) FROM energia.alerta
UNION ALL SELECT 'periodo_facturacion', count(*) FROM energia.periodo_facturacion
UNION ALL SELECT 'lectura', count(*) FROM energia.lectura
ORDER BY tabla;

\echo '=== 3. Cobertura territorial (rubrica 1.2 y 2.4) ==='
SELECT count(*) AS zonas_con_lectura
FROM energia.zona z
WHERE EXISTS (SELECT 1 FROM energia.servicio s WHERE s.id_zona = z.id_zona);

\echo '=== 4. Convenciones de campos (rubrica 3.2) ==='
SELECT count(*) AS medidores,
       count(*) FILTER (WHERE calidad_enlace BETWEEN 50 AND 100) AS calidad_en_rango,
       count(*) FILTER (WHERE calidad_enlace < 50 OR calidad_enlace > 100) AS calidad_fuera_de_rango
FROM energia.medidor;

SELECT count(*) AS alertas,
       count(*) FILTER (WHERE ts_cierre IS NOT NULL) AS alertas_cerradas,
       count(*) FILTER (WHERE ts_cierre IS NULL) AS alertas_abiertas,
       count(*) FILTER (WHERE prioridad BETWEEN 1 AND 4) AS prioridad_en_rango,
       count(*) FILTER (WHERE resultado NOT IN ('CONFIRMADA','FALSO_POSITIVO','NO_CONCLUYENTE')) AS resultado_invalido
FROM energia.alerta;

SELECT tipo_dia, count(*) AS perfiles
FROM energia.perfil_carga_horaria
GROUP BY tipo_dia
ORDER BY tipo_dia;

\echo '=== 5. Verdad de campo: anomalias y alertas separadas (rubrica 1.6) ==='
SELECT (SELECT count(*) FROM energia.evento) AS eventos,
       (SELECT count(*) FROM energia.alerta) AS alertas,
       round(100.0 * (SELECT count(*) FROM energia.alerta) /
             NULLIF((SELECT count(*) FROM energia.lectura), 0), 4) AS porcentaje_alertas;

\echo '=== 6. Datamart creado y poblado (rubrica 3.3 y 3.6) ==='
SELECT table_schema, table_name
FROM information_schema.views
WHERE table_schema = 'datamart'
ORDER BY table_name;

SELECT * FROM datamart.dm_resumen_general;
SELECT * FROM datamart.dm_validacion_integridad;

\echo '=== 7. Particiones de lectura ==='
SELECT tableoid::regclass AS particion, count(*) AS registros
FROM energia.lectura
GROUP BY tableoid::regclass
ORDER BY particion;
