import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


class RescateFinal2Tests(unittest.TestCase):
    def test_asistente_no_muestra_fuente_local_para_busqueda_documental(self):
        texto = (ROOT / "src/components/Asistente.tsx").read_text(encoding="utf-8")
        self.assertIn(
            'const usaFuenteLocal = respuesta?.modo !== "datos" && respuesta?.metodo !== "búsqueda documental";',
            texto,
        )
        self.assertNotIn("Sin fuentes de datos en esta respuesta", texto)
        self.assertIn("Sin fuentes verificadas en esta respuesta", texto)

    def test_manual_incluye_guias_de_consulta(self):
        texto = (ROOT / "MANUAL_USUARIO.md").read_text(encoding="utf-8")
        self.assertIn("## 9. Guías de consulta", texto)
        for frase in (
            "Buscar por RPU",
            "Consultar por fechas",
            "Exportar CSV",
            "Detectar huecos",
            "Sin datos",
        ):
            self.assertIn(frase, texto)

    def test_controles_tactiles_de_cabecera_son_40px(self):
        app = (ROOT / "src/App.tsx").read_text(encoding="utf-8")
        tema = (ROOT / "src/components/ui/ThemeMenu.tsx").read_text(encoding="utf-8")
        asistente = (ROOT / "src/components/Asistente.tsx").read_text(encoding="utf-8")
        self.assertIn('className="h-10 w-10 lg:hidden"', app)
        self.assertIn('className="ml-auto flex h-10 min-w-10', app)
        self.assertIn('className="relative gap-1.5 min-h-10 min-w-10"', app)
        self.assertIn('compact ? "h-10 w-10" : "gap-2"', tema)
        self.assertIn(
            'disabled={mensajes.length === 0}\n              className="min-h-10"',
            asistente,
        )
        self.assertIn(
            'disabled={mensajes.length === 0 && !entrada}\n              className="min-h-10"',
            asistente,
        )
        self.assertIn('inline-flex min-h-10 items-center rounded-full', asistente)
        self.assertIn('className="mt-2 min-h-10"', asistente)
        self.assertIn(
            'size="xs"\n              className="min-h-10 min-w-10"\n              onClick={onRegenerar}',
            asistente,
        )
        self.assertIn(
            'size="xs"\n            className="min-h-10 min-w-10"\n            onClick={onCopiar}',
            asistente,
        )


if __name__ == "__main__":
    unittest.main()
