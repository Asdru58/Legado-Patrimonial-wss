from __future__ import annotations

import csv
from pathlib import Path
import sys
import unittest


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scripts.corpus_expansion.normalizacion_paginada_v2 import (  # noqa: E402
    SEPARADOR_PAGINA_RE,
    construir_evidencia_lexica,
    normalizar_guiones_v1_documentada,
    normalizar_paginado_v2,
)


MANIFIESTO = ROOT / "PILOTO_CORPUS_BUSCADOR_40" / "MANIFIESTO_CORPUS_40.csv"


class NormalizacionPaginadaV2Test(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        with MANIFIESTO.open("r", encoding="utf-8-sig", newline="") as stream:
            cls.filas = list(csv.DictReader(stream))
        cls.brutos = {
            Path(fila["ruta_texto_bruto"]).name: Path(
                fila["ruta_texto_bruto"]
            ).read_text(encoding="utf-8")
            for fila in cls.filas
        }
        cls.evidencia = construir_evidencia_lexica(cls.brutos.values())

    def test_v1_reproduce_los_cinco_errores_historicos(self) -> None:
        todo = "\n".join(self.brutos.values())
        v1 = normalizar_guiones_v1_documentada(todo)
        for alterada in (
            "dede",
            "Notacorte",
            "setentasemanas",
            "decristo",
            "medopersa",
        ):
            self.assertIn(alterada.casefold(), v1.casefold())

    def test_v2_conserva_los_cinco_guiones_historicos(self) -> None:
        todo = "\n".join(self.brutos.values())
        v2, _ = normalizar_paginado_v2(todo, self.evidencia)
        for conservada in (
            "de-de",
            "Nota-corte",
            "setenta-semanas",
            "de-cristo",
            "medo-persa",
        ):
            self.assertIn(conservada.casefold(), v2.casefold())

    def test_v2_conserva_las_cinco_uniones_legitimas(self) -> None:
        nombre = next(
            nombre
            for nombre in self.brutos
            if "los-hechos-del-espiritu-santo" in nombre
        )
        v2, decisiones = normalizar_paginado_v2(
            self.brutos[nombre],
            self.evidencia,
        )
        for unida in (
            "derramó",
            "escogidos",
            "bendición",
            "Dispensación",
            "condenación",
        ):
            self.assertIn(unida, v2)
        self.assertEqual(5, sum(d.accion == "unir" for d in decisiones))

    def test_uniones_certificadas_prevalecen_sobre_forma_con_guion(self) -> None:
        evidencia_amplia = construir_evidencia_lexica(
            [*self.brutos.values(), "Dispen-sación Dispen-sación"]
        )
        nombre = next(
            nombre
            for nombre in self.brutos
            if "los-hechos-del-espiritu-santo" in nombre
        )
        _, decisiones = normalizar_paginado_v2(
            self.brutos[nombre],
            evidencia_amplia,
        )
        decision = next(
            item
            for item in decisiones
            if item.izquierda.casefold() == "dispen"
            and item.derecha.casefold() == "sación"
        )
        self.assertEqual("unir", decision.accion)
        self.assertEqual("union_legitima_certificada_piloto", decision.motivo)

    def test_separadores_permanecen_identicos_en_los_40(self) -> None:
        for texto in self.brutos.values():
            antes = SEPARADOR_PAGINA_RE.findall(texto)
            despues, _ = normalizar_paginado_v2(texto, self.evidencia)
            self.assertEqual(antes, SEPARADOR_PAGINA_RE.findall(despues))


if __name__ == "__main__":
    unittest.main()
