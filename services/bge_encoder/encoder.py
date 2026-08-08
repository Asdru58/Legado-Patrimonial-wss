"""Codificador autonomo de consultas para el snapshot BGE-M3 certificado.

Este modulo solo conoce el modelo de consultas. No conoce el corpus, sus
pasajes, sus indices ni ningun mecanismo de transporte o persistencia.
"""

from __future__ import annotations

import hashlib
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np


MODEL_ID = "BAAI/bge-m3"
REVISION = "142964af7e05de16511657561de8e8750fc153a0"
DIMENSION = 1024
MAX_QUERY_CHARACTERS = 2000
MAX_QUERY_TOKENS = 512
EXPECTED_MODEL_SHA256 = (
    "993b2248881724788dcab8c644a91dfd63584b6e5604ff2037cb5541e1e38e7e"
)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BGE_ROOT = PROJECT_ROOT / "PILOTO_BGE_M3_LOCAL"
HF_CACHE = BGE_ROOT / "cache_huggingface"
SNAPSHOT = (
    HF_CACHE
    / "hub"
    / "models--BAAI--bge-m3"
    / "snapshots"
    / REVISION
)
MODEL_FILE = SNAPSHOT / "model.safetensors"


class QueryValidationError(ValueError):
    """Base para rechazos esperados de una consulta."""


class EmptyQueryError(QueryValidationError):
    """La consulta queda vacia despues de la canonicalizacion."""


class QueryLengthError(QueryValidationError):
    """La consulta excede el limite de caracteres."""


class QueryTokenLimitError(QueryValidationError):
    """La consulta excede el limite real del tokenizador."""

    def __init__(self, token_count: int) -> None:
        self.token_count = token_count
        super().__init__(
            f"La consulta tiene {token_count} tokens y supera el limite de "
            f"{MAX_QUERY_TOKENS}."
        )


@dataclass(frozen=True)
class EncodedQuery:
    """Resultado validado de una unica codificacion."""

    query: str
    vector: np.ndarray
    token_count: int
    l2_norm: float


def sha256_file(path: Path) -> str:
    """Calcula SHA-256 con la misma lectura por bloques del piloto."""

    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(8 * 1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def verify_snapshot() -> str:
    """Exige el peso exacto que ya verifica el piloto BGE-M3."""

    if SNAPSHOT.name != REVISION:
        raise RuntimeError("La ruta del snapshot no corresponde a la revision fijada.")
    if not MODEL_FILE.is_file():
        raise FileNotFoundError("Falta model.safetensors en el snapshot BGE-M3 fijado.")
    actual = sha256_file(MODEL_FILE)
    if actual.lower() != EXPECTED_MODEL_SHA256:
        raise RuntimeError(
            "La huella de model.safetensors no coincide con la certificada: "
            f"{actual}"
        )
    return actual


def canonicalize_query(query: str | None) -> str:
    """Aplica literalmente la canonicalizacion del motor validado."""

    query = " ".join((query or "").split())
    return query


class BGEQueryEncoder:
    """Encoder CPU/float32 cerrado sobre el snapshot local certificado."""

    def __init__(self) -> None:
        self.snapshot_sha256 = verify_snapshot()

        os.environ["HF_HOME"] = str(HF_CACHE)
        os.environ["HUGGINGFACE_HUB_CACHE"] = str(HF_CACHE / "hub")
        os.environ["HF_HUB_OFFLINE"] = "1"
        os.environ["TRANSFORMERS_OFFLINE"] = "1"
        os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"

        import torch
        from sentence_transformers import SentenceTransformer

        torch.set_num_threads(6)
        try:
            torch.set_num_interop_threads(1)
        except RuntimeError:
            pass

        if torch.version.cuda is not None or torch.cuda.is_available():
            raise RuntimeError("La ejecucion certificada debe ser exclusivamente CPU.")

        self.model: Any = SentenceTransformer(
            str(SNAPSHOT),
            device="cpu",
            local_files_only=True,
        )
        self.model.max_seq_length = MAX_QUERY_TOKENS
        self.model.float()

        if str(next(self.model.parameters()).dtype) != "torch.float32":
            raise RuntimeError("BGE-M3 no quedo cargado en float32.")

    def encode(self, query: str | None) -> EncodedQuery:
        """Canonicaliza, valida y codifica una consulta sin cache ni truncamiento."""

        query = canonicalize_query(query)
        if not query:
            raise EmptyQueryError("Escriba una frase o pregunta.")
        if len(query) > MAX_QUERY_CHARACTERS:
            raise QueryLengthError("La consulta es demasiado larga.")

        tokens = self.model.tokenizer(
            query,
            add_special_tokens=True,
            truncation=False,
        )
        token_count = len(tokens["input_ids"])
        if token_count > MAX_QUERY_TOKENS:
            raise QueryTokenLimitError(token_count)

        vector = self.model.encode(
            [query],
            batch_size=1,
            convert_to_numpy=True,
            normalize_embeddings=True,
            show_progress_bar=False,
        ).astype("float32", copy=False)[0]

        if vector.shape != (DIMENSION,):
            raise RuntimeError(
                f"El vector tiene shape {vector.shape}; se esperaba ({DIMENSION},)."
            )
        if vector.dtype != np.float32:
            raise RuntimeError(f"El vector tiene dtype {vector.dtype}; se esperaba float32.")
        if not np.isfinite(vector).all():
            raise RuntimeError("El vector contiene NaN o infinitos.")

        l2_norm = float(np.linalg.norm(vector))
        if not np.isclose(l2_norm, 1.0, rtol=0.0, atol=1e-5):
            raise RuntimeError(f"La norma L2 del vector no es unitaria: {l2_norm}.")

        return EncodedQuery(
            query=query,
            vector=vector,
            token_count=token_count,
            l2_norm=l2_norm,
        )
