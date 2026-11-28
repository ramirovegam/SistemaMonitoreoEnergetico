"""Índice en memoria del artefacto derivado.

La búsqueda es determinista: enlace exacto de alias, expansión acotada por
aristas de trazabilidad y fallo cerrado cuando no hay respuesta verificada.
"""

from __future__ import annotations

import hashlib
import json
import re
from collections import deque
from pathlib import Path
from typing import Any

from .esquema import RELACIONES_TRAZABLES, Evidencia, RespuestaGrafo
from .normalizacion import normalizar

RUTA_ARTEFACTOS = Path(__file__).resolve().parent / "artifacts"
NOMBRE_GRAFO = "grafo_derivado.json"
NOMBRE_MANIFIESTO = "manifiesto.json"


def _json_canonico(datos: Any) -> str:
    return json.dumps(
        datos,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )


class IndiceGrafo:
    """Grafo cargado una vez, con índices planos para resolución local."""

    def __init__(self, datos: dict[str, Any]) -> None:
        nodos = datos.get("nodos")
        aristas = datos.get("aristas")
        if datos.get("version") != 1 or not isinstance(nodos, list) or not isinstance(aristas, list):
            raise ValueError("Artefacto GraphRAG inválido.")

        self.datos = datos
        self.nodos: dict[str, dict[str, Any]] = {
            nodo["id"]: nodo for nodo in nodos if isinstance(nodo, dict) and nodo.get("id")
        }
        self.fuentes: dict[str, dict[str, Any]] = {}
        self.alias: dict[str, list[tuple[str, int]]] = {}
        self.salientes: dict[str, list[dict[str, Any]]] = {}

        for nodo in nodos:
            if not isinstance(nodo, dict):
                continue
            if nodo.get("tipo") == "fuente":
                self.fuentes[str(nodo["id"]).removeprefix("fuente:")] = nodo
            if nodo.get("tipo") == "alias":
                texto = normalizar(nodo.get("texto") or "")
                if texto:
                    self.alias.setdefault(texto, []).append(
                        (str(nodo.get("id")), int(nodo.get("prioridad") or 0))
                    )

        for arista in aristas:
            if not isinstance(arista, dict):
                continue
            self.salientes.setdefault(str(arista.get("desde")), []).append(arista)

    @classmethod
    def cargar(cls, ruta: Path | None = None, verificar_manifiesto: bool = True) -> "IndiceGrafo":
        ruta_grafo = Path(ruta) if ruta else RUTA_ARTEFACTOS / NOMBRE_GRAFO
        if not ruta_grafo.is_file():
            raise FileNotFoundError(f"No existe el artefacto GraphRAG: {ruta_grafo}")
        datos = json.loads(ruta_grafo.read_text(encoding="utf-8"))
        if not isinstance(datos, dict):
            raise ValueError("El artefacto GraphRAG debe ser un objeto JSON.")

        if verificar_manifiesto:
            ruta_manifiesto = ruta_grafo.with_name(NOMBRE_MANIFIESTO)
            if not ruta_manifiesto.is_file():
                raise FileNotFoundError(f"No existe el manifiesto GraphRAG: {ruta_manifiesto}")
            manifiesto = json.loads(ruta_manifiesto.read_text(encoding="utf-8"))
            if not isinstance(manifiesto, dict):
                raise ValueError("El manifiesto GraphRAG debe ser un objeto JSON.")
            esperado = str(manifiesto.get("hash_grafo") or "")
            if not esperado:
                raise ValueError("El manifiesto GraphRAG no declara hash_grafo.")
            calculado = hashlib.sha256(_json_canonico(datos).encode("utf-8")).hexdigest()
            if esperado != calculado:
                raise ValueError("El manifiesto no coincide con el grafo derivado.")
        return cls(datos)

    def _mejor_alias(self, texto: str) -> tuple[str, str] | None:
        candidatos: list[tuple[int, int, str, str]] = []
        for alias_texto, destinos in self.alias.items():
            if not re.search(rf"(?<!\w){re.escape(alias_texto)}(?!\w)", texto):
                continue
            for nodo_id, prioridad in destinos:
                enlaces = self.salientes.get(nodo_id) or []
                objetivos = [
                    str(arista.get("hasta"))
                    for arista in enlaces
                    if arista.get("tipo") == "ALIAS_DE"
                ]
                for objetivo in objetivos:
                    candidatos.append((len(alias_texto), prioridad, objetivo, nodo_id))
        if not candidatos:
            return None
        mejor = max(candidatos, key=lambda item: (item[0], item[1], item[2], item[3]))
        return mejor[2], mejor[3]

    def resolver(self, texto: str) -> RespuestaGrafo | None:
        texto_normalizado = normalizar(texto)
        if not texto_normalizado:
            return None

        mejor = self._mejor_alias(texto_normalizado)
        if mejor is None:
            return None
        objetivo, alias_id = mejor
        nodo = self.nodos.get(objetivo)
        if not nodo or not nodo.get("respuesta"):
            return None

        modo = nodo.get("modo")
        if modo not in {"conversacional", "conceptual"}:
            return None

        evidencias: list[Evidencia] = []
        vistos: set[str] = {objetivo, alias_id}
        cola: deque[tuple[str, int]] = deque([(objetivo, 0)])

        while cola:
            actual, profundidad = cola.popleft()
            if profundidad >= 2:
                continue
            for arista in self.salientes.get(actual, []):
                tipo = str(arista.get("tipo") or "")
                if tipo not in RELACIONES_TRAZABLES:
                    continue
                destino = str(arista.get("hasta") or "")
                if destino in vistos:
                    continue
                vistos.add(destino)
                if tipo in {"DERIVA_DE", "CITADO_EN"} and destino.startswith("fuente:"):
                    fuente_id = destino.removeprefix("fuente:")
                    fuente = self.fuentes.get(fuente_id)
                    if not fuente or fuente.get("disponible") is not True:
                        return None
                    extractos = {
                        str(item.get("id")): item
                        for item in fuente.get("extractos") or []
                        if isinstance(item, dict)
                    }
                    for extracto_id in arista.get("evidencia") or ():
                        extracto = extractos.get(str(extracto_id))
                        if not extracto:
                            continue
                        evidencias.append(
                            Evidencia(
                                fuente=fuente_id,
                                cita=str(fuente.get("cita") or fuente_id),
                                localizador=str(extracto.get("localizador") or ""),
                                texto=str(extracto.get("texto") or ""),
                            )
                        )
                elif tipo in {"RELACIONADO_CON", "RESUELVE_CON"}:
                    cola.append((destino, profundidad + 1))

        unicas: dict[tuple[str, str], Evidencia] = {}
        for evidencia in evidencias:
            unicas.setdefault((evidencia.fuente, evidencia.localizador), evidencia)
        if not unicas:
            return None

        citas = tuple(
            str(self.fuentes[fuente_id]["cita"])
            for fuente_id in dict.fromkeys(item.fuente for item in unicas.values())
            if fuente_id in self.fuentes
        )
        if not citas:
            return None
        return RespuestaGrafo(
            modo=modo,
            respuesta=str(nodo["respuesta"]),
            fuentes=citas,
            nodo=str(nodo["id"]),
            evidencia=tuple(unicas.values()),
        )
