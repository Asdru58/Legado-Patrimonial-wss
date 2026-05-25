import Image from "next/image";
import Link from "next/link";

export default function HeroSection() {
    return (
        <section
            aria-labelledby="hero-title"
            className="relative flex min-h-[calc(100svh-4rem)] overflow-hidden bg-[#0F0D0A]"
        >
            <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-6 py-12 md:px-10 lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.86fr)] lg:py-16">
                <div className="z-10 max-w-2xl">
                    <div className="mb-7 inline-flex items-center gap-2 border border-[rgba(200,168,67,0.24)] px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-[#DFC06A]">
                        <span aria-hidden="true" className="text-[0.7rem] text-[#C8A843]">
                            ✦
                        </span>
                        <span>Archivo Patrimonial Digital</span>
                    </div>

                    <h1
                        id="hero-title"
                        className="font-serif text-5xl font-semibold leading-[1.08] tracking-[-0.04em] text-[#E8DCC8] sm:text-6xl lg:text-7xl"
                    >
                        El resguardo de{" "}
                        <em className="not-italic text-[#DFC06A]">la Palabra viva</em>
                    </h1>

                    <blockquote className="mt-8 max-w-xl border-l border-[#C8A843] pl-5">
                        <p className="text-base leading-8 text-[rgba(232,220,200,0.7)] md:text-lg">
                            &ldquo;El Mensaje de Dios para cada etapa, edad o dispensación, luego que es
                            dado, es un patrimonio del pueblo de Dios.&rdquo;
                        </p>
                        <cite className="mt-4 block text-sm not-italic text-[rgba(232,220,200,0.52)]">
                            Dr. William Soto Santiago
                        </cite>
                    </blockquote>

                    <div className="mt-10 flex flex-wrap gap-4">
                        <Link
                            href="/archivo"
                            className="inline-flex min-h-[48px] items-center rounded-md bg-[#C8A843] px-7 py-3 font-semibold text-[#0F0D0A] transition-colors duration-200 hover:bg-[#DFC06A] active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DFC06A]"
                        >
                            Explorar el Archivo ↓
                        </Link>
                        <Link
                            href="/el-legado"
                            className="inline-flex min-h-[48px] items-center rounded-md border border-[rgba(200,168,67,0.28)] px-7 py-3 font-semibold text-[#E8DCC8] transition-colors duration-200 hover:border-[#C8A843] hover:text-[#DFC06A] active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DFC06A]"
                        >
                            Conocer El Legado
                        </Link>
                    </div>
                </div>

                <div className="relative min-h-[360px] w-full self-end sm:min-h-[440px] lg:h-full lg:min-h-[560px]">
                    <Image
                        src="/images/hero-dr-william.png"
                        alt="Dr. William Soto Santiago sosteniendo la Biblia"
                        fill
                        priority
                        quality={85}
                        sizes="(max-width: 1023px) 100vw, 45vw"
                        className="object-contain object-bottom"
                    />
                </div>
            </div>
        </section>
    );
}
