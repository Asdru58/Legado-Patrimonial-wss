"use client";

import { useState } from "react";
import { SidebarFilters, ConferenceCard } from "@/components/ui";
import type { FilterState } from "@/components/ui";
import type { ConferenciaConMultimedia } from "@/types";

/* ── Datos mockeados para validar renderizado ── */
const MOCK_CONFERENCIAS: ConferenciaConMultimedia[] = [
    {
        id: "1",
        titulo: "La Estatura de un Hombre Perfecto",
        fecha_impartida: "1962-10-14",
        lugar: "Jeffersonville, IN",
        created_at: "2024-01-01",
        multimedia: {
            id: "m1",
            conferencia_id: "1",
            audio_url: "https://example.com/audio1.mp3",
            video_url: null,
            pdf_url: "https://example.com/doc1.pdf",
        },
    },
    {
        id: "2",
        titulo: "La Brecha Entre las Siete Edades de la Iglesia y los Siete Sellos",
        fecha_impartida: "1963-03-17",
        lugar: "Jeffersonville, IN",
        created_at: "2024-01-02",
        multimedia: {
            id: "m2",
            conferencia_id: "2",
            audio_url: "https://example.com/audio2.mp3",
            video_url: "https://example.com/video2.mp4",
            pdf_url: "https://example.com/doc2.pdf",
        },
    },
    {
        id: "3",
        titulo: "El Séptimo Sello",
        fecha_impartida: "1963-03-24",
        lugar: "Jeffersonville, IN",
        created_at: "2024-01-03",
        multimedia: {
            id: "m3",
            conferencia_id: "3",
            audio_url: "https://example.com/audio3.mp3",
            video_url: null,
            pdf_url: "https://example.com/doc3.pdf",
        },
    },
    {
        id: "4",
        titulo: "Preguntas y Respuestas Sobre los Sellos",
        fecha_impartida: "1963-03-24",
        lugar: "Jeffersonville, IN",
        created_at: "2024-01-04",
        multimedia: {
            id: "m4",
            conferencia_id: "4",
            audio_url: "https://example.com/audio4.mp3",
            video_url: null,
            pdf_url: "https://example.com/doc4.pdf",
        },
    },
];

export default function ArchivoPage() {
    const [filters, setFilters] = useState<FilterState>({
        periodo: null,
        formatos: [],
        temas: [],
        libroBiblico: null,
    });

    const totalResults = MOCK_CONFERENCIAS.length;

    return (
        <div className="min-h-screen" style={{ background: "var(--color-bg-primary)" }}>
            {/* Page Header */}
            <div className="mx-auto max-w-7xl px-6 pt-10 pb-6">
                <h1
                    className="text-3xl md:text-4xl font-extrabold tracking-tight"
                    style={{ color: "var(--color-text-primary)" }}
                >
                    Archivo Cronológico
                </h1>
                <p className="mt-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
                    Explora el archivo completo de conferencias espirituales desde 1978 hasta la actualidad.
                </p>
            </div>

            {/* Two-Column Layout */}
            <div className="mx-auto max-w-7xl px-6 pb-20">
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left: Sidebar Filters */}
                    <SidebarFilters filters={filters} onFiltersChange={setFilters} />

                    {/* Right: Results */}
                    <div className="flex-1 min-w-0">
                        {/* Results Header */}
                        <div className="flex items-center justify-between mb-6">
                            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                                Mostrando <span style={{ color: "var(--color-gold)" }}>1-{totalResults}</span> de{" "}
                                <span style={{ color: "var(--color-gold)" }}>{totalResults}</span> resultados
                            </p>
                            <select
                                className="rounded-lg px-3 py-2 text-xs font-medium outline-none cursor-pointer"
                                style={{
                                    background: "rgba(226, 184, 87, 0.05)",
                                    border: "1px solid var(--color-border)",
                                    color: "var(--color-text-secondary)",
                                }}
                                defaultValue="reciente"
                            >
                                <option value="reciente">Ordenar por: Más reciente</option>
                                <option value="antiguo">Más antiguo</option>
                                <option value="titulo">Título A-Z</option>
                            </select>
                        </div>

                        {/* Conference Grid */}
                        <div className="stagger-children grid gap-5 sm:grid-cols-2">
                            {MOCK_CONFERENCIAS.map((conf, i) => (
                                <ConferenceCard key={conf.id} conferencia={conf} index={i} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
