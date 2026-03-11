"use client";

import { useRef, useEffect, useCallback } from "react";
import { usePlayerStore } from "@/store";

export function PersistentPlayer() {
    const audioRef = useRef<HTMLAudioElement>(null);
    const conferencia = usePlayerStore((s) => s.conferencia_activa);
    const estaReproduciendo = usePlayerStore((s) => s.esta_reproduciendo);
    const tiempoActual = usePlayerStore((s) => s.tiempo_actual);
    const duracion = usePlayerStore((s) => s.duracion);
    const volumen = usePlayerStore((s) => s.volumen);
    const toggle = usePlayerStore((s) => s.toggle);
    const setTiempoActual = usePlayerStore((s) => s.setTiempoActual);
    const setDuracion = usePlayerStore((s) => s.setDuracion);
    const setVolumen = usePlayerStore((s) => s.setVolumen);
    const detener = usePlayerStore((s) => s.detener);

    // Sync play/pause with audio element
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        if (estaReproduciendo) {
            audio.play().catch(() => { });
        } else {
            audio.pause();
        }
    }, [estaReproduciendo]);

    // Sync volume
    useEffect(() => {
        const audio = audioRef.current;
        if (audio) audio.volume = volumen;
    }, [volumen]);

    // Load new source when conferencia changes
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !conferencia?.multimedia?.audio_url) return;
        audio.src = conferencia.multimedia.audio_url;
        audio.load();
    }, [conferencia]);

    const handleTimeUpdate = useCallback(() => {
        const audio = audioRef.current;
        if (audio) setTiempoActual(audio.currentTime);
    }, [setTiempoActual]);

    const handleLoadedMetadata = useCallback(() => {
        const audio = audioRef.current;
        if (audio) setDuracion(audio.duration);
    }, [setDuracion]);

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = Number(e.target.value);
        setTiempoActual(time);
        if (audioRef.current) audioRef.current.currentTime = time;
    };

    const formatTime = (seconds: number) => {
        if (!seconds || !isFinite(seconds)) return "0:00";
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    const progressPct = duracion > 0 ? (tiempoActual / duracion) * 100 : 0;

    // Don't render if no conferencia loaded
    if (!conferencia) return null;

    const formattedDate = new Date(conferencia.fecha_impartida).toLocaleDateString(
        "es-ES",
        { year: "numeric", month: "short", day: "numeric" }
    );

    return (
        <>
            {/* Hidden audio element */}
            <audio
                ref={audioRef}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => detener()}
                preload="metadata"
            />

            {/* ── Player Bar ── */}
            <div
                className="fixed bottom-0 left-0 right-0 z-50"
                style={{
                    height: "96px",
                    background: "rgba(10, 10, 46, 0.8)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    borderTop: "1px solid rgba(212, 175, 55, 0.3)",
                }}
            >
                <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-6">

                    {/* ── Left: Metadata ── */}
                    <div className="flex items-center gap-4 w-1/4 min-w-0">
                        {/* Thumbnail */}
                        <div
                            className="h-14 w-14 shrink-0 rounded overflow-hidden flex items-center justify-center"
                            style={{
                                background: "var(--color-bg-secondary)",
                                border: "1px solid rgba(212, 175, 55, 0.2)",
                            }}
                        >
                            <svg
                                width="24" height="24" viewBox="0 0 24 24" fill="none"
                                stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round"
                                className={estaReproduciendo ? "animate-spin-slow" : ""}
                            >
                                <circle cx="12" cy="12" r="10" />
                                <circle cx="12" cy="12" r="3" />
                            </svg>
                        </div>
                        <div className="flex flex-col min-w-0">
                            <h3
                                className="text-sm font-bold truncate leading-tight"
                                style={{ color: "var(--color-text-primary)" }}
                            >
                                {conferencia.titulo}
                            </h3>
                            <p className="text-[12px] font-medium mt-1" style={{ color: "var(--color-text-muted)" }}>
                                Conferencia • {formattedDate}
                            </p>
                        </div>
                    </div>

                    {/* ── Center: Controls + Progress ── */}
                    <div className="hidden md:flex flex-col items-center flex-1 max-w-2xl px-8">
                        {/* Transport Controls */}
                        <div className="flex items-center gap-6 mb-2">
                            <button
                                onClick={() => { if (audioRef.current) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 15); }}
                                className="transition-colors hover:text-[var(--color-gold)]"
                                style={{ color: "var(--color-text-muted)" }}
                                aria-label="Retroceder 15 segundos"
                            >
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <polyline points="1 4 1 10 7 10" />
                                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                                </svg>
                            </button>

                            {/* Play/Pause */}
                            <button
                                onClick={toggle}
                                className="h-11 w-11 rounded-full flex items-center justify-center transition-transform hover:scale-105"
                                style={{
                                    background: "var(--color-gold)",
                                    boxShadow: estaReproduciendo ? "0 0 20px rgba(212, 175, 55, 0.3)" : "none",
                                }}
                                aria-label={estaReproduciendo ? "Pausar" : "Reproducir"}
                            >
                                {estaReproduciendo ? (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#0a0a2e">
                                        <rect x="6" y="4" width="4" height="16" rx="1" />
                                        <rect x="14" y="4" width="4" height="16" rx="1" />
                                    </svg>
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#0a0a2e">
                                        <polygon points="5 3 19 12 5 21 5 3" />
                                    </svg>
                                )}
                            </button>

                            <button
                                onClick={() => { if (audioRef.current) audioRef.current.currentTime += 15; }}
                                className="transition-colors hover:text-[var(--color-gold)]"
                                style={{ color: "var(--color-text-muted)" }}
                                aria-label="Avanzar 15 segundos"
                            >
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <polyline points="23 4 23 10 17 10" />
                                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                                </svg>
                            </button>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full flex items-center gap-3">
                            <span className="text-[10px] font-medium w-10 text-right tabular-nums" style={{ color: "var(--color-text-muted)" }}>
                                {formatTime(tiempoActual)}
                            </span>
                            <div className="relative flex-1 h-1.5 rounded-full cursor-pointer overflow-hidden group"
                                style={{ background: "rgba(212, 175, 55, 0.1)" }}
                            >
                                {/* Filled portion */}
                                <div
                                    className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-100"
                                    style={{
                                        width: `${progressPct}%`,
                                        background: "linear-gradient(90deg, rgba(212, 175, 55, 0.6), var(--color-gold))",
                                    }}
                                />
                                {/* Invisible range input overlay */}
                                <input
                                    type="range"
                                    min={0}
                                    max={duracion || 100}
                                    value={tiempoActual}
                                    onChange={handleSeek}
                                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                                    style={{ height: "100%" }}
                                />
                                {/* Thumb indicator */}
                                <div
                                    className="absolute top-1/2 -translate-y-1/2 h-3 w-3 bg-white rounded-full shadow-md scale-0 group-hover:scale-100 transition-transform"
                                    style={{ left: `${progressPct}%` }}
                                />
                            </div>
                            <span className="text-[10px] font-medium w-12 tabular-nums" style={{ color: "var(--color-text-muted)" }}>
                                {formatTime(duracion)}
                            </span>
                        </div>
                    </div>

                    {/* ── Right: Secondary Controls ── */}
                    <div className="flex items-center justify-end gap-5 w-1/4">
                        {/* Volume */}
                        <div className="hidden lg:flex items-center gap-2 group">
                            <button
                                onClick={() => setVolumen(volumen > 0 ? 0 : 0.8)}
                                className="transition-colors hover:text-[var(--color-gold)]"
                                style={{ color: "var(--color-text-muted)" }}
                                aria-label="Volumen"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    {volumen === 0 ? (
                                        <>
                                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                            <line x1="23" y1="9" x2="17" y2="15" />
                                            <line x1="17" y1="9" x2="23" y2="15" />
                                        </>
                                    ) : (
                                        <>
                                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                                        </>
                                    )}
                                </svg>
                            </button>
                            <div className="w-20 h-1 rounded-full overflow-hidden" style={{ background: "rgba(212, 175, 55, 0.2)" }}>
                                <div
                                    className="h-full rounded-full transition-[width] duration-100"
                                    style={{ width: `${volumen * 100}%`, background: "rgba(212, 175, 55, 0.6)" }}
                                />
                            </div>
                            <input
                                type="range" min={0} max={1} step={0.05} value={volumen}
                                onChange={(e) => setVolumen(Number(e.target.value))}
                                className="absolute w-20 opacity-0 cursor-pointer"
                            />
                        </div>

                        {/* Speed */}
                        <button
                            className="hidden md:flex px-2 py-1 rounded text-[10px] font-bold transition-all hover:text-[var(--color-gold)] hover:border-[var(--color-gold)]"
                            style={{
                                border: "1px solid rgba(212, 175, 55, 0.2)",
                                color: "var(--color-text-muted)",
                            }}
                        >
                            1x
                        </button>

                        {/* Continuar Escuchando bookmark */}
                        <button
                            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors"
                            style={{
                                background: "rgba(212, 175, 55, 0.1)",
                                color: "var(--color-gold)",
                            }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--color-gold)" stroke="var(--color-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                            </svg>
                            <span className="text-[11px] font-bold uppercase tracking-wider">Guardar</span>
                        </button>

                        {/* Close */}
                        <button
                            onClick={detener}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[var(--color-surface-hover)]"
                            aria-label="Cerrar reproductor"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" strokeLinecap="round">
                                <path d="M18 6L6 18" />
                                <path d="M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* ── Mobile Mini-Player (below md) ── */}
                <div className="md:hidden absolute inset-0 flex flex-col justify-center px-4">
                    {/* Info + Controls */}
                    <div className="flex items-center gap-3">
                        <div
                            className="h-10 w-10 shrink-0 rounded flex items-center justify-center"
                            style={{ background: "var(--color-bg-secondary)", border: "1px solid rgba(212, 175, 55, 0.2)" }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="2" strokeLinecap="round" className={estaReproduciendo ? "animate-spin-slow" : ""}>
                                <circle cx="12" cy="12" r="10" />
                                <circle cx="12" cy="12" r="3" />
                            </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                                {conferencia.titulo}
                            </p>
                            <p className="truncate text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                                {formattedDate}
                            </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                            <button
                                onClick={toggle}
                                className="flex h-9 w-9 items-center justify-center rounded-full"
                                style={{ background: "var(--color-gold)" }}
                                aria-label={estaReproduciendo ? "Pausar" : "Reproducir"}
                            >
                                {estaReproduciendo ? (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#0a0a2e">
                                        <rect x="6" y="4" width="4" height="16" rx="1" />
                                        <rect x="14" y="4" width="4" height="16" rx="1" />
                                    </svg>
                                ) : (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#0a0a2e">
                                        <polygon points="5 3 19 12 5 21 5 3" />
                                    </svg>
                                )}
                            </button>
                            <button
                                onClick={detener}
                                className="flex h-8 w-8 items-center justify-center rounded-full"
                                aria-label="Cerrar"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" strokeLinecap="round">
                                    <path d="M18 6L6 18" />
                                    <path d="M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    {/* Mobile progress */}
                    <div className="mt-2 flex items-center gap-2">
                        <span className="w-8 text-right text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                            {formatTime(tiempoActual)}
                        </span>
                        <div className="relative flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(212, 175, 55, 0.1)" }}>
                            <div
                                className="absolute inset-y-0 left-0 rounded-full"
                                style={{ width: `${progressPct}%`, background: "var(--color-gold)" }}
                            />
                            <input
                                type="range" min={0} max={duracion || 100} value={tiempoActual}
                                onChange={handleSeek}
                                className="absolute inset-0 w-full opacity-0 cursor-pointer"
                            />
                        </div>
                        <span className="w-8 text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                            {formatTime(duracion)}
                        </span>
                    </div>
                </div>
            </div>
        </>
    );
}
