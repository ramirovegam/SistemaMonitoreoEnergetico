"""Pruebas de aceptación para enrutamiento, periodo y renderizado."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from backend.app.services import estadisticas, llm, memoria, render


class PruebasAceptacionAsistente(unittest.TestCase):
    def test_medidor_se_clasifica_como_definicion(self) -> None:
        plan = llm._plan_determinista("Que es un medidor", [])
        self.assertEqual(plan["modo"], "conceptual")
        self.assertIn("Un medidor es el equipo", plan["respuesta"])

    def test_cuantos_medidores_sigue_siendo_datos(self) -> None:
        plan = llm._plan_determinista("Cuantos medidores hay", [])
        self.assertEqual(plan["modo"], "datos")

    def test_marzo_no_contamina_la_zona(self) -> None:
        plan = llm._plan_determinista("Dame las metricas de Marzo de Toluca", [])
        self.assertEqual(plan["modo"], "datos")
        paso = plan["pasos"][0]
        self.assertEqual(paso["herramienta"], "consultar_zonas")
        self.assertEqual(paso["parametros"].get("zona_nombre"), "Toluca")
        self.assertEqual(paso["parametros"].get("desde"), "2026-03-01")
        self.assertEqual(paso["parametros"].get("hasta"), "2026-04-01")

    def test_consultar_zonas_acepta_rango_fechas(self) -> None:
        with patch.object(estadisticas, "_consultar", return_value=[]) as consultar:
            estadisticas.consultar_zonas(
                "Toluca", desde="2026-03-01", hasta="2026-04-01"
            )
        sql, parametros = consultar.call_args.args
        self.assertIn("CAST(:desde AS DATE)", sql)
        self.assertIn("CAST(:hasta AS DATE)", sql)
        self.assertEqual(parametros["desde"], "2026-03-01")
        self.assertEqual(parametros["hasta"], "2026-04-01")

    def test_formula_se_renderiza_en_prosa_sin_claves_internas(self) -> None:
        formula = {
            "nombre": "proyeccion_tendencia",
            "expresion": "ŷ = a + b·t; banda = ŷ ± 1.96·σ_residual",
            "resultado": {
                "disponible": True,
                "pendiente_kwh_dia": 631.93,
                "r2": 0.05,
                "media_movil_7_dias_kwh": 404575.66,
                "desviacion_residual_kwh": 5970.54,
                "dias_observados": 7,
                "proyeccion": [
                    {
                        "fecha": "2026-04-01",
                        "consumo_proyectado_kwh": 410000.0,
                        "limite_inferior_kwh": 398000.0,
                        "limite_superior_kwh": 422000.0,
                    }
                ],
            },
            "interpretacion": "Estimación, no dato observado.",
            "metodo": "estimación estadística sobre datamart.dm_kpi_diarios",
            "fuentes": ["datamart.dm_kpi_diarios"],
        }
        texto = "\n".join(llm._lineas_formula(formula))
        for prohibido in ("disponible", "pendiente_kwh_dia", "r2", "{", "True"):
            self.assertNotIn(prohibido, texto)
        self.assertIn("banda de predicción", texto)
        self.assertIn("410,000", texto)
        self.assertLessEqual(len(texto), 800)

    def test_resumen_general_es_datos(self) -> None:
        plan = llm._plan_determinista("Dame un resumen general del sistema", [])
        self.assertEqual(plan["modo"], "datos")
        self.assertEqual(
            plan["pasos"][0]["herramienta"], "obtener_resumen_sistema"
        )

    def test_integridad_tiene_herramienta_separada(self) -> None:
        plan = llm._plan_determinista("Dame la integridad del datamart", [])
        self.assertEqual(
            plan["pasos"][0]["herramienta"], "validar_integridad_datamart"
        )

    def test_render_datos_no_expone_diccionarios_y_cita(self) -> None:
        ejecucion = {
            "herramientas": [
                {
                    "herramienta": "ejecutar_sql_lectura",
                    "fuentes": ["energia.medidor"],
                    "metodo": "observación directa",
                    "datos": {
                        "filas": [{"total_medidores": 5260}],
                        "total_filas": 1,
                        "limite": 200,
                    },
                }
            ],
            "fuentes": ["energia.medidor"],
            "formulas_aplicadas": [],
        }
        texto = render.render_datos(ejecucion, "Cuantos medidores hay")
        self.assertIn("5,260", texto)
        self.assertIn("*Fuentes: energia.medidor.*", texto)
        self.assertNotIn("{", texto)
        self.assertNotIn("total_medidores", texto)

    def test_calculo_no_se_duplica_como_herramienta(self) -> None:
        formula = {
            "nombre": "proyeccion_tendencia",
            "resultado": {
                "disponible": True,
                "dias_observados": 7,
                "pendiente_kwh_dia": 631.93,
                "proyeccion": [
                    {
                        "fecha": "2026-04-01",
                        "consumo_proyectado_kwh": 410000.0,
                        "limite_inferior_kwh": 398000.0,
                        "limite_superior_kwh": 422000.0,
                    }
                ],
            },
            "fuentes": ["datamart.dm_kpi_diarios"],
        }
        ejecucion = {
            "herramientas": [
                {
                    "herramienta": "calcular_formula",
                    "fuentes": ["datamart.dm_kpi_diarios"],
                    "datos": formula["resultado"],
                }
            ],
            "fuentes": ["datamart.dm_kpi_diarios"],
            "formulas_aplicadas": [formula],
        }
        texto = render.render_datos(ejecucion, "dame alguna prediccion")
        self.assertEqual(texto.count("Proyección de consumo"), 1)
        self.assertNotIn("disponible", texto)
        self.assertNotIn("pendiente_kwh_dia", texto)

    def test_citas_conceptuales_se_extraen(self) -> None:
        texto = (
            "Definición.\n\n"
            "*Fuentes: RAE_Definiciones.pdf (DLE, consulta 26-nov-2026); "
            "Base de Conocimiento SIMET.*"
        )
        fuentes = render.fuentes_de_texto(texto)
        self.assertIn("Base de Conocimiento SIMET", fuentes)
        self.assertIn("RAE_Definiciones.pdf (DLE, consulta 26-nov-2026)", fuentes)

    def test_memoria_solo_acepta_preferencias_declaradas(self) -> None:
        self.assertIsNone(memoria.detectar_declaracion("Dame métricas de marzo"))
        self.assertEqual(
            memoria.detectar_declaracion("Prefiero respuestas breves"),
            {"accion": "registrar", "clave": "detalle", "valor": "breve"},
        )
        self.assertEqual(
            memoria.detectar_declaracion("Olvídame la preferencia de formato"),
            {"accion": "olvidar", "clave": "formato"},
        )

    def test_memoria_registra_olvidar_y_no_toca_cifras(self) -> None:
        ruta_original = memoria._RUTA
        with tempfile.TemporaryDirectory() as temporal:
            memoria._RUTA = Path(temporal) / "memoria.sqlite3"
            try:
                memoria.registrar("detalle", "breve", "Prefiero respuestas breves")
                self.assertEqual(memoria.leer(), {"detalle": "breve"})
                texto = "5,260 medidores\n\n*Fuentes: energia.medidor.*"
                self.assertEqual(
                    memoria.aplicar(texto, {"detalle": "breve"}), texto
                )
                memoria.olvidar("detalle")
                self.assertEqual(memoria.leer(), {})
            finally:
                memoria._RUTA = ruta_original


if __name__ == "__main__":
    unittest.main()
