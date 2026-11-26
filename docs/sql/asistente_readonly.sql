-- Rol de solo lectura para el asistente plus de SIMET.
-- Ejecutar como superusuario o dueño de la base:
--   psql -h 127.0.0.1 -p 5544 -U postgres -d energia_hsd -f docs/sql/asistente_readonly.sql
--
-- Sustituir CAMBIAR_PASSWORD por un secreto real fuera del repositorio.
-- ASISTENTE_DATABASE_URL debe apuntar a este rol, nunca a DATABASE_URL.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'simet_asistente') THEN
        CREATE ROLE simet_asistente LOGIN PASSWORD 'CAMBIAR_PASSWORD';
    END IF;
END
$$;

GRANT CONNECT ON DATABASE energia_hsd TO simet_asistente;
GRANT USAGE ON SCHEMA energia, datamart TO simet_asistente;

-- ALL TABLES cubre también las vistas dm_* en PostgreSQL.
GRANT SELECT ON ALL TABLES IN SCHEMA energia, datamart TO simet_asistente;

-- Las vistas futuras creadas por create_datamart.py quedan disponibles sin regrant.
ALTER DEFAULT PRIVILEGES IN SCHEMA energia, datamart
    GRANT SELECT ON TABLES TO simet_asistente;

-- El rol no puede crear objetos en los esquemas que consume.
REVOKE CREATE ON SCHEMA energia, datamart FROM simet_asistente;

-- Comprobación posterior: debe devolver 'f' (no superusuario) y 'f' (sin CREATEDB).
SELECT rolsuper, rolcreatedb FROM pg_roles WHERE rolname = 'simet_asistente';
