from backend.app.database import engine
from sqlalchemy import text
with engine.begin() as conn:
    conn.execute(text("CREATE SCHEMA IF NOT EXISTS datamart"))
    conn.execute(text('''
        CREATE OR REPLACE VIEW datamart.dm_consumo_zona_mensual AS
        SELECT z.id_zona, z.nombre AS zona, z.tipo_urbano,
               DATE_TRUNC('month', l.ts) AS mes,
               SUM(l.consumo_real_kwh) AS consumo_real_kwh,
               SUM(COALESCE(l.consumo_kwh,0)) AS consumo_reportado_kwh,
               COUNT(l.ts) AS num_lecturas,
               COUNT(DISTINCT m.id_medidor) AS num_medidores
        FROM energia.lectura l
        JOIN energia.medidor m ON m.id_medidor = l.id_medidor
        JOIN energia.servicio s ON s.id_servicio = m.id_servicio
        JOIN energia.zona z ON z.id_zona = s.id_zona
        GROUP BY z.id_zona, z.nombre, z.tipo_urbano, DATE_TRUNC('month', l.ts)
    '''))
    conn.execute(text('''
        CREATE OR REPLACE VIEW datamart.dm_kpi_diarios AS
        SELECT DATE_TRUNC('day', l.ts)::date AS fecha,
               SUM(l.consumo_real_kwh) AS consumo_total_kwh,
               AVG(l.consumo_real_kwh) AS consumo_promedio_kwh,
               MAX(l.consumo_real_kwh) AS demanda_maxima_kwh,
               COUNT(l.ts) AS num_lecturas,
               COUNT(DISTINCT m.id_medidor) AS medidores_activos,
               SUM(CASE WHEN (l.consumo_kwh IS NULL OR l.consumo_kwh = 0) AND l.consumo_real_kwh > 0 THEN 1 ELSE 0 END) AS perdidas_comunicacion
        FROM energia.lectura l
        JOIN energia.medidor m ON m.id_medidor = l.id_medidor
        GROUP BY DATE_TRUNC('day', l.ts)::date
    '''))
    conn.execute(text('''
        CREATE OR REPLACE VIEW datamart.dm_anomalias_zona AS
        SELECT z.id_zona, z.nombre AS zona, te.nombre AS tipo_anomalia,
               COUNT(e.id_evento) AS num_eventos,
               SUM(e.kwh_desviados) AS kwh_desviados,
               DATE_TRUNC('month', e.ts_inicio) AS mes
        FROM energia.evento e
        JOIN energia.medidor m ON m.id_medidor = e.id_medidor
        JOIN energia.servicio s ON s.id_servicio = m.id_servicio
        JOIN energia.zona z ON z.id_zona = s.id_zona
        JOIN energia.tipo_evento te ON te.id_tipo_evento = e.id_tipo_evento
        GROUP BY z.id_zona, z.nombre, te.nombre, DATE_TRUNC('month', e.ts_inicio)
    '''))
    conn.execute(text('''
        CREATE OR REPLACE VIEW datamart.dm_resumen_general AS
        SELECT (SELECT COUNT(*) FROM energia.zona) AS total_zonas,
               (SELECT COUNT(*) FROM energia.servicio) AS total_servicios,
               (SELECT COUNT(*) FROM energia.medidor) AS total_medidores,
               (SELECT COUNT(*) FROM energia.lectura) AS total_lecturas,
               (SELECT COUNT(*) FROM energia.evento) AS total_eventos,
               (SELECT COUNT(*) FROM energia.alerta) AS total_alertas,
               (SELECT SUM(consumo_real_kwh) FROM energia.lectura) AS consumo_total_acumulado
    '''))
    print('DATAMART_CREATED')
