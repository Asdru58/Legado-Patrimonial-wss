"""Recertifica el normalizador v2 y selecciona 960 documentos seguros.

No escribe textos normalizados, no genera embeddings y no se conecta a
Supabase. Los unicos artefactos de salida son manifiestos y auditorias CSV/JSON.
"""

from __future__ import annotations

from array import array
from collections import Counter, defaultdict
from concurrent.futures import ProcessPoolExecutor
import csv
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
import hashlib
import json
import math
import os
from pathlib import Path
import pickle
import re
import sys
from typing import Any, Iterable
import unicodedata

import fitz


ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.corpus_expansion.normalizacion_paginada_v2 import (  # noqa: E402
    CORTE_GUION_RE,
    SEPARADOR_PAGINA_RE,
    VERSION_NORMALIZACION,
    construir_evidencia_lexica,
    normalizar_paginado_v2,
)


PDF_ROOT = Path(r"C:\Users\USUARIO\Documents\Downloads\BASE DE DATOS 1974-2018 PDFs. WSS")
ESTADOS = ROOT / "entrega_archivos_manifiesto_bloque5_fase1" / "rederivacion_6728.csv"
INVENTARIO = ROOT / "artifacts" / "inventario_wss_definitivo" / "inventario_fisico_definitivo.csv"
PILOTO = ROOT / "PILOTO_CORPUS_BUSCADOR_40" / "MANIFIESTO_CORPUS_40.csv"
SALIDA = ROOT / "artifacts" / "expansion_corpus_1000" / "certificado_v2_1"
MANIFIESTO_960 = SALIDA / "MANIFIESTO_SELECCION_960_NORMALIZACION_V2_1.csv"
AUDITORIA_RECERTIFICACION = SALIDA / "AUDITORIA_RECERTIFICACION_NORMALIZACION_V2_1.csv"
RECHAZOS = SALIDA / "RECHAZOS_SELECCION_960.csv"
RESUMEN = SALIDA / "RESUMEN_SELECCION_960.json"

OBJETIVO = 960
UMBRAL_TEXTO_PAGINAS = 0.85
UMBRAL_CARACTERES = 6000
MINIMO_PAGINAS = 6
UMBRAL_ORDEN = 0.95
UMBRAL_JACCARD = 0.55
MUESTRA_RECERTIFICACION_CANDIDATOS = 200
PROCESOS = 6
CACHE_EXTRACCION = (
    Path(os.environ.get("LOCALAPPDATA", str(ROOT)))
    / "Temp"
    / "seleccion_960_extraccion_4559.pkl"
)

FOLIO_RE = re.compile(r"^\s*[-\u2013\u2014]?\s*(\d{1,3})\s*[-\u2013\u2014]?\s*$")
PALABRA_RE = re.compile(r"[^\W\d_]+", re.UNICODE)
CIERRE_RE = re.compile(r"[.!?…:;\"'»”’\)\]\}]$")
STOP_TITULO = {
    "para", "como", "desde", "hasta", "entre", "sobre", "bajo", "ante",
    "tras", "hacia", "segun", "donde", "cuando", "quien", "cual", "que",
    "del", "las", "los", "una", "uno", "unos", "unas", "con", "sin",
    "por", "sus", "este", "esta", "estos", "estas", "dios", "cristo",
}
PREFIJOS_BOILERPLATE = (
    "dr. william soto", "william soto santiago", "distribucion gratuita",
    "distribución gratuita", "www.", "http://", "https://", "t&r ",
)


def leer_csv(ruta: Path) -> list[dict[str, str]]:
    with ruta.open("r", encoding="utf-8-sig", newline="") as stream:
        return list(csv.DictReader(stream))


def sha256_archivo(ruta: Path) -> str:
    digest = hashlib.sha256()
    with ruta.open("rb") as stream:
        for bloque in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(bloque)
    return digest.hexdigest().lower()


def sha256_texto(texto: str) -> str:
    return hashlib.sha256(texto.encode("utf-8")).hexdigest().upper()


def plegar(texto: str) -> str:
    normal = unicodedata.normalize("NFKD", texto.casefold())
    return "".join(caracter for caracter in normal if not unicodedata.combining(caracter))


@dataclass(frozen=True)
class Entrada:
    documento_id: str
    conferencia_id: str
    sha256: str
    tamano_bytes: int
    ruta_relativa: str
    titulo: str
    fecha: str
    edicion: str


def construir_universo() -> list[Entrada]:
    piloto_ids = {fila["documento_id"] for fila in leer_csv(PILOTO)}
    estados = {
        fila["sha256"].lower(): fila
        for fila in leer_csv(ESTADOS)
        if fila["estado_actual"] == "vinculado_auto"
        and fila["caso_derivado"] == "A"
        and fila["documento_id"] not in piloto_ids
    }
    fuentes: dict[str, dict[str, str]] = {}
    for fila in sorted(
        leer_csv(INVENTARIO),
        key=lambda item: (item["sha256"].lower(), item["ruta_relativa"].casefold()),
    ):
        sha = fila["sha256"].lower()
        if sha in estados and sha not in fuentes:
            fuentes[sha] = fila

    faltantes = sorted(set(estados) - set(fuentes))
    if faltantes:
        raise RuntimeError(f"Faltan fuentes fisicas para {len(faltantes)} candidatos")

    universo: list[Entrada] = []
    for sha, estado in sorted(estados.items()):
        fuente = fuentes[sha]
        universo.append(
            Entrada(
                documento_id=estado["documento_id"],
                conferencia_id=fuente["id_supabase_coincidente"],
                sha256=sha,
                tamano_bytes=int(fuente["tamano_bytes"]),
                ruta_relativa=fuente["ruta_relativa"],
                titulo=fuente["titulo_supabase_coincidente"] or fuente["titulo_tentativo"],
                fecha=fuente["fecha_supabase_coincidente"] or fuente["fecha_detectada"],
                edicion=fuente["edition_type_detectado"],
            )
        )
    return universo


def _folios_pagina(texto: str, total: int) -> list[int]:
    lineas = [linea.strip() for linea in texto.splitlines() if linea.strip()]
    valores: set[int] = set()
    for linea in lineas[:8] + lineas[-8:]:
        match = FOLIO_RE.fullmatch(linea)
        if match:
            valor = int(match.group(1))
            if 1 <= valor <= total + 10:
                valores.add(valor)
    return sorted(valores)


def _control_orden(
    paginas: list[str],
    geometria: list[tuple[float, float, int]],
) -> dict[str, Any]:
    total = len(paginas)
    offsets: list[int] = []
    candidatos: list[list[int]] = []
    for indice, texto in enumerate(paginas, 1):
        valores = _folios_pagina(texto, total)
        candidatos.append(valores)
        offsets.extend(valor - indice for valor in valores)

    apaisadas = [
        indice
        for indice, (ancho, alto, rotacion) in enumerate(geometria, 1)
        if ancho > alto or rotacion % 180 != 0
    ]
    if not offsets:
        return {
            "pass": False, "paginas_numeradas": 0, "desfase": None,
            "consistencia": 0.0, "apaisadas_rotadas": apaisadas,
        }
    desfase, _ = Counter(offsets).most_common(1)[0]
    numeradas = sum(bool(valores) for valores in candidatos)
    coincidentes = sum(
        any(valor - indice == desfase for valor in valores)
        for indice, valores in enumerate(candidatos, 1)
    )
    consistencia = coincidentes / numeradas if numeradas else 0.0
    return {
        "pass": (
            numeradas >= math.ceil(total / 2)
            and consistencia >= UMBRAL_ORDEN
            and not apaisadas
        ),
        "paginas_numeradas": numeradas,
        "desfase": desfase,
        "consistencia": round(consistencia, 6),
        "apaisadas_rotadas": apaisadas,
    }


def _lineas_utiles(texto: str) -> list[str]:
    salida: list[str] = []
    for linea in texto.splitlines():
        limpia = re.sub(r"\s+", " ", linea).strip()
        if not limpia or FOLIO_RE.fullmatch(limpia):
            continue
        plegada = plegar(limpia)
        if any(plegada.startswith(plegar(prefijo)) for prefijo in PREFIJOS_BOILERPLATE):
            continue
        salida.append(limpia)
    return salida


def _control_inicio(paginas: list[str], titulo: str, fecha: str) -> dict[str, Any]:
    primeras = "\n".join(paginas[: min(3, len(paginas))])
    primeras_plegadas = plegar(primeras)
    anio = fecha[:4]
    tokens_titulo = {
        token
        for token in PALABRA_RE.findall(plegar(titulo))
        if len(token) >= 4 and token not in STOP_TITULO
    }
    cobertura = (
        sum(token in primeras_plegadas for token in tokens_titulo) / len(tokens_titulo)
        if tokens_titulo else 0.0
    )
    identidad_visible = anio in primeras_plegadas or cobertura >= 0.50

    primera_linea = ""
    for pagina in paginas[: min(6, len(paginas))]:
        for linea in _lineas_utiles(pagina):
            if sum(caracter.isalpha() for caracter in linea) >= 20:
                primera_linea = linea
                break
        if primera_linea:
            break
    primer_alfabetico = next(
        (caracter for caracter in primera_linea if caracter.isalpha()),
        "",
    )
    comienzo_completo = bool(primer_alfabetico and primer_alfabetico.isupper())
    return {
        "pass": identidad_visible and comienzo_completo,
        "identidad_visible": identidad_visible,
        "cobertura_titulo": round(cobertura, 6),
        "primera_linea": primera_linea[:300],
        "comienzo_completo": comienzo_completo,
    }


def _pagina_es_colofo_o_notas(lineas: list[str]) -> bool:
    texto = plegar(" ".join(lineas))
    alfa = sum(caracter.isalpha() for caracter in texto)
    if alfa < 120:
        return True
    marcadores = (
        "distribucion gratuita", "pagina de notas", "notas:",
        "esta conferencia fue", "imprenta carpa", "www.carpa",
    )
    return alfa < 900 and any(marcador in texto for marcador in marcadores)


def _control_cierre(paginas: list[str]) -> dict[str, Any]:
    ultima_linea = ""
    pagina_cierre: int | None = None
    for indice in range(len(paginas) - 1, -1, -1):
        lineas = _lineas_utiles(paginas[indice])
        if not lineas or _pagina_es_colofo_o_notas(lineas):
            continue
        ultima_linea = lineas[-1].rstrip()
        pagina_cierre = indice + 1
        break
    cierre_valido = bool(ultima_linea and CIERRE_RE.search(ultima_linea))
    return {
        "pass": cierre_valido,
        "pagina_cierre": pagina_cierre,
        "ultima_linea": ultima_linea[-300:],
    }


def inspeccionar_pdf(entrada: Entrada) -> dict[str, Any]:
    ruta = PDF_ROOT / entrada.ruta_relativa
    resultado: dict[str, Any] = {"entrada": asdict(entrada), "error": ""}
    try:
        if not ruta.is_file():
            raise FileNotFoundError(ruta)
        tamano = ruta.stat().st_size
        sha = sha256_archivo(ruta)
        identidad = tamano == entrada.tamano_bytes and sha == entrada.sha256

        fitz.TOOLS.mupdf_warnings(reset=True)
        documento = fitz.open(ruta)
        if documento.needs_pass:
            raise ValueError("PDF protegido con contraseña")
        paginas: list[str] = []
        geometria: list[tuple[float, float, int]] = []
        paginas_con_texto = 0
        for pagina in documento:
            texto = pagina.get_text("text")
            paginas.append(texto)
            geometria.append((pagina.rect.width, pagina.rect.height, pagina.rotation))
            if re.sub(r"\s+", "", texto):
                paginas_con_texto += 1
        advertencias = fitz.TOOLS.mupdf_warnings(reset=True).strip()
        documento.close()

        bruto = "\n".join(
            f"===== [PAGINA {indice} de {len(paginas)}] =====\n{texto.rstrip()}"
            for indice, texto in enumerate(paginas, 1)
        ) + "\n"
        caracteres = len(re.sub(r"\s+", "", "\n".join(paginas)))
        ratio_texto = paginas_con_texto / len(paginas) if paginas else 0.0
        precandidato = (
            identidad and not advertencias and len(paginas) >= MINIMO_PAGINAS
            and caracteres >= UMBRAL_CARACTERES
            and ratio_texto >= UMBRAL_TEXTO_PAGINAS
        )
        resultado.update(
            {
                "identidad": identidad,
                "tamano_fisico": tamano,
                "sha256_fisico": sha,
                "advertencias": advertencias,
                "paginas": len(paginas),
                "paginas_con_texto": paginas_con_texto,
                "ratio_texto": round(ratio_texto, 6),
                "caracteres": caracteres,
                "precandidato": precandidato,
                "bruto": bruto,
                "paginas_texto": paginas,
                "orden": _control_orden(paginas, geometria),
                "inicio": _control_inicio(paginas, entrada.titulo, entrada.fecha),
                "cierre": _control_cierre(paginas),
                "cortes_guion": len(CORTE_GUION_RE.findall(bruto)),
            }
        )
    except Exception as error:
        resultado.update(
            {
                "identidad": False, "precandidato": False,
                "error": f"{type(error).__name__}: {error}",
                "bruto": "", "paginas_texto": [], "paginas": 0,
                "orden": {"pass": False}, "inicio": {"pass": False},
                "cierre": {"pass": False}, "cortes_guion": 0,
            }
        )
    return resultado


def _tokens_para_duplicacion(texto_normalizado: str) -> list[str]:
    sin_separadores = SEPARADOR_PAGINA_RE.sub(" ", texto_normalizado)
    return PALABRA_RE.findall(plegar(sin_separadores))


_MASCARA_64 = (1 << 64) - 1
_BASE_ROLLING = 1_000_003
_POTENCIA_7 = pow(_BASE_ROLLING, 7, 1 << 64)
_TOKEN_HASH_CACHE: dict[str, int] = {}


def _hash_token(token: str) -> int:
    existente = _TOKEN_HASH_CACHE.get(token)
    if existente is not None:
        return existente
    valor = 14_695_981_039_346_656_037
    for byte in token.encode("utf-8"):
        valor ^= byte
        valor = (valor * 1_099_511_628_211) & _MASCARA_64
    _TOKEN_HASH_CACHE[token] = valor
    return valor


def _gramas_ocho(tokens: list[str]) -> array:
    if len(tokens) < 8:
        return array("Q")
    valores = [_hash_token(token) for token in tokens]
    rolling = 0
    for valor in valores[:8]:
        rolling = ((rolling * _BASE_ROLLING) + valor) & _MASCARA_64
    hashes: set[int] = {rolling}
    for indice in range(8, len(valores)):
        rolling = (
            ((rolling - (valores[indice - 8] * _POTENCIA_7)) & _MASCARA_64)
            * _BASE_ROLLING
            + valores[indice]
        ) & _MASCARA_64
        hashes.add(rolling)
    return array("Q", sorted(hashes))


def _interseccion_ordenada(izquierda: array, derecha: array) -> int:
    i = j = total = 0
    while i < len(izquierda) and j < len(derecha):
        if izquierda[i] == derecha[j]:
            total += 1
            i += 1
            j += 1
        elif izquierda[i] < derecha[j]:
            i += 1
        else:
            j += 1
    return total


class IndiceJaccardExacto:
    """Filtro de prefijos sin falsos negativos seguido de Jaccard exacto."""

    def __init__(self, umbral: float) -> None:
        self.umbral = umbral
        self.documentos: list[array] = []
        self.ids: list[str] = []
        self.prefijos: dict[int, list[int]] = defaultdict(list)

    def _largo_prefijo(self, largo: int) -> int:
        return max(0, largo - math.ceil(self.umbral * largo) + 1)

    def buscar(self, gramas: array) -> tuple[str | None, float]:
        candidatos: set[int] = set()
        for token in gramas[: self._largo_prefijo(len(gramas))]:
            candidatos.update(self.prefijos.get(token, ()))
        mejor_id: str | None = None
        mejor = 0.0
        for indice in candidatos:
            otro = self.documentos[indice]
            if len(otro) < self.umbral * len(gramas) or len(otro) > len(gramas) / self.umbral:
                continue
            interseccion = _interseccion_ordenada(gramas, otro)
            union = len(gramas) + len(otro) - interseccion
            similitud = interseccion / union if union else 1.0
            if similitud > mejor:
                mejor = similitud
                mejor_id = self.ids[indice]
        return (mejor_id, mejor) if mejor >= self.umbral else (None, mejor)

    def agregar(self, documento_id: str, gramas: array) -> None:
        indice = len(self.documentos)
        self.documentos.append(gramas)
        self.ids.append(documento_id)
        for token in gramas[: self._largo_prefijo(len(gramas))]:
            self.prefijos[token].append(indice)


def _orden_seleccion(resultado: dict[str, Any]) -> tuple[Any, ...]:
    entrada = resultado["entrada"]
    fecha = entrada["fecha"] or "9999-99-99"
    return (fecha, -int(resultado["paginas"]), entrada["documento_id"])


def _seleccionar_muestra(resultados: list[dict[str, Any]]) -> list[dict[str, Any]]:
    precandidatos = [fila for fila in resultados if fila["precandidato"]]
    por_guiones = sorted(
        precandidatos,
        key=lambda fila: (-fila["cortes_guion"], _orden_seleccion(fila)),
    )[:100]
    elegidos = {fila["entrada"]["documento_id"]: fila for fila in por_guiones}

    grupos: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for fila in sorted(precandidatos, key=_orden_seleccion):
        decada = (fila["entrada"]["fecha"][:3] + "0s") if fila["entrada"]["fecha"] else "sin_fecha"
        grupos[decada].append(fila)
    while len(elegidos) < MUESTRA_RECERTIFICACION_CANDIDATOS:
        cambio = False
        for decada in sorted(grupos):
            grupo = grupos[decada]
            if not grupo:
                continue
            indices = [0, len(grupo) // 2, len(grupo) - 1]
            for indice in indices:
                fila = grupo[indice]
                clave = fila["entrada"]["documento_id"]
                if clave not in elegidos:
                    elegidos[clave] = fila
                    cambio = True
                    break
            if len(elegidos) >= MUESTRA_RECERTIFICACION_CANDIDATOS:
                break
        if not cambio:
            for fila in sorted(precandidatos, key=_orden_seleccion):
                elegidos.setdefault(fila["entrada"]["documento_id"], fila)
                if len(elegidos) >= MUESTRA_RECERTIFICACION_CANDIDATOS:
                    break
            break
    return list(elegidos.values())[:MUESTRA_RECERTIFICACION_CANDIDATOS]


def _auditar_recertificacion(
    resultados: list[dict[str, Any]],
    evidencia: Any,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    muestra = _seleccionar_muestra(resultados)
    filas_auditoria: list[dict[str, Any]] = []
    indebidas: list[dict[str, Any]] = []

    fuentes: list[tuple[str, str, str, str]] = []
    for fila in muestra:
        entrada = fila["entrada"]
        fuentes.append((entrada["documento_id"], entrada["fecha"], entrada["titulo"], fila["bruto"]))
    for piloto in leer_csv(PILOTO):
        fuentes.append(
            (
                piloto["documento_id"], piloto["fecha"], piloto["titulo"],
                Path(piloto["ruta_texto_bruto"]).read_text(encoding="utf-8"),
            )
        )

    for documento_id, fecha, titulo, bruto in fuentes:
        antes = SEPARADOR_PAGINA_RE.findall(bruto)
        _, decisiones = normalizar_paginado_v2(bruto, evidencia)
        for decision in decisiones:
            fila = {
                "documento_id": documento_id,
                "fecha": fecha,
                "titulo": titulo,
                **asdict(decision),
            }
            filas_auditoria.append(fila)
            if decision.accion == "unir" and (
                decision.motivo
                not in {
                    "forma_unida_atestiguada",
                    "union_legitima_certificada_piloto",
                }
                or (
                    decision.motivo == "forma_unida_atestiguada"
                    and (
                        decision.frecuencia_unida < 2
                        or decision.frecuencia_con_guion > 0
                    )
                )
            ):
                indebidas.append(fila)
        despues, _ = normalizar_paginado_v2(bruto, evidencia)
        if SEPARADOR_PAGINA_RE.findall(despues) != antes:
            indebidas.append(
                {
                    "documento_id": documento_id,
                    "fecha": fecha,
                    "titulo": titulo,
                    "accion": "alteracion_paginas",
                    "motivo": "separadores_distintos",
                }
            )
    return filas_auditoria, indebidas


def _motivo_basico(fila: dict[str, Any]) -> str | None:
    if not fila["identidad"] or fila["advertencias"] or fila["error"]:
        return "otros"
    if not fila["orden"]["pass"]:
        return "orden_logico"
    if not fila["inicio"]["pass"]:
        return "inicio"
    if not fila["cierre"]["pass"]:
        return "cierre"
    return None


def _escribir_csv(ruta: Path, filas: list[dict[str, Any]], campos: list[str]) -> None:
    with ruta.open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.DictWriter(
            stream,
            fieldnames=campos,
            extrasaction="ignore",
            lineterminator="\n",
        )
        writer.writeheader()
        writer.writerows(filas)


def ejecutar() -> None:
    universo = construir_universo()
    firma_universo = hashlib.sha256(
        json.dumps(
            [asdict(entrada) for entrada in universo],
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        ).encode("utf-8")
    ).hexdigest()
    resultados: list[dict[str, Any]]
    if CACHE_EXTRACCION.is_file():
        with CACHE_EXTRACCION.open("rb") as stream:
            cache = pickle.load(stream)
        if cache.get("firma_universo") == firma_universo:
            resultados = cache["resultados"]
            print("FASE_EXTRACCION=CACHE_VALIDO", flush=True)
        else:
            CACHE_EXTRACCION.unlink()
            resultados = []
    else:
        resultados = []
    if not resultados:
        print("FASE_EXTRACCION=INICIO", flush=True)
        with ProcessPoolExecutor(max_workers=PROCESOS) as executor:
            resultados = list(executor.map(inspeccionar_pdf, universo, chunksize=4))
        CACHE_EXTRACCION.parent.mkdir(parents=True, exist_ok=True)
        with CACHE_EXTRACCION.open("wb") as stream:
            pickle.dump(
                {"firma_universo": firma_universo, "resultados": resultados},
                stream,
                protocol=pickle.HIGHEST_PROTOCOL,
            )
        print("FASE_EXTRACCION=PASS", flush=True)

    discrepancias = [
        fila for fila in resultados
        if fila["error"] or not fila["identidad"]
    ]
    if discrepancias:
        raise RuntimeError(
            f"DETENCION: {len(discrepancias)} discrepancias dentro del universo candidato"
        )

    precandidatos = [fila for fila in resultados if fila["precandidato"]]
    if len(precandidatos) != 3989:
        raise RuntimeError(
            f"DETENCION: se esperaban 3989 precandidatos y se obtuvieron {len(precandidatos)}"
        )

    evidencia = construir_evidencia_lexica(fila["bruto"] for fila in precandidatos)
    print(f"FASE_LEXICO=PASS SHA256={evidencia.sha256}", flush=True)
    auditoria, indebidas = _auditar_recertificacion(resultados, evidencia)
    if indebidas:
        raise RuntimeError(
            f"DETENCION: {len(indebidas)} alteraciones indebidas en recertificacion"
        )
    print(
        f"FASE_RECERTIFICACION=PASS DECISIONES={len(auditoria)} INDEBIDAS=0",
        flush=True,
    )

    seleccionados: list[dict[str, Any]] = []
    rechazados: list[dict[str, Any]] = []
    indice = IndiceJaccardExacto(UMBRAL_JACCARD)
    hashes_texto: dict[str, str] = {}
    conferencias: set[str] = set()
    evaluados = 0

    for fila in sorted(precandidatos, key=_orden_seleccion):
        if len(seleccionados) >= OBJETIVO:
            break
        evaluados += 1
        if evaluados % 100 == 0:
            print(
                f"FASE_SELECCION EVALUADOS={evaluados} "
                f"APROBADOS={len(seleccionados)} RECHAZADOS={len(rechazados)}",
                flush=True,
            )
        entrada = fila["entrada"]
        motivo = _motivo_basico(fila)
        detalle = ""
        similitud = 0.0
        duplicado_de = ""

        if motivo is None and entrada["conferencia_id"] in conferencias:
            motivo = "duplicacion"
            detalle = "conferencia_id ya seleccionado"

        texto_normalizado = ""
        if motivo is None:
            texto_normalizado, _ = normalizar_paginado_v2(fila["bruto"], evidencia)
            hash_texto = sha256_texto(texto_normalizado)
            if hash_texto in hashes_texto:
                motivo = "duplicacion"
                duplicado_de = hashes_texto[hash_texto]
                similitud = 1.0
                detalle = "texto normalizado exacto"

        gramas = array("Q")
        if motivo is None:
            gramas = _gramas_ocho(_tokens_para_duplicacion(texto_normalizado))
            duplicado_de, similitud = indice.buscar(gramas)
            if duplicado_de:
                motivo = "duplicacion"
                detalle = f"Jaccard 8-gramas={similitud:.6f}"

        if motivo is not None:
            rechazados.append(
                {
                    "documento_id": entrada["documento_id"],
                    "conferencia_id": entrada["conferencia_id"],
                    "ruta": str(PDF_ROOT / entrada["ruta_relativa"]),
                    "fecha": entrada["fecha"],
                    "titulo": entrada["titulo"],
                    "motivo": motivo,
                    "detalle": detalle,
                    "duplicado_de": duplicado_de or "",
                    "similitud_jaccard": f"{similitud:.6f}",
                }
            )
            continue

        hash_texto = sha256_texto(texto_normalizado)
        hashes_texto[hash_texto] = entrada["documento_id"]
        conferencias.add(entrada["conferencia_id"])
        indice.agregar(entrada["documento_id"], gramas)
        seleccionados.append(
            {
                "ruta": str(PDF_ROOT / entrada["ruta_relativa"]),
                "documento_id": entrada["documento_id"],
                "conferencia_id": entrada["conferencia_id"],
                "fecha": entrada["fecha"],
                "titulo": entrada["titulo"],
                "paginas": fila["paginas"],
                "estado_control": "APROBADO",
                "sha256_pdf": entrada["sha256"].upper(),
                "normalizador": VERSION_NORMALIZACION,
                "sha256_lexico": evidencia.sha256,
                "orden_logico": "PASS",
                "paginas_numeradas": fila["orden"]["paginas_numeradas"],
                "desfase_folios": fila["orden"]["desfase"],
                "consistencia_orden": fila["orden"]["consistencia"],
                "inicio": "PASS",
                "cierre": "PASS",
                "duplicacion": "PASS",
                "jaccard_maximo": f"{similitud:.6f}",
            }
        )

    if len(seleccionados) < OBJETIVO:
        raise RuntimeError(
            f"No fue posible obtener {OBJETIVO}: solo {len(seleccionados)} aprobados"
        )

    SALIDA.mkdir(parents=True, exist_ok=True)
    campos_manifest = [
        "ruta", "documento_id", "conferencia_id", "fecha", "titulo", "paginas",
        "estado_control", "sha256_pdf", "normalizador", "sha256_lexico",
        "orden_logico", "paginas_numeradas", "desfase_folios",
        "consistencia_orden", "inicio", "cierre", "duplicacion", "jaccard_maximo",
    ]
    _escribir_csv(MANIFIESTO_960, seleccionados, campos_manifest)
    _escribir_csv(
        RECHAZOS,
        rechazados,
        [
            "documento_id", "conferencia_id", "ruta", "fecha", "titulo",
            "motivo", "detalle", "duplicado_de", "similitud_jaccard",
        ],
    )
    campos_auditoria = [
        "documento_id", "fecha", "titulo", "izquierda", "derecha",
        "forma_unida", "forma_con_guion", "accion", "motivo",
        "frecuencia_unida", "frecuencia_con_guion", "contexto",
    ]
    _escribir_csv(AUDITORIA_RECERTIFICACION, auditoria, campos_auditoria)

    motivos = Counter(fila["motivo"] for fila in rechazados)
    resumen = {
        "generado_utc": datetime.now(timezone.utc).isoformat(),
        "normalizador_anterior": "normalizacion_paginada_v1",
        "normalizador_corregido": VERSION_NORMALIZACION,
        "sha256_lexico": evidencia.sha256,
        "universo_vinculado_auto_sin_piloto": len(universo),
        "precandidatos": len(precandidatos),
        "muestra_recertificacion_candidatos": MUESTRA_RECERTIFICACION_CANDIDATOS,
        "muestra_recertificacion_piloto": 40,
        "muestra_recertificacion_total": MUESTRA_RECERTIFICACION_CANDIDATOS + 40,
        "decisiones_guion_auditadas": len(auditoria),
        "alteraciones_indebidas": len(indebidas),
        "precandidatos_evaluados_hasta_objetivo": evaluados,
        "aprobados": len(seleccionados),
        "rechazados": len(rechazados),
        "motivos_rechazo": dict(sorted(motivos.items())),
        "conjunto_960_disponible": len(seleccionados) == OBJETIVO,
        "manifiesto": str(MANIFIESTO_960),
        "sha256_manifiesto": sha256_archivo(MANIFIESTO_960).upper(),
        "auditoria_recertificacion": str(AUDITORIA_RECERTIFICACION),
        "sha256_auditoria": sha256_archivo(AUDITORIA_RECERTIFICACION).upper(),
        "rechazos_archivo": str(RECHAZOS),
        "sha256_rechazos": sha256_archivo(RECHAZOS).upper(),
        "sin_embeddings": True,
        "sin_supabase": True,
    }
    with RESUMEN.open("w", encoding="utf-8", newline="\n") as stream:
        stream.write(json.dumps(resumen, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(resumen, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    ejecutar()
