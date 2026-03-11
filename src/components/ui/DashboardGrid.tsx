"use client";

import Link from "next/link";

interface CategoryCard {
    title: string;
    description: string;
    href: string;
    cta: string;
    icon: React.ReactNode;
}

const categories: CategoryCard[] = [
    {
        title: "Conferencias en Texto",
        description: "Transcripciones completas de más de 1,100 conferencias espirituales.",
        href: "/archivo",
        cta: "Explorar Textos",
        icon: (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
            </svg>
        ),
    },
    {
        title: "Audios Originales",
        description: "3,500+ horas de grabaciones originales restauradas digitalmente.",
        href: "/archivo?formato=audio",
        cta: "Escuchar",
        icon: (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
            </svg>
        ),
    },
    {
        title: "Videos",
        description: "Conferencias en formato audiovisual para una experiencia inmersiva.",
        href: "/archivo?formato=video",
        cta: "Ver Videos",
        icon: (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
        ),
    },
    {
        title: "Estudios Temáticos",
        description: "Colecciones organizadas: Las Siete Edades, Los Sellos y más.",
        href: "/estudios",
        cta: "Iniciar Estudio",
        icon: (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                <path d="M12 6L2 7l10 5 10-5-10-5z" />
            </svg>
        ),
    },
    {
        title: "Alabanza y Adoración",
        description: "Himnos y cánticos espirituales del legado patrimonial.",
        href: "/alabanza",
        cta: "Escuchar Himnos",
        icon: (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
            </svg>
        ),
    },
    {
        title: "Podcast",
        description: "Estudios semanales en formato de diálogo sobre textos proféticos.",
        href: "/podcast",
        cta: "Oír Podcast",
        icon: (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
        ),
    },
];

export function DashboardGrid() {
    return (
        <section className="relative py-20 px-6" style={{ background: "var(--color-bg-primary)" }}>
            {/* Section Header */}
            <div className="mx-auto max-w-6xl text-center mb-14">
                <h2
                    className="text-3xl md:text-4xl font-extrabold tracking-tight"
                    style={{ color: "var(--color-text-primary)" }}
                >
                    Explora el Archivo
                </h2>
                <div
                    className="mx-auto mt-3 h-1 w-16 rounded-full"
                    style={{ background: "linear-gradient(90deg, var(--color-gold), var(--color-gold-dark))" }}
                />
                <p
                    className="mt-4 text-base max-w-xl mx-auto"
                    style={{ color: "var(--color-text-secondary)" }}
                >
                    Navega por las diferentes categorías del archivo espiritual más completo de la posteridad.
                </p>
            </div>

            {/* Cards Grid */}
            <div className="mx-auto max-w-6xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger-children">
                {categories.map((cat) => (
                    <Link
                        key={cat.title}
                        href={cat.href}
                        className="glass-card group flex flex-col items-start p-7 cursor-pointer"
                    >
                        {/* Icon */}
                        <div
                            className="flex h-14 w-14 items-center justify-center rounded-xl mb-5 transition-transform group-hover:scale-110"
                            style={{
                                background: "rgba(226, 184, 87, 0.1)",
                                color: "var(--color-gold)",
                                border: "1px solid rgba(226, 184, 87, 0.15)",
                            }}
                        >
                            {cat.icon}
                        </div>

                        {/* Title */}
                        <h3
                            className="text-lg font-bold mb-2"
                            style={{ color: "var(--color-text-primary)" }}
                        >
                            {cat.title}
                        </h3>

                        {/* Description */}
                        <p
                            className="text-sm leading-relaxed flex-1 mb-5"
                            style={{ color: "var(--color-text-muted)" }}
                        >
                            {cat.description}
                        </p>

                        {/* CTA */}
                        <span
                            className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase transition-colors group-hover:text-[var(--color-gold-light)]"
                            style={{ color: "var(--color-gold)" }}
                        >
                            {cat.cta}
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-1">
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </span>
                    </Link>
                ))}
            </div>
        </section>
    );
}
