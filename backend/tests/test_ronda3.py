"""Pruebas de la ronda 3: periodos, zonas, fórmulas combinadas y SQL local."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from backend.app.services import estadisticas, formulas, llm, memoria, render


def plan(pregunta: str, historial: list[dict] | None = None) -> dict:
    resultado, _ = llm.planificar(pregunta, historial or [])
    return resultado


class Ronda3Test(unittest.TestCase):
    def setUp(self) -> None:
        temporal = tempfile.TemporaryDirectory()
        self.addCleanup(temporal.cleanup)
        self._ruta_original = memoria._RUTA
        memoria._RUTA = Path(temporal.name) / "preferencias.sqlite3"
        self.addCleanup(setattr, memoria, "_RUTA", self._ruta_original)

    def test_meses_en_conflicto_piden_aclaracion(self) -> None:
        resultado = plan("Dame las métricas de Toluca de enero y marzo")
        self.assertEqual(resultado["modo"], "conversacional")
        self.assertIn("por separado", resultado["respuesta"])

    def test_rango_de_meses_usa_extremo_abierto_correcto(self) -> None:
        parametros = plan("Dame las métricas de Toluca de enero a marzo")["pasos"][0]["parametros"]
        self.assertEqual(parametros.get("desde"), "2026-01-01")
        self.assertEqual(parametros.get("hasta"), "2026-04-01")

    def test_anio_sin_mes_no_se_sirve_como_2026(self) -> None:
        parametros = plan("Dame las métricas de Toluca de 2025")["pasos"][0]["parametros"]
        self.assertEqual(parametros.get("desde"), "2025-01-01")
        self.assertEqual(parametros.get("hasta"), "2026-01-01")

    def test_ultimos_quince_dias_usan_ventana_observada(self) -> None:
        parametros = plan("Dame las métricas de Toluca de los últimos 15 días")["pasos"][0]["parametros"]
        self.assertEqual(parametros.get("desde"), "2026-03-17")
        self.assertEqual(parametros.get("hasta"), "2026-04-01")

    def test_agregado_de_quince_dias_no_incluye_dia_extra(self) -> None:
        captura: dict = {}
        fila = {
            "valor": 1.0,
            "registros": 15,
            "fecha_desde": "2026-03-17",
            "fecha_hasta": "2026-03-31",
        }

        def falso(sql: str, parametros=None):
            captura["sql"] = sql
            captura["parametros"] = parametros or {}
            return fila

        with patch.object(estadisticas, "_primero", side_effect=falso):
            estadisticas.consultar_agregados(dias=15)
        self.assertIn("CAST(:dias AS integer) - 1", captura["sql"])
        self.assertEqual(captura["parametros"].get("dias"), 15)

    def test_zona_en_minusculas_resuelve_la_misma_zona(self) -> None:
        parametros = plan("Dame las métricas de marzo de toluca")["pasos"][0]["parametros"]
        self.assertIsNotNone(parametros.get("zona_nombre"))
        self.assertEqual(str(parametros["zona_nombre"]).lower(), "toluca")

    def test_zona_numerica_pide_el_nombre(self) -> None:
        resultado = plan("Dame las métricas de marzo de la zona 5")
        self.assertEqual(resultado["modo"], "conversacional")
        self.assertIn("nombre de la zona", resultado["respuesta"])

    def test_anaphora_de_zona_sin_contexto_no_consulta_todo(self) -> None:
        resultado = plan("esa zona")
        self.assertEqual(resultado["modo"], "conversacional")
        self.assertIn("Dime el nombre de la zona", resultado["respuesta"])

    def test_formulas_combinadas_se_ejecutan_todas(self) -> None:
        casos = (
            ("Calcula riesgo DAC y proyección", {"riesgo_dac", "proyeccion_tendencia"}),
            ("Factor de carga y pérdidas", {"factor_carga", "indice_perdidas_y_anomalias"}),
        )
        for pregunta, esperados in casos:
            with self.subTest(pregunta=pregunta):
                nombres = {
                    paso.get("parametros", {}).get("nombre")
                    for paso in plan(pregunta)["pasos"]
                    if paso["herramienta"] == "calcular_formula"
                }
                self.assertEqual(nombres, esperados)

    def test_indice_perdidas_sin_periodo_usa_vista_datamart(self) -> None:
        pasos = plan("Factor de carga y pérdidas")["pasos"]
        self.assertNotIn("consultar_zonas", [paso["herramienta"] for paso in pasos])
        paso = next(
            paso for paso in pasos if paso["herramienta"] == "consultar_desviacion_zonal"
        )
        self.assertEqual(paso["parametros"].get("desde"), "2026-01-01")
        self.assertEqual(paso["parametros"].get("hasta"), "2026-04-01")

    def test_desviacion_zonal_usa_vistas_datamart(self) -> None:
        captura: dict = {}
        filas = [
            {
                "zona": "Toluca de Lerdo",
                "consumo_total_kwh": 1000.0,
                "kwh_desviados": 10.0,
                "num_eventos": 3,
            }
        ]

        def falso(sql: str, parametros=None):
            captura["sql"] = sql
            captura["parametros"] = parametros or {}
            return filas

        with patch.object(estadisticas, "_consultar", side_effect=falso):
            paquete = estadisticas.consultar_desviacion_zonal(
                desde="2026-01-01", hasta="2026-04-01"
            )
        self.assertIn("datamart.dm_consumo_zona_mensual", captura["sql"])
        self.assertIn("datamart.dm_anomalias_zona", captura["sql"])
        self.assertNotIn("energia.lectura", captura["sql"])
        self.assertIn("datamart.dm_consumo_zona_mensual", paquete["fuentes"])
        self.assertIn("datamart.dm_anomalias_zona", paquete["fuentes"])
        self.assertEqual(paquete["datos"]["zonas"], filas)

    def test_riesgo_dac_lee_el_payload_de_servicios(self) -> None:
        resultado = formulas.riesgo_dac(
            {
                "servicios": [
                    {
                        "tipo_servicio": "DOMESTICO",
                        "consumo_mensual_promedio_kwh": 100.0,
                        "tarifas": [
                            {
                                "codigo_tarifa": "1",
                                "categoria": "DOMESTICA",
                                "limite_dac_kwh_mes": 250,
                            }
                        ],
                    }
                ]
            }
        )
        self.assertTrue(resultado["resultado"]["disponible"])
        self.assertEqual(resultado["resultado"]["evaluados"][0]["razon_limite"], 0.4)

    def test_render_riesgo_dac_muestra_los_evaluados(self) -> None:
        lineas = render._lineas_formula(
            {
                "nombre": "riesgo_dac",
                "resultado": {
                    "disponible": True,
                    "evaluados": [
                        {
                            "tipo_servicio": "DOMESTICO",
                            "razon_limite": 1.12,
                            "estatus": "supera",
                        }
                    ],
                    "umbrales_declarados_kwh_mes": [250, 850],
                },
                "interpretacion": "Compara el promedio del tipo de servicio.",
                "fuentes": ["energia.tarifa"],
            }
        )
        texto = "\n".join(lineas)
        self.assertIn("DOMESTICO", texto)
        self.assertIn("1.12", texto)
        self.assertNotIn("**: .", texto)

    def test_render_dos_formulas_conserva_ambas(self) -> None:
        ejecucion = {
            "herramientas": [
                {
                    "herramienta": "consultar_servicios_y_tarifas",
                    "fuentes": ["energia.tarifa"],
                    "datos": {},
                }
            ],
            "formulas_aplicadas": [
                {
                    "nombre": "riesgo_dac",
                    "resultado": {
                        "disponible": True,
                        "evaluados": [
                            {
                                "tipo_servicio": "DOMESTICO",
                                "razon_limite": 1.12,
                                "estatus": "supera",
                            }
                        ],
                    },
                    "interpretacion": "Compara el promedio del tipo de servicio.",
                    "fuentes": ["energia.tarifa"],
                },
                {
                    "nombre": "proyeccion_tendencia",
                    "resultado": {
                        "disponible": True,
                        "pendiente_kwh_dia": 631.93,
                        "r2": 0.05,
                        "dias_observados": 7,
                        "proyeccion": [
                            {
                                "fecha": "2026-04-01",
                                "dia_proyectado": 1,
                                "consumo_proyectado_kwh": 407103.37,
                                "limite_inferior_kwh": 389973.01,
                                "limite_superior_kwh": 424233.72,
                            }
                        ],
                    },
                    "interpretacion": "Banda de predicción, no intervalo de confianza.",
                    "fuentes": ["datamart.dm_kpi_diarios"],
                },
            ],
        }
        texto = render.render_datos(
            ejecucion,
            aviso_estimacion="Estimación derivada; SIMET no almacena pronósticos oficiales.",
        )
        self.assertIn("riesgo_dac", texto)
        self.assertIn("proyeccion_tendencia", texto)
        self.assertNotIn("sin evidencia suficiente", texto)
        self.assertNotIn("**: .", texto)

    def test_sql_no_ejecutable_se_rechaza_en_local(self) -> None:
        for pregunta in (
            "SELECT 1 -- comentario",
            "SELECT 1; SELECT 2",
            "SELECT pg_sleep(30)",
            "SELECT * FROM pg_shadow",
        ):
            with self.subTest(pregunta=pregunta):
                resultado = plan(pregunta)
                self.assertEqual(resultado["modo"], "conversacional")
                self.assertIn("No ejecuto", resultado["respuesta"])

    def test_ranking_de_alertas_por_zona_no_se_improvisa(self) -> None:
        resultado = plan("Qué zonas tienen más alertas abiertas")
        self.assertEqual(resultado["modo"], "conversacional")
        self.assertIn("ranking verificado por zona", resultado["respuesta"])


if __name__ == "__main__":
    unittest.main()
