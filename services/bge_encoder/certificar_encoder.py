"""Certificacion reproducible del encoder autonomo BGE-M3.

Debe ejecutarse con el Python del entorno virtual BGE-M3 del piloto. Todas las
fuentes historicas se abren en modo de solo lectura y no se escribe ningun
artefacto de certificacion.
"""

from __future__ import annotations

import json
import os
import platform
import re
import sqlite3
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any


os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"
os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"

import numpy as np
import sentence_transformers
import torch
import transformers

from encoder import (
    BGEQueryEncoder,
    DIMENSION,
    EmptyQueryError,
    QueryLengthError,
    QueryTokenLimitError,
    REVISION,
    canonicalize_query,
    sha256_file,
)


PROJECT_ROOT = Path(__file__).resolve().parents[2]
BGE_ROOT = PROJECT_ROOT / "PILOTO_BGE_M3_LOCAL"
BANK_FILE = (
    PROJECT_ROOT
    / "PILOTO_SEMANTICO_E5_LOCAL"
    / "BANCO_SEMANTICO_12_CONGELADO.json"
)
HISTORICAL_QUERY_EMBEDDINGS = (
    BGE_ROOT / "salida" / "embeddings_consultas_bge_m3.npy"
)
PASSAGE_EMBEDDINGS = BGE_ROOT / "salida" / "embeddings_pasajes_bge_m3.npy"
SQLITE_FILE = (
    PROJECT_ROOT
    / "PILOTO_BUSCADOR_HIBRIDO_LOCAL"
    / "indice"
    / "pasajes.sqlite"
)
HF_CACHE = BGE_ROOT / "cache_huggingface"

EXPECTED_VERSIONS = {
    "python": "3.12.13",
    "torch": "2.8.0+cpu",
    "sentence_transformers": "5.1.0",
    "transformers": "4.55.0",
    "numpy": "2.2.6",
}
EXPECTED_HASHES = {
    BANK_FILE: "6bbeca0e3855d081602ed00aac53033fff5288755a2da941eecfffcc69ebad79",
    HISTORICAL_QUERY_EMBEDDINGS: (
        "274e45cee26b05526bfc926f057d76b8181186bac41f905b13d85732457a7f24"
    ),
    PASSAGE_EMBEDDINGS: (
        "031fc8a8cf39865a8366213cf33989fd144a346dc9aeed37e1175e1f9281cf4b"
    ),
    SQLITE_FILE: "aad81814221c5b5d34d90f1be3b8086b1869d462f94a49f55ce1b616aef7e769",
}
VECTOR_TOLERANCE = 1e-6
SIMILARITY_TOLERANCE = 1e-6
REFERENCE_QUERY_COUNT = 12
TOP_K = 10


class CertificationError(RuntimeError):
    """Incumplimiento de una condicion obligatoria del pliego."""


@dataclass(frozen=True)
class Passage:
    passage_id: int
    document_id: str
    conference_id: str
    order: int
    page_start: int
    page_end: int
    text: str


class EncodeGuard:
    """Reutiliza el tokenizador real y demuestra que encode no fue invocado."""

    def __init__(self, model: Any) -> None:
        self.tokenizer = model.tokenizer
        self.encode_calls = 0

    def encode(self, *_args: Any, **_kwargs: Any) -> np.ndarray:
        self.encode_calls += 1
        raise AssertionError("encode() no debia ejecutarse para esta entrada.")


def effective_versions() -> dict[str, str]:
    return {
        "python": platform.python_version(),
        "torch": torch.__version__,
        "sentence_transformers": sentence_transformers.__version__,
        "transformers": transformers.__version__,
        "numpy": np.__version__,
    }


def verify_versions() -> dict[str, str]:
    versions = effective_versions()
    if versions != EXPECTED_VERSIONS:
        raise CertificationError(
            "El entorno efectivo difiere del entorno certificado; se detiene "
            f"antes de cargar el modelo. Esperado={EXPECTED_VERSIONS}; "
            f"efectivo={versions}"
        )
    return versions


def verify_reference_hashes() -> dict[str, str]:
    verified: dict[str, str] = {}
    for path, expected in EXPECTED_HASHES.items():
        if not path.is_file():
            raise CertificationError(f"Falta una referencia obligatoria: {path.name}")
        actual = sha256_file(path)
        if actual.lower() != expected:
            raise CertificationError(
                f"Huella distinta para {path.name}: {actual}; esperada={expected}"
            )
        verified[path.name] = actual
    return verified


def cache_inventory() -> tuple[int, int, tuple[tuple[str, int, int], ...]]:
    if not HF_CACHE.is_dir():
        raise CertificationError("No existe el cache local congelado de BGE-M3.")
    entries: list[tuple[str, int, int]] = []
    for path in sorted(candidate for candidate in HF_CACHE.rglob("*") if candidate.is_file()):
        stat = path.stat()
        entries.append((path.relative_to(HF_CACHE).as_posix(), stat.st_size, stat.st_mtime_ns))
    return len(entries), sum(entry[1] for entry in entries), tuple(entries)


def verify_no_absolute_dependencies() -> int:
    patterns = (
        re.compile(r"[A-Za-z]:[\\/]"),
        re.compile(r"/(?:Users|home)/"),
    )
    offending: list[str] = []
    for path in (Path(__file__).resolve(), Path(__file__).with_name("encoder.py").resolve()):
        text = path.read_text(encoding="utf-8")
        if any(pattern.search(text) for pattern in patterns):
            offending.append(path.name)
    if offending:
        raise CertificationError(
            "Se encontraron rutas absolutas heredadas en: " + ", ".join(offending)
        )
    return 0


def load_queries() -> list[str]:
    payload = json.loads(BANK_FILE.read_text(encoding="utf-8"))
    queries = [entry["consulta"] for entry in payload.get("consultas", [])]
    if len(queries) != REFERENCE_QUERY_COUNT:
        raise CertificationError(
            f"El banco debe contener exactamente {REFERENCE_QUERY_COUNT} consultas."
        )
    return queries


def certify_positive_vectors(
    encoder: BGEQueryEncoder,
    queries: list[str],
) -> tuple[list[Any], list[float]]:
    historical = np.load(
        HISTORICAL_QUERY_EMBEDDINGS,
        mmap_mode="r",
        allow_pickle=False,
    )
    if historical.shape != (17, DIMENSION) or historical.dtype != np.float32:
        raise CertificationError(
            f"Referencia de consultas incompatible: {historical.shape}/{historical.dtype}"
        )

    encoded: list[Any] = []
    maximum_differences: list[float] = []
    for index, query in enumerate(queries):
        result = encoder.encode(query)
        if result.vector.shape != (DIMENSION,) or result.vector.dtype != np.float32:
            raise CertificationError(f"Vector {index + 1} con shape o dtype incorrecto.")
        if not np.isfinite(result.vector).all():
            raise CertificationError(f"Vector {index + 1} contiene valores no finitos.")
        if not np.isclose(result.l2_norm, 1.0, rtol=0.0, atol=1e-5):
            raise CertificationError(f"Vector {index + 1} no tiene norma L2 unitaria.")

        difference = float(
            np.max(np.abs(result.vector - historical[index]))
        )
        if difference > VECTOR_TOLERANCE:
            raise CertificationError(
                f"Consulta {index + 1}: diferencia {difference} > {VECTOR_TOLERANCE}."
            )
        encoded.append(result)
        maximum_differences.append(difference)

    return encoded, maximum_differences


def guarded_encoder(model: Any) -> tuple[BGEQueryEncoder, EncodeGuard]:
    guard = EncodeGuard(model)
    candidate = object.__new__(BGEQueryEncoder)
    candidate.model = guard
    candidate.snapshot_sha256 = "verificado_por_instancia_principal"
    return candidate, guard


def require_rejection(
    encoder: BGEQueryEncoder,
    guard: EncodeGuard,
    query: str,
    expected_exception: type[Exception],
) -> Exception:
    calls_before = guard.encode_calls
    try:
        encoder.encode(query)
    except expected_exception as error:
        if guard.encode_calls != calls_before:
            raise CertificationError("Una entrada rechazada alcanzo encode().") from error
        return error
    except Exception as error:
        raise CertificationError(
            f"Tipo de rechazo incorrecto: {type(error).__name__}; "
            f"se esperaba {expected_exception.__name__}."
        ) from error
    raise CertificationError(f"No se produjo {expected_exception.__name__}.")


def build_over_token_limit_query(tokenizer: Any) -> tuple[str, int]:
    for word_count in range(513, 1000):
        query = " ".join(["a"] * word_count)
        if len(query) > 2000:
            break
        tokens = tokenizer(
            query,
            add_special_tokens=True,
            truncation=False,
        )
        token_count = len(tokens["input_ids"])
        if token_count > 512:
            return query, token_count
    raise CertificationError(
        "No fue posible construir una consulta <=2000 caracteres y >512 tokens."
    )


def certify_negative_inputs(encoder: BGEQueryEncoder) -> dict[str, Any]:
    candidate, guard = guarded_encoder(encoder.model)

    require_rejection(candidate, guard, "", EmptyQueryError)
    require_rejection(candidate, guard, "   \t \n   ", EmptyQueryError)

    too_long = "x" * 2001
    if len(canonicalize_query(too_long)) != 2001:
        raise CertificationError("El caso largo no canonicalizo a 2001 caracteres.")
    require_rejection(candidate, guard, too_long, QueryLengthError)

    token_query, measured_token_count = build_over_token_limit_query(guard.tokenizer)
    error = require_rejection(
        candidate,
        guard,
        token_query,
        QueryTokenLimitError,
    )
    if not isinstance(error, QueryTokenLimitError):
        raise CertificationError("No se recupero la cuenta real del limite de tokens.")
    if error.token_count != measured_token_count or measured_token_count <= 512:
        raise CertificationError("La cuenta de tokens del rechazo no es reproducible.")
    if guard.encode_calls != 0:
        raise CertificationError("Alguna prueba negativa ejecuto encode().")

    return {
        "vacio": "PASS",
        "solo_blancos": "PASS",
        "caracteres_2001": "PASS",
        "mas_de_512_tokens": "PASS",
        "token_count": measured_token_count,
        "encode_calls": guard.encode_calls,
        "truncamiento": False,
    }


def load_passages() -> list[Passage]:
    uri = SQLITE_FILE.resolve().as_uri() + "?mode=ro"
    connection = sqlite3.connect(uri, uri=True)
    try:
        connection.execute("PRAGMA query_only = ON")
        rows = connection.execute(
            """
            SELECT
              pasaje.id,
              documento.documento_id,
              documento.conferencia_id,
              pasaje.orden,
              pasaje.pagina_inicio,
              pasaje.pagina_fin,
              pasaje.texto
            FROM pasajes AS pasaje
            JOIN documentos AS documento
              ON documento.id = pasaje.documento
            ORDER BY pasaje.id
            """
        ).fetchall()
    finally:
        connection.close()

    passages = [Passage(*row) for row in rows]
    if [passage.passage_id for passage in passages] != list(range(1, 1974)):
        raise CertificationError("SQLite no conserva la secuencia de pasajes 1..1973.")
    return passages


def local_top10(
    vector: np.ndarray,
    passage_vectors: np.ndarray,
    passages: list[Passage],
) -> list[tuple[Passage, float]]:
    scores = passage_vectors @ vector
    ordered_indices = sorted(
        range(len(passages)),
        key=lambda index: (
            -float(scores[index]),
            passages[index].order,
            passages[index].passage_id,
        ),
    )

    best_by_conference: dict[str, tuple[Passage, float]] = {}
    for index in ordered_indices:
        passage = passages[index]
        if passage.conference_id not in best_by_conference:
            best_by_conference[passage.conference_id] = (
                passage,
                float(scores[index]),
            )

    ranked = sorted(
        best_by_conference.values(),
        key=lambda item: (-item[1], item[0].conference_id),
    )
    return ranked[:TOP_K]


def rpc_credentials() -> tuple[str, str]:
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
    key = (
        os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        or os.environ.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
        or os.environ.get("SUPABASE_ANON_KEY")
    )
    if not url or not key:
        raise CertificationError(
            "Faltan las variables de entorno publicas necesarias para invocar la RPC."
        )
    return url.rstrip("/"), key


def rpc_top10(vector: np.ndarray) -> list[dict[str, Any]]:
    base_url, anon_key = rpc_credentials()
    body = json.dumps(
        {
            "consulta_vector": [float(value) for value in vector],
            "resultado_limit": TOP_K,
            "resultado_offset": 0,
        },
        ensure_ascii=False,
        separators=(",", ":"),
    ).encode("utf-8")
    request = urllib.request.Request(
        base_url + "/rest/v1/rpc/buscar_corpus_semantica",
        data=body,
        method="POST",
        headers={
            "apikey": anon_key,
            "Authorization": "Bearer " + anon_key,
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise CertificationError(
            f"La RPC respondio HTTP {error.code}: {detail}"
        ) from error
    except urllib.error.URLError as error:
        raise CertificationError(f"No fue posible invocar la RPC: {error.reason}") from error
    if not isinstance(payload, list):
        raise CertificationError("La RPC no devolvio una lista de resultados.")
    return payload


def certify_end_to_end(encoded: list[Any]) -> tuple[list[float], float]:
    passage_vectors = np.load(
        PASSAGE_EMBEDDINGS,
        mmap_mode="r",
        allow_pickle=False,
    )
    if passage_vectors.shape != (1973, DIMENSION) or passage_vectors.dtype != np.float32:
        raise CertificationError(
            f"Matriz de pasajes incompatible: {passage_vectors.shape}/{passage_vectors.dtype}"
        )
    passages = load_passages()

    query_differences: list[float] = []
    for query_index, result in enumerate(encoded, start=1):
        local_rows = local_top10(result.vector, passage_vectors, passages)
        remote_rows = rpc_top10(result.vector)
        if len(remote_rows) != TOP_K:
            raise CertificationError(
                f"Consulta {query_index}: la RPC devolvio {len(remote_rows)} filas, no {TOP_K}."
            )

        maximum_similarity_difference = 0.0
        for rank, ((local, local_score), remote) in enumerate(
            zip(local_rows, remote_rows, strict=True),
            start=1,
        ):
            comparable = {
                "conferencia_id": local.conference_id,
                "documento_id": local.document_id,
                "orden": local.order,
                "pagina_inicio": local.page_start,
                "pagina_fin": local.page_end,
                "texto": local.text,
            }
            for field, expected in comparable.items():
                if remote.get(field) != expected:
                    raise CertificationError(
                        f"Consulta {query_index}, rango {rank}, campo {field}: "
                        "el Top 10 local y pgvector difieren."
                    )
            similarity_difference = abs(float(remote["similitud"]) - local_score)
            maximum_similarity_difference = max(
                maximum_similarity_difference,
                similarity_difference,
            )
            if similarity_difference > SIMILARITY_TOLERANCE:
                raise CertificationError(
                    f"Consulta {query_index}, rango {rank}: diferencia de similitud "
                    f"{similarity_difference} > {SIMILARITY_TOLERANCE}."
                )

        if any(int(row.get("total_count", -1)) != 40 for row in remote_rows):
            raise CertificationError(
                f"Consulta {query_index}: total_count no certifica 40 conferencias."
            )
        query_differences.append(maximum_similarity_difference)

    return query_differences, max(query_differences, default=0.0)


def main() -> int:
    cache_before = cache_inventory()
    versions = verify_versions()
    reference_hashes_before = verify_reference_hashes()
    absolute_dependencies = verify_no_absolute_dependencies()
    queries = load_queries()

    encoder = BGEQueryEncoder()
    encoded, vector_differences = certify_positive_vectors(encoder, queries)
    negative_results = certify_negative_inputs(encoder)
    similarity_differences, global_similarity_difference = certify_end_to_end(encoded)

    reference_hashes_after = verify_reference_hashes()
    if reference_hashes_after != reference_hashes_before:
        raise CertificationError("Una referencia historica cambio durante la certificacion.")
    cache_after = cache_inventory()
    if cache_after != cache_before:
        raise CertificationError("El cache local cambio; no puede certificarse descargas=0.")

    report = {
        "estado": "PASS",
        "archivos_encoder": ["encoder.py", "certificar_encoder.py"],
        "entorno": versions,
        "canonicalizacion": 'query = " ".join((query or "").split())',
        "modelo": "BAAI/bge-m3",
        "revision": REVISION,
        "snapshot": "snapshot local exacto",
        "snapshot_model_sha256": encoder.snapshot_sha256,
        "referencias_sha256": reference_hashes_before,
        "vectores": {
            "resultado": "12/12 PASS",
            "diferencias_maximas_por_consulta": vector_differences,
            "diferencia_maxima_global": max(vector_differences, default=0.0),
            "tolerancia": VECTOR_TOLERANCE,
        },
        "pruebas_negativas": negative_results,
        "pgvector": {
            "resultado": "12/12 Top 10 identico",
            "diferencias_maximas_similitud_por_consulta": similarity_differences,
            "diferencia_maxima_global": global_similarity_difference,
            "tolerancia": SIMILARITY_TOLERANCE,
            "vectores_recodificados": 0,
        },
        "dependencias_absolutas_heredadas": absolute_dependencies,
        "descargas": 0,
        "cache_archivos_antes_y_despues": cache_before[0],
        "embeddings_historicos_modificados": 0,
        "deuda_documental": (
            "PILOTO_BGE_M3_LOCAL/CONFIGURACION_PRELIMINAR_BGE_M3.json "
            "menciona una revision preliminar distinta."
        ),
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except CertificationError as error:
        print(f"CERTIFICACION FALLIDA: {error}", file=sys.stderr)
        raise SystemExit(1) from error
