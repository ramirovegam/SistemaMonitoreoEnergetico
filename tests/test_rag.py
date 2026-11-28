"""Pruebas del RAG. SIMET_RAG_EVAL=1 habilita la evaluación con el índice y la API."""

import json
import os
import unittest
from io import BytesIO
from time import perf_counter
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from uuid import uuid4

import numpy as np

from backend.app.services import rag, rag_cerebras, rag_embeddings
from backend.app.services.rag_corpus import SECCION_GUIAS, cargar_corpus


CASOS_DOCUMENTALES = (
    ("¿Dónde puedo descargar a CSV las mediciones de un medidor?", "Historial de lecturas"),
    ("¿Dónde reviso los huecos?", "Historial de lecturas"),
    ("¿Dónde encuentro los intervalos sin lectura?", "Historial de lecturas"),
    ("¿Cómo busco un medidor por RPU?", "Medidores"),
    ("¿En qué pantalla aparecen días festivos y factor estacional?", "Calendario"),
    ("¿Cómo cambio a modo oscuro?", "Selector de tema"),
    ("¿Cómo activo el tema claro de SIMET?", "Selector de tema"),
    ("¿Cómo uso la paleta de comandos?", "Paleta de comandos"),
    ("¿Dónde está el atajo Ctrl + K?", "Paleta de comandos"),
    ("¿En qué pantalla veo los avisos con mayor prioridad?", "Alertas"),
    ("¿Qué muestra el Resumen del sistema?", "Resumen"),
    ("¿Dónde encuentro el límite DAC?", "Tarifas"),
    ("¿Cómo filtro las zonas por mes?", "Zonas"),
    ("¿Cómo cambio entre vista de lista y cuadrícula?", "Medidores"),
    ("¿Cómo busco la carga contratada?", "Servicios"),
    ("¿Dónde consulto curvas horarias y perfiles?", "Análisis energético"),
    ("¿Qué significa el estado Sin datos?", "Sin datos"),
    ("¿Qué hago si el Historial de lecturas aparece sin datos después de filtrar?", "Historial de lecturas · Sin datos"),
    ("¿Cómo veo las lecturas de un medidor entre dos fechas?", "Historial de lecturas · Consultar por fechas"),
    ("¿Cuál es la diferencia entre Exportar CSV y Exportar filtradas?", "Historial de lecturas · Exportar CSV"),
)
CONSULTA_RPU_Y_FECHAS = "¿Cómo busco un medidor por RPU y consulto sus lecturas en un rango de fechas?"
CONSULTA_HUECOS_Y_CSV = "¿Cómo detecto huecos y exporto las lecturas a CSV?"
CONSULTA_LECTURAS_Y_SEMILLA = "¿Cuántas lecturas hay y con qué semilla se generó?"
CASOS_SIN_EVIDENCIA = (
    "¿Cómo cambio mi contraseña en SIMET?",
    "¿Dónde activo la autenticación con huella digital?",
    "¿Dónde conecto una impresora Bluetooth?",
)


class TestRagLocal(unittest.TestCase):
    def test_fragmentos_identificables(self):
        pasajes, huella = cargar_corpus()
        self.assertTrue(huella)
        self.assertEqual(len({p.id for p in pasajes}), len(pasajes))
        exportacion = next(p for p in pasajes if "Exportar CSV" in p.texto)
        self.assertEqual(exportacion.ruta, "#/lecturas")
        self.assertIn("Detectar huecos", exportacion.texto)

    def test_guia_tiene_su_ruta_y_cita(self):
        pasajes, _ = cargar_corpus()
        guias = {p.tema: p for p in pasajes if p.seccion == SECCION_GUIAS}
        self.assertEqual(guias["Medidores · Buscar por RPU"].ruta, "#/medidores")
        sin_datos = guias["Historial de lecturas · Sin datos"]
        self.assertEqual(sin_datos.ruta, "#/lecturas")
        self.assertIn("Guías de consulta", sin_datos.fuente)

    def test_respuesta_combinada_conserva_las_rutas_de_las_citas(self):
        pasajes, _ = cargar_corpus()
        guias = {p.tema: p for p in pasajes if p.seccion == SECCION_GUIAS}
        rpu = guias["Medidores · Buscar por RPU"]
        fechas = guias["Historial de lecturas · Consultar por fechas"]
        indice = rag.Indice((rpu, fechas), np.zeros((2, rag_embeddings.DIMENSIONES)))
        texto = "- Busque por RPU.\n- Seleccione el número de serie y las fechas."
        with (
            patch.object(rag, "_indice", return_value=indice),
            patch.object(rag, "vector_consulta", return_value=indice.vectores[0]),
            patch.object(rag, "recuperar", return_value=[rpu, fechas]),
            patch.object(rag, "_redactar", return_value=(texto, [rpu, fechas])),
        ):
            respuesta = rag.responder(CONSULTA_RPU_Y_FECHAS)
        self.assertIn("Rutas en SIMET: `#/medidores`, `#/lecturas`.", respuesta.texto)
        self.assertEqual(respuesta.fuentes, (rpu.fuente, fechas.fuente))

    def test_respaldo_textual_sin_embeddings(self):
        pasajes, _ = cargar_corpus()
        indice = rag.Indice(tuple(pasajes), np.zeros((len(pasajes), rag_embeddings.DIMENSIONES)))
        with patch.object(rag, "_indice", return_value=indice), patch.object(
            rag, "vector_consulta", side_effect=OSError
        ):
            respuesta = rag.responder(CASOS_DOCUMENTALES[0][0])
            self.assertIn("#/lecturas", respuesta.texto)
            self.assertIn("Manual de usuario", respuesta.fuentes[0])
            self.assertEqual(respuesta.origen, "local")
            sin_evidencia = rag.responder(CASOS_SIN_EVIDENCIA[0])
            self.assertEqual(sin_evidencia.texto, rag.SIN_EVIDENCIA)
            self.assertFalse(sin_evidencia.fuentes)

    def test_rechaza_un_control_inventado_aunque_la_cita_exista(self):
        pasajes, _ = cargar_corpus()
        servicios = next(p for p in pasajes if p.tema == "Servicios")
        salida = {"respuesta": "Selecciona la opción Carga contratada.", "citas": [1]}
        with patch.object(
            rag_cerebras, "redactar", return_value=json.dumps(salida)
        ):
            with self.assertRaisesRegex(ValueError, "controles sin fuente"):
                rag._redactar("¿Dónde está la carga contratada?", [servicios])

    def test_numeros_de_lista_no_son_cifras_operativas(self):
        pasajes, _ = cargar_corpus()
        fechas = next(p for p in pasajes if p.tema == "Historial de lecturas · Consultar por fechas")
        texto = "1. Seleccione el número de serie en **Medidor**.\n2. Active **Rango personalizado**."
        salida = {"respuesta": texto, "citas": [1]}
        with patch.object(rag_cerebras, "redactar", return_value=json.dumps(salida)):
            self.assertEqual(rag._redactar(CONSULTA_RPU_Y_FECHAS, [fechas]), (texto, [fechas]))
        salida["respuesta"] = f"{texto}\n3. Seleccione los últimos 15 días."
        with patch.object(rag_cerebras, "redactar", return_value=json.dumps(salida)):
            with self.assertRaisesRegex(ValueError, "cifras sin fuente"):
                rag._redactar(CONSULTA_RPU_Y_FECHAS, [fechas])

    def test_cerebras_redacta_con_citas_que_verifica_simet(self):
        pasajes, _ = cargar_corpus()
        pasaje = next(p for p in pasajes if "pulse **Exportar CSV**" in p.texto)
        salida = {"respuesta": "Filtra por medidor y rango de fechas y usa **Exportar CSV**.", "citas": [1]}
        cuerpo = {"choices": [{"finish_reason": "stop", "message": {"content": json.dumps(salida)}}]}
        variables = {"CEREBRAS_API_KEY": "solo-prueba", "CEREBRAS_MODEL": "qwen-3.8-27b"}
        with patch.dict(os.environ, variables), patch.object(
            rag_cerebras, "urlopen", return_value=BytesIO(json.dumps(cuerpo).encode())
        ) as enviar:
            texto, citados = rag._redactar(CASOS_DOCUMENTALES[0][0], [pasaje])
        self.assertEqual(texto, salida["respuesta"])
        self.assertEqual(citados, [pasaje])
        peticion = enviar.call_args.args[0]
        self.assertEqual(peticion.full_url, "https://api.cerebras.ai/v1/chat/completions")
        self.assertEqual(peticion.get_header("Authorization"), "Bearer solo-prueba")
        datos = json.loads(peticion.data)
        self.assertEqual(datos["reasoning_effort"], "none")
        esquema = datos["response_format"]["json_schema"]
        self.assertTrue(esquema["strict"])
        self.assertFalse(esquema["schema"]["additionalProperties"])
        self.assertNotIn("solo-prueba", peticion.data.decode())

    def test_sin_creditos_se_muestra_el_pasaje_con_su_fuente(self):
        pasajes, _ = cargar_corpus()
        pasaje = next(p for p in pasajes if "pulse **Exportar CSV**" in p.texto)
        vector = np.full(rag_embeddings.DIMENSIONES, 1 / np.sqrt(rag_embeddings.DIMENSIONES))
        indice = rag.Indice((pasaje,), vector.reshape(1, -1))
        error = HTTPError("https://api.cerebras.ai/v1/chat/completions", 402, "", {}, BytesIO())
        with (
            patch.dict(os.environ, {"CEREBRAS_API_KEY": "solo-prueba"}),
            patch.object(rag, "_indice", return_value=indice),
            patch.object(rag, "vector_consulta", return_value=vector),
            patch.object(rag_cerebras, "urlopen", side_effect=error),
        ):
            respuesta = rag.responder(CASOS_DOCUMENTALES[0][0])
        self.assertEqual(respuesta.origen, "local")
        self.assertIn("requiere créditos", respuesta.aviso)
        self.assertIn("#/lecturas", respuesta.texto)
        self.assertEqual(respuesta.fuentes, (pasaje.fuente,))


@unittest.skipUnless(os.getenv("SIMET_RAG_EVAL") == "1", "requiere el índice y SIMET activo")
class TestRagEnVivo(unittest.TestCase):
    def test_recuperacion(self):
        indice = rag._indice()
        for pregunta, tema in CASOS_DOCUMENTALES:
            with self.subTest(pregunta=pregunta):
                pasajes = rag.recuperar(indice, pregunta, rag.vector_consulta(pregunta))
                temas = {pasaje.tema for pasaje in pasajes}
                self.assertIn(tema, temas | {nombre.partition(" · ")[0] for nombre in temas})
        combinadas = (
            (CONSULTA_RPU_Y_FECHAS, {"Medidores · Buscar por RPU", "Historial de lecturas · Consultar por fechas"}),
            (CONSULTA_HUECOS_Y_CSV, {"Historial de lecturas · Detectar huecos", "Historial de lecturas · Exportar CSV"}),
        )
        for pregunta, esperados in combinadas:
            with self.subTest(pregunta=pregunta):
                pasajes = rag.recuperar(indice, pregunta, rag.vector_consulta(pregunta))
                self.assertTrue(esperados <= {pasaje.tema for pasaje in pasajes})
        for pregunta in CASOS_SIN_EVIDENCIA:
            with self.subTest(pregunta=pregunta):
                self.assertFalse(rag.recuperar(indice, pregunta, rag.vector_consulta(pregunta)))

    def test_rutas_del_chat(self):
        sesion = uuid4().hex

        def consultar(pregunta):
            peticion = Request(
                "http://127.0.0.1:8000/api/asistente/consultar",
                data=json.dumps({"pregunta": pregunta}).encode(),
                headers={"Content-Type": "application/json", "X-Simet-Session": sesion},
            )
            inicio = perf_counter()
            with urlopen(peticion, timeout=45) as respuesta:
                datos = json.load(respuesta)
            print(f"{perf_counter() - inicio:.2f} s · {pregunta}")
            return datos

        exportacion = consultar(CASOS_DOCUMENTALES[0][0])
        self.assertEqual(exportacion["metodo"], rag.METODO)
        self.assertIn("#/lecturas", exportacion["respuesta"])
        self.assertIn("CSV", exportacion["respuesta"])
        self.assertIn("rango", exportacion["respuesta"].lower())
        self.assertTrue(any("Manual de usuario" in fuente for fuente in exportacion["fuentes"]))
        if os.getenv("SIMET_RAG_EXIGIR_CEREBRAS") == "1":
            self.assertEqual(exportacion["origen"], "llm", exportacion["aviso"])

        huecos = consultar(CASOS_DOCUMENTALES[1][0])
        self.assertIn("Detectar huecos", huecos["respuesta"])
        self.assertIn("#/lecturas", huecos["respuesta"])

        desconocida = consultar(CASOS_SIN_EVIDENCIA[0])
        self.assertEqual(desconocida["respuesta"], rag.SIN_EVIDENCIA)
        self.assertFalse(desconocida["fuentes"])

        glosario = consultar("¿Qué es una tarifa DAC?")
        self.assertEqual(glosario["origen"], "local")
        self.assertIn("Base de Conocimiento SIMET", glosario["respuesta"])

        capacidades = consultar("¿Cómo funcionas?")
        self.assertEqual(capacidades["modo"], "conversacional")
        self.assertEqual(capacidades["origen"], "local")

        datos = consultar(CONSULTA_LECTURAS_Y_SEMILLA)
        self.assertEqual(datos["modo"], "datos")
        self.assertEqual(datos["origen"], "local")
        self.assertIn("datamart.dm_resumen_general", datos["fuentes"])
        self.assertEqual(datos["datos"]["total_lecturas"], 10_800_000)
        self.assertIn("10,800,000.", datos["respuesta"])
        self.assertIn("`20260103`", datos["respuesta"])
        self.assertNotIn("20,260,103", datos["respuesta"])
        self.assertNotIn("Medidores registrados", datos["respuesta"])

        sin_datos = consultar(CASOS_DOCUMENTALES[-3][0])
        self.assertEqual(sin_datos["metodo"], rag.METODO)
        self.assertIn("Estado de lectura", sin_datos["respuesta"])
        self.assertTrue(any(fuente.endswith("Historial de lecturas · Sin datos") for fuente in sin_datos["fuentes"]))

        exportaciones = consultar(CASOS_DOCUMENTALES[-1][0])
        self.assertEqual(exportaciones["metodo"], rag.METODO)
        self.assertIn("Exportar filtradas", exportaciones["respuesta"])

        if os.getenv("SIMET_RAG_EXIGIR_CEREBRAS") == "1":
            recorrido = consultar(CONSULTA_RPU_Y_FECHAS)
            self.assertEqual(recorrido["origen"], "llm", recorrido["aviso"])
            self.assertIn("Rango personalizado", recorrido["respuesta"])
            self.assertIn("#/medidores", recorrido["respuesta"])
            self.assertIn("#/lecturas", recorrido["respuesta"])

        oficial = consultar("¿Tienes un pronóstico oficial de consumo?")
        self.assertIn("SIMET no almacena pronósticos oficiales", oficial["respuesta"])
        self.assertEqual(oficial["origen"], "local")
