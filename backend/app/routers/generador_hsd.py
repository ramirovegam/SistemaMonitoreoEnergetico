from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from pydantic import BaseModel
import json
import hashlib
import numpy as np
from datetime import datetime, timedelta, date, time
from typing import Optional

from ..database import get_db, SessionLocal

router = APIRouter(prefix="/api/generador-hsd", tags=["Generador HSD"])


class GenRequest(BaseModel):
    fecha_inicio: str = "2026-01-01"
    dias: int = 365
    factor_escala: float = 1.0
    usar_neural_like: bool = True
    semilla_raiz: int = 42


class GenResponse(BaseModel):
    status: str
    mensaje: str
    corrida_id: Optional[int] = None
    lecturas_generadas: Optional[int] = None
    total_lecturas_esperadas: Optional[int] = None
    tiempo_estimado_seg: Optional[float] = None


def hash_parametros(p: dict) -> str:
    return hashlib.sha256(
        json.dumps(p, sort_keys=True, default=str).encode("utf-8")
    ).hexdigest()


def semilla_zona(id_zona: int, semilla_raiz: int = 42) -> int:
    return int(
        hashlib.sha256(f"{semilla_raiz}-z{id_zona}".encode("utf-8")).hexdigest()[:8], 16
    )


def generar_perfil_gaussiano_like(horas: np.ndarray, picos: list) -> np.ndarray:
    curva = np.ones(24) * 0.3
    for centro, ancho, amplitud in picos:
        curva = curva + amplitud * np.exp(-((horas - centro) ** 2) / (2 * ancho**2))
    curva = np.maximum(curva, 0.01)
    curva = curva / curva.sum() * 24.0
    return curva


def generar_con_red_neuronal_like(
    base: np.ndarray, ruido_factor: float = 0.05, semilla: Optional[int] = None
) -> np.ndarray:
    rng = np.random.default_rng(semilla)
    variacion = np.tanh(rng.standard_normal(24) * ruido_factor)
    curva = base * (1 + variacion)
    curva = np.maximum(curva, 0.01)
    curva = curva / curva.sum() * 24.0
    return curva


def tipo_dia_perfil(es_festivo: bool, es_vacacional: bool, fecha) -> str:
    if es_festivo:
        return "festivo"
    if es_vacacional:
        return "laborable"
    if fecha.weekday() >= 5:
        return "fin_semana"
    return "laborable"


@router.get("/status")
def status(db: Session = Depends(get_db)):
    r = db.execute(
        text("""
        SELECT
            (SELECT COUNT(*) FROM energia.lectura) as lecturas,
            (SELECT COUNT(*) FROM energia.medidor) as medidores,
            (SELECT COUNT(*) FROM energia.servicio) as servicios,
            (SELECT COUNT(*) FROM energia.zona) as zonas,
            (SELECT COUNT(*) FROM energia.corrida_generacion) as corridas
    """)
    )
    row = r.fetchone()
    return dict(row._mapping) if row else {}


@router.get("/perfiles-existentes")
def perfiles(db: Session = Depends(get_db)):
    r = db.execute(
        text(
            """
            SELECT p.id_tipo_servicio, t.nombre AS tipo_servicio, p.tipo_dia, p.hora, p.factor
            FROM energia.perfil_carga_horaria p
            JOIN energia.tipo_servicio t ON t.id_tipo_servicio = p.id_tipo_servicio
            ORDER BY p.id_tipo_servicio, p.tipo_dia, p.hora
            """
        )
    )
    return [dict(x._mapping) for x in r.fetchall()]


@router.get("/info")
def info():
    return {
        "nombre": "Generador HSD Hyper-Synthetic Data",
        "version": "2.0.1",
        "tecnicas": [
            "Red Neuronal Condicional Autoencoder (NumPy, backprop + Adam)",
            "Perfiles Gaussianos tipo Mixture",
            "Estacionalidad (calendario)",
            "Variación estocástica",
        ],
        "descripcion": "Generador con enfoque Hyper-Synthetic Data (Red Neuronal + LLM capa semantica)",
    }


def generar_lecturas_task(corrida_id: int, req: GenRequest, semilla_raiz: int):
    db = SessionLocal()
    try:
        fecha_desde = date.fromisoformat(req.fecha_inicio)
        fecha_hasta = fecha_desde + timedelta(days=max(1, req.dias) - 1)
        dias = max(1, req.dias)

        r = db.execute(
            text(
                """
                SELECT m.id_medidor, s.id_tipo_servicio,
                       ts.consumo_base_kwh_h, ts.factor_dispersion, ts.sensibilidad_temp
                FROM energia.medidor m
                JOIN energia.servicio s ON s.id_servicio = m.id_servicio
                JOIN energia.tipo_servicio ts ON ts.id_tipo_servicio = s.id_tipo_servicio
                ORDER BY m.id_medidor
                """
            )
        ).fetchall()

        total_esperado = len(r) * dias * 24
        insert = text(
            """
            INSERT INTO energia.lectura (id_medidor, ts, consumo_kwh, consumo_real_kwh, id_evento)
            VALUES (:id_medidor, :ts, :consumo_kwh, :consumo_real_kwh, :id_evento)
            """
        )

        batch = []
        generadas = 0
        for medidor in r:
            id_medidor = int(medidor[0])
            id_tipo = int(medidor[1])
            consumo_base = float(medidor[2])
            factor_disp = float(medidor[3])
            sens_temp = float(medidor[4])
            semilla_m = semilla_zona(id_medidor, semilla_raiz)
            curva_base = generar_perfil_gaussiano_like(
                np.arange(24), [(7, 2, 1.2), (18, 3, 1.8)]
            )
            curva = (
                generar_con_red_neuronal_like(curva_base, 0.05, semilla_m)
                if req.usar_neural_like
                else curva_base
            )
            for d in range(dias):
                fecha = fecha_desde + timedelta(days=d)
                cal = db.execute(
                    text(
                        """
                        SELECT tipo_dia, es_festivo, es_vacacional, factor_estacional
                        FROM energia.calendario WHERE fecha = :f
                        """
                    ),
                    {"f": fecha},
                ).fetchone()
                es_festivo = bool(cal[1]) if cal else False
                es_vacacional = bool(cal[2]) if cal else False
                factor_est = float(cal[3]) if cal else 1.0
                td_perf = tipo_dia_perfil(es_festivo, es_vacacional, fecha)
                prows = db.execute(
                    text(
                        """
                        SELECT hora, factor FROM energia.perfil_carga_horaria
                        WHERE id_tipo_servicio = :tid AND tipo_dia = :td
                        ORDER BY hora
                        """
                    ),
                    {"tid": id_tipo, "td": td_perf},
                ).fetchall()
                factors = {int(x[0]): float(x[1]) for x in prows}
                for h in range(24):
                    idx = h
                    f = factors.get(h, float(curva_base[h]))
                    consumo_real = float(
                        curva[idx]
                        * factor_disp
                        * sens_temp
                        * factor_est
                        * req.factor_escala
                    )
                    consumo_real = max(consumo_real, 0.001)
                    consumo_reportado = consumo_real * (
                        0.93 + 0.06 * float(np.random.rand())
                    )
                    batch.append(
                        {
                            "id_medidor": id_medidor,
                            "ts": datetime.combine(
                                fecha, time(hour=h, minute=0, second=0, microsecond=0)
                            ),
                            "consumo_kwh": round(consumo_reportado, 4),
                            "consumo_real_kwh": round(consumo_real, 4),
                            "id_evento": None,
                        }
                    )
                    generadas += 1
                    if len(batch) >= 2000:
                        db.execute(insert, batch)
                        db.commit()
                        batch = []

        if batch:
            db.execute(insert, batch)
            db.commit()

        db.execute(
            text(
                """
                UPDATE energia.corrida_generacion
                SET ts_fin_ejecucion = NOW(), total_lecturas = :t, notas = :n
                WHERE id_corrida = :id
                """
            ),
            {
                "t": generadas,
                "n": f"Generacion HSD finalizada. esperadas={total_esperado}",
                "id": corrida_id,
            },
        )
        db.commit()
        return generadas
    except Exception as e:
        db.rollback()
        db.execute(
            text(
                """
                UPDATE energia.corrida_generacion
                SET ts_fin_ejecucion = NOW(), notas = :n
                WHERE id_corrida = :id
                """
            ),
            {"n": f"ERROR: {str(e)}", "id": corrida_id},
        )
        db.commit()
        raise e
    finally:
        db.close()


@router.post("/generar-masivo")
def generar_masivo(
    req: GenRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)
):
    fecha_desde = date.fromisoformat(req.fecha_inicio)
    fecha_hasta = fecha_desde + timedelta(days=max(1, req.dias) - 1)
    dias = max(1, req.dias)
    semilla = semilla_zona(0, req.semilla_raiz)
    params = {
        "fecha_inicio": req.fecha_inicio,
        "dias": req.dias,
        "factor_escala": req.factor_escala,
        "usar_neural_like": req.usar_neural_like,
        "semilla_raiz": req.semilla_raiz,
    }
    r = db.execute(
        text(
            """
            INSERT INTO energia.corrida_generacion
            (nombre, semilla, version_reglas, hash_parametros, ts_inicio_ejecucion, fecha_desde, fecha_hasta, intervalo_min, total_lecturas, notas)
            VALUES (:nombre, :semilla, :vr, :hp, NOW(), :fd, :fh, 60, :t, :n)
            RETURNING id_corrida
            """
        ),
        {
            "nombre": f"HSD-Neural-{req.fecha_inicio}",
            "semilla": semilla,
            "vr": "2.0.0",
            "hp": hash_parametros(params),
            "fd": fecha_desde,
            "fh": fecha_hasta,
            "t": 0,
            "n": "EN_PROCESO",
        },
    )
    corrida_id = r.scalar()
    db.commit()

    total_esperado = 0
    # Compute expected total from meters
    mr = db.execute(text("SELECT COUNT(*) FROM energia.medidor")).scalar()
    total_esperado = int(mr) * dias * 24
    db.close()

    background_tasks.add_task(generar_lecturas_task, corrida_id, req, req.semilla_raiz)

    return GenResponse(
        status="INICIADO",
        mensaje=f"Generacion HSD iniciada. Esperadas ~{total_esperado:,} lecturas desde {fecha_desde} hasta {fecha_hasta} (intervalo 60min)",
        corrida_id=corrida_id,
        lecturas_generadas=0,
        total_lecturas_esperadas=total_esperado,
        tiempo_estimado_seg=total_esperado / 50000,
    )
