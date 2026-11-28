"""Ingesta curada y construcción determinista del grafo derivado.

Este módulo no lee la base de datos y no escribe en `docs/base_conocimiento`.
Solo transforma fuentes verificadas y sinónimos revisados en un artefacto
regenerable que vive en `backend/app/graphrag/artifacts/`.
"""

from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any

import yaml

from .normalizacion import normalizar, slug
from .plantillas import PLANTILLAS

RAIZ = Path(__file__).resolve().parents[3]
DIRECTORIO = Path(__file__).resolve().parent
ARCHIVO_FUENTES = DIRECTORIO / "fuentes.yaml"
ARCHIVO_ALIAS = DIRECTORIO / "sinonimos_revisados.yaml"


def _leer_yaml(ruta: Path) -> dict[str, Any]:
    datos = yaml.safe_load(ruta.read_text(encoding="utf-8"))
    if not isinstance(datos, dict):
        raise ValueError(f"YAML inválido: {ruta}")
    return datos


def _ruta_fuente(valor: str) -> Path:
    ruta = Path(valor)
    return ruta if ruta.is_absolute() else RAIZ / ruta


def cargar_fuentes() -> list[dict[str, Any]]:
    """Carga metadatos y verifica el digest de los archivos disponibles."""
    documentos = _leer_yaml(ARCHIVO_FUENTES).get("fuentes") or []
    if not isinstance(documentos, list):
        raise ValueError("fuentes.yaml debe contener una lista en `fuentes`.")

    fuentes: list[dict[str, Any]] = []
    vistos: set[str] = set()
    for documento in documentos:
        if not isinstance(documento, dict):
            raise ValueError("Cada fuente debe ser un objeto.")
        identidad = str(documento.get("id") or "").strip()
        if not identidad or identidad in vistos:
            raise ValueError(f"Identificador de fuente inválido o duplicado: {identidad}")
        vistos.add(identidad)

        esperado = str(documento.get("sha256") or "").strip().lower()
        archivo = _ruta_fuente(str(documento.get("archivo") or ""))
        disponible = archivo.is_file()
        if not disponible and esperado:
            raise ValueError(f"Fuente registrada pero no disponible: {archivo}")
        if disponible:
            calculado = hashlib.sha256(archivo.read_bytes()).hexdigest()
            if esperado and calculado != esperado:
                raise ValueError(f"Fuente modificada respecto al digest registrado: {archivo}")

        extractos = documento.get("extractos") or []
        if not isinstance(extractos, list) or not extractos:
            raise ValueError(f"La fuente {identidad} no tiene extractos verificables.")

        fuentes.append(
            {
                "id": identidad,
                "titulo": str(documento.get("titulo") or identidad),
                "tipo": str(documento.get("tipo") or "fuente"),
                "cita": str(documento.get("cita") or identidad),
                "archivo": str(documento.get("archivo") or ""),
                "fecha": str(documento.get("fecha") or ""),
                "sha256": esperado,
                "autoridad": str(documento.get("autoridad") or ""),
                "disponible": disponible,
                "extractos": [
                    {
                        "id": str(item["id"]),
                        "localizador": str(item.get("localizador") or ""),
                        "texto": str(item.get("texto") or "").strip(),
                    }
                    for item in extractos
                    if isinstance(item, dict) and item.get("id")
                ],
            }
        )
    return fuentes


def cargar_alias() -> list[dict[str, Any]]:
    documentos = _leer_yaml(ARCHIVO_ALIAS).get("alias") or []
    if not isinstance(documentos, list):
        raise ValueError("sinonimos_revisados.yaml debe contener una lista en `alias`.")
    alias: list[dict[str, Any]] = []
    for documento in documentos:
        if not isinstance(documento, dict):
            raise ValueError("Cada alias debe ser un objeto.")
        texto = normalizar(documento.get("texto") or "")
        nodo = str(documento.get("nodo") or "").strip()
        if not texto or not nodo:
            raise ValueError("Alias incompleto en sinonimos_revisados.yaml.")
        alias.append(
            {
                "nodo": nodo,
                "texto": texto,
                "prioridad": int(documento.get("prioridad") or 50),
                "motivo": str(documento.get("motivo") or ""),
            }
        )
    if len({item["texto"] for item in alias}) != len(alias):
        raise ValueError("Hay alias duplicados en sinonimos_revisados.yaml.")
    return alias


NODOS_BASE: tuple[dict[str, Any], ...] = (
    {
        "id": "intencion:saludo",
        "tipo": "intencion",
        "titulo": "Saludo",
        "modo": "conversacional",
        "plantilla": "intencion:saludo",
        "fuentes": ("corpus_simet",),
        "evidencia": {"corpus_simet": ("corpus:grounding",)},
        "relacionados": ("concepto:identidad",),
    },
    {
        "id": "concepto:identidad",
        "tipo": "intencion",
        "titulo": "Identidad del agente",
        "modo": "conversacional",
        "plantilla": "concepto:identidad",
        "fuentes": ("corpus_simet",),
        "evidencia": {"corpus_simet": ("corpus:grounding",)},
        "relacionados": (),
    },
    {
        "id": "concepto:arquitectura",
        "tipo": "concepto",
        "titulo": "Arquitectura de SIMET",
        "modo": "conceptual",
        "plantilla": "concepto:arquitectura",
        "fuentes": ("corpus_simet",),
        "evidencia": {"corpus_simet": ("corpus:arquitectura",)},
        "relacionados": ("territorio:toluca",),
    },
    {
        "id": "concepto:metrica",
        "tipo": "concepto",
        "titulo": "Métrica",
        "modo": "conceptual",
        "plantilla": "concepto:metrica",
        "fuentes": ("rae", "corpus_simet"),
        "evidencia": {"rae": ("rae:metrica",), "corpus_simet": ("corpus:grounding",)},
        "relacionados": ("concepto:indicador", "herramienta:consultar_zonas"),
    },
    {
        "id": "concepto:indicador",
        "tipo": "concepto",
        "titulo": "Indicador",
        "modo": "conceptual",
        "plantilla": "concepto:indicador",
        "fuentes": ("rae", "corpus_simet"),
        "evidencia": {"rae": ("rae:indicador",), "corpus_simet": ("corpus:grounding",)},
        "relacionados": ("concepto:metrica",),
    },
    {
        "id": "relacion:indicador_metrica",
        "tipo": "concepto",
        "titulo": "Indicador frente a métrica",
        "modo": "conceptual",
        "plantilla": "relacion:indicador_metrica",
        "fuentes": ("rae", "corpus_simet"),
        "evidencia": {"rae": ("rae:metrica",), "corpus_simet": ("corpus:grounding",)},
        "relacionados": ("concepto:metrica", "concepto:indicador"),
    },
    {
        "id": "concepto:luz",
        "tipo": "concepto",
        "titulo": "Luz",
        "modo": "conceptual",
        "plantilla": "concepto:luz",
        "fuentes": ("rae", "corpus_simet"),
        "evidencia": {"rae": ("rae:luz",), "corpus_simet": ("corpus:grounding",)},
        "relacionados": ("concepto:energia_electrica",),
    },
    {
        "id": "concepto:energia_electrica",
        "tipo": "concepto",
        "titulo": "Energía eléctrica",
        "modo": "conceptual",
        "plantilla": "concepto:energia_electrica",
        "fuentes": ("rae", "corpus_simet"),
        "evidencia": {"rae": ("rae:energia",), "corpus_simet": ("corpus:grounding",)},
        "relacionados": ("concepto:luz",),
    },
    {
        "id": "concepto:rpu",
        "tipo": "concepto",
        "titulo": "RPU",
        "modo": "conceptual",
        "plantilla": "concepto:rpu",
        "fuentes": ("cfe_suministro", "corpus_simet"),
        "evidencia": {"cfe_suministro": ("cfe:rpu",), "corpus_simet": ("corpus:grounding",)},
        "relacionados": ("concepto:medidor",),
    },
    {
        "id": "concepto:demanda_contratada",
        "tipo": "concepto",
        "titulo": "Demanda contratada",
        "modo": "conceptual",
        "plantilla": "concepto:demanda_contratada",
        "fuentes": ("cfe_suministro", "corpus_simet"),
        "evidencia": {"cfe_suministro": ("cfe:demanda",), "corpus_simet": ("corpus:grounding",)},
        "relacionados": ("concepto:medidor",),
    },
    {
        "id": "concepto:medidor",
        "tipo": "concepto",
        "titulo": "Medidor",
        "modo": "conceptual",
        "plantilla": "concepto:medidor",
        "fuentes": ("cfe_suministro", "corpus_simet"),
        "evidencia": {"cfe_suministro": ("cfe:medidor",), "corpus_simet": ("corpus:grounding",)},
        "relacionados": ("concepto:rpu",),
    },
    {
        "id": "regla:tarifa_dac",
        "tipo": "regla",
        "titulo": "Regla DAC adaptada a SIMET",
        "modo": "conceptual",
        "plantilla": "regla:tarifa_dac",
        "fuentes": ("cfe_tarifas", "corpus_simet"),
        "evidencia": {
            "cfe_tarifas": ("cfe:dac_limites", "cfe:dac_regla"),
            "corpus_simet": ("corpus:grounding",),
        },
        "relacionados": ("concepto:demanda_contratada",),
    },
    {
        "id": "regla:prediccion",
        "tipo": "regla",
        "titulo": "Predicciones verificadas",
        "modo": "conceptual",
        "plantilla": "regla:prediccion",
        "fuentes": ("banco_memoria", "corpus_simet"),
        "evidencia": {
            "banco_memoria": ("banco:pronostico", "banco:evidencia"),
            "corpus_simet": ("corpus:prediccion",),
        },
        "relacionados": ("herramienta:calcular_formula", "concepto:pronostico_oficial"),
    },
    {
        "id": "regla:guardrails",
        "tipo": "regla",
        "titulo": "Guardrails deterministas",
        "modo": "conceptual",
        "plantilla": "regla:guardrails",
        "fuentes": ("banco_memoria", "corpus_simet"),
        "evidencia": {
            "banco_memoria": ("banco:arquitectura_llm", "banco:null_cero"),
            "corpus_simet": ("corpus:grounding",),
        },
        "relacionados": ("concepto:pronostico_oficial",),
    },
    {
        "id": "concepto:pronostico_oficial",
        "tipo": "concepto",
        "titulo": "Pronóstico oficial",
        "modo": "conceptual",
        "plantilla": None,
        "fuentes": ("corpus_simet",),
        "evidencia": {"corpus_simet": ("corpus:prediccion",)},
        "relacionados": (),
    },
)

NODOS_AUXILIARES: tuple[dict[str, Any], ...] = (
    {
        "id": "territorio:toluca",
        "tipo": "territorio",
        "titulo": "Toluca",
        "fuentes": ("corpus_simet",),
    },
    {
        "id": "herramienta:consultar_zonas",
        "tipo": "herramienta",
        "titulo": "consultar_zonas",
        "fuentes": ("corpus_simet",),
    },
    {
        "id": "herramienta:calcular_formula",
        "tipo": "herramienta",
        "titulo": "calcular_formula",
        "fuentes": ("corpus_simet",),
    },
)

ARISTAS_BASE: tuple[dict[str, str], ...] = (
    {"desde": "intencion:saludo", "tipo": "RESUELVE_CON", "hasta": "concepto:identidad"},
    {"desde": "herramienta:consultar_zonas", "tipo": "MIDE", "hasta": "territorio:toluca"},
    {"desde": "herramienta:consultar_zonas", "tipo": "MIDE", "hasta": "concepto:metrica"},
    {"desde": "regla:prediccion", "tipo": "USA_HERRAMIENTA", "hasta": "herramienta:calcular_formula"},
    {"desde": "regla:guardrails", "tipo": "RECHAZA", "hasta": "concepto:pronostico_oficial"},
    {"desde": "regla:prediccion", "tipo": "RECHAZA", "hasta": "concepto:pronostico_oficial"},
)


def _nodo_base(entrada: dict[str, Any]) -> dict[str, Any]:
    clave = entrada.get("plantilla")
    return {
        "id": entrada["id"],
        "tipo": entrada["tipo"],
        "titulo": entrada["titulo"],
        "modo": entrada.get("modo", "conceptual"),
        "respuesta": PLANTILLAS.get(clave) if clave else None,
        "fuentes": list(entrada.get("fuentes") or ()),
        "evidencia": {
            str(fuente): list(ids)
            for fuente, ids in (entrada.get("evidencia") or {}).items()
        },
    }


def construir_grafo() -> dict[str, Any]:
    """Construye el grafo con orden estable y sin timestamps."""
    fuentes = cargar_fuentes()
    alias = cargar_alias()

    extractos_por_fuente: dict[str, set[str]] = {
        fuente["id"]: {extracto["id"] for extracto in fuente["extractos"]}
        for fuente in fuentes
    }
    for entrada in NODOS_BASE:
        if not entrada.get("plantilla"):
            continue
        evidencia = entrada.get("evidencia") or {}
        if not evidencia or not any(evidencia.values()):
            raise ValueError(f"Nodo sin evidencia verificable: {entrada['id']}")
        for fuente_id, ids in evidencia.items():
            if fuente_id not in extractos_por_fuente:
                raise ValueError(f"Fuente de evidencia inexistente: {fuente_id}")
            for extracto_id in ids:
                if extracto_id not in extractos_por_fuente[fuente_id]:
                    raise ValueError(
                        f"Extracto inexistente: {fuente_id}:{extracto_id} ({entrada['id']})"
                    )

    nodos: list[dict[str, Any]] = []
    for fuente in fuentes:
        nodos.append(
            {
                "id": f"fuente:{fuente['id']}",
                "tipo": "fuente",
                "titulo": fuente["titulo"],
                "cita": fuente["cita"],
                "sha256": fuente["sha256"],
                "disponible": fuente["disponible"],
                "extractos": fuente["extractos"],
            }
        )

    ids_conocidos: set[str] = {nodo["id"] for nodo in nodos}
    for entrada in (*NODOS_BASE, *NODOS_AUXILIARES):
        if entrada["id"] in ids_conocidos:
            raise ValueError(f"Nodo duplicado: {entrada['id']}")
        ids_conocidos.add(entrada["id"])
        nodos.append(_nodo_base(entrada))

    aristas: list[dict[str, Any]] = [
        dict(arista) for arista in ARISTAS_BASE
    ]
    for entrada in NODOS_BASE:
        identidad = entrada["id"]
        for relacionado in entrada.get("relacionados") or ():
            aristas.append(
                {
                    "desde": identidad,
                    "tipo": "RELACIONADO_CON",
                    "hasta": relacionado,
                }
            )
        for fuente_id, extractos in (entrada.get("evidencia") or {}).items():
            aristas.append(
                {
                    "desde": identidad,
                    "tipo": "DERIVA_DE",
                    "hasta": f"fuente:{fuente_id}",
                    "evidencia": list(extractos),
                }
            )

    for indice, item in enumerate(alias):
        alias_id = f"alias:{indice:03d}:{slug(item['texto'])}"
        if alias_id in ids_conocidos:
            raise ValueError(f"Nodo de alias duplicado: {alias_id}")
        ids_conocidos.add(alias_id)
        if item["nodo"] not in ids_conocidos:
            raise ValueError(f"Alias apunta a nodo inexistente: {item['nodo']}")
        nodos.append(
            {
                "id": alias_id,
                "tipo": "alias",
                "titulo": item["texto"],
                "texto": item["texto"],
                "prioridad": item["prioridad"],
                "motivo": item["motivo"],
            }
        )
        aristas.append(
            {"desde": alias_id, "tipo": "ALIAS_DE", "hasta": item["nodo"]}
        )

    for arista in aristas:
        if arista["desde"] not in ids_conocidos or arista["hasta"] not in ids_conocidos:
            raise ValueError(f"Arista con extremo inexistente: {arista}")

    nodos.sort(key=lambda nodo: nodo["id"])
    aristas.sort(
        key=lambda arista: (
            arista["desde"],
            arista["tipo"],
            arista["hasta"],
            tuple(arista.get("evidencia") or ()),
        )
    )
    return {"version": 1, "nodos": nodos, "aristas": aristas}
