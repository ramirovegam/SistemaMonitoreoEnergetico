-- Esquema completo de la base de datos de SIMET
-- Ejecutar con: psql "postgresql://usuario:password@localhost:5432/energia_hsd" -f backend/sql/schema.sql
-- (psql no acepta el prefijo "+psycopg" que usa DATABASE_URL)
-- Debe mantenerse alineado con los modelos de backend/app/models/
-- Para datos de demostracion, ver el script de carga usado en desarrollo.

CREATE SCHEMA IF NOT EXISTS energia;
CREATE TABLE IF NOT EXISTS energia.calendario (
	fecha DATE NOT NULL, 
	tipo_dia CHAR(1) NOT NULL, 
	es_festivo BOOLEAN NOT NULL, 
	es_vacacional BOOLEAN NOT NULL, 
	temp_min_c NUMERIC(4, 1) NOT NULL, 
	temp_max_c NUMERIC(4, 1) NOT NULL, 
	factor_estacional NUMERIC(5, 4) NOT NULL, 
	PRIMARY KEY (fecha)
);

CREATE TABLE IF NOT EXISTS energia.corrida_generacion (
	id_corrida SMALLSERIAL NOT NULL, 
	nombre VARCHAR(40) NOT NULL, 
	semilla BIGINT NOT NULL, 
	version_reglas VARCHAR(12) NOT NULL, 
	hash_parametros CHAR(64) NOT NULL, 
	ts_inicio_ejecucion TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	ts_fin_ejecucion TIMESTAMP WITHOUT TIME ZONE, 
	fecha_desde DATE NOT NULL, 
	fecha_hasta DATE NOT NULL, 
	intervalo_min SMALLINT NOT NULL, 
	total_lecturas BIGINT, 
	notas VARCHAR(300), 
	PRIMARY KEY (id_corrida)
);

CREATE TABLE IF NOT EXISTS energia.tarifa (
	id_tarifa SMALLSERIAL NOT NULL, 
	codigo VARCHAR(6) NOT NULL, 
	nombre VARCHAR(60) NOT NULL, 
	categoria VARCHAR(18) NOT NULL, 
	limite_dac_kwh_mes INTEGER, 
	PRIMARY KEY (id_tarifa)
);

CREATE TABLE IF NOT EXISTS energia.tipo_evento (
	id_tipo_evento SMALLSERIAL NOT NULL, 
	clave VARCHAR(20) NOT NULL, 
	nombre VARCHAR(60) NOT NULL, 
	efecto VARCHAR(14) NOT NULL, 
	afecta_acumulado BOOLEAN NOT NULL, 
	duracion_min_h SMALLINT NOT NULL, 
	duracion_max_h SMALLINT NOT NULL, 
	intensidad_min NUMERIC(5, 3), 
	intensidad_max NUMERIC(5, 3), 
	tasa_por_medidor_mes NUMERIC(6, 4) NOT NULL, 
	prob_deteccion NUMERIC(4, 3) NOT NULL, 
	regla_deteccion VARCHAR(30) NOT NULL, 
	PRIMARY KEY (id_tipo_evento)
);

CREATE TABLE IF NOT EXISTS energia.tipo_servicio (
	id_tipo_servicio SMALLSERIAL NOT NULL, 
	clave VARCHAR(14) NOT NULL, 
	nombre VARCHAR(60) NOT NULL, 
	categoria VARCHAR(12) NOT NULL, 
	consumo_base_kwh_h NUMERIC(8, 3) NOT NULL, 
	factor_dispersion NUMERIC(4, 3) NOT NULL, 
	sensibilidad_temp NUMERIC(4, 3) NOT NULL, 
	PRIMARY KEY (id_tipo_servicio)
);

CREATE TABLE IF NOT EXISTS energia.zona (
	id_zona SMALLSERIAL NOT NULL, 
	nombre VARCHAR(60) NOT NULL, 
	tipo_urbano VARCHAR(20) NOT NULL, 
	superficie_km2 NUMERIC(6, 3) NOT NULL, 
	factor_socioeconomico NUMERIC(4, 3) NOT NULL, 
	poblacion_total INTEGER, 
	viviendas_habitadas INTEGER, 
	grado_rezago_representativo VARCHAR(12), 
	id_referencia INTEGER, 
	PRIMARY KEY (id_zona), 
	UNIQUE (nombre)
);

CREATE TABLE IF NOT EXISTS energia.perfil_carga_horaria (
	id_tipo_servicio SMALLINT NOT NULL, 
	tipo_dia VARCHAR(12) NOT NULL, 
	hora SMALLINT NOT NULL, 
	factor NUMERIC(5, 4) NOT NULL, 
	PRIMARY KEY (id_tipo_servicio, tipo_dia, hora), 
	FOREIGN KEY(id_tipo_servicio) REFERENCES energia.tipo_servicio (id_tipo_servicio)
);

CREATE TABLE IF NOT EXISTS energia.servicio (
	id_servicio SERIAL NOT NULL, 
	rpu VARCHAR(12) NOT NULL, 
	id_zona SMALLINT NOT NULL, 
	id_tipo_servicio SMALLINT NOT NULL, 
	id_tarifa SMALLINT NOT NULL, 
	nombre VARCHAR(120) NOT NULL, 
	latitud NUMERIC(9, 6) NOT NULL, 
	longitud NUMERIC(9, 6) NOT NULL, 
	ocupacion_estimada SMALLINT, 
	carga_contratada_kw NUMERIC(8, 2) NOT NULL, 
	tiene_solar BOOLEAN NOT NULL, 
	PRIMARY KEY (id_servicio), 
	FOREIGN KEY(id_zona) REFERENCES energia.zona (id_zona), 
	FOREIGN KEY(id_tipo_servicio) REFERENCES energia.tipo_servicio (id_tipo_servicio), 
	FOREIGN KEY(id_tarifa) REFERENCES energia.tarifa (id_tarifa)
);

CREATE TABLE IF NOT EXISTS energia.medidor (
	id_medidor SERIAL NOT NULL, 
	id_servicio INTEGER NOT NULL, 
	numero_serie VARCHAR(24) NOT NULL, 
	marca VARCHAR(24) NOT NULL, 
	multiplicador SMALLINT NOT NULL, 
	fecha_instalacion DATE NOT NULL, 
	fecha_retiro DATE, 
	calidad_enlace NUMERIC(5, 4) NOT NULL, 
	PRIMARY KEY (id_medidor), 
	FOREIGN KEY(id_servicio) REFERENCES energia.servicio (id_servicio)
);

CREATE TABLE IF NOT EXISTS energia.periodo_facturacion (
	id_periodo SERIAL NOT NULL, 
	id_servicio INTEGER NOT NULL, 
	folio VARCHAR(20) NOT NULL, 
	fecha_inicio DATE NOT NULL, 
	fecha_fin DATE NOT NULL, 
	id_tarifa_aplicada SMALLINT NOT NULL, 
	registro_inicial_kwh NUMERIC(12, 3) NOT NULL, 
	registro_final_kwh NUMERIC(12, 3) NOT NULL, 
	consumo_real_kwh NUMERIC(12, 3) NOT NULL, 
	clasificacion_dac BOOLEAN NOT NULL, 
	PRIMARY KEY (id_periodo), 
	FOREIGN KEY(id_servicio) REFERENCES energia.servicio (id_servicio), 
	FOREIGN KEY(id_tarifa_aplicada) REFERENCES energia.tarifa (id_tarifa)
);

CREATE TABLE IF NOT EXISTS energia.evento (
	id_evento BIGSERIAL NOT NULL, 
	id_medidor INTEGER NOT NULL, 
	id_tipo_evento SMALLINT NOT NULL, 
	ts_inicio TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	ts_fin TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	intensidad NUMERIC(5, 3), 
	kwh_desviados NUMERIC(12, 4) NOT NULL, 
	PRIMARY KEY (id_evento), 
	FOREIGN KEY(id_medidor) REFERENCES energia.medidor (id_medidor), 
	FOREIGN KEY(id_tipo_evento) REFERENCES energia.tipo_evento (id_tipo_evento)
);

CREATE TABLE IF NOT EXISTS energia.alerta (
	id_alerta BIGSERIAL NOT NULL, 
	id_evento BIGINT, 
	id_medidor INTEGER NOT NULL, 
	id_tipo_evento SMALLINT NOT NULL, 
	ts_generacion TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	prioridad SMALLINT NOT NULL, 
	ts_cierre TIMESTAMP WITHOUT TIME ZONE, 
	resultado VARCHAR(15), 
	PRIMARY KEY (id_alerta), 
	FOREIGN KEY(id_evento) REFERENCES energia.evento (id_evento), 
	FOREIGN KEY(id_medidor) REFERENCES energia.medidor (id_medidor), 
	FOREIGN KEY(id_tipo_evento) REFERENCES energia.tipo_evento (id_tipo_evento)
);

CREATE TABLE IF NOT EXISTS energia.lectura (
	id_medidor INTEGER NOT NULL, 
	ts TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	consumo_kwh NUMERIC(9, 4), 
	consumo_real_kwh NUMERIC(9, 4) NOT NULL, 
	id_evento BIGINT, 
	PRIMARY KEY (id_medidor, ts), 
	FOREIGN KEY(id_medidor) REFERENCES energia.medidor (id_medidor), 
	FOREIGN KEY(id_evento) REFERENCES energia.evento (id_evento)
);


