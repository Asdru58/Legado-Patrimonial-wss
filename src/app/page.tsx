import Link from "next/link";

export default function Page() {
  return (
    <main className="min-h-screen bg-[#0F0D0A] px-6 py-16 text-[#E8DCC8]">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#C8A843]">
          Legado Patrimonial El Séptimo Sello
        </p>
        <h1 className="mt-6 font-serif text-4xl font-semibold">
          Portada en construcción
        </h1>
        <p className="mt-4 text-[rgba(232,220,200,0.6)]">
          La portada editorial será implementada en el Bloque D.4.
        </p>
        <Link
          href="/inicio"
          className="mt-8 inline-flex min-h-[48px] items-center rounded-md bg-[#C8A843] px-6 py-3 font-semibold text-[#0F0D0A]"
        >
          Entrar al portal
        </Link>
      </div>
    </main>
  );
}
