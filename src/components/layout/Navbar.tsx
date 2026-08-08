"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
    { label: "Inicio", href: "/inicio" },
    { label: "El Legado", href: "/el-legado" },
    { label: "Archivo", href: "/archivo" },
    { label: "Estudios", href: "/estudios" },
    { label: "Podcast", href: "/podcast" },
] as const;

function MenuIcon() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            aria-hidden="true"
        >
            <line x1="3" y1="5" x2="17" y2="5" />
            <line x1="3" y1="10" x2="17" y2="10" />
            <line x1="3" y1="15" x2="17" y2="15" />
        </svg>
    );
}

function CloseIcon() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            aria-hidden="true"
        >
            <line x1="5" y1="5" x2="15" y2="15" />
            <line x1="15" y1="5" x2="5" y2="15" />
        </svg>
    );
}

function LogoMark() {
    return (
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[linear-gradient(135deg,#C8A843,#B89A6A)] font-serif text-sm font-bold text-[#0F0D0A]">
            LP
        </span>
    );
}

export function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [isDrawerMounted, setIsDrawerMounted] = useState(false);
    const [isDrawerVisible, setIsDrawerVisible] = useState(false);
    const pathname = usePathname();
    const hamburgerRef = useRef<HTMLButtonElement>(null);
    const closeRef = useRef<HTMLButtonElement>(null);
    const wasOpenedRef = useRef(false);

    const closeDrawer = useCallback(() => {
        setIsOpen(false);
    }, []);

    const isActive = useCallback(
        (href: string) => {
            if (href === "/") return pathname === "/";
            return pathname === href || pathname.startsWith(`${href}/`);
        },
        [pathname],
    );

    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape" && isOpen) {
                closeDrawer();
            }
        };

        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [closeDrawer, isOpen]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }

        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    useEffect(() => {
        let frameId: number | undefined;
        let timeoutId: number | undefined;

        if (isOpen) {
            setIsDrawerMounted(true);
            frameId = window.requestAnimationFrame(() => {
                setIsDrawerVisible(true);
            });
        } else {
            setIsDrawerVisible(false);
            timeoutId = window.setTimeout(() => {
                setIsDrawerMounted(false);
            }, 150);
        }

        return () => {
            if (frameId !== undefined) {
                window.cancelAnimationFrame(frameId);
            }

            if (timeoutId !== undefined) {
                window.clearTimeout(timeoutId);
            }
        };
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && isDrawerMounted) {
            wasOpenedRef.current = true;
            closeRef.current?.focus();
            return;
        }

        if (!isOpen && wasOpenedRef.current) {
            hamburgerRef.current?.focus();
            wasOpenedRef.current = false;
        }
    }, [isDrawerMounted, isOpen]);

    return (
        <nav className="fixed inset-x-0 top-0 z-50 border-b border-[rgba(200,170,100,0.1)] bg-[rgba(15,13,10,0.95)] backdrop-blur-sm motion-reduce:bg-[rgba(15,13,10,0.98)] motion-reduce:backdrop-blur-none md:bg-[rgba(15,13,10,0.88)] md:backdrop-blur-xl">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 md:px-10">
                <Link
                    href="/inicio"
                    className="flex items-center gap-3 rounded-md transition-transform duration-150 active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DFC06A]"
                    aria-label="Legado Patrimonial, el Séptimo Sello"
                >
                    <LogoMark />
                    <span className="font-sans text-sm font-semibold tracking-wide text-[#E8DCC8]">
                        <span className="hidden sm:inline">Legado Patrimonial, </span>
                        <span className="sm:hidden">LP, </span>
                        <span className="text-[#DFC06A]">el Séptimo Sello</span>
                    </span>
                </Link>

                <div className="hidden items-center gap-1 md:flex">
                    {NAV_ITEMS.map((item) => {
                        const active = isActive(item.href);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={[
                                    "flex min-h-[44px] items-center rounded-md px-3.5 py-2 font-sans text-[0.8rem] font-medium transition-colors duration-200 hover:bg-[rgba(200,170,100,0.04)] hover:text-[#DFC06A] active:bg-[rgba(200,170,100,0.1)]",
                                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DFC06A]",
                                    active
                                        ? "bg-[rgba(200,170,100,0.08)] text-[#E8DCC8]"
                                        : "text-[rgba(232,220,200,0.6)]",
                                ].join(" ")}
                                aria-current={active ? "page" : undefined}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </div>

                <button
                    ref={hamburgerRef}
                    type="button"
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md p-2 text-[#E8DCC8] transition-[background-color,transform] duration-200 hover:bg-[rgba(200,170,100,0.08)] active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DFC06A] md:hidden"
                    aria-label={isOpen ? "Cerrar menú de navegación" : "Abrir menú de navegación"}
                    aria-expanded={isOpen}
                    aria-controls="mobile-drawer"
                    onClick={() => setIsOpen((current) => !current)}
                >
                    {isOpen ? <CloseIcon /> : <MenuIcon />}
                </button>
            </div>

            {isDrawerMounted && (
                <div
                    id="mobile-drawer"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Menú de navegación"
                    className="fixed inset-0 z-[60] md:hidden"
                    onClick={closeDrawer}
                >
                    <div
                        className={[
                            "fixed inset-0 bg-black/50 transition-opacity ease-out",
                            isDrawerVisible ? "opacity-100 duration-200" : "opacity-0 duration-150",
                        ].join(" ")}
                    />
                    <div
                        className={[
                            "fixed bottom-0 right-0 top-0 w-[80vw] max-w-sm overflow-y-auto border-l border-[rgba(200,170,100,0.1)] bg-[#0F0D0A] p-6 transition-transform ease-out",
                            isDrawerVisible ? "translate-x-0 duration-200" : "translate-x-full duration-150",
                        ].join(" ")}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="mb-8 flex items-center justify-between">
                            <Link
                                href="/inicio"
                                className="flex items-center gap-3 rounded-md transition-transform duration-150 active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DFC06A]"
                                aria-label="Legado Patrimonial, el Séptimo Sello"
                            >
                                <LogoMark />
                                <span className="font-sans text-sm font-semibold tracking-wide text-[#E8DCC8]">
                                    Legado Patrimonial,{' '}
                                    <span className="text-[#DFC06A]">el Séptimo Sello</span>
                                </span>
                            </Link>

                            <button
                                ref={closeRef}
                                type="button"
                                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md p-2 text-[#E8DCC8] transition-[background-color,transform] duration-200 hover:bg-[rgba(200,170,100,0.08)] active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DFC06A]"
                                aria-label="Cerrar menú de navegación"
                                onClick={closeDrawer}
                            >
                                <CloseIcon />
                            </button>
                        </div>

                        <div className="flex flex-col">
                            {NAV_ITEMS.map((item) => {
                                const active = isActive(item.href);

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={[
                                            "block min-h-[48px] w-full rounded-md border-b border-l-[3px] border-b-[rgba(200,170,100,0.06)] border-l-transparent px-4 py-3.5 font-sans text-base font-medium transition-colors duration-150 hover:bg-[rgba(200,170,100,0.04)] hover:text-[#DFC06A] active:bg-[rgba(200,170,100,0.1)]",
                                            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#DFC06A]",
                                            active
                                                ? "border-l-[#C8A843] bg-[rgba(200,170,100,0.06)] text-[#E8DCC8]"
                                                : "text-[rgba(232,220,200,0.6)]",
                                        ].join(" ")}
                                        aria-current={active ? "page" : undefined}
                                        onClick={closeDrawer}
                                    >
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
