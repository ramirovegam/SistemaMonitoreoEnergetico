"""Pruebas de perfeccionamiento: enrutamiento, render, citas y preferencias."""

from __future__ import annotations

import hashlib
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from backend.app.routers import asistente
from backend.app.schemas.asistente import ConsultaRequest
from backend.app.services import conocimiento_simet, estadisticas, formulas, llm, memoria, render

CORPUS = Path(__file__).resolve().parents[2] / "docs" / "base_conocimiento" / "CORPUS_OPERATIVO_SIMET.md"
SHA_CANONICO = "944c4c4133dc63c001624f0ea81afdfb4a6745fbbc9ca70bb2351fa855f08599"
AVISO_ESTIMACION = "Estimación derivada; SIMET no almacena pronósticos oficiales."
FRECUENCIA = "No tengo una definición de 'frecuencia' en las fuentes verificadas de SIMET, así que no la improviso."


def plan(pregunta: str, historial: list[dict] | None = None) -> dict:
    resultado, _ = llm.planificar(pregunta, historial or [])
    return resultado


def responder(pregunta: str, sesion: str = "prueba", historial: list[dict] | None = None):
    body = ConsultaRequest(
        pregunta=pregunta,
        historial=[{"rol": str(h.get("rol", "usuario")), "contenido": str(h.get("contenido", ""))} for h in (historial or [])],
    )
    try:
        return asistente._responder(body, sesion)
    except TypeError as error:
        if "sesion" not in str(error):
            raise
        return asistente._responder(body)


class PerfeccionamientoLocalTest(unittest.TestCase):
    def setUp(self) -> None:
        temporal = tempfile.TemporaryDirectory()
        self.addCleanup(temporal.cleanup)
        self._ruta_original = memoria._RUTA
        memoria._RUTA = Path(temporal.name) / "preferencias.sqlite3"
        self.addCleanup(setattr, memoria, "_RUTA", self._ruta_original)

    def lint(self, texto: str) -> None:
        for prohibido in (
            "{",
            "}",
            "True",
            "False",
            "None",
            "ejecutar_sql_lectura",
            "Filas:",
            "Límite:",
            "Método:",
            "pendiente_kwh_dia",
            "r2",
        ):
            self.assertNotIn(prohibido, texto, f"Token interno filtrado: {prohibido}")
        self.assertFalse(texto.rstrip().endswith("…"), "Respuesta truncada con elipsis")

    def test_anaphora_tras_capacidades(self) -> None:
        responder("que haces", sesion="ana-capacidades")
        esperado = responder("enlista lo que puedes hacer", sesion="ana-referencia")
        resultado = responder("enlistalo", sesion="ana-capacidades")
        self.assertEqual(resultado.respuesta, esperado.respuesta)
        self.assertEqual(resultado.modo, "conversacional")
        self.lint(resultado.respuesta)

    def test_anaphora_sin_contexto(self) -> None:
        resultado = responder("enlistalo", sesion="ana-sin-contexto")
        self.assertEqual(resultado.modo, "conversacional")
        self.assertIn("¿Qué quieres que enliste?", resultado.respuesta)
        self.lint(resultado.respuesta)

    def test_sugerencias_seis_bloques_y_dos_limites(self) -> None:
        resultado = plan("dame sugerencias")
        self.assertEqual(resultado["modo"], "conversacional")
        self.assertEqual(resultado["respuesta"].count("\n") >= 6, True)
        for bloc in ("Resumen", "Zonas", "Tarifas", "Alertas", "Tendencia", "Concepto"):
            self.assertIn(f"**{bloc}**", resultado["respuesta"])
        self.assertNotIn("intervalo de confianza", resultado["respuesta"])
        self.assertNotIn("250", resultado["respuesta"])
        self.assertNotIn("850", resultado["respuesta"])
        self.assertEqual(len(estadisticas.SUGERENCIAS), 6)
        self.lint(resultado["respuesta"])

    def test_sugerencias_con_typos_iguales(self) -> None:
        esperado = plan("dame sugerencias")["respuesta"]
        for texto in ("dame sugerensias", "proegutarle sugerencias", "DAME SUGERENCIAS!"):
            with self.subTest(texto=texto):
                self.assertEqual(plan(texto)["respuesta"], esperado)

    def test_sugerencias_diccionario_cerrado(self) -> None:
        self.assertFalse(llm._sugerencias_solicitadas("dame cosmogonias"))
        self.assertFalse(llm._sugerencias_solicitadas("sugerenciazo"))
        self.assertIsNone(llm._unico_candidato("abc", {"a": "abd", "b": "abe"}))
        self.assertEqual(llm._unico_candidato("abd", {"a": "abd"}), "a")

    def test_total_medidores_con_fuente(self) -> None:
        ejecucion = {
            "herramientas": [
                {
                    "herramienta": "ejecutar_sql_lectura",
                    "fuentes": ["energia.medidor"],
                    "datos": {"filas": [{"total_medidores": 5260}], "total_filas": 1, "limite": 200},
                }
            ],
            "fuentes": ["energia.medidor"],
            "formulas_aplicadas": [],
        }
        texto = render.render_datos(ejecucion, "Cuántos medidores hay")
        self.assertIn("**Total de medidores**: 5,260.", texto)
        self.assertIn("*Fuentes: energia.medidor.*", texto)
        self.lint(texto)

    def test_resumen_zonas_servicios_y_cifras(self) -> None:
        ejecucion = {
            "herramientas": [
                {
                    "herramienta": "obtener_resumen_sistema",
                    "fuentes": ["datamart.dm_resumen_general", "energia.corrida_generacion"],
                    "datos": {
                        "total_lecturas": 10_800_000,
                        "total_servicios": 5_000,
                        "total_medidores": 5_260,
                        "total_zonas": 46,
                        "consumo_total_acumulado": 39_987_301.57,
                        "semilla": 20260103,
                        "fecha_desde": "2026-01-01",
                        "fecha_hasta": "2026-03-31",
                    },
                }
            ],
            "fuentes": ["datamart.dm_resumen_general", "energia.corrida_generacion"],
            "formulas_aplicadas": [],
        }
        texto = render.render_datos(ejecucion, "Dame un resumen general del sistema")
        for esperado in (
            "**Zonas**: 46.",
            "**Servicios**: 5,000.",
            "**Total de medidores**: 5,260.",
            "10,800,000",
            "39,987,301.57 kWh",
            "20260103",
            "*Fuentes:",
        ):
            self.assertIn(esperado, texto)
        self.lint(texto)

    def test_alertas_abiertas_usan_ts_cierre(self) -> None:
        for pregunta in ("alertas abiertas", "alertas activas", "alertas pendientes", "alertas sin cerrar"):
            with self.subTest(pregunta=pregunta):
                resultado = plan(pregunta)
                self.assertEqual(resultado["modo"], "datos")
                self.assertEqual(resultado["pasos"][0]["herramienta"], "consultar_alertas_y_medidores")
                self.assertIs(resultado["pasos"][0]["parametros"].get("solo_abiertas"), True)
        ejecucion = {
            "herramientas": [
                {
                    "herramienta": "consultar_alertas_y_medidores",
                    "fuentes": ["energia.alerta"],
                    "datos": {
                        "resumen_alertas": {"total": 15682, "abiertas": 0, "tasa_falsos_positivos_pct": 0.0},
                        "medidores": [],
                    },
                }
            ],
            "fuentes": ["energia.alerta"],
            "formulas_aplicadas": [],
        }
        texto = render.render_datos(ejecucion, "alertas abiertas")
        self.assertIn("No hay alertas abiertas con ts_cierre IS NULL en el periodo verificado.", texto)
        self.assertIn("*Fuentes: energia.alerta.*", texto)
        self.lint(texto)

    def test_prioridad_alerta_es_conceptual(self) -> None:
        resultado = plan("Qué es la prioridad de alerta")
        self.assertEqual(resultado["modo"], "conceptual")
        self.assertIn("prioridad", resultado["respuesta"])
        self.assertIn("ts_cierre IS NULL", resultado["respuesta"])
        self.lint(resultado["respuesta"])

    def test_factor_de_carga_conceptual_no_ejecuta(self) -> None:
        with patch.object(asistente, "_ejecutar_plan") as ejecutar:
            resultado = responder("Qué es factor de carga", sesion="concepto-fc")
        self.assertEqual(resultado.modo, "conceptual")
        self.assertIn("demanda media / demanda máxima", resultado.respuesta)
        ejecutar.assert_not_called()
        self.lint(resultado.respuesta)

    def test_factor_de_carga_calculado_si_se_pide(self) -> None:
        resultado = plan("Calcula el factor de carga", [])
        self.assertEqual(resultado["modo"], "datos")
        self.assertIn("calcular_formula", [paso["herramienta"] for paso in resultado["pasos"]])

    def test_riesgo_dac_conceptual_sin_umbrales(self) -> None:
        resultado = plan("Explica el riesgo DAC")
        self.assertEqual(resultado["modo"], "conceptual")
        self.assertIn("tipo de servicio", resultado["respuesta"])
        self.assertNotIn("250", resultado["respuesta"])
        self.assertNotIn("850", resultado["respuesta"])
        self.lint(resultado["respuesta"])

    def test_riesgo_dac_sin_servicios_no_improvisa(self) -> None:
        ejecucion = {
            "herramientas": [
                {
                    "herramienta": "consultar_servicios_y_tarifas",
                    "fuentes": [],
                    "datos": {"motivo": "sin servicios"},
                }
            ],
            "fuentes": [],
            "formulas_aplicadas": [
                {"nombre": "riesgo_dac", "resultado": {"disponible": False}, "fuentes": []}
            ],
        }
        texto = render.render_datos(ejecucion, "Calcula el riesgo DAC")
        self.assertEqual(texto, conocimiento_simet.SIN_EVIDENCIA)
        self.lint(texto)

    def test_aclaracion_lista_cinco_formulas_y_pregunta(self) -> None:
        resultado = plan("dame la formula de algo")
        self.assertEqual(resultado["modo"], "conversacional")
        self.assertIn("¿De cuál fórmula?", resultado["respuesta"])
        self.assertEqual(len(formulas.FORMULAS), 5)
        for nombre in formulas.FORMULAS:
            self.assertIn(f"`{nombre}`", resultado["respuesta"])
        self.lint(resultado["respuesta"])

    def test_respuestas_locales_sin_elipsis(self) -> None:
        for texto in (
            responder("que haces", sesion="sin-elipsis-1").respuesta,
            plan("dame sugerencias")["respuesta"],
        ):
            self.assertNotIn("…", texto)
            self.lint(texto)

    def test_preferencia_breve_registrada(self) -> None:
        resultado = responder("Prefiero respuestas breves", sesion="pref-breve")
        self.assertIn("breve", resultado.preferencias_aplicadas)
        self.assertEqual(resultado.modo, "conversacional")

    def test_preferencia_tabla_registrada(self) -> None:
        resultado = responder("Prefiero respuestas en tabla", sesion="pref-tabla")
        self.assertIn("tabla", resultado.preferencias_aplicadas)

    def test_olvido_limpia_preferencias(self) -> None:
        responder("Prefiero respuestas breves", sesion="pref-olvido")
        resultado = responder("Olvídame las preferencias", sesion="pref-olvido")
        self.assertEqual(resultado.preferencias_aplicadas, [])

    def test_frecuencia_frase_exacta(self) -> None:
        resultado = plan("QUE ES UNA FRECUENCIA")
        self.assertEqual(resultado["modo"], "conversacional")
        self.assertEqual(resultado["respuesta"].strip(), FRECUENCIA)
        for texto in ("que es simon", "que es sin", "que es sime"):
            with self.subTest(texto=texto):
                self.assertIn(conocimiento_simet.FUERA_DE_ALCANCE, plan(texto)["respuesta"])

    def test_consumos_por_mes_usan_periodo_explicito(self) -> None:
        for mes, desde, hasta in (
            ("febrero", "2026-02-01", "2026-03-01"),
            ("marzo", "2026-03-01", "2026-04-01"),
        ):
            with self.subTest(mes=mes):
                resultado = plan(f"consumos de {mes} de Toluca")
                self.assertEqual(resultado["modo"], "datos")
                self.assertEqual(resultado["pasos"][0]["herramienta"], "consultar_zonas")
                parametros = resultado["pasos"][0]["parametros"]
                self.assertEqual(parametros.get("desde"), desde)
                self.assertEqual(parametros.get("hasta"), hasta)

    def test_prediccion_sigue_siendo_datos(self) -> None:
        resultado = plan("Dame una predicción de consumo")
        self.assertEqual(resultado["modo"], "datos")
        herramientas = [paso["herramienta"] for paso in resultado["pasos"]]
        self.assertIn("calcular_formula", herramientas)
        nombres = [
            paso.get("parametros", {}).get("nombre") for paso in resultado["pasos"]
        ]
        self.assertIn("proyeccion_tendencia", nombres)

    def test_sql_libre_no_expone_metadatos_internos(self) -> None:
        ejecucion = {
            "herramientas": [
                {
                    "herramienta": "ejecutar_sql_lectura",
                    "fuentes": ["energia.medidor"],
                    "datos": {
                        "filas": [
                            {"id_medidor": 204, "ts": "2026-03-31", "lecturas": 12.5}
                        ],
                        "total_filas": 200,
                        "limite": 200,
                    },
                }
            ],
            "fuentes": ["energia.medidor"],
            "formulas_aplicadas": [],
        }
        texto = render.render_datos(
            ejecucion, "dame un SELECT * FROM energia.medidor", None
        )
        self.lint(texto)
        self.assertIn("Consulta de solo lectura", texto)
        self.assertIn("204", texto)
        self.assertIn("energia.medidor", texto)

    def test_sql_de_escritura_se_rechaza_en_local(self) -> None:
        resultado = plan("DROP TABLE energia.alerta")
        self.assertEqual(resultado["modo"], "conversacional")
        self.assertIn("No ejecuto DROP", resultado["respuesta"])
        self.assertNotIn("kWh", resultado["respuesta"])
        self.lint(resultado["respuesta"])

    def test_alertas_cerradas_muestra_el_conteo(self) -> None:
        ejecucion = {
            "herramientas": [
                {
                    "herramienta": "consultar_alertas_y_medidores",
                    "fuentes": ["energia.alerta", "energia.medidor"],
                    "datos": {
                        "resumen_alertas": {
                            "total": 15682,
                            "abiertas": 692,
                            "cerradas": 14990,
                            "tasa_falsos_positivos_pct": 2.76,
                        },
                        "medidores": [],
                    },
                }
            ],
            "fuentes": ["energia.alerta"],
            "formulas_aplicadas": [],
        }
        texto = render.render_datos(ejecucion, "cuántas alertas cerradas hay", None)
        self.assertIn("14,990 cerradas", texto)
        self.assertIn("15,682 totales", texto)
        self.lint(texto)

    def test_alertas_abiertas_por_zona_respeta_el_slot(self) -> None:
        resultado = plan("cuántas alertas abiertas hay en Toluca")
        self.assertEqual(resultado["modo"], "datos")
        self.assertEqual(
            resultado["pasos"][0]["herramienta"], "consultar_alertas_y_medidores"
        )
        self.assertEqual(
            resultado["pasos"][0]["parametros"].get("zona_nombre"), "Toluca"
        )

    def test_formula_con_mes_usa_la_serie_de_ese_mes(self) -> None:
        resultado = plan("calcula factor de carga para febrero")
        serie = next(
            paso for paso in resultado["pasos"]
            if paso["herramienta"] == "obtener_serie_diaria_y_horaria"
        )
        self.assertEqual(serie["parametros"].get("desde"), "2026-02-01")
        self.assertEqual(serie["parametros"].get("hasta"), "2026-03-01")

    def test_hostilidad_inutil_redirige(self) -> None:
        resultado = plan("eres un inútil")
        self.assertEqual(resultado["modo"], "conversacional")
        self.assertIn("Entiendo la frustración", resultado["respuesta"])

    def test_regresiones_enrutamiento_y_citas(self) -> None:
        con_comillas = plan('que es "medidor')
        self.assertEqual(con_comillas["modo"], "conceptual")
        self.assertNotIn('"', con_comillas["respuesta"])
        reloj = plan("Dime la hora")["respuesta"]
        self.assertTrue("Hoy es" in reloj or "Son las" in reloj)
        simey = plan("QUE ES SIMEY")["respuesta"]
        self.assertIn("Interpreté 'SIMEY' como 'SIMET'", simey)
        self.assertIn("Base de Conocimiento SIMET", simey)
        hostil = plan("maldita sea dame las metricas")
        self.assertEqual(hostil["modo"], "conversacional")
        self.assertIn("¿De qué zona y periodo", hostil["respuesta"])
        self.assertNotIn("Entiendo la frustración", hostil["respuesta"])
        ejecucion = {
            "herramientas": [],
            "fuentes": ["datamart.dm_kpi_diarios"],
            "formulas_aplicadas": [
                {
                    "nombre": "proyeccion_tendencia",
                    "resultado": {
                        "disponible": True,
                        "dias_observados": 7,
                        "pendiente_kwh_dia": 631.93,
                        "r2": 0.05,
                        "desviacion_residual_kwh": 5970.54,
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
            ],
        }
        texto = render.render_datos(ejecucion, "dame una prediccion", AVISO_ESTIMACION)
        self.assertIn(AVISO_ESTIMACION, texto)
        self.assertIn("banda de predicción", texto)
        self.assertNotIn("intervalo de confianza", texto)
        self.lint(texto)
        digest = hashlib.sha256(CORPUS.read_bytes()).hexdigest()
        self.assertEqual(digest, SHA_CANONICO)


if __name__ == "__main__":
    unittest.main()
