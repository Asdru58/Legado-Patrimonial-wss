#!/usr/bin/env python3
"""Expansion local, incremental y reanudable del corpus certificado de 960.

No conecta con Supabase, no modifica PDF, no reprocesa el corpus piloto de 40
y reutiliza sin cambios el extractor, normalizador y fragmentador certificados.
"""

from __future__ import annotations

from collections import Counter
from concurrent.futures import ProcessPoolExecutor
import argparse
import csv
from datetime import datetime, timezone
import gzip
import hashlib
import json
import math
import os
from pathlib import Path
import shutil
import sqlite3
import sys
import time
from typing import Any, Iterable
import uuid


ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

PILOTO_LOCAL = ROOT / "PILOTO_BUSCADOR_HIBRIDO_LOCAL"
if str(PILOTO_LOCAL) not in sys.path:
    sys.path.insert(0, str(PILOTO_LOCAL))

from scripts.corpus_expansion.normalizacion_paginada_v2 import (  # noqa: E402
    EvidenciaLexica,
    VERSION_NORMALIZACION,
    construir_evidencia_lexica,
    normalizar_paginado_v2,
)
from comun import PALABRA, plegar  # noqa: E402
from indexar import separar_paginas, trocear  # noqa: E402


VERSION_EXTRACTOR = "pdf_nativo_pagina_v1"
VERSION_FRAGMENTADOR = "fragmentacion_paginada_250_40_v1"
MODELO = "BAAI/bge-m3"
REVISION = "142964af7e05de16511657561de8e8750fc153a0"
MODELO_SHA256 = "993b2248881724788dcab8c644a91dfd63584b6e5604ff2037cb5541e1e38e7e"
DIMENSION = 1024
DTYPE = "float32"
MAX_LENGTH = 512
BATCH_SIZE = 2
LOTE_PASAJES = 100
LEXICO_SHA256 = "B75821DCA7E73A9A59289274E77E823F84436591E15C224011B0ECD7D1694ABC"
MANIFIESTO_SHA256 = "F3B9BC54AE89A1583B6FEE1678F4534921753291683DF782D644B592F35B605D"
COMMIT_BASE = "27ed952ecc209f87f6c98261348a7fe6315ff5a7"

CERTIFICADO = ROOT / "artifacts" / "expansion_corpus_1000" / "certificado_v2_1"
MANIFIESTO = CERTIFICADO / "MANIFIESTO_SELECCION_960_NORMALIZACION_V2_1.csv"
PILOTO_MANIFIESTO = ROOT / "PILOTO_CORPUS_BUSCADOR_40" / "MANIFIESTO_CORPUS_40.csv"
PILOTO_SQLITE = ROOT / "PILOTO_BUSCADOR_HIBRIDO_LOCAL" / "indice" / "pasajes.sqlite"
PILOTO_EMBEDDINGS = ROOT / "PILOTO_BGE_M3_LOCAL" / "salida" / "embeddings_pasajes_bge_m3.npy"
BANCO_SEMANTICO = ROOT / "PILOTO_SEMANTICO_E5_LOCAL" / "BANCO_SEMANTICO_12_CONGELADO.json"
SNAPSHOT = (
    ROOT / "PILOTO_BGE_M3_LOCAL" / "cache_huggingface" / "hub"
    / "models--BAAI--bge-m3" / "snapshots" / REVISION
)
MODEL_FILE = SNAPSHOT / "model.safetensors"

SALIDA = ROOT / "artifacts" / "expansion_corpus_1000" / "procesamiento_local_960_v1"
BRUTOS = SALIDA / "textos_brutos"
NORMALIZADOS = SALIDA / "textos_normalizados"
PASAJES_DOC = SALIDA / "pasajes_por_conferencia"
CHECKPOINTS = SALIDA / "checkpoints"
ESTADO = CHECKPOINTS / "estado_conferencias.json"
LEXICO = CHECKPOINTS / "evidencia_lexica_certificada.json.gz"
PRECHECK = SALIDA / "PRECHECK.json"
PASAJES = SALIDA / "PASAJES_960.jsonl"
MANIFIESTO_PASAJES = SALIDA / "MANIFIESTO_PASAJES_960.csv"
MANIFIESTO_CONFERENCIAS = SALIDA / "MANIFIESTO_CONFERENCIAS_PROCESADAS_960.csv"
COMPUERTA = SALIDA / "COMPUERTA_PRE_BGE.json"
EMBEDDINGS = SALIDA / "embeddings_bge_m3_960.npy"
MAPA_EMBEDDINGS = SALIDA / "MAPA_PASAJE_EMBEDDING_960.csv"
CHECKPOINT_BGE = CHECKPOINTS / "checkpoint_bge_m3_960.json"
PRUEBA_BGE = SALIDA / "PRUEBA_CORTA_BGE_M3.json"
PRUEBA_REANUDACION = CHECKPOINTS / "PRUEBA_REANUDACION_BGE_M3.json"
PRUEBA_LOCAL = SALIDA / "PRUEBA_SEMANTICA_LOCAL_40_MAS_960.json"
VALIDACION_FINAL = SALIDA / "VALIDACION_FINAL_EMBEDDINGS.json"
INFORME_JSON = SALIDA / "INFORME_FINAL_EXPANSION_LOCAL_960.json"
INFORME_MD = SALIDA / "INFORME_FINAL_EXPANSION_LOCAL_960.md"


def ahora() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


def sha256_archivo(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(8 * 1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest().upper()


def sha256_texto(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest().upper()


def atomic_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_text(content, encoding="utf-8", newline="\n")
    os.replace(temporary, path)


def atomic_json(path: Path, payload: Any) -> None:
    atomic_text(path, json.dumps(payload, ensure_ascii=False, indent=2) + "\n")


def leer_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as stream:
        return list(csv.DictReader(stream))


def escribir_csv_atomico(path: Path, rows: Iterable[dict[str, Any]], fields: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp")
    with temporary.open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=fields, extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)
    os.replace(temporary, path)


def git_head() -> str:
    import subprocess

    result = subprocess.run(
        ["git", "rev-parse", "HEAD"], cwd=ROOT, check=True,
        text=True, capture_output=True,
    )
    return result.stdout.strip()


def hashes_protegidos() -> dict[str, str]:
    paths = [PILOTO_MANIFIESTO, PILOTO_SQLITE, PILOTO_EMBEDDINGS]
    return {str(path): sha256_archivo(path) for path in paths}


def ejecutar_precheck() -> dict[str, Any]:
    rows = leer_csv(MANIFIESTO)
    pilot = leer_csv(PILOTO_MANIFIESTO)
    docs = [row["documento_id"] for row in rows]
    confs = [row["conferencia_id"] for row in rows]
    pilot_docs = {row["documento_id"] for row in pilot}
    pilot_confs = {row["conferencia_id"] for row in pilot}
    manifest_hash = sha256_archivo(MANIFIESTO)
    model_hash = sha256_archivo(MODEL_FILE)
    disk = shutil.disk_usage(ROOT)
    failures: list[str] = []
    checks = {
        "commit_base": git_head(),
        "manifest_sha256": manifest_hash,
        "filas": len(rows),
        "documentos_unicos": len(set(docs)),
        "conferencias_unicas": len(set(confs)),
        "solapamiento_documentos_40": len(set(docs) & pilot_docs),
        "solapamiento_conferencias_40": len(set(confs) & pilot_confs),
        "rutas_ausentes": sum(not Path(row["ruta"]).is_file() for row in rows),
        "normalizadores_distintos": sum(row["normalizador"] != VERSION_NORMALIZACION for row in rows),
        "lexicos_distintos": sorted({row["sha256_lexico"] for row in rows}),
        "modelo": MODELO,
        "revision": REVISION,
        "modelo_sha256": model_hash,
        "dimension": DIMENSION,
        "dtype": DTYPE,
        "disco_libre_bytes": disk.free,
        "disco_libre_gib": round(disk.free / 2**30, 3),
        "protegidos_40_sha256": hashes_protegidos(),
    }
    expected = {
        "commit_base": COMMIT_BASE,
        "manifest_sha256": MANIFIESTO_SHA256,
        "filas": 960,
        "documentos_unicos": 960,
        "conferencias_unicas": 960,
        "solapamiento_documentos_40": 0,
        "solapamiento_conferencias_40": 0,
        "rutas_ausentes": 0,
        "normalizadores_distintos": 0,
        "modelo_sha256": MODELO_SHA256,
    }
    for key, value in expected.items():
        if str(checks[key]).upper() != str(value).upper():
            failures.append(f"{key}: esperado={value!r}, actual={checks[key]!r}")
    if checks["lexicos_distintos"] != [LEXICO_SHA256]:
        failures.append(f"sha256_lexico inesperado: {checks['lexicos_distintos']}")
    if disk.free < 5 * 2**30:
        failures.append(f"espacio insuficiente: {checks['disco_libre_gib']} GiB")
    payload = {
        "generado": ahora(), "estado": "PASS" if not failures else "FAIL",
        "checks": checks, "fallos": failures,
    }
    atomic_json(PRECHECK, payload)
    if failures:
        raise RuntimeError("PRECHECK FAIL: " + "; ".join(failures))
    print(
        "PRECHECK=PASS FILAS=960 DOCS=960 CONFS=960 SOLAPAMIENTO_40=0 "
        f"DISCO_LIBRE_GIB={checks['disco_libre_gib']}", flush=True,
    )
    return payload


def _extraer_lexico(entrada: Any) -> tuple[bool, Counter[str], Counter[str], str]:
    """Reconstruye solo la evidencia lexica; no ejecuta controles de orden."""

    import fitz
    from scripts.corpus_expansion import seleccionar_960 as seleccion

    path = seleccion.PDF_ROOT / entrada.ruta_relativa
    try:
        fitz.TOOLS.mupdf_warnings(reset=True)
        document = fitz.open(path)
        if document.needs_pass:
            raise ValueError("PDF protegido")
        pages: list[str] = []
        pages_with_text = 0
        for page in document:
            text = page.get_text("text")
            pages.append(text)
            if "".join(text.split()):
                pages_with_text += 1
        warnings = fitz.TOOLS.mupdf_warnings(reset=True).strip()
        document.close()
        characters = len("".join("".join(pages).split()))
        ratio = pages_with_text / len(pages) if pages else 0.0
        eligible = (
            not warnings and len(pages) >= seleccion.MINIMO_PAGINAS
            and characters >= seleccion.UMBRAL_CARACTERES
            and ratio >= seleccion.UMBRAL_TEXTO_PAGINAS
        )
        if not eligible:
            return False, Counter(), Counter(), ""
        raw = "\n".join(
            f"===== [PAGINA {index} de {len(pages)}] =====\n{text.rstrip()}"
            for index, text in enumerate(pages, 1)
        ) + "\n"
        evidence = construir_evidencia_lexica([raw])
        return True, evidence.palabras, evidence.formas_con_guion, ""
    except Exception as exc:
        return False, Counter(), Counter(), f"{type(exc).__name__}: {exc}"


def guardar_lexico(evidence: EvidenciaLexica, precandidates: int) -> None:
    LEXICO.parent.mkdir(parents=True, exist_ok=True)
    temporary = LEXICO.with_name(LEXICO.name + ".tmp")
    payload = {
        "version": VERSION_NORMALIZACION,
        "sha256": evidence.sha256,
        "precandidatos_fuente": precandidates,
        "palabras": sorted(evidence.palabras.items()),
        "formas_con_guion": sorted(evidence.formas_con_guion.items()),
    }
    with gzip.open(temporary, "wt", encoding="utf-8", newline="\n") as stream:
        json.dump(payload, stream, ensure_ascii=False, separators=(",", ":"))
    os.replace(temporary, LEXICO)


def cargar_lexico() -> EvidenciaLexica:
    if LEXICO.is_file():
        with gzip.open(LEXICO, "rt", encoding="utf-8") as stream:
            payload = json.load(stream)
        evidence = EvidenciaLexica(Counter(dict(payload["palabras"])), Counter(dict(payload["formas_con_guion"])))
        if evidence.sha256 != LEXICO_SHA256 or payload.get("precandidatos_fuente") != 3989:
            raise RuntimeError("El checkpoint del lexico no coincide con la certificacion")
        print(f"LEXICO=CHECKPOINT_VALIDO SHA256={evidence.sha256}", flush=True)
        return evidence

    print("LEXICO=RECONSTRUCCION_DE_DEPENDENCIA INICIO", flush=True)
    from scripts.corpus_expansion import seleccionar_960 as seleccion

    universe = seleccion.construir_universo()
    words: Counter[str] = Counter()
    hyphens: Counter[str] = Counter()
    precandidates = 0
    errors: list[str] = []
    with ProcessPoolExecutor(max_workers=seleccion.PROCESOS) as executor:
        for index, (eligible, local_words, local_hyphens, error) in enumerate(
            executor.map(_extraer_lexico, universe, chunksize=4), 1
        ):
            if error:
                errors.append(error)
            if eligible:
                precandidates += 1
                words.update(local_words)
                hyphens.update(local_hyphens)
            if index % 500 == 0:
                print(f"LEXICO DOCUMENTOS={index}/{len(universe)} PRE={precandidates}", flush=True)
    if errors:
        raise RuntimeError(f"Reconstruccion lexica con {len(errors)} errores; primero={errors[0]}")
    evidence = EvidenciaLexica(words, hyphens)
    if precandidates != 3989 or evidence.sha256 != LEXICO_SHA256:
        raise RuntimeError(
            f"Lexico no reproducible: precandidatos={precandidates}, sha256={evidence.sha256}"
        )
    guardar_lexico(evidence, precandidates)
    print(f"LEXICO=PASS PRE={precandidates} SHA256={evidence.sha256}", flush=True)
    return evidence


def _estado_inicial(rows: list[dict[str, str]]) -> dict[str, Any]:
    return {
        "version": 1,
        "manifest_sha256": MANIFIESTO_SHA256,
        "actualizado": ahora(),
        "conferencias": {
            row["documento_id"]: {
                "documento_id": row["documento_id"],
                "conferencia_id": row["conferencia_id"],
                "estado": "pendiente",
                "error_tipo": "",
                "error": "",
            }
            for row in rows
        },
    }


def cargar_estado(rows: list[dict[str, str]]) -> dict[str, Any]:
    if ESTADO.is_file():
        state = json.loads(ESTADO.read_text(encoding="utf-8"))
        if state.get("manifest_sha256") != MANIFIESTO_SHA256:
            raise RuntimeError("Checkpoint de preprocesamiento incompatible")
        if set(state.get("conferencias", {})) != {row["documento_id"] for row in rows}:
            raise RuntimeError("Checkpoint no contiene exactamente las 960 conferencias")
        return state
    state = _estado_inicial(rows)
    atomic_json(ESTADO, state)
    return state


def persistir_estado(state: dict[str, Any]) -> None:
    state["actualizado"] = ahora()
    atomic_json(ESTADO, state)


def extraer_pdf(path: Path) -> tuple[str, int, int]:
    import fitz

    fitz.TOOLS.mupdf_warnings(reset=True)
    document = fitz.open(path)
    if document.needs_pass:
        raise ValueError("PDF protegido con contrasena")
    pages = [page.get_text("text") for page in document]
    warnings = fitz.TOOLS.mupdf_warnings(reset=True).strip()
    document.close()
    if warnings:
        raise ValueError(f"advertencias PDF: {warnings}")
    raw = "\n".join(
        f"===== [PAGINA {index} de {len(pages)}] =====\n{text.rstrip()}"
        for index, text in enumerate(pages, 1)
    ) + "\n"
    pages_with_text = sum(bool("".join(text.split())) for text in pages)
    return raw, len(pages), pages_with_text


def validar_checkpoint_documento(record: dict[str, Any]) -> bool:
    if record.get("estado") != "validada":
        return False
    paths = [Path(record.get(key, "")) for key in ("ruta_bruto", "ruta_normalizado", "ruta_pasajes")]
    hashes = [record.get(key, "") for key in ("sha256_bruto", "sha256_normalizado", "sha256_pasajes")]
    return all(path.is_file() and sha256_archivo(path) == expected for path, expected in zip(paths, hashes))


def _id_pasaje(row: dict[str, str], order: int) -> str:
    name = f"legado:{row['conferencia_id']}:{row['documento_id']}:{order}"
    return str(uuid.uuid5(uuid.NAMESPACE_URL, name))


def procesar_documento(row: dict[str, str], evidence: EvidenciaLexica, state: dict[str, Any]) -> dict[str, Any]:
    doc_id = row["documento_id"]
    record = state["conferencias"][doc_id]
    path = Path(row["ruta"])
    if sha256_archivo(path) != row["sha256_pdf"].upper():
        raise ValueError("sha256_pdf_distinto")
    raw, pages, pages_with_text = extraer_pdf(path)
    if pages != int(row["paginas"]):
        raise ValueError(f"paginas_distintas: {pages} != {row['paginas']}")
    raw_path = BRUTOS / f"{doc_id}.txt"
    atomic_text(raw_path, raw)
    record.update({
        "estado": "extraida", "ruta_bruto": str(raw_path),
        "sha256_bruto": sha256_archivo(raw_path), "paginas": pages,
        "paginas_con_texto": pages_with_text,
    })
    persistir_estado(state)

    normalized, decisions = normalizar_paginado_v2(raw, evidence)
    normal_path = NORMALIZADOS / f"{doc_id}.txt"
    atomic_text(normal_path, normalized)
    record.update({
        "estado": "normalizada", "ruta_normalizado": str(normal_path),
        "sha256_normalizado": sha256_archivo(normal_path),
        "decisiones_guion": len(decisions),
        "uniones_guion": sum(decision.accion == "unir" for decision in decisions),
    })
    persistir_estado(state)

    continuous, page_map = separar_paginas(normalized)
    fragments = trocear(continuous, page_map)
    if not fragments:
        raise ValueError("sin_pasajes")
    passages: list[dict[str, Any]] = []
    for order, fragment in enumerate(fragments, 1):
        text = fragment["texto"]
        start = int(fragment["pagina_inicio"])
        end = int(fragment["pagina_fin"])
        if not text.strip():
            raise ValueError(f"pasaje_vacio:{order}")
        if not (1 <= start <= end <= pages):
            raise ValueError(f"paginas_invalidas:{order}:{start}-{end}/{pages}")
        passages.append({
            "pasaje_id": _id_pasaje(row, order),
            "documento_id": doc_id,
            "conferencia_id": row["conferencia_id"],
            "titulo": row["titulo"],
            "fecha": row["fecha"],
            "orden": order,
            "pagina_inicio": start,
            "pagina_fin": end,
            "palabras": int(fragment["palabras"]),
            "texto": text,
            "texto_plegado": plegar(text),
            "sha256_texto": sha256_texto(text),
            "sha256_pdf": row["sha256_pdf"].upper(),
            "sha256_texto_bruto": record["sha256_bruto"],
            "sha256_texto_normalizado": record["sha256_normalizado"],
            "extractor": VERSION_EXTRACTOR,
            "normalizador": VERSION_NORMALIZACION,
            "fragmentador": VERSION_FRAGMENTADOR,
        })
    passages_path = PASAJES_DOC / f"{doc_id}.jsonl"
    atomic_text(passages_path, "".join(json.dumps(item, ensure_ascii=False, separators=(",", ":")) + "\n" for item in passages))
    record.update({
        "estado": "fragmentada", "ruta_pasajes": str(passages_path),
        "sha256_pasajes": sha256_archivo(passages_path), "pasajes": len(passages),
    })
    persistir_estado(state)

    if [item["orden"] for item in passages] != list(range(1, len(passages) + 1)):
        raise ValueError("orden_pasajes_inconsistente")
    record.update({"estado": "validada", "error_tipo": "", "error": "", "validada": ahora()})
    persistir_estado(state)
    return record


def leer_jsonl(path: Path) -> list[dict[str, Any]]:
    with path.open("r", encoding="utf-8") as stream:
        return [json.loads(line) for line in stream if line.strip()]


def consolidar(rows: list[dict[str, str]], state: dict[str, Any]) -> dict[str, Any]:
    valid_rows: list[dict[str, str]] = []
    exclusions: list[dict[str, str]] = []
    all_passages: list[dict[str, Any]] = []
    conference_manifest: list[dict[str, Any]] = []
    for row in rows:
        record = state["conferencias"][row["documento_id"]]
        if record.get("estado") != "validada":
            exclusions.append({
                "documento_id": row["documento_id"],
                "conferencia_id": row["conferencia_id"],
                "motivo": record.get("error") or record.get("estado", "pendiente"),
            })
            continue
        valid_rows.append(row)
        passages = leer_jsonl(Path(record["ruta_pasajes"]))
        all_passages.extend(passages)
        conference_manifest.append({
            **row,
            "estado_procesamiento": "VALIDADA",
            "ruta_texto_bruto": record["ruta_bruto"],
            "ruta_texto_normalizado": record["ruta_normalizado"],
            "ruta_pasajes": record["ruta_pasajes"],
            "sha256_texto_bruto": record["sha256_bruto"],
            "sha256_texto_normalizado": record["sha256_normalizado"],
            "sha256_pasajes": record["sha256_pasajes"],
            "pasajes": record["pasajes"],
        })

    docs = [row["documento_id"] for row in valid_rows]
    confs = [row["conferencia_id"] for row in valid_rows]
    pilot = leer_csv(PILOTO_MANIFIESTO)
    pilot_docs = {row["documento_id"] for row in pilot}
    pilot_confs = {row["conferencia_id"] for row in pilot}
    empty_passages = sum(not passage["texto"].strip() for passage in all_passages)
    invalid_pages = sum(
        not (1 <= int(passage["pagina_inicio"]) <= int(passage["pagina_fin"]))
        for passage in all_passages
    )
    inconsistent_order = 0
    by_doc: dict[str, list[int]] = {}
    for passage in all_passages:
        by_doc.setdefault(passage["documento_id"], []).append(int(passage["orden"]))
    for orders in by_doc.values():
        inconsistent_order += orders != list(range(1, len(orders) + 1))
    gate = {
        "generado": ahora(),
        "conferencias_objetivo": 960,
        "conferencias_validas": len(valid_rows),
        "conferencias_excluidas": exclusions,
        "conferencias_vacias": sum(int(row.get("pasajes", 0)) == 0 for row in conference_manifest),
        "pasajes": len(all_passages),
        "pasajes_vacios": empty_passages,
        "paginas_invalidas": invalid_pages,
        "orden_pasajes_inconsistente": inconsistent_order,
        "documento_id_duplicado": len(docs) - len(set(docs)),
        "conferencia_id_duplicado": len(confs) - len(set(confs)),
        "solapamiento_documentos_piloto_40": len(set(docs) & pilot_docs),
        "solapamiento_conferencias_piloto_40": len(set(confs) & pilot_confs),
    }
    blockers = [
        gate["conferencias_vacias"], gate["pasajes_vacios"], gate["paginas_invalidas"],
        gate["orden_pasajes_inconsistente"], gate["documento_id_duplicado"],
        gate["conferencia_id_duplicado"], gate["solapamiento_documentos_piloto_40"],
        gate["solapamiento_conferencias_piloto_40"],
    ]
    gate["estado"] = "PASS" if not any(blockers) and len(valid_rows) > 0 else "FAIL"
    if gate["estado"] != "PASS":
        atomic_json(COMPUERTA, gate)
        raise RuntimeError(f"COMPUERTA PRE-BGE FAIL: {gate}")

    for index, passage in enumerate(all_passages):
        passage["embedding_index"] = index
    atomic_text(PASAJES, "".join(json.dumps(item, ensure_ascii=False, separators=(",", ":")) + "\n" for item in all_passages))
    passage_fields = [
        "embedding_index", "pasaje_id", "documento_id", "conferencia_id", "titulo", "fecha",
        "orden", "pagina_inicio", "pagina_fin", "palabras", "sha256_texto", "sha256_pdf",
        "sha256_texto_bruto", "sha256_texto_normalizado", "extractor", "normalizador", "fragmentador",
    ]
    escribir_csv_atomico(MANIFIESTO_PASAJES, all_passages, passage_fields)
    conference_fields = list(rows[0].keys()) + [
        "estado_procesamiento", "ruta_texto_bruto", "ruta_texto_normalizado", "ruta_pasajes",
        "sha256_texto_bruto", "sha256_texto_normalizado", "sha256_pasajes", "pasajes",
    ]
    escribir_csv_atomico(MANIFIESTO_CONFERENCIAS, conference_manifest, conference_fields)
    gate.update({
        "sha256_pasajes_jsonl": sha256_archivo(PASAJES),
        "sha256_manifiesto_pasajes": sha256_archivo(MANIFIESTO_PASAJES),
        "sha256_manifiesto_conferencias": sha256_archivo(MANIFIESTO_CONFERENCIAS),
    })
    atomic_json(COMPUERTA, gate)
    print(
        f"COMPUERTA_PRE_BGE=PASS CONFERENCIAS={len(valid_rows)} PASAJES={len(all_passages)} "
        f"EXCLUIDAS={len(exclusions)}", flush=True,
    )
    return gate


def ejecutar_preprocesamiento() -> dict[str, Any]:
    ejecutar_precheck()
    evidence = cargar_lexico()
    rows = leer_csv(MANIFIESTO)
    state = cargar_estado(rows)
    errors_by_type: Counter[str] = Counter()
    started = time.perf_counter()
    for index, row in enumerate(rows, 1):
        record = state["conferencias"][row["documento_id"]]
        if validar_checkpoint_documento(record):
            continue
        try:
            procesar_documento(row, evidence, state)
        except Exception as exc:
            error_type = type(exc).__name__ + ":" + str(exc).split(":", 1)[0]
            errors_by_type[error_type] += 1
            record.update({
                "estado": "error", "error_tipo": error_type,
                "error": f"{type(exc).__name__}: {exc}", "actualizado": ahora(),
            })
            persistir_estado(state)
            print(f"ERROR DOCUMENTO={row['documento_id']} TIPO={error_type}: {exc}", flush=True)
            if errors_by_type[error_type] >= 3:
                raise RuntimeError(f"DETENCION: 3 fallos del mismo tipo: {error_type}") from exc
        if index % 25 == 0 or index == len(rows):
            completed = sum(item.get("estado") == "validada" for item in state["conferencias"].values())
            elapsed = time.perf_counter() - started
            print(
                f"PREPROCESAMIENTO CONFERENCIAS={completed}/960 POSICION={index}/960 "
                f"TRANSCURRIDO_MIN={elapsed/60:.1f}", flush=True,
            )
    return consolidar(rows, state)


def configurar_offline() -> None:
    cache = ROOT / "PILOTO_BGE_M3_LOCAL" / "cache_huggingface"
    os.environ["HF_HOME"] = str(cache)
    os.environ["HUGGINGFACE_HUB_CACHE"] = str(cache / "hub")
    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["TRANSFORMERS_OFFLINE"] = "1"
    os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"


def cargar_modelo():
    configurar_offline()
    import torch
    from sentence_transformers import SentenceTransformer

    torch.set_num_threads(6)
    try:
        torch.set_num_interop_threads(1)
    except RuntimeError:
        pass
    if torch.version.cuda is not None or torch.cuda.is_available():
        raise RuntimeError("La ejecucion dejo de ser CPU exclusiva")
    model = SentenceTransformer(str(SNAPSHOT), device="cpu", local_files_only=True)
    model.max_seq_length = MAX_LENGTH
    model.float()
    if str(next(model.parameters()).dtype) != "torch.float32":
        raise RuntimeError("El modelo no esta en float32")
    return model


def leer_pasajes() -> list[dict[str, Any]]:
    if not PASAJES.is_file() or not COMPUERTA.is_file():
        raise RuntimeError("Falta la compuerta pre-BGE")
    gate = json.loads(COMPUERTA.read_text(encoding="utf-8"))
    if gate.get("estado") != "PASS" or gate.get("sha256_pasajes_jsonl") != sha256_archivo(PASAJES):
        raise RuntimeError("La compuerta o la fuente de pasajes no son validas")
    return leer_jsonl(PASAJES)


def validar_tokenizacion(model, passages: list[dict[str, Any]]) -> dict[str, Any]:
    import numpy as np

    lengths: list[int] = []
    for start in range(0, len(passages), 256):
        texts = [item["texto"] for item in passages[start:start + 256]]
        tokens = model.tokenizer(
            texts, add_special_tokens=True, truncation=False, padding=False,
            return_attention_mask=False,
        )
        lengths.extend(len(ids) for ids in tokens["input_ids"])
    values = np.asarray(lengths, dtype=np.int32)
    report = {
        "pasajes": len(passages), "limite": MAX_LENGTH,
        "maximo": int(values.max()), "mediana": float(np.median(values)),
        "p95": float(np.percentile(values, 95)),
        "truncados": int((values > MAX_LENGTH).sum()),
    }
    if report["truncados"]:
        raise RuntimeError(f"Hay {report['truncados']} pasajes que exceden {MAX_LENGTH} tokens")
    return report


def _hash_bloque(matrix, start: int, end: int) -> str:
    return hashlib.sha256(matrix[start:end].tobytes(order="C")).hexdigest().upper()


def ejecutar_prueba_corta() -> dict[str, Any]:
    import numpy as np

    passages = leer_pasajes()
    model = cargar_modelo()
    token_report = validar_tokenizacion(model, passages)
    indices = np.linspace(0, len(passages) - 1, num=min(8, len(passages)), dtype=int)
    texts = [passages[int(index)]["texto"] for index in indices]
    start = time.perf_counter()
    vectors = model.encode(
        texts, batch_size=BATCH_SIZE, convert_to_numpy=True,
        normalize_embeddings=True, show_progress_bar=False,
    ).astype("float32", copy=False)
    elapsed = time.perf_counter() - start
    norms = np.linalg.norm(vectors, axis=1)
    if vectors.shape != (len(texts), DIMENSION) or vectors.dtype != np.float32:
        raise RuntimeError(f"Prueba corta con shape/dtype invalidos: {vectors.shape}/{vectors.dtype}")
    if not np.isfinite(vectors).all() or float(norms.min()) < 0.999 or float(norms.max()) > 1.001:
        raise RuntimeError("Prueba corta no finita o no normalizada")

    resume_path = CHECKPOINTS / "prueba_reanudacion.npy"
    matrix = np.lib.format.open_memmap(resume_path, mode="w+", dtype="float32", shape=(4, DIMENSION))
    first = model.encode(texts[:2], batch_size=2, convert_to_numpy=True, normalize_embeddings=True, show_progress_bar=False).astype("float32")
    matrix[:2] = first
    matrix.flush()
    resume_checkpoint = {
        "revision": REVISION, "dimension": DIMENSION, "completados": 2,
        "total": 4, "sha256_lote": _hash_bloque(matrix, 0, 2), "estado": "PARCIAL",
    }
    atomic_json(PRUEBA_REANUDACION, resume_checkpoint)
    del matrix
    matrix = np.lib.format.open_memmap(resume_path, mode="r+")
    saved = json.loads(PRUEBA_REANUDACION.read_text(encoding="utf-8"))
    if saved["sha256_lote"] != _hash_bloque(matrix, 0, 2):
        raise RuntimeError("La prueba de reanudacion no valido el lote inicial")
    second = model.encode(texts[2:4], batch_size=2, convert_to_numpy=True, normalize_embeddings=True, show_progress_bar=False).astype("float32")
    matrix[2:4] = second
    matrix.flush()
    resume_checkpoint.update({"completados": 4, "estado": "PASS", "sha256_final": sha256_archivo(resume_path)})
    atomic_json(PRUEBA_REANUDACION, resume_checkpoint)

    rate_min = len(texts) / elapsed * 60 if elapsed else 0.0
    report = {
        "generado": ahora(), "estado": "PASS", "modelo": MODELO,
        "revision": REVISION, "dimension": DIMENSION, "dtype": str(vectors.dtype),
        "shape": list(vectors.shape), "nan": int(np.isnan(vectors).sum()),
        "inf": int(np.isinf(vectors).sum()), "norma_min": float(norms.min()),
        "norma_max": float(norms.max()), "pasajes_prueba": len(texts),
        "tiempo_s": round(elapsed, 3), "pasajes_minuto": round(rate_min, 3),
        "segundos_pasaje": round(elapsed / len(texts), 3),
        "eta_total_horas": round(len(passages) / rate_min / 60, 3),
        "tokenizacion": token_report, "reanudacion_probada": "PASS",
    }
    atomic_json(PRUEBA_BGE, report)
    print(
        f"PRUEBA_BGE=PASS PASAJES_MIN={rate_min:.2f} ETA_H={report['eta_total_horas']} "
        f"TOKENS_MAX={token_report['maximo']} REANUDACION=PASS", flush=True,
    )
    return report


def _identidad_bge(total: int, source_hash: str) -> dict[str, Any]:
    return {
        "modelo": MODELO, "revision": REVISION, "sha256_modelo": MODELO_SHA256,
        "sha256_fuente_pasajes": source_hash, "dimension": DIMENSION,
        "dtype": DTYPE, "total_pasajes": total, "lote_pasajes": LOTE_PASAJES,
    }


def _ultima_conferencia_completa(passages: list[dict[str, Any]], completed: int) -> str | None:
    if completed <= 0:
        return None
    index = completed - 1
    if completed < len(passages) and passages[index]["conferencia_id"] == passages[completed]["conferencia_id"]:
        current = passages[index]["conferencia_id"]
        while index >= 0 and passages[index]["conferencia_id"] == current:
            index -= 1
    return passages[index]["conferencia_id"] if index >= 0 else None


def ejecutar_bge_completo() -> dict[str, Any]:
    import numpy as np

    if not PRUEBA_BGE.is_file() or json.loads(PRUEBA_BGE.read_text(encoding="utf-8")).get("estado") != "PASS":
        ejecutar_prueba_corta()
    passages = leer_pasajes()
    total = len(passages)
    source_hash = sha256_archivo(PASAJES)
    identity = _identidad_bge(total, source_hash)
    completed = 0
    lots: list[dict[str, Any]] = []
    elapsed_prior = 0.0
    started = ahora()
    if CHECKPOINT_BGE.is_file() or EMBEDDINGS.is_file():
        if not (CHECKPOINT_BGE.is_file() and EMBEDDINGS.is_file()):
            raise RuntimeError("Existe solo una parte del checkpoint BGE; no se sobrescribe")
        checkpoint = json.loads(CHECKPOINT_BGE.read_text(encoding="utf-8"))
        if any(checkpoint.get(key) != value for key, value in identity.items()):
            raise RuntimeError("Checkpoint BGE incompatible; no se sobrescribe")
        matrix = np.lib.format.open_memmap(EMBEDDINGS, mode="r+")
        if matrix.shape != (total, DIMENSION) or matrix.dtype != np.float32:
            raise RuntimeError("Matriz BGE de checkpoint incompatible")
        lots = checkpoint.get("lotes", [])
        for lot in lots:
            if lot["sha256"] != _hash_bloque(matrix, int(lot["inicio"]), int(lot["fin"])):
                raise RuntimeError(f"Lote BGE corrupto: {lot}")
        completed = int(checkpoint.get("pasajes_completados", 0))
        if completed != (int(lots[-1]["fin"]) if lots else 0):
            raise RuntimeError("Checkpoint BGE no coincide con sus lotes")
        elapsed_prior = float(checkpoint.get("tiempo_transcurrido_s", 0.0))
        started = checkpoint.get("iniciado", started)
        print(f"BGE=REANUDACION PASAJES={completed}/{total} LOTES={len(lots)}", flush=True)
    else:
        EMBEDDINGS.parent.mkdir(parents=True, exist_ok=True)
        matrix = np.lib.format.open_memmap(
            EMBEDDINGS, mode="w+", dtype="float32", shape=(total, DIMENSION),
        )
        checkpoint = {
            **identity, "checkpoint_id": 0, "iniciado": started,
            "actualizado": ahora(), "pasajes_completados": 0,
            "conferencias_completadas": 0, "ultima_conferencia_completada": None,
            "embeddings_validos": 0, "tiempo_transcurrido_s": 0.0,
            "estado": "EN_PROGRESO", "lotes": [],
        }
        atomic_json(CHECKPOINT_BGE, checkpoint)

    if completed == total:
        print("BGE=CHECKPOINT_COMPLETO", flush=True)
        return validar_embeddings()

    model = cargar_modelo()
    run_start = time.perf_counter()
    last_report = run_start
    for start in range(completed, total, LOTE_PASAJES):
        end = min(start + LOTE_PASAJES, total)
        texts = [item["texto"] for item in passages[start:end]]
        vectors = model.encode(
            texts, batch_size=BATCH_SIZE, convert_to_numpy=True,
            normalize_embeddings=True, show_progress_bar=False,
        ).astype("float32", copy=False)
        if vectors.shape != (end - start, DIMENSION) or not np.isfinite(vectors).all():
            raise RuntimeError(f"Vectores invalidos en lote {start}:{end}")
        norms = np.linalg.norm(vectors, axis=1)
        if float(norms.min()) < 0.999 or float(norms.max()) > 1.001:
            raise RuntimeError(f"Normas invalidas en lote {start}:{end}")
        matrix[start:end] = vectors
        matrix.flush()
        lot = {"inicio": start, "fin": end, "sha256": _hash_bloque(matrix, start, end)}
        lots.append(lot)
        total_elapsed = elapsed_prior + (time.perf_counter() - run_start)
        completed_confs = len({item["conferencia_id"] for item in passages[:end]})
        checkpoint = {
            **identity, "checkpoint_id": len(lots), "iniciado": started,
            "actualizado": ahora(), "pasajes_completados": end,
            "conferencias_completadas": completed_confs,
            "ultima_conferencia_completada": _ultima_conferencia_completa(passages, end),
            "embeddings_validos": end, "tiempo_transcurrido_s": round(total_elapsed, 3),
            "estado": "COMPLETO" if end == total else "EN_PROGRESO", "lotes": lots,
        }
        atomic_json(CHECKPOINT_BGE, checkpoint)
        now_perf = time.perf_counter()
        if now_perf - last_report >= 300 or end == total:
            rate = end / total_elapsed * 60 if total_elapsed else 0.0
            remaining = (total - end) / rate if rate else math.inf
            print(
                f"Conferencias: {completed_confs} / {json.loads(COMPUERTA.read_text(encoding='utf-8'))['conferencias_validas']} | "
                f"Pasajes: {end} / {total} | Ritmo: {rate:.2f} pasajes/min | "
                f"Tiempo: {total_elapsed/3600:.2f} h | ETA: {remaining/60:.2f} h | "
                "Ultimo checkpoint: OK", flush=True,
            )
            last_report = now_perf
    return validar_embeddings()


def escribir_mapa(passages: list[dict[str, Any]]) -> None:
    fields = [
        "embedding_index", "pasaje_id", "documento_id", "conferencia_id",
        "orden", "pagina_inicio", "pagina_fin", "sha256_texto",
    ]
    escribir_csv_atomico(MAPA_EMBEDDINGS, passages, fields)


def validar_embeddings() -> dict[str, Any]:
    import numpy as np

    passages = leer_pasajes()
    matrix = np.load(EMBEDDINGS, mmap_mode="r")
    nan = inf = 0
    norm_min = math.inf
    norm_max = -math.inf
    for start in range(0, len(passages), 1000):
        block = np.asarray(matrix[start:start + 1000])
        nan += int(np.isnan(block).sum())
        inf += int(np.isinf(block).sum())
        norms = np.linalg.norm(block, axis=1)
        norm_min = min(norm_min, float(norms.min()))
        norm_max = max(norm_max, float(norms.max()))
    escribir_mapa(passages)
    checkpoint = json.loads(CHECKPOINT_BGE.read_text(encoding="utf-8"))
    gate = json.loads(COMPUERTA.read_text(encoding="utf-8"))
    protected_now = hashes_protegidos()
    protected_before = json.loads(PRECHECK.read_text(encoding="utf-8"))["checks"]["protegidos_40_sha256"]
    report = {
        "generado": ahora(), "conferencias": gate["conferencias_validas"],
        "pasajes": len(passages), "embeddings": int(matrix.shape[0]),
        "shape": list(matrix.shape), "dtype": str(matrix.dtype),
        "dimension": int(matrix.shape[1]), "nan": nan, "inf": inf,
        "norma_l2_min": norm_min, "norma_l2_max": norm_max,
        "norma_vectorial": "PASS" if 0.999 <= norm_min <= norm_max <= 1.001 else "FAIL",
        "correspondencia_pasaje_embedding": "PASS" if len(passages) == matrix.shape[0] else "FAIL",
        "piloto_40_intacto": protected_now == protected_before,
        "sha256_embeddings": sha256_archivo(EMBEDDINGS),
        "sha256_mapa": sha256_archivo(MAPA_EMBEDDINGS),
        "tiempo_total_bge_s": checkpoint.get("tiempo_transcurrido_s"),
        "checkpoints_creados": checkpoint.get("checkpoint_id"),
    }
    if (
        report["shape"] != [len(passages), DIMENSION] or report["dtype"] != DTYPE
        or nan or inf or report["norma_vectorial"] != "PASS"
        or report["correspondencia_pasaje_embedding"] != "PASS"
        or not report["piloto_40_intacto"]
    ):
        report["estado"] = "FAIL"
        atomic_json(VALIDACION_FINAL, report)
        raise RuntimeError(f"Validacion final BGE FAIL: {report}")
    report["estado"] = "PASS"
    atomic_json(VALIDACION_FINAL, report)
    print(
        f"VALIDACION_BGE=PASS SHAPE={report['shape']} DTYPE={report['dtype']} "
        f"NAN={nan} INF={inf} NORMA={norm_min:.6f}-{norm_max:.6f} PILOTO_40_INTACTO=SI",
        flush=True,
    )
    return report


def leer_piloto_40() -> list[dict[str, Any]]:
    uri = "file:" + PILOTO_SQLITE.as_posix() + "?mode=ro"
    connection = sqlite3.connect(uri, uri=True)
    connection.row_factory = sqlite3.Row
    try:
        query = """
            SELECT p.id AS pasaje_id, p.texto, p.orden, p.pagina_inicio, p.pagina_fin,
                   d.conferencia_id, d.documento_id, d.titulo, d.fecha
            FROM pasajes p JOIN documentos d ON d.id=p.documento ORDER BY p.id
        """
        return [dict(row) for row in connection.execute(query)]
    finally:
        connection.close()


def ejecutar_prueba_local() -> dict[str, Any]:
    import numpy as np

    validation = validar_embeddings()
    new_passages = leer_pasajes()
    old_passages = leer_piloto_40()
    old_matrix = np.load(PILOTO_EMBEDDINGS, mmap_mode="r")
    new_matrix = np.load(EMBEDDINGS, mmap_mode="r")
    if old_matrix.shape != (len(old_passages), DIMENSION):
        raise RuntimeError("Matriz piloto 40 incompatible")
    bank = json.loads(BANCO_SEMANTICO.read_text(encoding="utf-8"))
    queries_source = bank.get("consultas", bank)
    queries = []
    for item in queries_source[:3]:
        query = item.get("consulta") if isinstance(item, dict) else str(item)
        if query:
            queries.append(query)
    if len(queries) < 3:
        raise RuntimeError("No hay tres consultas certificadas disponibles")
    model = cargar_modelo()
    query_vectors = model.encode(
        queries, batch_size=1, convert_to_numpy=True,
        normalize_embeddings=True, show_progress_bar=False,
    ).astype("float32")
    results: list[dict[str, Any]] = []
    for query, vector in zip(queries, query_vectors):
        old_scores = np.asarray(old_matrix @ vector)
        new_scores = np.asarray(new_matrix @ vector)
        combined = np.concatenate([old_scores, new_scores])
        top = np.argpartition(-combined, min(9, len(combined) - 1))[:10]
        top = top[np.argsort(-combined[top])]
        rows: list[dict[str, Any]] = []
        for position, index in enumerate(top, 1):
            if index < len(old_passages):
                row = old_passages[int(index)]
                origin = "PILOTO_40"
            else:
                row = new_passages[int(index) - len(old_passages)]
                origin = "NUEVAS_960"
            rows.append({
                "posicion": position, "origen": origin,
                "puntuacion": round(float(combined[int(index)]), 8),
                "pasaje_id": row["pasaje_id"], "conferencia_id": row["conferencia_id"],
                "documento_id": row["documento_id"], "titulo": row["titulo"],
                "pagina_inicio": row["pagina_inicio"], "pagina_fin": row["pagina_fin"],
                "texto": row["texto"],
            })
        results.append({
            "consulta": query, "top10": rows,
            "nuevas_en_top10": sum(row["origen"] == "NUEVAS_960" for row in rows),
        })
    duplicate_docs = len({row["documento_id"] for row in old_passages} & {row["documento_id"] for row in new_passages})
    duplicate_confs = len({row["conferencia_id"] for row in old_passages} & {row["conferencia_id"] for row in new_passages})
    report = {
        "generado": ahora(), "estado": "PASS",
        "corpus_local": {
            "conferencias_piloto": len({row["conferencia_id"] for row in old_passages}),
            "conferencias_nuevas": validation["conferencias"],
            "conferencias_totales": len({row["conferencia_id"] for row in old_passages}) + validation["conferencias"],
            "pasajes_piloto": len(old_passages), "pasajes_nuevos": len(new_passages),
            "documentos_duplicados": duplicate_docs, "conferencias_duplicadas": duplicate_confs,
        },
        "dimension": DIMENSION, "threshold": "NO_FIJADO", "indice_hnsw": "NO_CREADO",
        "consultas": results,
    }
    if duplicate_docs or duplicate_confs or any(item["nuevas_en_top10"] == 0 for item in results):
        report["estado"] = "FAIL"
        atomic_json(PRUEBA_LOCAL, report)
        raise RuntimeError("Prueba semantica local FAIL")
    atomic_json(PRUEBA_LOCAL, report)
    print(
        f"PRUEBA_LOCAL=PASS CONFERENCIAS=40+{validation['conferencias']}="
        f"{report['corpus_local']['conferencias_totales']} CONSULTAS={len(results)}",
        flush=True,
    )
    return report


def emitir_informe() -> dict[str, Any]:
    gate = json.loads(COMPUERTA.read_text(encoding="utf-8"))
    validation = json.loads(VALIDACION_FINAL.read_text(encoding="utf-8"))
    trial = json.loads(PRUEBA_BGE.read_text(encoding="utf-8"))
    local = json.loads(PRUEBA_LOCAL.read_text(encoding="utf-8"))
    checkpoint = json.loads(CHECKPOINT_BGE.read_text(encoding="utf-8"))
    elapsed = float(validation["tiempo_total_bge_s"] or 0.0)
    rate = validation["embeddings"] / elapsed * 60 if elapsed else 0.0
    artifacts = [
        MANIFIESTO_PASAJES, MANIFIESTO_CONFERENCIAS, PASAJES, EMBEDDINGS,
        MAPA_EMBEDDINGS, CHECKPOINT_BGE, COMPUERTA, PRUEBA_BGE,
        VALIDACION_FINAL, PRUEBA_LOCAL,
    ]
    hashes = {str(path): sha256_archivo(path) for path in artifacts}
    report = {
        "generado": ahora(), "conferencias_objetivo": 960,
        "conferencias_procesadas": gate["conferencias_validas"],
        "conferencias_excluidas": gate["conferencias_excluidas"],
        "pasajes_generados": gate["pasajes"],
        "promedio_pasajes_conferencia": round(gate["pasajes"] / gate["conferencias_validas"], 3),
        "embeddings_generados": validation["embeddings"],
        "shape": validation["shape"], "dtype": validation["dtype"],
        "dimension": validation["dimension"], "nan": validation["nan"], "inf": validation["inf"],
        "norma_vectorial": validation["norma_vectorial"],
        "correspondencia_pasaje_embedding": validation["correspondencia_pasaje_embedding"],
        "bge_pasajes_minuto_real": round(rate, 3),
        "tiempo_total_bge_s": elapsed,
        "checkpoints_creados": checkpoint["checkpoint_id"],
        "reanudacion_probada": trial["reanudacion_probada"],
        "corpus_local": local["corpus_local"],
        "prueba_semantica_local": local["estado"],
        "sha256_artefactos_finales": hashes,
        "rutas": {
            "manifiesto_final_pasajes": str(MANIFIESTO_PASAJES),
            "manifiesto_conferencias": str(MANIFIESTO_CONFERENCIAS),
            "textos_brutos": str(BRUTOS), "textos_normalizados": str(NORMALIZADOS),
            "pasajes": str(PASAJES), "embeddings": str(EMBEDDINGS),
            "mapa_pasaje_embedding": str(MAPA_EMBEDDINGS), "checkpoints": str(CHECKPOINTS),
            "informe_final": str(INFORME_MD),
        },
        "incidencias": gate["conferencias_excluidas"],
        "supabase_modificado": False, "git_commit": False, "git_push": False,
    }
    atomic_json(INFORME_JSON, report)
    excluded = (
        "Ninguna" if not report["conferencias_excluidas"] else
        "\n".join(f"- {item['documento_id']}: {item['motivo']}" for item in report["conferencias_excluidas"])
    )
    markdown = f"""# Informe final - expansion local del corpus a aproximadamente 1.000 conferencias

CONFERENCIAS OBJETIVO: **960**

CONFERENCIAS PROCESADAS: **{report['conferencias_procesadas']}**

CONFERENCIAS EXCLUIDAS:
{excluded}

PASAJES GENERADOS: **{report['pasajes_generados']}**

PROMEDIO PASAJES/CONFERENCIA: **{report['promedio_pasajes_conferencia']}**

EMBEDDINGS GENERADOS: **{report['embeddings_generados']}**

SHAPE: **{report['shape']}**
DTYPE: **{report['dtype']}**
DIMENSION: **{report['dimension']}**
NaN: **{report['nan']}**
Inf: **{report['inf']}**
NORMA VECTORIAL: **{report['norma_vectorial']}**
CORRESPONDENCIA PASAJE <-> EMBEDDING: **{report['correspondencia_pasaje_embedding']}**

BGE-M3 PASAJES/MINUTO REAL: **{report['bge_pasajes_minuto_real']}**
TIEMPO TOTAL BGE-M3: **{report['tiempo_total_bge_s']} segundos**
CHECKPOINTS CREADOS: **{report['checkpoints_creados']}**
REANUDACION PROBADA: **{report['reanudacion_probada']}**

CORPUS LOCAL DISPONIBLE: **40 + {report['corpus_local']['conferencias_nuevas']} = {report['corpus_local']['conferencias_totales']} conferencias**

PRUEBA SEMANTICA LOCAL: **{report['prueba_semantica_local']}**

## Rutas

- Manifiesto final de pasajes: `{MANIFIESTO_PASAJES}`
- Manifiesto de conferencias: `{MANIFIESTO_CONFERENCIAS}`
- Textos brutos: `{BRUTOS}`
- Textos normalizados: `{NORMALIZADOS}`
- Pasajes: `{PASAJES}`
- Embeddings: `{EMBEDDINGS}`
- Mapa pasaje <-> embedding: `{MAPA_EMBEDDINGS}`
- Checkpoints: `{CHECKPOINTS}`
- Informe JSON: `{INFORME_JSON}`

## SHA-256

""" + "\n".join(f"- `{path}`: `{digest}`" for path, digest in hashes.items()) + """

## Cierre

Supabase no fue accedido ni modificado. No se reprocesaron embeddings de las 40 conferencias piloto. No se hizo commit ni push.
"""
    atomic_text(INFORME_MD, markdown)
    report["sha256_informe_md"] = sha256_archivo(INFORME_MD)
    report["sha256_informe_json"] = sha256_archivo(INFORME_JSON)
    print(f"INFORME_FINAL=PASS RUTA={INFORME_MD}", flush=True)
    return report


def ejecutar_todo() -> None:
    ejecutar_preprocesamiento()
    ejecutar_prueba_corta()
    ejecutar_bge_completo()
    ejecutar_prueba_local()
    emitir_informe()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "fase",
        choices=("precheck", "preprocess", "bge-trial", "bge-full", "validate", "local-test", "report", "all"),
    )
    args = parser.parse_args()
    phases = {
        "precheck": ejecutar_precheck,
        "preprocess": ejecutar_preprocesamiento,
        "bge-trial": ejecutar_prueba_corta,
        "bge-full": ejecutar_bge_completo,
        "validate": validar_embeddings,
        "local-test": ejecutar_prueba_local,
        "report": emitir_informe,
        "all": ejecutar_todo,
    }
    phases[args.fase]()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
