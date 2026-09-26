-- Esquema de la base de datos de SIMET
-- Ejecutar con: psql "$DATABASE_URL" -f backend/sql/schema.sql
-- Debe mantenerse alineado con los modelos de backend/app/models/

CREATE SCHEMA IF NOT EXISTS energia;

CREATE TABLE IF NOT EXISTS energia.zona (
    id_zona               SMALLINT      PRIMARY KEY,
    nombre                VARCHAR(60)   NOT NULL UNIQUE,
    tipo_urbano           VARCHAR(20)   NOT NULL,
    superficie_km2        NUMERIC(6, 3) NOT NULL,
    factor_socioeconomico NUMERIC(4, 3) NOT NULL
);
