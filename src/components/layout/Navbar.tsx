"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/* Enlaces con efectos hover especiales */
const HIGHLIGHT_LABELS = ["Podcast", "Estudios"];

const navLinks = [
    {
        label: "Inicio",
        href: "/",
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
        ),
    },
    {
        label: "El Legado",
        href: "/legado",
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
            </svg>
        ),
    },
    {
        label: "Archivo",
        href: "/archivo",
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
            </svg>
        ),
    },
    {
        label: "Estudios",
        href: "/estudios",
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
        ),
    },
    {
        label: "Alabanza",
        href: "/alabanza",
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
            </svg>
        ),
    },
    {
        label: "Podcast",
        href: "/podcast",
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
        ),
    },
    {
        label: "Radio",
        href: "#radio",
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="2" />
                <path d="M16.24 7.76a6 6 0 0 1 0 8.49" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                <path d="M7.76 16.24a6 6 0 0 1 0-8.49" />
                <path d="M4.93 19.07a10 10 0 0 1 0-14.14" />
            </svg>
        ),
    },
    {
        label: "Blog",
        href: "/blog",
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
        ),
    },
];

const adminLink = {
    label: "Admin",
    href: "/admin",
    icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2zm10-10V7a4 4 0 0 0-8 0v4h8z" />
        </svg>
    ),
};

export function Navbar() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const pathname = usePathname();

    const isActive = (href: string) => {
        if (href === "/") return pathname === "/";
        return pathname.startsWith(href);
    };

    return (
        <nav
            className="fixed top-0 left-0 right-0 z-50 glass-strong"
            style={{ height: "64px" }}
        >
            <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-3 group shrink-0">
                    <div
                        className="flex h-9 w-9 items-center justify-center rounded-lg animate-border-glow"
                        style={{
                            background: "linear-gradient(135deg, var(--color-gold), var(--color-gold-dark))",
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0a0a14" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2L2 7l10 5 10-5-10-5z" />
                            <path d="M2 17l10 5 10-5" />
                            <path d="M2 12l10 5 10-5" />
                        </svg>
                    </div>
                    <span className="text-lg font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                        Legado Patrimonial
                        <span className="text-gold ml-1 font-extrabold">WSS</span>
                    </span>
                </Link>

                {/* Desktop Links */}
                <div className="hidden items-center gap-0.5 xl:flex">
                    {navLinks.map((link) => {
                        const isHighlighted = HIGHLIGHT_LABELS.includes(link.label);
                        return (
                            <Link
                                key={link.label}
                                href={link.href}
                                className={`btn-ghost text-[15px] flex items-center gap-2 relative group${isHighlighted ? " nav-highlight" : ""
                                    }`}
                                style={{
                                    border: "none",
                                    borderRadius: "var(--radius-md)",
                                    color: isActive(link.href) ? "var(--color-gold)" : undefined,
                                    background: isActive(link.href) ? "rgba(212, 175, 55, 0.08)" : undefined,
                                }}
                            >
                                {link.icon}
                                {link.label}
                                {/* Subrayado animado para enlaces destacados */}
                                {isHighlighted && (
                                    <span
                                        className="absolute -bottom-0.5 left-1/2 h-[2px] w-0 group-hover:w-4/5 -translate-x-1/2 transition-all duration-300 ease-out rounded-full"
                                        style={{ background: "linear-gradient(90deg, transparent, var(--color-gold), transparent)" }}
                                    />
                                )}
                            </Link>
                        );
                    })}
                </div>

                {/* Search + Admin (Desktop) */}
                <div className="hidden items-center gap-2 xl:flex">
                    <button
                        className="flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200 hover:bg-[var(--color-surface-hover)]"
                        aria-label="Buscar"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.3-4.3" />
                        </svg>
                    </button>
                    <Link
                        href={adminLink.href}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-200 hover:opacity-90"
                        style={{
                            background: isActive(adminLink.href)
                                ? "linear-gradient(135deg, var(--color-gold), var(--color-gold-dark))"
                                : "rgba(212, 175, 55, 0.12)",
                            color: isActive(adminLink.href) ? "#0a0a14" : "var(--color-gold)",
                            border: "1px solid rgba(212, 175, 55, 0.25)",
                        }}
                    >
                        {adminLink.icon}
                        {adminLink.label}
                    </Link>
                </div>

                {/* Mobile Menu Button */}
                <button
                    className="flex h-9 w-9 items-center justify-center rounded-lg xl:hidden hover:bg-[var(--color-surface-hover)]"
                    onClick={() => setMobileOpen(!mobileOpen)}
                    aria-label="Menú"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round">
                        {mobileOpen ? (
                            <>
                                <path d="M18 6L6 18" />
                                <path d="M6 6l12 12" />
                            </>
                        ) : (
                            <>
                                <path d="M4 8h16" />
                                <path d="M4 16h16" />
                            </>
                        )}
                    </svg>
                </button>
            </div>

            {/* Mobile Menu */}
            {mobileOpen && (
                <div
                    className="glass-strong border-t xl:hidden"
                    style={{
                        borderColor: "var(--color-border)",
                        animation: "fadeIn 0.2s ease-out",
                    }}
                >
                    <div className="flex flex-col gap-1 p-4">
                        {navLinks.map((link) => (
                            <Link
                                key={link.label}
                                href={link.href}
                                className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors hover:bg-[var(--color-surface-hover)]"
                                style={{
                                    color: isActive(link.href) ? "var(--color-gold)" : "var(--color-text-secondary)",
                                    background: isActive(link.href) ? "rgba(212, 175, 55, 0.08)" : undefined,
                                }}
                                onClick={() => setMobileOpen(false)}
                            >
                                {link.icon}
                                {link.label}
                            </Link>
                        ))}

                        {/* Separador */}
                        <div
                            className="my-2"
                            style={{ height: "1px", background: "var(--color-border)" }}
                        />

                        {/* Admin en móvil */}
                        <Link
                            href={adminLink.href}
                            className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition-colors"
                            style={{
                                color: "var(--color-gold)",
                                background: "rgba(212, 175, 55, 0.08)",
                                border: "1px solid rgba(212, 175, 55, 0.2)",
                            }}
                            onClick={() => setMobileOpen(false)}
                        >
                            {adminLink.icon}
                            Panel de Administración
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    );
}

