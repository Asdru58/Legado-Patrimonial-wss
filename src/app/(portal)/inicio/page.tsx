import Link from "next/link";
import { ArchiveEntry } from "@/components/hero/ArchiveEntry";
import { DashboardGrid, HeroSection } from "@/components/ui";
import { getEstadisticasPortada } from "@/lib/services/conferences";
import { conSeparadorDeMiles } from "@/lib/format";

/**
 * Las cifras se recalculan una vez por hora, no en cada visita.
 *
 * Antes eran constantes y se desfasaban en silencio: «Episodios 5» era falso,
 * porque el quinto está sin publicar y el visitante ve cuatro. Consultarlas en
 * cada carga habría convertido la portada en una página dinámica; con esta
 * revalidación se pagan cuatro consultas por hora y la portada se sigue
 * sirviendo desde la caché.
 *
 * Las cifras que se pintan son las que ve el público, no las de la base: hay
 * 7 colecciones y 5 episodios, pero una colección y un episodio están sin
 * publicar. Quedan anotados en `docs/REGISTROS_A_MEDIO_CREAR.md`.
 */
export const revalidate = 3600;

export default async function Home() {
  const cifras = await getEstadisticasPortada();

  const stats = [
    {
      value: conSeparadorDeMiles(cifras.conferencias),
      label: "Conferencias",
      ariaLabel: `${cifras.conferencias} conferencias en el archivo`,
    },
    {
      value: String(cifras.anios),
      label: "Años de archivo",
      ariaLabel: `${cifras.anios} años de archivo`,
    },
    {
      value: String(cifras.colecciones),
      label: "Colecciones",
      ariaLabel: `${cifras.colecciones} colecciones disponibles`,
    },
    {
      value: String(cifras.episodios),
      label: "Episodios",
      ariaLabel: `${cifras.episodios} episodios disponibles`,
    },
  ] as const;

  return (
    <div className="min-h-screen bg-[#0F0D0A]">
      <HeroSection />
      <ArchiveEntry />

      <section
        aria-labelledby="stats-title"
        className="border-y border-[rgba(200,168,67,0.14)] bg-[#161310] px-6 py-10 md:px-10"
      >
        <h2 id="stats-title" className="sr-only">
          Cifras del archivo patrimonial
        </h2>
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              role="group"
              aria-label={stat.ariaLabel}
              className="text-center md:text-left"
            >
              <p className="font-serif text-4xl font-semibold text-[#DFC06A] md:text-5xl">
                {stat.value}
              </p>
              <p className="mt-2 text-sm text-[rgba(232,220,200,0.6)]">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <DashboardGrid />

      <section
        aria-labelledby="closing-title"
        className="border-t border-[rgba(200,168,67,0.14)] bg-[#161310] px-6 py-20 text-center md:px-10 md:py-24"
      >
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#C8A843]">
            CONTINUIDAD DEL RECORRIDO
          </p>
          <h2
            id="closing-title"
            className="mt-5 font-serif text-3xl font-semibold tracking-tight text-[#E8DCC8] md:text-5xl"
          >
            Explora el archivo completo
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-[rgba(232,220,200,0.62)]">
            Más de cinco mil conferencias te esperan, organizadas por año, mes y tema.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/archivo"
              className="inline-flex min-h-[48px] items-center rounded-md bg-[#C8A843] px-8 py-3 font-semibold text-[#0F0D0A] transition-colors duration-200 hover:bg-[#DFC06A] active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DFC06A]"
            >
              Ir al Archivo →
            </Link>
            <Link
              href="/estudios"
              className="inline-flex min-h-[48px] items-center rounded-md border border-[rgba(200,168,67,0.28)] px-8 py-3 font-semibold text-[#E8DCC8] transition-colors duration-200 hover:border-[#C8A843] hover:text-[#DFC06A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DFC06A]"
            >
              Ver Estudios
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
