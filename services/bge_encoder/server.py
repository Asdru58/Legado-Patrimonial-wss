"""Servicio HTTP privado para el encoder BGE-M3 certificado.

Expone unicamente salud y codificacion. La canonicalizacion, tokenizacion,
validacion y generacion del vector pertenecen exclusivamente a ``encoder.py``.
"""

from __future__ import annotations

import argparse
import ctypes
import gc
import json
import signal
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

from encoder import (
    BGEQueryEncoder,
    DIMENSION,
    MODEL_ID,
    REVISION,
    QueryValidationError,
)


HOST = "127.0.0.1"
DEFAULT_PORT = 8766
MUTEX_NAME = r"Local\LegadoPatrimonial_BGE_Encoder_V1"
ERROR_ALREADY_EXISTS = 183
DUPLICATE_EXIT_CODE = 3
MAX_REQUEST_BYTES = 64 * 1024


class SingleInstanceMutex:
    """Mutex exclusivo de Windows mantenido durante toda la vida del proceso."""

    def __init__(self, name: str) -> None:
        self.name = name
        self.handle: int | None = None

    def acquire(self) -> bool:
        if sys.platform != "win32":
            raise RuntimeError(
                "La proteccion de instancia unica de la fase piloto requiere Windows."
            )

        kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
        create_mutex = kernel32.CreateMutexW
        create_mutex.argtypes = (ctypes.c_void_p, ctypes.c_bool, ctypes.c_wchar_p)
        create_mutex.restype = ctypes.c_void_p
        close_handle = kernel32.CloseHandle
        close_handle.argtypes = (ctypes.c_void_p,)
        close_handle.restype = ctypes.c_bool

        ctypes.set_last_error(0)
        handle = create_mutex(None, False, self.name)
        if not handle:
            raise ctypes.WinError(ctypes.get_last_error())
        if ctypes.get_last_error() == ERROR_ALREADY_EXISTS:
            close_handle(handle)
            return False

        self.handle = int(handle)
        return True

    def close(self) -> None:
        if self.handle is None:
            return

        kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
        close_handle = kernel32.CloseHandle
        close_handle.argtypes = (ctypes.c_void_p,)
        close_handle.restype = ctypes.c_bool
        handle, self.handle = self.handle, None
        if not close_handle(handle):
            raise ctypes.WinError(ctypes.get_last_error())


class LocalEncoderServer(ThreadingHTTPServer):
    """Servidor local cuyos hilos no impiden el cierre del proceso."""

    daemon_threads = True
    block_on_close = False


class EncoderHandler(BaseHTTPRequestHandler):
    """Transporte HTTP sin logica semantica propia."""

    encoder: BGEQueryEncoder | None = None
    encode_lock = threading.Lock()

    def log_message(self, fmt: str, *args: Any) -> None:
        sys.stderr.write("  " + (fmt % args) + "\n")

    def _send_json(self, status: int, payload: dict[str, Any]) -> None:
        encoded = json.dumps(
            payload,
            ensure_ascii=False,
            separators=(",", ":"),
            allow_nan=False,
        ).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(encoded)

    def _not_found(self) -> None:
        self._send_json(404, {"error": "Endpoint no encontrado."})

    def do_GET(self) -> None:  # noqa: N802
        if self.path != "/health":
            self._not_found()
            return

        self._send_json(
            200,
            {
                "status": "ok",
                "modelo": MODEL_ID,
                "revision": REVISION,
                "dimension": DIMENSION,
                "normalizado": True,
                "modelo_cargado": self.encoder is not None,
            },
        )

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/encode":
            self._not_found()
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self._send_json(400, {"error": "Content-Length invalido."})
            return

        if content_length <= 0 or content_length > MAX_REQUEST_BYTES:
            self._send_json(400, {"error": "Cuerpo JSON ausente o demasiado grande."})
            return

        try:
            payload = json.loads(self.rfile.read(content_length).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            self._send_json(400, {"error": "JSON invalido."})
            return

        if not isinstance(payload, dict):
            self._send_json(400, {"error": "El cuerpo debe ser un objeto JSON."})
            return

        query = payload.get("query")
        if query is not None and not isinstance(query, str):
            self._send_json(400, {"error": "query debe ser texto."})
            return

        encoder = self.encoder
        if encoder is None:
            self._send_json(500, {"error": "El modelo no esta disponible."})
            return

        try:
            with self.encode_lock:
                result = encoder.encode(query)
            self._send_json(
                200,
                {
                    "vector": result.vector.tolist(),
                    "modelo": MODEL_ID,
                    "revision": REVISION,
                    "normalizado": True,
                    "tokens": result.token_count,
                },
            )
        except QueryValidationError as error:
            self._send_json(400, {"error": str(error)})
        except Exception as error:
            print(
                f"ERROR interno en /encode: {type(error).__name__}: {error}",
                file=sys.stderr,
                flush=True,
            )
            self._send_json(500, {"error": "Error interno del codificador."})


def main() -> int:
    parser = argparse.ArgumentParser(description="Servicio privado BGE-M3")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error("--port debe estar entre 1 y 65535")

    mutex = SingleInstanceMutex(MUTEX_NAME)
    server: LocalEncoderServer | None = None

    def interrupt(_signum: int, _frame: Any) -> None:
        raise KeyboardInterrupt

    signal.signal(signal.SIGINT, interrupt)
    if hasattr(signal, "SIGBREAK"):
        signal.signal(signal.SIGBREAK, interrupt)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, interrupt)

    try:
        if not mutex.acquire():
            print(
                "INSTANCIA_DUPLICADA: encoder_construido=false; "
                "no se cargara otra copia de BGE-M3.",
                flush=True,
            )
            return DUPLICATE_EXIT_CODE

        print("MUTEX_ADQUIRIDO: cargando encoder BGE-M3 una sola vez.", flush=True)
        EncoderHandler.encoder = BGEQueryEncoder()
        print(
            f"ENCODER_CARGADO: modelo={MODEL_ID}; revision={REVISION}; "
            f"host={HOST}; port={args.port}",
            flush=True,
        )

        server = LocalEncoderServer((HOST, args.port), EncoderHandler)
        server.serve_forever()
    except KeyboardInterrupt:
        print("CIERRE_SOLICITADO: deteniendo servicio BGE-M3.", flush=True)
    except Exception as error:
        print(
            f"ERROR al iniciar o ejecutar el servicio: {type(error).__name__}: {error}",
            file=sys.stderr,
            flush=True,
        )
        return 1
    finally:
        try:
            if server is not None:
                server.server_close()
        finally:
            EncoderHandler.encoder = None
            gc.collect()
            try:
                mutex.close()
            except OSError as error:
                print(
                    f"ADVERTENCIA: no se pudo liberar el mutex: {error}",
                    file=sys.stderr,
                    flush=True,
                )
            print("SERVICIO_CERRADO: mutex_liberado=true.", flush=True)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
