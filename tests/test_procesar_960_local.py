from __future__ import annotations

import json
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.corpus_expansion import procesar_960_local as pipeline


def test_versiones_certificadas() -> None:
    assert pipeline.VERSION_EXTRACTOR == "pdf_nativo_pagina_v1"
    assert pipeline.VERSION_NORMALIZACION == "normalizacion_paginada_v2_1_guiones_lexico_20260811"
    assert pipeline.VERSION_FRAGMENTADOR == "fragmentacion_paginada_250_40_v1"
    assert pipeline.REVISION == "142964af7e05de16511657561de8e8750fc153a0"
    assert pipeline.DIMENSION == 1024
    assert pipeline.DTYPE == "float32"


def test_fragmentador_reutilizado_conserva_paginas_y_solapamiento() -> None:
    page_1 = " ".join(f"uno{i}" for i in range(180))
    page_2 = " ".join(f"dos{i}" for i in range(180))
    paged = (
        "===== [PAGINA 1 de 2] =====\n" + page_1 + "\n"
        "===== [PAGINA 2 de 2] =====\n" + page_2 + "\n"
    )
    continuous, page_map = pipeline.separar_paginas(paged)
    passages = pipeline.trocear(continuous, page_map)
    assert len(passages) == 2
    assert passages[0]["palabras"] == 250
    assert passages[1]["palabras"] == 250
    assert passages[0]["pagina_inicio"] == 1
    assert passages[0]["pagina_fin"] == 2
    assert passages[1]["pagina_inicio"] == 1
    assert passages[1]["pagina_fin"] == 2


def test_ids_de_pasaje_deterministas() -> None:
    row = {"conferencia_id": "c", "documento_id": "d"}
    assert pipeline._id_pasaje(row, 1) == pipeline._id_pasaje(row, 1)
    assert pipeline._id_pasaje(row, 1) != pipeline._id_pasaje(row, 2)


def test_identidad_checkpoint_bge_completa() -> None:
    identity = pipeline._identidad_bge(123, "ABC")
    assert identity["revision"] == pipeline.REVISION
    assert identity["dimension"] == 1024
    assert identity["dtype"] == "float32"
    assert identity["total_pasajes"] == 123
    assert identity["sha256_fuente_pasajes"] == "ABC"
    json.dumps(identity)
