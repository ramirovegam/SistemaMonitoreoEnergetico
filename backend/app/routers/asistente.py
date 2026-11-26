"""Endpoint del agente analítico conversacional de SIMET.

Orquesta el plan del LLM, ejecuta herramientas de solo lectura y devuelve la
respuesta con fuentes, fórmulas aplicadas y visualizaciones verificadas.
"""

from __future__ import annotations

import math
import os
import threading
import time
from collections import deque
from typing import Any

from fastapi import APIRouter, HTTPException, Request

from ..schemas.asistente import ConsultaRequest, ConsultaResponse, Sugerencia
from ..services import conocimiento_simet, estadisticas, formulas, llm

router = APIRouter(prefix="/api/asistente", tags=["Asistente"])
_MAX_CLAVES = 2000


class Limitador:
    """Ventana deslizante simple por IP y sesión, en memoria."""

    def __init__(self, limite: int, ventana: int) -> None:
        self.limite = limite
        self.ventana = ventana
        self.eventos: dict[str, deque[float]] = {}
        self.bloqueo = threading.Lock()

    def esperar(self, clave: str) -> int:
        ahora = time.monotonic()
        with self.bloqueo:
            cola = self.eventos.setdefault(clave, deque())
            while cola and ahora - cola[0] > self.ventana:
                cola.popleft()
            if len(cola) >= self.limite:
                return max(1, int(self.ventana - (ahora - cola[0])) + 1)
            cola.append(ahora)
            if len(self.eventos) > _MAX_CLAVES // 2:
                inactivas = [
                    llave
                    for llave, valores in self.eventos.items()
                    if not valores or ahora - valores[-1] > self.ventana
                ]
                for llave in inactivas:
                    self.eventos.pop(llave, None)
            if len(self.eventos) > _MAX_CLAVES:
                antiguas = sorted(
                    self.eventos.items(),
                    key=lambda item: item[1][-1] if item[1] else 0,
                )
                excedente = len(self.eventos) - _MAX_CLAVES
                for llave, _ in antiguas[:excedente]:
                    self.eventos.pop(llave, None)
            return 0


_limitador = Limitador(
    limite=int(os.getenv("ASISTENTE_RATE_LIMIT", "30")),
    ventana=int(os.getenv("ASISTENTE_RATE_WINDOW", "60")),
)
_CONCURRENCIA = threading.BoundedSemaphore(
    max(1, int(os.getenv("ASISTENTE_MAX_CONCURRENTES", "10")))
)


def _clave_cliente(request: Request) -> str:
    ip = request.client.host if request.client else "desconocida"
    sesion = (request.headers.get("x-simet-session") or "")[:64]
    return f"{ip}|{sesion}"


def _aplicar_limite(request: Request) -> None:
    espera = _limitador.esperar(_clave_cliente(request))
    if espera:
        raise HTTPException(
            status_code=429,
            detail=f"Demasiadas consultas. Intenta de nuevo en {espera} segundos.",
            headers={"Retry-After": str(espera)},
        )


def _sin_evidencia(herramienta: str, error: Exception) -> dict[str, Any]:
    return {
        "herramienta": herramienta,
        "fuentes": [],
        "metodo": "sin evidencia suficiente",
        "datos": {
            "motivo": (
                f"La herramienta verificada no devolvió datos "
                f"({type(error).__name__})."
            )
        },
        "datos_visualizacion": [],
    }


def _variables_verificadas(datos: Any) -> dict[str, float]:
    """Deriva variables numéricas del payload de una herramienta verificada."""
    if isinstance(datos, dict):
        pares = datos.items()
    elif isinstance(datos, list) and datos and isinstance(datos[0], dict):
        pares = datos[0].items()
    else:
        return {}
    variables: dict[str, float] = {}
    for clave, valor in pares:
        if isinstance(valor, bool) or valor is None:
            continue
        try:
            numero = float(valor)
        except (TypeError, ValueError):
            continue
        if math.isfinite(numero):
            variables[str(clave)] = numero
        if len(variables) >= 20:
            break
    return variables


def _ejecutar_plan(plan: dict[str, Any]) -> dict[str, Any]:
    resultados: dict[str, dict[str, Any]] = {}
    ejecutados: list[dict[str, Any]] = []
    fuentes: set[str] = set()
    visualizaciones: list[dict[str, Any]] = []
    aplicadas: list[dict[str, Any]] = []

    for indice, paso in enumerate(plan.get("pasos") or []):
        nombre = str(paso.get("herramienta") or "")
        parametros = dict(paso.get("parametros") or {})
        id_paso = str(paso.get("id") or f"paso_{indice + 1}")
        try:
            if nombre == "calcular_formula":
                formula_nombre = str(parametros.pop("nombre", ""))
                datos_desde = parametros.pop("datos_desde", None)
                datos = None
                heredadas: list[str] = []
                if isinstance(datos_desde, str) and datos_desde in resultados:
                    origen = resultados[datos_desde]
                    datos = origen.get("datos")
                    heredadas = list(origen.get("fuentes") or [])

                if formula_nombre == "evaluar_expresion_segura":
                    if datos is None:
                        raise ValueError(
                            "La expresión requiere datos verificados de un paso previo."
                        )
                    parametros["variables"] = _variables_verificadas(datos)

                calculo = formulas.calcular_formula(
                    formula_nombre,
                    datos=datos,
                    parametros=parametros,
                )
                resultado: dict[str, Any] = {
                    "herramienta": "calcular_formula",
                    "fuentes": heredadas,
                    "metodo": str(calculo.get("metodo") or ""),
                    "datos": calculo.get("resultado"),
                    "datos_visualizacion": (
                        [calculo["grafica"]] if calculo.get("grafica") else []
                    ),
                }
                aplicadas.append(
                    {
                        "nombre": formula_nombre,
                        "expresion": str(calculo.get("expresion") or ""),
                        "resultado": calculo.get("resultado"),
                        "interpretacion": str(calculo.get("interpretacion") or ""),
                        "metodo": str(calculo.get("metodo") or ""),
                        "fuentes": heredadas,
                    }
                )
            else:
                resultado = estadisticas.ejecutar_herramienta(nombre, parametros)
        except Exception as error:  # la API nunca expone SQL ni credenciales
            resultado = _sin_evidencia(nombre, error)

        resultados[id_paso] = resultado
        ejecutados.append(resultado)
        fuentes.update(str(fuente) for fuente in resultado.get("fuentes") or [])
        for visualizacion in resultado.get("datos_visualizacion") or []:
            if isinstance(visualizacion, dict):
                visualizaciones.append(visualizacion)

    datos_crudos = [
        item["datos"]
        for item in ejecutados
        if item.get("herramienta") != "calcular_formula"
    ]
    metodos = list(
        dict.fromkeys(str(item.get("metodo") or "") for item in ejecutados if item.get("metodo"))
    )
    return {
        "herramientas": ejecutados,
        "fuentes": sorted(fuentes),
        "formulas_aplicadas": aplicadas,
        "datos_visualizacion": visualizaciones,
        "datos_compat": datos_crudos[0] if len(datos_crudos) == 1 else datos_crudos,
        "metodo_compat": " · ".join(metodos),
    }


@router.get("/sugerencias", response_model=list[Sugerencia])
def sugerencias() -> list[Sugerencia]:
    return [Sugerencia(**item) for item in estadisticas.SUGERENCIAS]


def _responder(body: ConsultaRequest) -> ConsultaResponse:
    historial = [mensaje.model_dump() for mensaje in body.historial[-12:]]
    plan, aviso_plan = llm.planificar(body.pregunta, historial)
    modo = plan.get("modo") if plan.get("modo") in {"conversacional", "conceptual", "datos"} else "datos"
    respuesta_local: str | None = None
    aviso_estimacion: str | None = None

    if modo in {"conversacional", "conceptual"}:
        respuesta_base = str(plan.get("respuesta") or "").strip()
        if modo == "conceptual" and not respuesta_base:
            termino = conocimiento_simet.detectar_termino(body.pregunta)
            respuesta_base = (
                conocimiento_simet.explicar(termino)
                if termino
                else conocimiento_simet.FUERA_DE_ALCANCE
            )
        if not respuesta_base:
            respuesta_base = conocimiento_simet.FUERA_DE_ALCANCE
        ejecucion: dict[str, Any] = {
            "herramientas": [],
            "fuentes": [],
            "formulas_aplicadas": [],
            "datos_visualizacion": [],
            "datos_compat": None,
            "metodo_compat": "base de conocimiento",
        }
        payload = {"modo": modo, "respuesta_base": respuesta_base}
        # La base de conocimiento ya trae la cita canónica: no se gasta un LLM en paráfrasis.
        respuesta_local = llm.recortar(respuesta_base)
    else:
        ejecucion = _ejecutar_plan(plan)
        aviso_estimacion = next(
            (
                "Estimación derivada; SIMET no almacena pronósticos oficiales."
                for item in ejecucion["formulas_aplicadas"]
                if str(item.get("nombre") or "") == "proyeccion_tendencia"
                and (item.get("resultado") or {}).get("disponible")
            ),
            None,
        )
        payload = {
            "modo": "datos",
            "pregunta": body.pregunta,
            "herramientas": ejecucion["herramientas"],
            "fuentes": ejecucion["fuentes"],
            "formulas_aplicadas": ejecucion["formulas_aplicadas"],
        }
        if aviso_estimacion:
            payload["aviso"] = aviso_estimacion

    if respuesta_local is not None:
        texto, aviso_redaccion, origen = respuesta_local, None, "local"
    else:
        texto, aviso_redaccion = llm.redactar(body.pregunta, payload, historial)
        origen = "local" if aviso_plan or aviso_redaccion else "llm"
    # La estimación prevalece: es una regla de dominio, no un aviso técnico del proveedor.
    aviso = aviso_estimacion or aviso_plan or aviso_redaccion
    grafica = ejecucion["datos_visualizacion"][0] if ejecucion["datos_visualizacion"] else None

    return ConsultaResponse(
        pregunta=body.pregunta,
        respuesta=texto,
        fuentes=ejecucion["fuentes"],
        formulas_aplicadas=ejecucion["formulas_aplicadas"],
        datos_visualizacion=ejecucion["datos_visualizacion"],
        modo=modo,
        origen=origen,
        aviso=aviso,
        fuente=ejecucion["fuentes"],
        metodo=ejecucion["metodo_compat"] or None,
        datos=ejecucion["datos_compat"],
        grafica=grafica,
    )


@router.post("/consultar", response_model=ConsultaResponse)
def consultar(body: ConsultaRequest, request: Request) -> ConsultaResponse:
    _aplicar_limite(request)
    if not _CONCURRENCIA.acquire(blocking=False):
        raise HTTPException(
            status_code=503,
            detail="El asistente está atendiendo otras consultas. Intenta de nuevo en unos segundos.",
            headers={"Retry-After": "5"},
        )
    try:
        return _responder(body)
    finally:
        _CONCURRENCIA.release()
