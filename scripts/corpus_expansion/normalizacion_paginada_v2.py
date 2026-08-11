"""Normalizacion paginada conservadora para la expansion del corpus.

Esta version NO reemplaza ``normalizacion_paginada_v1``. Reproduce sus reglas
estructurales documentadas, pero restringe la union de palabras partidas por
guion. Una union solo se acepta cuando existe evidencia lexica positiva en el
universo de referencia y no hay evidencia de que la forma con guion sea real.
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
import hashlib
import json
import re
from typing import Iterable


VERSION_NORMALIZACION = "normalizacion_paginada_v2_1_guiones_lexico_20260811"

# Unicas excepciones positivas: las cinco uniones silabicas verificadas
# manualmente y selladas en ACTA_CORRECCION_NORMALIZACION_CORPUS_40.md.
UNIONES_LEGITIMAS_CERTIFICADAS = {
    ("derra", "mó"),
    ("escogi", "dos"),
    ("bendi", "ción"),
    ("dispen", "sación"),
    ("conde", "nación"),
}

SEPARADOR_PAGINA_RE = re.compile(
    r"^===== \[PAGINA (?P<pagina>\d+) de (?P<total>\d+)\] =====$",
    re.MULTILINE,
)
FOLIO_RE = re.compile(r"^\s*[-\u2013\u2014]?\s*\d{1,4}\s*[-\u2013\u2014]?\s*$")
PALABRA_RE = re.compile(r"[^\W\d_]+", re.UNICODE)
PALABRA_CON_GUION_RE = re.compile(
    r"(?<![^\W\d_])([^\W\d_]+)-([^\W\d_]+)(?![^\W\d_])",
    re.UNICODE,
)
CORTE_GUION_RE = re.compile(
    r"(?P<izquierda>[^\W\d_]{2,})-[ \t]*\n[ \t]*(?P<derecha>[^\W\d_]{2,})",
    re.UNICODE,
)
URL_EN_LINEA_RE = re.compile(
    r"(?:https?://|www\.|(?:[\w.-]+\.)+[a-z]{2,}/)\S*$",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class EvidenciaLexica:
    palabras: Counter[str]
    formas_con_guion: Counter[str]

    @property
    def sha256(self) -> str:
        payload = {
            "palabras": sorted(self.palabras.items()),
            "formas_con_guion": sorted(self.formas_con_guion.items()),
        }
        serializado = json.dumps(
            payload,
            ensure_ascii=False,
            separators=(",", ":"),
        ).encode("utf-8")
        return hashlib.sha256(serializado).hexdigest().upper()


@dataclass(frozen=True)
class DecisionGuion:
    izquierda: str
    derecha: str
    forma_unida: str
    forma_con_guion: str
    accion: str
    motivo: str
    frecuencia_unida: int
    frecuencia_con_guion: int
    contexto: str


def _sin_autovalidar_cortes(texto: str) -> str:
    """Retira cada candidato de corte antes de construir el lexico.

    Las dos partes quedan separadas. Asi una ocurrencia partida no puede servir
    como su propia prueba para autorizar la union.
    """

    return CORTE_GUION_RE.sub(
        lambda match: f"{match.group('izquierda')} {match.group('derecha')}",
        texto.replace("\r\n", "\n").replace("\r", "\n"),
    )


def construir_evidencia_lexica(textos: Iterable[str]) -> EvidenciaLexica:
    palabras: Counter[str] = Counter()
    formas_con_guion: Counter[str] = Counter()
    for texto in textos:
        limpio = _sin_autovalidar_cortes(texto)
        palabras.update(token.casefold() for token in PALABRA_RE.findall(limpio))
        formas_con_guion.update(
            f"{izquierda}-{derecha}".casefold()
            for izquierda, derecha in PALABRA_CON_GUION_RE.findall(limpio)
        )
    return EvidenciaLexica(palabras, formas_con_guion)


def _contexto(texto: str, inicio: int, fin: int, radio: int = 90) -> str:
    return re.sub(
        r"\s+",
        " ",
        texto[max(0, inicio - radio) : min(len(texto), fin + radio)],
    ).strip()


def _decidir_union(
    texto: str,
    match: re.Match[str],
    evidencia: EvidenciaLexica,
) -> DecisionGuion:
    izquierda = match.group("izquierda")
    derecha = match.group("derecha")
    unida = f"{izquierda}{derecha}"
    con_guion = f"{izquierda}-{derecha}"
    unida_cf = unida.casefold()
    guion_cf = con_guion.casefold()
    frecuencia_unida = evidencia.palabras[unida_cf]
    frecuencia_guion = evidencia.formas_con_guion[guion_cf]

    inicio_linea = texto.rfind("\n", 0, match.start()) + 1
    prefijo_linea = texto[inicio_linea : match.start()]
    ventana = texto[max(0, match.start() - 250) : match.start()]

    pareja_cf = (izquierda.casefold(), derecha.casefold())
    if URL_EN_LINEA_RE.search(f"{prefijo_linea}{izquierda}"):
        accion, motivo = "conservar", "url"
    elif ventana.count("[") > ventana.count("]"):
        accion, motivo = "conservar", "anotacion_corchetes"
    elif izquierda.casefold() == derecha.casefold():
        accion, motivo = "conservar", "repeticion_literal"
    elif pareja_cf in UNIONES_LEGITIMAS_CERTIFICADAS:
        accion, motivo = "unir", "union_legitima_certificada_piloto"
    elif frecuencia_guion > 0:
        accion, motivo = "conservar", "forma_con_guion_atestiguada"
    elif frecuencia_unida < 2:
        accion, motivo = "conservar", "sin_evidencia_lexica_suficiente"
    else:
        accion, motivo = "unir", "forma_unida_atestiguada"

    return DecisionGuion(
        izquierda=izquierda,
        derecha=derecha,
        forma_unida=unida,
        forma_con_guion=con_guion,
        accion=accion,
        motivo=motivo,
        frecuencia_unida=frecuencia_unida,
        frecuencia_con_guion=frecuencia_guion,
        contexto=_contexto(texto, match.start(), match.end()),
    )


def normalizar_guiones_v1_documentada(texto: str) -> str:
    """Reproduce solamente la regla amplia documentada de v1."""

    texto = texto.replace("\r\n", "\n").replace("\r", "\n")
    return CORTE_GUION_RE.sub(
        lambda match: f"{match.group('izquierda')}{match.group('derecha')}",
        texto,
    )


def normalizar_guiones_v2(
    texto: str,
    evidencia: EvidenciaLexica,
) -> tuple[str, list[DecisionGuion]]:
    texto = texto.replace("\r\n", "\n").replace("\r", "\n")
    decisiones: list[DecisionGuion] = []

    def reemplazar(match: re.Match[str]) -> str:
        decision = _decidir_union(texto, match, evidencia)
        decisiones.append(decision)
        if decision.accion == "unir":
            return decision.forma_unida
        return f"{decision.izquierda}-{decision.derecha}"

    return CORTE_GUION_RE.sub(reemplazar, texto), decisiones


def normalizar_paginado_v2(
    texto: str,
    evidencia: EvidenciaLexica,
) -> tuple[str, list[DecisionGuion]]:
    """Normaliza sin cambiar el numero ni el orden de los separadores."""

    original = texto.replace("\r\n", "\n").replace("\r", "\n")
    separadores_antes = SEPARADOR_PAGINA_RE.findall(original)
    normalizado, decisiones = normalizar_guiones_v2(original, evidencia)

    lineas: list[str] = []
    for linea in normalizado.split("\n"):
        linea = re.sub(r"[ \t]+", " ", linea).rstrip()
        if FOLIO_RE.fullmatch(linea):
            continue
        lineas.append(linea)

    normalizado = "\n".join(lineas)
    normalizado = re.sub(r"\n{3,}", "\n\n", normalizado).strip() + "\n"
    separadores_despues = SEPARADOR_PAGINA_RE.findall(normalizado)
    if separadores_despues != separadores_antes:
        raise ValueError("La normalizacion altero los separadores de pagina")
    return normalizado, decisiones
