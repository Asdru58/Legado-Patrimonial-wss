"use client";

import Link from "next/link";
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
} from "react";
import { useShallow } from "zustand/react/shallow";
import { usePlayerStore } from "@/store/playerStore";

const SYNC_INTERVAL_SECONDS = 5;

function normalizeTime(value: number): number {
    if (!Number.isFinite(value) || value < 0) {
        return 0;
    }

    return value;
}

function getAudioDuration(audio: HTMLAudioElement | null): number {
    if (!audio) {
        return 0;
    }

    return normalizeTime(audio.duration);
}

function formatTime(value: number): string {
    const totalSeconds = Math.floor(normalizeTime(value));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function PersistentPlayer() {
    const {
        currentTrack,
        playbackPosition,
        isPlaying,
        hasHydrated,
        hydrate,
        play,
        pause,
        clearCurrentTrack,
        setIsPlaying,
        savePlaybackState,
        syncPlayback,
    } = usePlayerStore(
        useShallow((state) => ({
            currentTrack: state.currentTrack,
            playbackPosition: state.playbackPosition,
            isPlaying: state.isPlaying,
            hasHydrated: state.hasHydrated,
            hydrate: state.hydrate,
            play: state.play,
            pause: state.pause,
            clearCurrentTrack: state.clearCurrentTrack,
            setIsPlaying: state.setIsPlaying,
            savePlaybackState: state.savePlaybackState,
            syncPlayback: state.syncPlayback,
        })),
    );

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const durationRef = useRef(0);
    const lastSyncedSecondRef = useRef(0);
    const pendingInitialSeekRef = useRef(false);
    const isEndingRef = useRef(false);

    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        if (!hasHydrated) {
            void hydrate();
        }
    }, [hasHydrated, hydrate]);

    useEffect(() => {
        if (!hasHydrated) {
            return;
        }

        if (!currentTrack) {
            setCurrentTime(0);
            setDuration(0);
            durationRef.current = 0;
            lastSyncedSecondRef.current = 0;
            pendingInitialSeekRef.current = false;

            if (audioRef.current && !audioRef.current.paused) {
                audioRef.current.pause();
            }

            return;
        }

        setCurrentTime(normalizeTime(playbackPosition));
        lastSyncedSecondRef.current = Math.floor(normalizeTime(playbackPosition));
        pendingInitialSeekRef.current = true;
    }, [hasHydrated, currentTrack?.conferencia_id, currentTrack?.url_audio, playbackPosition]);

    useEffect(() => {
        if (!hasHydrated || !currentTrack) {
            return;
        }

        const audio = audioRef.current;

        if (!audio) {
            return;
        }

        if (audio.readyState < 1) {
            return;
        }

        const targetTime = normalizeTime(playbackPosition);
        const drift = Math.abs(audio.currentTime - targetTime);

        if (drift > 1.5) {
            audio.currentTime = targetTime;
            setCurrentTime(targetTime);
        }
    }, [hasHydrated, currentTrack?.conferencia_id, playbackPosition]);

    useEffect(() => {
        if (!hasHydrated || !currentTrack) {
            return;
        }

        const audio = audioRef.current;

        if (!audio) {
            return;
        }

        if (isPlaying) {
            void audio.play().catch(() => {
                setIsPlaying(false);
            });

            return;
        }

        if (!audio.paused) {
            audio.pause();
        }
    }, [
        hasHydrated,
        currentTrack?.conferencia_id,
        currentTrack?.url_audio,
        isPlaying,
        setIsPlaying,
    ]);

    const flushPlaybackSnapshot = useCallback(() => {
        const audio = audioRef.current;

        if (!audio || !currentTrack) {
            return;
        }

        const nextCurrentTime = normalizeTime(audio.currentTime);
        const nextDuration = getAudioDuration(audio) || durationRef.current;

        savePlaybackState(nextCurrentTime);
        syncPlayback({
            currentTime: nextCurrentTime,
            duration: nextDuration,
        });

        setCurrentTime(nextCurrentTime);
        lastSyncedSecondRef.current = Math.floor(nextCurrentTime);
    }, [currentTrack, savePlaybackState, syncPlayback]);


    const handleLoadedMetadata = useCallback(() => {
        const audio = audioRef.current;

        if (!audio) {
            return;
        }

        const nextDuration = getAudioDuration(audio);
        durationRef.current = nextDuration;
        setDuration(nextDuration);

        if (!pendingInitialSeekRef.current) {
            return;
        }

        const nextPlaybackPosition = normalizeTime(playbackPosition);
        const restoreTo =
            nextDuration > 0
                ? Math.min(nextPlaybackPosition, nextDuration)
                : nextPlaybackPosition;

        if (restoreTo > 0) {
            audio.currentTime = restoreTo;
            setCurrentTime(restoreTo);
        }

        pendingInitialSeekRef.current = false;
    }, [playbackPosition]);

    const handleDurationChange = useCallback(() => {
        const audio = audioRef.current;
        const nextDuration = getAudioDuration(audio);

        durationRef.current = nextDuration;
        setDuration(nextDuration);
    }, []);

    const handleTimeUpdate = useCallback(() => {
        const audio = audioRef.current;

        if (!audio) {
            return;
        }

        const nextCurrentTime = normalizeTime(audio.currentTime);
        const nextDuration = getAudioDuration(audio) || durationRef.current;
        const wholeSeconds = Math.floor(nextCurrentTime);

        setCurrentTime(nextCurrentTime);

        if (Math.abs(wholeSeconds - lastSyncedSecondRef.current) >= SYNC_INTERVAL_SECONDS) {
            lastSyncedSecondRef.current = wholeSeconds;

            savePlaybackState(nextCurrentTime);
            syncPlayback({
                currentTime: nextCurrentTime,
                duration: nextDuration,
            });
        }
    }, [savePlaybackState, syncPlayback]);

    const handlePlay = useCallback(() => {
        setIsPlaying(true);
    }, [setIsPlaying]);

    const handlePause = useCallback(() => {
        if (isEndingRef.current) {
            isEndingRef.current = false;
            return;
        }

        const audio = audioRef.current;

        if (!audio) {
            pause(currentTime);
            return;
        }

        const nextCurrentTime = normalizeTime(audio.currentTime);
        const nextDuration = getAudioDuration(audio) || durationRef.current;

        pause(nextCurrentTime);
        syncPlayback({
            currentTime: nextCurrentTime,
            duration: nextDuration,
        });

        setCurrentTime(nextCurrentTime);
        lastSyncedSecondRef.current = Math.floor(nextCurrentTime);
    }, [currentTime, pause, syncPlayback]);

    const handleEnded = useCallback(() => {
        const audio = audioRef.current;
        const finalDuration = getAudioDuration(audio) || durationRef.current;

        isEndingRef.current = true;

        syncPlayback({
            currentTime: finalDuration,
            duration: finalDuration,
        });

        if (audio) {
            audio.currentTime = 0;
        }

        savePlaybackState(0);
        pause(0);
        setCurrentTime(0);
        lastSyncedSecondRef.current = 0;
    }, [pause, savePlaybackState, syncPlayback]);

    const handleProgressChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            const nextTime = normalizeTime(Number(event.target.value));
            const audio = audioRef.current;

            if (audio) {
                audio.currentTime = nextTime;
            }

            setCurrentTime(nextTime);
            savePlaybackState(nextTime);
            syncPlayback({
                currentTime: nextTime,
                duration: getAudioDuration(audio) || durationRef.current,
            });
            lastSyncedSecondRef.current = Math.floor(nextTime);
        },
        [savePlaybackState, syncPlayback],
    );

    const handleTogglePlayback = useCallback(() => {
        const audio = audioRef.current;

        if (!currentTrack || !audio) {
            return;
        }

        if (isPlaying) {
            pause(audio.currentTime);
            return;
        }

        play();
    }, [currentTrack, isPlaying, pause, play]);

    const handleRestart = useCallback(() => {
        const audio = audioRef.current;

        if (audio) {
            audio.currentTime = 0;
        }

        setCurrentTime(0);
        savePlaybackState(0);
        syncPlayback({
            currentTime: 0,
            duration: getAudioDuration(audio) || durationRef.current,
        });
        lastSyncedSecondRef.current = 0;
    }, [savePlaybackState, syncPlayback]);

    const handleClose = useCallback(() => {
        flushPlaybackSnapshot();

        if (audioRef.current && !audioRef.current.paused) {
            audioRef.current.pause();
        }

        clearCurrentTrack();
        setCurrentTime(0);
        setDuration(0);
        durationRef.current = 0;
        lastSyncedSecondRef.current = 0;
        pendingInitialSeekRef.current = false;
    }, [clearCurrentTrack, flushPlaybackSnapshot]);

    const progressMax = duration > 0 ? duration : 0;
    const progressValue = progressMax > 0 ? Math.min(currentTime, progressMax) : 0;

    const progressLabel = useMemo(() => {
        if (duration <= 0) {
            return "0%";
        }

        const pct = Math.min(100, Math.max(0, Math.round((currentTime / duration) * 100)));
        return `${pct}%`;
    }, [currentTime, duration]);

    if (!hasHydrated || !currentTrack) {
        return null;
    }

    return (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 px-4">
            <div
                className="pointer-events-auto mx-auto max-w-6xl overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-xl"
                style={{
                    background: "rgba(12, 12, 28, 0.88)",
                    borderColor: "rgba(212, 175, 55, 0.18)",
                    boxShadow:
                        "0 20px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)",
                }}
            >
                <audio
                    ref={audioRef}
                    src={currentTrack.url_audio}
                    preload="metadata"
                    onLoadedMetadata={handleLoadedMetadata}
                    onDurationChange={handleDurationChange}
                    onTimeUpdate={handleTimeUpdate}
                    onPlay={handlePlay}
                    onPause={handlePause}
                    onEnded={handleEnded}
                />

                <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)_auto] lg:items-center">
                    <div className="min-w-0">
                        <div className="flex items-start gap-3">
                            <div
                                className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
                                style={{
                                    background: "rgba(212, 175, 55, 0.08)",
                                    borderColor: "rgba(212, 175, 55, 0.2)",
                                    color: "var(--color-gold)",
                                }}
                            >
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M9 18V5l12-2v13" />
                                    <circle cx="6" cy="18" r="3" />
                                    <circle cx="18" cy="16" r="3" />
                                </svg>
                            </div>

                            <div className="min-w-0">
                                <p
                                    className="text-[11px] font-semibold uppercase tracking-[0.24em]"
                                    style={{ color: "var(--color-gold)" }}
                                >
                                    Reproductor persistente
                                </p>

                                <Link
                                    href={`/conferencia/${currentTrack.conferencia_id}`}
                                    className="mt-1 block truncate text-base font-semibold transition-opacity hover:opacity-85 md:text-lg"
                                    style={{ color: "var(--color-text-primary)" }}
                                >
                                    {currentTrack.titulo}
                                </Link>

                                <div
                                    className="mt-1 flex items-center gap-2 text-xs"
                                    style={{ color: "var(--color-text-muted)" }}
                                >
                                    <span>{isPlaying ? "Reproduciendo" : "En pausa"}</span>
                                    <span aria-hidden="true">•</span>
                                    <span>{formatTime(currentTime)}</span>
                                    <span aria-hidden="true">/</span>
                                    <span>{formatTime(duration)}</span>
                                    <span aria-hidden="true">•</span>
                                    <span>{progressLabel}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="min-w-0">
                        <div className="flex items-center gap-3">
                            <span
                                className="w-12 shrink-0 text-right text-xs tabular-nums"
                                style={{ color: "var(--color-text-muted)" }}
                            >
                                {formatTime(currentTime)}
                            </span>

                            <input
                                type="range"
                                min={0}
                                max={progressMax}
                                step={1}
                                value={progressValue}
                                onChange={handleProgressChange}
                                disabled={progressMax <= 0}
                                aria-label="Control de progreso del audio"
                                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-transparent disabled:cursor-not-allowed"
                                style={{ accentColor: "var(--color-gold)" }}
                            />

                            <span
                                className="w-12 shrink-0 text-xs tabular-nums"
                                style={{ color: "var(--color-text-muted)" }}
                            >
                                {formatTime(duration)}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={handleRestart}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border transition-all hover:-translate-y-0.5"
                            style={{
                                background: "rgba(255,255,255,0.03)",
                                borderColor: "rgba(212, 175, 55, 0.14)",
                                color: "var(--color-text-secondary)",
                            }}
                            aria-label="Volver al inicio"
                            title="Volver al inicio"
                        >
                            <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <polyline points="11 17 6 12 11 7" />
                                <polyline points="18 17 13 12 18 7" />
                            </svg>
                        </button>

                        <button
                            type="button"
                            onClick={handleTogglePlayback}
                            className="inline-flex h-12 min-w-32 items-center justify-center gap-2 rounded-xl border px-4 font-semibold transition-all hover:-translate-y-0.5"
                            style={{
                                background: "var(--color-gold)",
                                borderColor: "rgba(212, 175, 55, 0.5)",
                                color: "#0a0a14",
                                boxShadow: "0 10px 30px rgba(212, 175, 55, 0.18)",
                            }}
                            aria-label={isPlaying ? "Pausar audio" : "Reproducir audio"}
                        >
                            {isPlaying ? (
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    aria-hidden="true"
                                >
                                    <rect x="6" y="4" width="4" height="16" rx="1" />
                                    <rect x="14" y="4" width="4" height="16" rx="1" />
                                </svg>
                            ) : (
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    aria-hidden="true"
                                >
                                    <path d="M8 5v14l11-7-11-7Z" />
                                </svg>
                            )}
                            <span>{isPlaying ? "Pausar" : "Reproducir"}</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleClose}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border transition-all hover:-translate-y-0.5"
                            style={{
                                background: "rgba(255,255,255,0.03)",
                                borderColor: "rgba(212, 175, 55, 0.14)",
                                color: "var(--color-text-secondary)",
                            }}
                            aria-label="Cerrar reproductor"
                            title="Cerrar reproductor"
                        >
                            <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
