"""El asistente falla cerrado cuando la base verificada no responde."""

from __future__ import annotations

import os
import sys
import unittest
from unittest.mock import patch

RAIZ = __import__("pathlib").Path(__file__).resolve().parents[2]
if str(RAIZ) not in sys.path:
    sys.path.insert(0, str(RAIZ))

os.environ.setdefault(
    "ASISTENTE_DATABASE_URL",
    "postgresql://readonly:readonly@127.0.0.1:5544/simet",
)

from backend.app.routers import asistente  # noqa: E402
from backend.app.schemas.asistente import ConsultaRequest  # noqa: E402
from backend.app.services import conocimiento_simet  # noqa: E402


class AsistenteSinEvidenciaTest(unittest.TestCase):
    def test_fallo_de_base_no_redacta_ni_devuelve_vacio(self) -> None:
        plan = {
            "modo": "datos",
            "pasos": [
                {
                    "id": "paso_1",
                    "herramienta": "consultar_zonas",
                    "parametros": {},
                }
            ],
        }
        consulta = ConsultaRequest(
            pregunta="Dame las metricas de Toluca", historial=[]
        )
        with (
            patch.object(asistente.llm, "planificar", return_value=(plan, None)),
            patch.object(
                asistente.estadisticas,
                "ejecutar_herramienta",
                side_effect=RuntimeError("base no disponible"),
            ),
            patch.object(
                asistente.llm, "redactar", return_value=("", None)
            ) as redactar,
        ):
            respuesta = asistente._responder(consulta)

        redactar.assert_not_called()
        self.assertEqual(respuesta.modo, "datos")
        self.assertEqual(respuesta.origen, "local")
        self.assertEqual(respuesta.respuesta, conocimiento_simet.SIN_EVIDENCIA)
        self.assertEqual(respuesta.fuentes, [])

    def test_formula_sin_datos_tampoco_redacta(self) -> None:
        plan = {
            "modo": "datos",
            "pasos": [
                {
                    "id": "paso_1",
                    "herramienta": "obtener_serie_diaria_y_horaria",
                    "parametros": {},
                },
                {
                    "id": "paso_2",
                    "herramienta": "calcular_formula",
                    "parametros": {
                        "nombre": "proyeccion_tendencia",
                        "datos_desde": "paso_1",
                    },
                },
            ],
        }
        consulta = ConsultaRequest(
            pregunta="Dime que predicciones puedes hacer", historial=[]
        )
        with (
            patch.object(asistente.llm, "planificar", return_value=(plan, None)),
            patch.object(
                asistente.estadisticas,
                "ejecutar_herramienta",
                side_effect=RuntimeError("base no disponible"),
            ),
            patch.object(
                asistente.llm, "redactar", return_value=("", None)
            ) as redactar,
        ):
            respuesta = asistente._responder(consulta)

        redactar.assert_not_called()
        self.assertEqual(respuesta.respuesta, conocimiento_simet.SIN_EVIDENCIA)
        self.assertEqual(respuesta.origen, "local")


if __name__ == "__main__":
    unittest.main()
