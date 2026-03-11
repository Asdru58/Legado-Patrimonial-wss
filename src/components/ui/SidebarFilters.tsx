"use client";

import { useState, useCallback } from "react";

/* ── Tipos ── */
export interface FilterState {
    periodo: string | null;
    formatos: string[];
    temas: string[];
    libroBiblico: string | null;
}

interface SidebarFiltersProps {
    filters: FilterState;
    onFiltersChange: (filters: FilterState) => void;
    className?: string;
}

/* ── Datos estáticos ── */
const DECADAS = ["1970s", "1980s", "1990s", "2000s", "2010s", "2020s"] as const;

const FORMATOS = [
    { id: "audio", label: "Audio", count: 1100 },
    { id: "video", label: "Video", count: 450 },
    { id: "pdf", label: "Texto / PDF", count: 900 },
] as const;

const TEMAS = [
    "Profecía",
    "Las Siete Edades",
    "Los Sellos",
    "Adoración",
    "Doctrina",
    "Sanidad Divina",
    "Vida Cristiana",
    "Segunda Venida",
] as const;

const LIBROS_BIBLICOS = [
    "Apocalipsis",
    "Génesis",
    "Éxodo",
    "Hebreos",
    "Mateo",
    "Juan",
    "Romanos",
    "Isaías",
    "Daniel",
    "Malaquías",
] as const;

/* ── Componente ── */
export function SidebarFilters({ filters, onFiltersChange, className = "" }: SidebarFiltersProps) {
    const [temasOpen, setTemasOpen] = useState(true);
    const [libroSearch, setLibroSearch] = useState("");

    const setPeriodo = useCallback(
        (val: string | null) => onFiltersChange({ ...filters, periodo: val }),
        [filters, onFiltersChange]
    );

    const toggleFormato = useCallback(
        (id: string) => {
            const next = filters.formatos.includes(id)
                ? filters.formatos.filter((f) => f !== id)
                : [...filters.formatos, id];
            onFiltersChange({ ...filters, formatos: next });
        },
        [filters, onFiltersChange]
    );

    const toggleTema = useCallback(
        (tema: string) => {
            const next = filters.temas.includes(tema)
                ? filters.temas.filter((t) => t !== tema)
                : [...filters.temas, tema];
            onFiltersChange({ ...filters, temas: next });
        },
        [filters, onFiltersChange]
    );

    const setLibro = useCallback(
        (val: string | null) => onFiltersChange({ ...filters, libroBiblico: val }),
        [filters, onFiltersChange]
    );

    const clearAll = () =>
        onFiltersChange({ periodo: null, formatos: [], temas: [], libroBiblico: null });

    const filteredLibros = LIBROS_BIBLICOS.filter((l) =>
        l.toLowerCase().includes(libroSearch.toLowerCase())
    );

    const activeCount =
        (filters.periodo ? 1 : 0) +
        filters.formatos.length +
        filters.temas.length +
        (filters.libroBiblico ? 1 : 0);

    return (
        <aside
            className={`glass-card w-full lg:w-[280px] shrink-0 p-5 flex flex-col gap-6 h-fit sticky top-20 ${className}`}
            style={{ borderRadius: "var(--radius-lg)" }}
        >
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                    </svg>
                    <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--color-gold)" }}>
                        Filtros
                    </h3>
                    {activeCount > 0 && (
                        <span
                            className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
                            style={{ background: "var(--color-gold)", color: "#0a0a14" }}
                        >
                            {activeCount}
                        </span>
                    )}
                </div>
            </div>

            {/* ── Período ── */}
            <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-secondary)" }}>
                    Período
                </p>
                <div className="flex flex-col gap-1.5">
                    {DECADAS.map((dec) => (
                        <button
                            key={dec}
                            onClick={() => setPeriodo(filters.periodo === dec ? null : dec)}
                            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all text-left"
                            style={{
                                color: filters.periodo === dec ? "var(--color-gold)" : "var(--color-text-secondary)",
                                background: filters.periodo === dec ? "rgba(226, 184, 87, 0.1)" : "transparent",
                            }}
                        >
                            <span
                                className="flex h-4 w-4 items-center justify-center rounded-full border-2 shrink-0"
                                style={{
                                    borderColor: filters.periodo === dec ? "var(--color-gold)" : "var(--color-text-muted)",
                                }}
                            >
                                {filters.periodo === dec && (
                                    <span
                                        className="h-2 w-2 rounded-full"
                                        style={{ background: "var(--color-gold)" }}
                                    />
                                )}
                            </span>
                            {dec}
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-px" style={{ background: "var(--color-border)" }} />

            {/* ── Formato ── */}
            <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-secondary)" }}>
                    Formato
                </p>
                <div className="flex flex-col gap-2">
                    {FORMATOS.map((fmt) => (
                        <label
                            key={fmt.id}
                            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium cursor-pointer transition-all"
                            style={{
                                color: filters.formatos.includes(fmt.id) ? "var(--color-gold)" : "var(--color-text-secondary)",
                                background: filters.formatos.includes(fmt.id) ? "rgba(226, 184, 87, 0.1)" : "transparent",
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={filters.formatos.includes(fmt.id)}
                                onChange={() => toggleFormato(fmt.id)}
                                className="sr-only"
                            />
                            <span
                                className="flex h-4 w-4 items-center justify-center rounded border-2 shrink-0 transition-colors"
                                style={{
                                    borderColor: filters.formatos.includes(fmt.id) ? "var(--color-gold)" : "var(--color-text-muted)",
                                    background: filters.formatos.includes(fmt.id) ? "var(--color-gold)" : "transparent",
                                }}
                            >
                                {filters.formatos.includes(fmt.id) && (
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0a0a14" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                )}
                            </span>
                            <span className="flex-1">{fmt.label}</span>
                            <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                style={{ background: "rgba(226, 184, 87, 0.1)", color: "var(--color-gold)" }}
                            >
                                {fmt.count.toLocaleString()}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="h-px" style={{ background: "var(--color-border)" }} />

            {/* ── Temas ── */}
            <div>
                <button
                    onClick={() => setTemasOpen(!temasOpen)}
                    className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider mb-3"
                    style={{ color: "var(--color-text-secondary)" }}
                >
                    Tema
                    <svg
                        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                        className={`transition-transform ${temasOpen ? "rotate-180" : ""}`}
                    >
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </button>
                {temasOpen && (
                    <div className="flex flex-wrap gap-2">
                        {TEMAS.map((tema) => (
                            <button
                                key={tema}
                                onClick={() => toggleTema(tema)}
                                className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                                style={{
                                    background: filters.temas.includes(tema) ? "rgba(226, 184, 87, 0.2)" : "rgba(226, 184, 87, 0.05)",
                                    color: filters.temas.includes(tema) ? "var(--color-gold)" : "var(--color-text-muted)",
                                    border: `1px solid ${filters.temas.includes(tema) ? "rgba(226, 184, 87, 0.4)" : "rgba(226, 184, 87, 0.1)"}`,
                                }}
                            >
                                {tema}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="h-px" style={{ background: "var(--color-border)" }} />

            {/* ── Libro Bíblico ── */}
            <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-secondary)" }}>
                    Libro Bíblico
                </p>
                <input
                    type="text"
                    value={libroSearch}
                    onChange={(e) => setLibroSearch(e.target.value)}
                    placeholder="Buscar libro..."
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none mb-2 transition-colors"
                    style={{
                        background: "rgba(226, 184, 87, 0.05)",
                        border: "1px solid var(--color-border)",
                        color: "var(--color-text-primary)",
                    }}
                />
                <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
                    {filteredLibros.map((libro) => (
                        <button
                            key={libro}
                            onClick={() => setLibro(filters.libroBiblico === libro ? null : libro)}
                            className="text-left rounded-lg px-3 py-1.5 text-sm transition-all"
                            style={{
                                color: filters.libroBiblico === libro ? "var(--color-gold)" : "var(--color-text-secondary)",
                                background: filters.libroBiblico === libro ? "rgba(226, 184, 87, 0.1)" : "transparent",
                            }}
                        >
                            {libro}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Clear ── */}
            {activeCount > 0 && (
                <button
                    onClick={clearAll}
                    className="btn-ghost w-full text-sm text-center"
                    style={{ borderColor: "rgba(226, 184, 87, 0.2)", color: "var(--color-gold)" }}
                >
                    Limpiar Filtros
                </button>
            )}
        </aside>
    );
}
