from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..database import get_db

router = APIRouter(
    prefix="/api/analisis-energetico",
    tags=["Análisis energético"],
)

Nivel = Literal["sistema", "zona", "servicio", "medidor"]
TipoDia = Literal["todos", "laborable", "fin_semana", "festivo"]
MESES = {1: "Enero", 2: "Febrero", 3: "Marzo"}
DIAS = {1: "Lunes", 2: "Martes", 3: "Miércoles", 4: "Jueves", 5: "Viernes", 6: "Sábado", 7: "Domingo"}


def _columnas(db: Session, tabla: str) -> set[str]:
    return set(db.execute(text("""
        SELECT column_name FROM information_schema.columns
        WHERE table_schema='energia' AND table_name=:tabla
    """), {"tabla": tabla}).scalars().all())


def _rango_mes(anio: int, mes: int) -> tuple[datetime, datetime]:
    inicio = datetime(anio, mes, 1)
    fin = datetime(anio + 1, 1, 1) if mes == 12 else datetime(anio, mes + 1, 1)
    return inicio, fin


def _rango_anterior(anio: int, mes: int) -> tuple[datetime, datetime]:
    return (datetime(anio - 1, 12, 1), datetime(anio, 1, 1)) if mes == 1 else (datetime(anio, mes - 1, 1), datetime(anio, mes, 1))


def _alcance(nivel: Nivel, id_zona: int | None, id_tipo_servicio: int | None, id_servicio: int | None, id_medidor: int | None) -> tuple[str, dict]:
    conditions: list[str] = []
    params: dict = {}
    if id_tipo_servicio is not None:
        conditions.append("s.id_tipo_servicio=:id_tipo_servicio")
        params["id_tipo_servicio"] = id_tipo_servicio
    if nivel == "zona":
        if id_zona is None: raise HTTPException(422, "id_zona es obligatorio para nivel=zona")
        conditions.append("s.id_zona=:id_zona"); params["id_zona"] = id_zona
    elif nivel == "servicio":
        if id_servicio is None: raise HTTPException(422, "id_servicio es obligatorio para nivel=servicio")
        conditions.append("s.id_servicio=:id_servicio"); params["id_servicio"] = id_servicio
    elif nivel == "medidor":
        if id_medidor is None: raise HTTPException(422, "id_medidor es obligatorio para nivel=medidor")
        conditions.append("m.id_medidor=:id_medidor"); params["id_medidor"] = id_medidor
    return (" AND " + " AND ".join(conditions) if conditions else ""), params


def _dia(db: Session, tipo_dia: TipoDia) -> tuple[str, str]:
    if tipo_dia == "todos": return "", ""
    if tipo_dia == "laborable": return "", " AND EXTRACT(ISODOW FROM l.ts) BETWEEN 1 AND 5"
    if tipo_dia == "fin_semana": return "", " AND EXTRACT(ISODOW FROM l.ts) IN (6,7)"
    cols = _columnas(db, "calendario")
    fecha = next((c for c in ("fecha", "dia", "fecha_calendario") if c in cols), None)
    tipo = next((c for c in ("es_festivo", "tipo_dia", "clasificacion") if c in cols), None)
    if not fecha or not tipo: return "", " AND FALSE"
    join = f" LEFT JOIN energia.calendario cal ON cal.{fecha}=l.ts::date"
    condition = " AND coalesce(cal.es_festivo,FALSE)=TRUE" if tipo == "es_festivo" else f" AND lower(coalesce(cal.{tipo}::text,'')) LIKE '%fest%'"
    return join, condition


@router.get("/medidores")
def medidores_analisis(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT m.id_medidor, m.id_servicio, m.numero_serie,
               s.id_zona, z.nombre AS zona_nombre,
               s.id_tipo_servicio, ts.nombre AS tipo_servicio_nombre,
               s.nombre AS servicio_nombre, s.rpu
        FROM energia.medidor m
        JOIN energia.servicio s ON s.id_servicio=m.id_servicio
        JOIN energia.zona z ON z.id_zona=s.id_zona
        JOIN energia.tipo_servicio ts ON ts.id_tipo_servicio=s.id_tipo_servicio
        ORDER BY z.nombre, s.nombre, m.numero_serie
    """)).mappings().all()
    return [dict(r) for r in rows]


@router.get("/lecturas")
def lecturas_medidor(id_medidor: int, db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT id_medidor, ts, consumo_kwh, consumo_real_kwh
        FROM energia.lectura WHERE id_medidor=:id ORDER BY ts
    """), {"id": id_medidor}).mappings().all()
    return [dict(r) for r in rows]


@router.get("/resumen")
def resumen_medidor(id_medidor: int, db: Session = Depends(get_db)):
    row = db.execute(text("""
        SELECT count(*)::int AS total_lecturas,
               coalesce(sum(consumo_real_kwh),0)::float AS consumo_total_kwh,
               coalesce(avg(consumo_real_kwh),0)::float AS consumo_promedio_kwh,
               coalesce(max(consumo_real_kwh),0)::float AS consumo_maximo_kwh,
               coalesce(min(consumo_real_kwh),0)::float AS consumo_minimo_kwh,
               min(ts) AS primera_lectura,
               max(ts) AS ultima_lectura
        FROM energia.lectura WHERE id_medidor=:id
    """), {"id": id_medidor}).mappings().one()
    max_row = db.execute(text("""
        SELECT ts AS fecha_maximo FROM energia.lectura
        WHERE id_medidor=:id ORDER BY consumo_real_kwh DESC NULLS LAST LIMIT 1
    """), {"id": id_medidor}).mappings().first()
    result = dict(row)
    result["fecha_maximo"] = max_row["fecha_maximo"] if max_row else None
    return result


@router.get("/perfil-horario")
def perfil_horario(
    id_tipo_servicio: int,
    tipo_dia: str = "H",
    db: Session = Depends(get_db),
):
    columns = _columnas(db, "perfil_carga_horaria")
    if {"id_tipo_servicio", "hora", "factor"}.issubset(columns):
        day_column = next((c for c in ("tipo_dia", "clasificacion_dia") if c in columns), None)
        condition = f" AND {day_column}=:tipo_dia" if day_column else ""
        rows = db.execute(text(f"""
            SELECT hora, factor FROM energia.perfil_carga_horaria
            WHERE id_tipo_servicio=:id {condition} ORDER BY hora
        """), {"id": id_tipo_servicio, "tipo_dia": tipo_dia}).mappings().all()
        return [dict(r) for r in rows]
    return [{"hora": hour, "factor": 0.0} for hour in range(24)]


@router.get("/periodos")
def periodos_servicio(id_servicio: int, db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT date_trunc('month', l.ts)::date AS fecha_inicio,
               (date_trunc('month', l.ts) + interval '1 month - 1 day')::date AS fecha_fin,
               concat('CALC-', to_char(date_trunc('month', l.ts), 'YYYYMM'), '-', :id) AS folio,
               coalesce(sum(l.consumo_real_kwh),0)::float AS consumo_kwh,
               0::float AS importe,
               'CALCULADO'::text AS clasificacion
        FROM energia.lectura l
        JOIN energia.medidor m ON m.id_medidor=l.id_medidor
        WHERE m.id_servicio=:id
        GROUP BY date_trunc('month', l.ts)
        ORDER BY fecha_inicio DESC
    """), {"id": id_servicio}).mappings().all()
    return [dict(r) for r in rows]


@router.get("/tipos-dia")
def tipos_dia():
    return [{"valor": "todos", "nombre": "Todos"}, {"valor": "laborable", "nombre": "Laborable"}, {"valor": "fin_semana", "nombre": "Fin de semana"}, {"valor": "festivo", "nombre": "Festivo"}]


@router.get("/agregado")
def analisis_agregado(
    mes: int = Query(3, ge=1, le=3),
    nivel: Nivel = Query("sistema"),
    tipo_dia: TipoDia = Query("todos"),
    id_zona: int | None = None,
    id_tipo_servicio: int | None = None,
    id_servicio: int | None = None,
    id_medidor: int | None = None,
    db: Session = Depends(get_db),
):
    reference = db.scalar(text("SELECT max(ts) FROM energia.lectura"))
    if reference is None: raise HTTPException(404, "No existen lecturas energéticas")
    year = reference.year
    start, end = _rango_mes(year, mes)
    previous_start, previous_end = _rango_anterior(year, mes)
    scope, scope_params = _alcance(nivel, id_zona, id_tipo_servicio, id_servicio, id_medidor)
    calendar_join, day_condition = _dia(db, tipo_dia)
    base = f"""FROM energia.lectura l
        JOIN energia.medidor m ON m.id_medidor=l.id_medidor
        JOIN energia.servicio s ON s.id_servicio=m.id_servicio
        {calendar_join}"""
    params = {**scope_params, "inicio": start, "fin": end, "inicio_anterior": previous_start, "fin_anterior": previous_end}

    summary = db.execute(text(f"""
        WITH actual AS (
          SELECT coalesce(sum(l.consumo_real_kwh),0)::float consumo,
                 coalesce(avg(l.consumo_real_kwh),0)::float promedio,
                 count(*)::int lecturas, count(DISTINCT l.id_medidor)::int medidores,
                 count(DISTINCT s.id_servicio)::int servicios,
                 count(DISTINCT l.ts::date)::int dias
          {base} WHERE l.ts>=:inicio AND l.ts<:fin {scope}{day_condition}
        ), anterior AS (
          SELECT coalesce(sum(l.consumo_real_kwh),0)::float consumo
          {base} WHERE l.ts>=:inicio_anterior AND l.ts<:fin_anterior {scope}{day_condition}
        ), pico AS (
          SELECT EXTRACT(HOUR FROM l.ts)::int hora, avg(l.consumo_real_kwh)::float consumo
          {base} WHERE l.ts>=:inicio AND l.ts<:fin {scope}{day_condition}
          GROUP BY EXTRACT(HOUR FROM l.ts) ORDER BY consumo DESC LIMIT 1
        )
        SELECT a.consumo consumo_total_kwh, p.consumo consumo_anterior_kwh,
          CASE WHEN p.consumo>0 THEN ((a.consumo-p.consumo)/p.consumo)*100 ELSE 0 END::float variacion_pct,
          a.promedio promedio_por_lectura_kwh,
          CASE WHEN a.dias>0 THEN a.consumo/a.dias ELSE 0 END::float promedio_diario_kwh,
          coalesce(pk.consumo,0)::float pico_horario_kwh, pk.hora hora_pico,
          a.lecturas, a.medidores, a.servicios
        FROM actual a CROSS JOIN anterior p LEFT JOIN pico pk ON TRUE
    """), params).mappings().one()

    hourly_rows = db.execute(text(f"""
        SELECT EXTRACT(HOUR FROM l.ts)::int hora,
               avg(l.consumo_real_kwh)::float consumo_real_kwh,
               avg(l.consumo_kwh)::float consumo_estimado_kwh,
               count(*)::int lecturas
        {base} WHERE l.ts>=:inicio AND l.ts<:fin {scope}{day_condition}
        GROUP BY EXTRACT(HOUR FROM l.ts) ORDER BY hora
    """), params).mappings().all()
    hourly_map = {int(r["hora"]): dict(r) for r in hourly_rows}
    hourly = [{"hora": h, "consumo_real_kwh": float(hourly_map.get(h, {}).get("consumo_real_kwh", 0)), "consumo_estimado_kwh": float(hourly_map.get(h, {}).get("consumo_estimado_kwh", 0)), "lecturas": int(hourly_map.get(h, {}).get("lecturas", 0))} for h in range(24)]

    monthly = []
    for number, name in MESES.items():
        ms, me = _rango_mes(year, number)
        row = db.execute(text(f"""
            SELECT coalesce(sum(l.consumo_real_kwh),0)::float consumo,
                   count(*)::int lecturas, count(DISTINCT l.ts::date)::int dias
            {base} WHERE l.ts>=:ms AND l.ts<:me {scope}{day_condition}
        """), {**params, "ms": ms, "me": me}).mappings().one()
        total = float(row["consumo"]); days = int(row["dias"])
        monthly.append({"mes": number, "nombre_mes": name, "consumo_total_kwh": total, "promedio_diario_kwh": total / days if days else 0, "lecturas": int(row["lecturas"])})

    heat_rows = db.execute(text(f"""
        SELECT EXTRACT(ISODOW FROM l.ts)::int dia, EXTRACT(HOUR FROM l.ts)::int hora,
               avg(l.consumo_real_kwh)::float consumo, count(*)::int lecturas
        {base} WHERE l.ts>=:inicio AND l.ts<:fin {scope}{day_condition}
        GROUP BY EXTRACT(ISODOW FROM l.ts), EXTRACT(HOUR FROM l.ts)
    """), params).mappings().all()
    heat_map = {(int(r["dia"]), int(r["hora"])): dict(r) for r in heat_rows}
    heat = [{"dia_semana": d, "nombre_dia": DIAS[d], "hora": h, "consumo_promedio_kwh": float(heat_map.get((d,h),{}).get("consumo",0)), "lecturas": int(heat_map.get((d,h),{}).get("lecturas",0))} for d in range(1,8) for h in range(24)]

    return {"nivel": nivel, "mes": mes, "anio": year, "tipo_dia": tipo_dia,
            "id_zona": id_zona, "id_tipo_servicio": id_tipo_servicio,
            "id_servicio": id_servicio, "id_medidor": id_medidor,
            "resumen": dict(summary), "curva_horaria": hourly,
            "comparacion_mensual": monthly, "mapa_calor": heat}
