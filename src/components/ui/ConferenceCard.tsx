"use client";

import type { ConferenciaConMultimedia } from "@/types";
import { usePlayerStore } from "@/store";

interface ConferenceCardProps {
    conferencia: ConferenciaConMultimedia;
    index?: number;
}

export function ConferenceCard({ conferencia, index = 0 }: ConferenceCardProps) {
    const cargarConferencia = usePlayerStore((s) => s.cargarConferencia);
    const play = usePlayerStore((s) => s.play);

    const formattedDate = new Date(conferencia.fecha_impartida).toLocaleDateString(
        "es-ES",
        { year: "numeric", month: "long", day: "numeric" }
    );

    const handlePlay = () => {
        cargarConferencia(conferencia);
        play();
    };

    const hasAudio = !!conferencia.multimedia?.audio_url;
    const hasVideo = !!conferencia.multimedia?.video_url;
    const hasPdf = !!conferencia.multimedia?.pdf_url;

    return (
        <article
            className="glass-card group relative flex flex-col overflow-hidden"
            style={{ animationDelay: `${index * 0.07}s` }}
        >
            {/* Top gradient accent */}
            <div
                className="h-1 w-full"
                style={{
                    background: "linear-gradient(90deg, var(--color-gold), var(--color-gold-dark), transparent)",
                }}
            />

            <div className="flex flex-1 flex-col gap-4 p-5">
                {/* Title */}
                <h3
                    className="text-lg font-bold leading-snug tracking-tight transition-colors group-hover:text-[var(--color-gold)]"
                    style={{ color: "var(--color-text-primary)" }}
                >
                    {conferencia.titulo}
                </h3>

                {/* Date & Location */}
                <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
                    <span className="flex items-center gap-1.5">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        {formattedDate}
                    </span>
                    {conferencia.lugar && (
                        <span className="flex items-center gap-1.5">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle cx="12" cy="10" r="3" />
                            </svg>
                            {conferencia.lugar}
                        </span>
                    )}
                </div>

                {/* Media Badges */}
                <div className="flex flex-wrap gap-2">
                    {hasAudio && (
                        <span className="media-badge">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <path d="M9 18V5l12-2v13" />
                                <circle cx="6" cy="18" r="3" />
                                <circle cx="18" cy="16" r="3" />
                            </svg>
                            Audio
                        </span>
                    )}
                    {hasVideo && (
                        <span className="media-badge">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <polygon points="23 7 16 12 23 17 23 7" />
                                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                            </svg>
                            Video
                        </span>
                    )}
                    {hasPdf && (
                        <span className="media-badge">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                            </svg>
                            PDF
                        </span>
                    )}
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Play Button */}
                <button
                    onClick={handlePlay}
                    disabled={!hasAudio}
                    className="btn-gold flex items-center justify-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ borderRadius: "var(--radius-lg)" }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    {hasAudio ? "Reproducir" : "Sin audio"}
                </button>
            </div>
        </article>
    );
}
