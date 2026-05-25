import Link from "next/link";

interface ModuleCard {
    number: string;
    title: string;
    description: string;
    href: string;
}

const modules: ModuleCard[] = [
    {
        number: "01",
        title: "Archivo Cronológico",
        description: "Consulta conferencias organizadas por año y fecha para recorrer el Mensaje en su contexto.",
        href: "/archivo",
    },
    {
        number: "02",
        title: "Estudios Temáticos",
        description: "Profundiza en colecciones doctrinales organizadas para el estudio sistemático.",
        href: "/estudios",
    },
    {
        number: "03",
        title: "Podcast Doctrinal",
        description: "Escucha episodios dedicados a la comprensión y difusión del contenido patrimonial.",
        href: "/podcast",
    },
    {
        number: "04",
        title: "Blog Editorial",
        description: "Lee artículos editoriales y materiales de contexto para acompañar la consulta.",
        href: "/blog",
    },
    {
        number: "05",
        title: "El Legado",
        description: "Conoce la misión de preservación y el valor histórico del archivo digital.",
        href: "/el-legado",
    },
];

export function DashboardGrid() {
    return (
        <section aria-labelledby="modules-title" className="bg-[#0F0D0A] px-6 py-20 md:px-10 md:py-24">
            <div className="mx-auto max-w-7xl">
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#C8A843]">
                    SECCIONES DEL PORTAL
                </p>
                <h2
                    id="modules-title"
                    className="mt-5 max-w-3xl font-serif text-3xl font-semibold tracking-tight text-[#E8DCC8] md:text-5xl"
                >
                    Custodiar, ordenar y transmitir el Mensaje
                </h2>

                <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {modules.map((module) => (
                        <article
                            key={module.number}
                            className="flex min-h-[276px] flex-col rounded-xl border border-[rgba(200,168,67,0.16)] bg-[rgba(232,220,200,0.025)] p-6"
                        >
                            <p className="font-serif text-3xl text-[#C8A843]">{module.number}</p>
                            <h3 className="mt-8 font-serif text-xl font-semibold text-[#E8DCC8]">
                                {module.title}
                            </h3>
                            <p className="mt-3 flex-1 text-sm leading-6 text-[rgba(232,220,200,0.6)]">
                                {module.description}
                            </p>
                            <Link
                                href={module.href}
                                aria-label={`Explorar ${module.title}`}
                                className="mt-7 text-sm font-semibold text-[#DFC06A] transition-[color,transform] hover:text-[#E8DCC8] active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DFC06A]"
                            >
                                Explorar →
                            </Link>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
