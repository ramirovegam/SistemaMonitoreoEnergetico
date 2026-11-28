"""Pruebas de intenciones locales: saludos, capacidades, aclaración y typos."""

from __future__ import annotations

import hashlib
import unittest
from pathlib import Path

from backend.app.services import conocimiento_simet, llm

CORPUS = Path(__file__).resolve().parents[2] / "docs" / "base_conocimiento" / "CORPUS_OPERATIVO_SIMET.md"
SHA_CANONICO = "944c4c4133dc63c001624f0ea81afdfb4a6745fbbc9ca70bb2351fa855f08599"


def plan(pregunta: str) -> dict:
    resultado, _ = llm.planificar(pregunta, [])
    return resultado


class IntencionesLocalesTest(unittest.TestCase):
    def test_normalizacion_compartida(self) -> None:
        self.assertIs(llm._normalizar, conocimiento_simet.normalizar)

    def test_buenos_dias_es_saludo_con_texto_propio(self) -> None:
        resultado = plan("Buenos días")
        self.assertEqual(resultado["modo"], "conversacional")
        self.assertIn("Buenos días", resultado["respuesta"])
        self.assertNotIn("no forma parte", resultado["respuesta"])

    def test_buenos_dias_ignora_tilde_y_campana(self) -> None:
        for texto in ("BUENOS DIAS", "buenos dias!", "Buenos días"):
            with self.subTest(texto=texto):
                resultado = plan(texto)
                self.assertEqual(resultado["modo"], "conversacional")
                self.assertIn("Buenos días", resultado["respuesta"])

    def test_capacidades_incluyen_que_haces_y_que_mas_sabes(self) -> None:
        for texto in ("QUE HACES", "que mas sabes", "para que sirves"):
            with self.subTest(texto=texto):
                resultado = plan(texto)
                self.assertEqual(resultado["modo"], "conversacional")
                self.assertIn("Qué puedo hacer", resultado["respuesta"])
                self.assertNotIn("no forma parte", resultado["respuesta"])

    def test_identidad_es_estable_en_mayusculas_y_tilde(self) -> None:
        respuestas = {
            plan(texto)["respuesta"]
            for texto in ("QUIEN ERES", "quien eres", "Quién eres")
        }
        self.assertEqual(len(respuestas), 1)

    def test_tipo_simet_se_interpreta_y_cita(self) -> None:
        resultado = plan("QUE ES SIMEY")
        self.assertEqual(resultado["modo"], "conceptual")
        self.assertIn("Interpreté 'SIMEY' como 'SIMET'", resultado["respuesta"])
        self.assertIn("Base de Conocimiento SIMET", resultado["respuesta"])

    def test_tipos_ambiguos_no_se_adivinan(self) -> None:
        for texto in ("que es simon", "que es sin", "que es sime"):
            with self.subTest(texto=texto):
                resultado = plan(texto)
                self.assertNotEqual(resultado["modo"], "conceptual")
                self.assertIn(conocimiento_simet.FUERA_DE_ALCANCE, resultado["respuesta"])

    def test_frecuencia_usa_frase_acordada(self) -> None:
        resultado = plan("QUE ES UNA FRECUENCIA")
        self.assertEqual(resultado["modo"], "conversacional")
        self.assertEqual(
            resultado["respuesta"].strip(),
            "No tengo una definición de 'frecuencia' en las fuentes verificadas de SIMET, así que no la improviso.",
        )

    def test_formula_sin_objetivo_pide_aclaracion(self) -> None:
        resultado = plan("dame la formula de algo")
        self.assertEqual(resultado["modo"], "conversacional")
        self.assertIn("¿De cuál fórmula?", resultado["respuesta"])
        self.assertIn("factor_carga", resultado["respuesta"])
        self.assertNotIn("no forma parte", resultado["respuesta"])

    def test_metricas_sin_slots_pide_zona_y_periodo(self) -> None:
        resultado = plan("DAME LAS METRICAS")
        self.assertEqual(resultado["modo"], "conversacional")
        self.assertIn("¿De qué zona y periodo", resultado["respuesta"])
        self.assertNotIn("no forma parte", resultado["respuesta"])

    def test_hostil_redirige_con_tono_sobrio(self) -> None:
        resultado = plan("MALDITA SEA")
        self.assertEqual(resultado["modo"], "conversacional")
        self.assertIn("Entiendo la frustración", resultado["respuesta"])
        self.assertNotIn("no forma parte", resultado["respuesta"])

    def test_hostil_con_slots_no_borra_la_aclaracion(self) -> None:
        resultado = plan("maldita sea dame las metricas")
        self.assertEqual(resultado["modo"], "conversacional")
        self.assertIn("¿De qué zona y periodo", resultado["respuesta"])
        self.assertNotIn("Entiendo la frustración", resultado["respuesta"])

    def test_corpus_no_se_modifica(self) -> None:
        digest = hashlib.sha256(CORPUS.read_bytes()).hexdigest()
        self.assertEqual(digest, SHA_CANONICO)


if __name__ == "__main__":
    unittest.main()
