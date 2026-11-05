from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..database import get_db

router = APIRouter(prefix="/api/datamart", tags=["Datamart"])


@router.get("/resumen")
def get_resumen(db: Session = Depends(get_db)):
    r = db.execute(text("SELECT * FROM datamart.dm_resumen_general"))
    row = r.fetchone()
    if row:
        return dict(row._mapping)
    return {}


@router.get("/consumo-zona-mensual")
def get_consumo_zona_mensual(db: Session = Depends(get_db)):
    r = db.execute(
        text("SELECT * FROM datamart.dm_consumo_zona_mensual ORDER BY mes, zona")
    )
    return [dict(row._mapping) for row in r.fetchall()]


@router.get("/kpi-diarios")
def get_kpi_diarios(db: Session = Depends(get_db)):
    r = db.execute(text("SELECT * FROM datamart.dm_kpi_diarios ORDER BY fecha"))
    return [dict(row._mapping) for row in r.fetchall()]


@router.get("/anomalias-zona")
def get_anomalias_zona(db: Session = Depends(get_db)):
    r = db.execute(text("SELECT * FROM datamart.dm_anomalias_zona ORDER BY mes, zona"))
    return [dict(row._mapping) for row in r.fetchall()]


@router.get("/consumo-por-servicio")
def get_consumo_por_servicio(db: Session = Depends(get_db)):
    r = db.execute(
        text(
            "SELECT * FROM datamart.dm_consumo_por_servicio ORDER BY mes, zona, tipo_servicio"
        )
    )
    return [dict(row._mapping) for row in r.fetchall()]


@router.get("/validacion-integridad")
def get_validacion(db: Session = Depends(get_db)):
    r = db.execute(text("SELECT * FROM datamart.dm_validacion_integridad"))
    return [dict(row._mapping) for row in r.fetchall()]


@router.get("/powerbi-url")
def get_powerbi_info():
    return {
        "mensaje": "Conectar Power BI a PostgreSQL usando las vistas del esquema datamart",
        "vistas": [
            "datamart.dm_consumo_zona_mensual",
            "datamart.dm_kpi_diarios",
            "datamart.dm_anomalias_zona",
            "datamart.dm_resumen_general",
            "datamart.dm_consumo_por_servicio",
            "datamart.dm_validacion_integridad",
        ],
        "conexion": {
            "servidor": "localhost:5432",
            "base_datos": "energia_hsd (o tu BD)",
            "esquema": "datamart",
            "puerto": 5432,
            "recomendado": "Usar conector PostgreSQL nativo en Power BI",
            "instrucciones": "Inicio > Obtener datos > PostgreSQL database > Servidor: localhost:5432, Base de datos: [tu_bd], Esquema: datamart",
        },
        "exportacion_csv": "Usa los endpoints /api/datamart/* para exportar JSON/CSV",
    }
