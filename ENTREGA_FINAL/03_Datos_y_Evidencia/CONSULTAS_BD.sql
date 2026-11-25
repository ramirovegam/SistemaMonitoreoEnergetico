-- ============================================================
--  HyperDataSynthetic / SIMET - consultas de verificacion
--  Base: energia_hsd | Esquema: energia | PostgreSQL 17
--  Ejecutar: psql -h 127.0.0.1 -p 5544 -U postgres -d energia_hsd -f CONSULTAS_BD.sql
-- ============================================================

\echo '=== 1. CONTEO GENERAL ==='
SELECT
    (SELECT count(*) FROM energia.lectura)    AS lecturas,
    (SELECT count(*) FROM energia.servicio)   AS servicios,
    (SELECT count(*) FROM energia.medidor)    AS medidores,
    (SELECT count(*) FROM energia.evento)     AS eventos,
    (SELECT count(*) FROM energia.alerta)     AS alertas,
    (SELECT count(*) FROM energia.zona)       AS zonas;

\echo '=== 2. PARTICIONES DE LECTURA ==='
SELECT tableoid::regclass AS particion, count(*) AS registros
FROM energia.lectura
GROUP BY 1 ORDER BY 1;

\echo '=== 3. CONSUMO POR ZONA (TOP 10) ==='
SELECT z.nombre,
       round(sum(l.consumo_real_kwh)::numeric, 2) AS consumo_kwh
FROM energia.lectura l
JOIN energia.medidor m  ON m.id_medidor = l.id_medidor
JOIN energia.servicio s ON s.id_servicio = m.id_servicio
JOIN energia.zona z     ON z.id_zona = s.id_zona
GROUP BY z.nombre
ORDER BY consumo_kwh DESC
LIMIT 10;

\echo '=== 4. CORRIDA DE GENERACION ==='
SELECT id_corrida, nombre, semilla, version_reglas,
       ts_inicio_ejecucion, total_lecturas
FROM energia.corrida_generacion
ORDER BY id_corrida DESC
LIMIT 5;

\echo '=== 5. ESPACIO POR TABLA ==='
SELECT relname AS tabla, pg_size_pretty(pg_total_relation_size(relid)) AS tamano
FROM pg_stat_user_tables
WHERE schemaname = 'energia'
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 12;
