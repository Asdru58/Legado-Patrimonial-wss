"use client";

import { useState } from "react";

/* ── Tipos ── */
export interface ConferenceData {
    id: string;
    titulo: string;
    fecha: string;
    lugar?: string;
    duracion?: string;
    categoria?: string;
    descripcion?: string;
    transcripcion?: string;
    citas_biblicas?: string[];
    multimedia?: {
        audio_url?: string;
        video_url?: string;
        pdf_url?: string;
    };
}

interface ConferenceDetailProps {
    conference: ConferenceData;
    onPlayAudio?: () => void;
}

/* ── Componente ── */
export function ConferenceDetail({ conference, onPlayAudio }: ConferenceDetailProps) {
    const [activeTab, setActiveTab] = useState<"transcripcion" | "metadatos">("transcripcion");

    return (
        <div className="mx-auto max-w-6xl px-6 py-10">
            {/* ── Header ── */}
            <div className="mb-8">
                {/* Category badge */}
                {conference.categoria && (
                    <span className="media-badge mb-4 inline-block">
                        {conference.categoria}
                    </span>
                )}

                <h1
                    className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3"
                    style={{ color: "var(--color-text-primary)" }}
                >
                    {conference.titulo}
                </h1>

                {/* Metadata row */}
                <div className="flex flex-wrap items-center gap-4 text-sm" style={{ color: "var(--color-text-muted)" }}>
                    <span className="flex items-center gap-1.5">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="2" strokeLinecap="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        {conference.fecha}
                    </span>
                    {conference.lugar && (
                        <span className="flex items-center gap-1.5">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="2" strokeLinecap="round">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle cx="12" cy="10" r="3" />
                            </svg>
                            {conference.lugar}
                        </span>
                    )}
                    {conference.duracion && (
                        <span className="flex items-center gap-1.5">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="2" strokeLinecap="round">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                            {conference.duracion}
                        </span>
                    )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-3 mt-6">
                    {conference.multimedia?.audio_url && (
                        <button onClick={onPlayAudio} className="btn-gold flex items-center gap-2 text-sm">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="#0a0a14">
                                <polygon points="5 3 19 12 5 21 5 3" />
                            </svg>
                            Reproducir Audio
                        </button>
                    )}
                    {conference.multimedia?.pdf_url && (
                        <a
                            href={conference.multimedia.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-ghost flex items-center gap-2 text-sm"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="12" y1="18" x2="12" y2="12" />
                                <polyline points="9 15 12 18 15 15" />
                            </svg>
                            Descargar PDF
                        </a>
                    )}
                    {conference.multimedia?.video_url && (
                        <a
                            href={conference.multimedia.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-ghost flex items-center gap-2 text-sm"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <polygon points="23 7 16 12 23 17 23 7" />
                                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                            </svg>
                            Ver Video
                        </a>
                    )}
                </div>
            </div>

            {/* ── Tabs ── */}
            <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: "rgba(226, 184, 87, 0.05)" }}>
                <button
                    onClick={() => setActiveTab("transcripcion")}
                    className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all"
                    style={{
                        background: activeTab === "transcripcion" ? "rgba(226, 184, 87, 0.15)" : "transparent",
                        color: activeTab === "transcripcion" ? "var(--color-gold)" : "var(--color-text-muted)",
                    }}
                >
                    Transcripción
                </button>
                <button
                    onClick={() => setActiveTab("metadatos")}
                    className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all"
                    style={{
                        background: activeTab === "metadatos" ? "rgba(226, 184, 87, 0.15)" : "transparent",
                        color: activeTab === "metadatos" ? "var(--color-gold)" : "var(--color-text-muted)",
                    }}
                >
                    Metadatos e Info
                </button>
            </div>

            {/* ── Tab Content ── */}
            <div className="glass-card p-6 md:p-8" style={{ borderRadius: "var(--radius-lg)" }}>
                {activeTab === "transcripcion" ? (
                    <div>
                        {conference.transcripcion ? (
                            <div
                                className="prose prose-invert max-w-none text-sm leading-relaxed"
                                style={{ color: "var(--color-text-secondary)" }}
                            >
                                {conference.transcripcion.split("\n").map((paragraph, i) => (
                                    <p key={i} className="mb-4">{paragraph}</p>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5" strokeLinecap="round" className="mx-auto mb-4 opacity-40">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                </svg>
                                <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                                    Transcripción no disponible para esta conferencia.
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Info cards */}
                        {[
                            { label: "Título completo", value: conference.titulo },
                            { label: "Fecha", value: conference.fecha },
                            { label: "Lugar", value: conference.lugar || "No especificado" },
                            { label: "Duración", value: conference.duracion || "No especificada" },
                            { label: "Categoría", value: conference.categoria || "General" },
                        ].map((item) => (
                            <div key={item.label} className="rounded-xl p-4" style={{ background: "rgba(226, 184, 87, 0.04)" }}>
                                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-gold)" }}>
                                    {item.label}
                                </p>
                                <p className="text-sm" style={{ color: "var(--color-text-primary)" }}>
                                    {item.value}
                                </p>
                            </div>
                        ))}

                        {/* Citas Bíblicas */}
                        {conference.citas_biblicas && conference.citas_biblicas.length > 0 && (
                            <div className="md:col-span-2 rounded-xl p-4" style={{ background: "rgba(226, 184, 87, 0.04)" }}>
                                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-gold)" }}>
                                    Citas Bíblicas Clave
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {conference.citas_biblicas.map((cita) => (
                                        <span key={cita} className="media-badge">{cita}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Descripción */}
                        {conference.descripcion && (
                            <div className="md:col-span-2 rounded-xl p-4" style={{ background: "rgba(226, 184, 87, 0.04)" }}>
                                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-gold)" }}>
                                    Descripción
                                </p>
                                <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                                    {conference.descripcion}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
