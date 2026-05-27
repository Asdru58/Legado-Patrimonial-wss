// src/app/el-legado/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  FileArchive,
  HeartHandshake,
  Landmark,
  Library,
  Mic2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export const metadata: Metadata = {
  title: "El Legado | Legado Patrimonial WSS",
  description:
    "Plataforma documental para custodiar, ordenar y transmitir el archivo histórico espiritual de la obra.",
};

const pillars = [
  {
    title: "Memoria viva",
    description:
      "Preservamos testimonios, enseñanzas y documentos para que el archivo no sea una colección muerta, sino una herencia activa para nuevas generaciones.",
    icon: Library,
  },
  {
    title: "Orden documental",
    description:
      "Cada pieza del legado se organiza con criterio archivístico para facilitar consulta, contexto y continuidad institucional.",
    icon: FileArchive,
  },
  {
    title: "Transmisión fiel",
    description:
      "Cuidamos el contenido doctrinal, histórico y espiritual para que la voz del archivo conserve integridad en el tiempo.",
    icon: ShieldCheck,
  },
];

const principles = [
  "Custodiar la memoria espiritual, histórica y documental con excelencia.",
  "Facilitar acceso claro, sobrio y reverente al contenido del archivo.",
  "Construir una plataforma preparada para crecimiento sostenido y consulta masiva.",
  "Honrar el legado recibido mientras se habilita su continuidad futura.",
];

const timeline = [
  {
    label: "Origen",
    title: "Nacimiento del archivo patrimonial",
    description:
      "El proyecto surge como respuesta a la necesidad de resguardar décadas de materiales en audio, video y documentos con una estructura durable.",
  },
  {
    label: "Consolidación",
    title: "Curaduría y organización progresiva",
    description:
      "La colección evoluciona desde un repositorio disperso hacia un sistema documental con criterios de clasificación, acceso y preservación.",
  },
  {
    label: "Expansión",
    title: "Portal institucional de alto rendimiento",
    description:
      "Legado Patrimonial WSS se proyecta como una plataforma robusta, preparada para navegación cronológica, hubs temáticos y continuidad editorial.",
  },
];

export default function ElLegadoPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <section aria-label="Introducción al Legado" className="relative overflow-hidden border-b border-[#D4AF37]/15">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.18),transparent_34%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0))]" />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-16 md:px-8 md:py-24 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/20 bg-white/5 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-[#E7C96C] backdrop-blur-xl">
              <Sparkles className="h-4 w-4" />
              El Legado
            </div>

            <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-5xl lg:text-6xl">
              Una plataforma para custodiar, ordenar y transmitir la memoria del archivo.
            </h1>

            <p className="mt-6 max-w-3xl text-base leading-8 text-white/72 md:text-lg">
              Legado Patrimonial WSS existe para preservar con sobriedad y excelencia el
              patrimonio espiritual, histórico y documental de la obra. No es solo una biblioteca:
              es una infraestructura de memoria diseñada para continuidad, consulta y transmisión
              fiel.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/archivo"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#D4AF37] px-6 py-4 text-sm font-semibold text-[#111111] shadow-[0_12px_40px_rgba(212,175,55,0.24)] transition hover:bg-[#e3bf4f]"
              >
                Explorar archivo
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/estudios"
                className="inline-flex items-center gap-2 rounded-2xl border border-[#D4AF37]/25 bg-white/5 px-6 py-4 text-sm font-semibold text-[#F5E7B5] backdrop-blur-xl transition hover:border-[#D4AF37]/45 hover:bg-white/8"
              >
                Ver estudios temáticos
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-[2rem] bg-[#D4AF37]/10 blur-3xl" />
            <div className="relative rounded-[2rem] border border-white/10 bg-white/6 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-5">
                  <Landmark className="h-6 w-6 text-[#D4AF37]" />
                  <p className="mt-4 text-sm font-semibold text-white">Patrimonio institucional</p>
                  <p className="mt-2 text-sm leading-7 text-white/65">
                    La identidad del archivo se apoya en permanencia, contexto y continuidad.
                  </p>
                </div>

                <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-5">
                  <Mic2 className="h-6 w-6 text-[#D4AF37]" />
                  <p className="mt-4 text-sm font-semibold text-white">Voz preservada</p>
                  <p className="mt-2 text-sm leading-7 text-white/65">
                    Audio, video y documentos se integran bajo una misma visión documental.
                  </p>
                </div>

                <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-5 sm:col-span-2">
                  <BookOpen className="h-6 w-6 text-[#D4AF37]" />
                  <p className="mt-4 text-sm font-semibold text-white">Propósito del archivo</p>
                  <p className="mt-2 text-sm leading-7 text-white/65">
                    Hacer accesible el legado sin trivializarlo: una experiencia elegante, estable
                    y reverente, preparada para crecimiento sostenido.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Pilares fundamentales" className="mx-auto max-w-7xl px-6 py-12 md:px-8 md:py-16">
        <div className="grid gap-6 lg:grid-cols-3">
          {pillars.map(({ title, description, icon: Icon }) => (
            <article
              key={title}
              className="rounded-[2rem] border border-white/10 bg-white/6 p-7 backdrop-blur-2xl"
            >
              <div className="inline-flex rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 p-3">
                <Icon className="h-6 w-6 text-[#D4AF37]" />
              </div>

              <h2 className="mt-5 text-xl font-semibold text-white">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-white/68">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-label="Misión y principios" className="mx-auto grid max-w-7xl gap-8 px-6 py-4 md:px-8 lg:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-[2rem] border border-white/10 bg-white/6 p-7 backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 rounded-full bg-[#D4AF37]" />
            <h2 className="text-2xl font-semibold tracking-tight text-white">Nuestra misión</h2>
          </div>

          <p className="mt-6 text-[15px] leading-8 text-white/72">
            Diseñar y sostener un sistema documental que resguarde el legado recibido, ordene su
            contenido con criterio técnico y lo ponga al servicio de la memoria espiritual e
            institucional de manera sobria, clara y durable.
          </p>

          <div className="mt-8 rounded-[1.5rem] border border-[#D4AF37]/15 bg-[#D4AF37]/7 p-5">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#E7C96C]">
              Enfoque rector
            </p>
            <p className="mt-3 text-sm leading-7 text-white/68">
              Preservar no solo archivos, sino contexto, significado y continuidad.
            </p>
          </div>
        </article>

        <article className="rounded-[2rem] border border-white/10 bg-white/6 p-7 backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 rounded-full bg-[#D4AF37]" />
            <h2 className="text-2xl font-semibold tracking-tight text-white">Principios</h2>
          </div>

          <ul className="mt-6 space-y-4">
            {principles.map((item) => (
              <li
                key={item}
                className="flex gap-4 rounded-[1.25rem] border border-white/8 bg-black/20 px-4 py-4"
              >
                <HeartHandshake className="mt-0.5 h-5 w-5 shrink-0 text-[#D4AF37]" />
                <span className="text-sm leading-7 text-white/70">{item}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section aria-labelledby="trayectoria-title" className="mx-auto max-w-7xl px-6 py-12 md:px-8 md:py-16">
        <div className="rounded-[2rem] border border-white/10 bg-white/6 p-7 backdrop-blur-2xl md:p-8">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 rounded-full bg-[#D4AF37]" />
            <h2 id="trayectoria-title" className="text-2xl font-semibold tracking-tight text-white">
              Trayectoria del proyecto
            </h2>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {timeline.map((item, index) => (
              <article
                key={item.title}
                className="relative rounded-[1.75rem] border border-white/10 bg-black/20 p-6"
              >
                <div className="absolute left-6 top-0 h-px w-16 bg-[#D4AF37]/50" />
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#E7C96C]">
                  {String(index + 1).padStart(2, "0")} · {item.label}
                </p>
                <h3 className="mt-4 text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-white/68">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="exploracion-title" className="mx-auto max-w-7xl px-6 pb-16 md:px-8 md:pb-24">
        <div className="rounded-[2rem] border border-[#D4AF37]/20 bg-[linear-gradient(180deg,rgba(212,175,55,0.12),rgba(255,255,255,0.03))] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-[#E7C96C]">
                Siguiente exploración
              </p>
              <h2 id="exploracion-title" className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                Continúa hacia las colecciones y el archivo documental.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/72">
                Desde aquí, el recorrido natural sigue hacia los estudios temáticos y la navegación
                cronológica del archivo.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/estudios"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#D4AF37] px-5 py-3 text-sm font-semibold text-[#111111] transition hover:bg-[#e3bf4f]"
              >
                Ir a Estudios
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/archivo"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-black/20 px-5 py-3 text-sm font-semibold text-white transition hover:border-[#D4AF37]/35 hover:bg-black/30"
              >
                Abrir Archivo
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
