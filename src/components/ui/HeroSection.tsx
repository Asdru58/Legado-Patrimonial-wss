import Image from "next/image";
import Link from "next/link";

export default function HeroSection() {
    return (
        <section
            aria-labelledby="hero-title"
            className="relative flex overflow-hidden bg-[#0F0D0A] lg:min-h-[calc(100svh-4rem)]"
        >
            <div className="mx-auto grid w-full max-w-7xl items-center px-6 pb-10 pt-8 md:px-10 lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.86fr)] lg:grid-rows-[auto_1fr] lg:gap-x-10 lg:gap-y-0 lg:pb-8 lg:pt-6">
                <div className="z-10 max-w-2xl lg:col-start-1 lg:row-start-1 lg:self-start">
                    <h1
                        id="hero-title"
                        className="font-serif text-5xl font-semibold leading-[1.08] tracking-[-0.04em] text-[#E8DCC8] sm:text-6xl lg:text-7xl"
                    >
                        El resguardo de{" "}
                        <em className="not-italic text-[#DFC06A]">la Palabra Pura</em>
                    </h1>
                </div>

                <div className="relative mx-auto mt-6 h-[min(48svh,370px)] min-h-[320px] w-full max-w-[420px] self-end sm:h-[440px] sm:min-h-[440px] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:h-full lg:min-h-[560px] lg:max-w-none">
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

                <div className="z-10 max-w-2xl lg:col-start-1 lg:row-start-2 lg:self-start">
                    <blockquote className="mt-6 max-w-xl border-l border-[#C8A843] pl-5 lg:mt-5">
                        <p className="text-[0.95rem] leading-7 text-[rgba(232,220,200,0.7)] md:text-base md:leading-7 2xl:text-lg 2xl:leading-8">
                            …el Mensaje de Dios para cada etapa, edad o dispensación, luego que es
                            dado, es un patrimonio del pueblo de Dios. Mientras está el mensajero, el
                            mensajero tiene control, pero cuando se va el mensajero, ya ni los
                            familiares del mensajero pueden hacer nada, porque ya ese patrimonio fue
                            dado para la Iglesia, para el pueblo de Dios.
                        </p>
                        <cite className="mt-3 block not-italic lg:mt-4">
                            <span className="block text-[0.68rem] font-medium uppercase leading-4 tracking-[0.05em] text-[rgba(232,220,200,0.42)]">
                                El lugar donde Dios ha puesto su palabra. 10 de julio del 2000
                            </span>
                            <span className="mt-1.5 block text-sm font-medium uppercase tracking-[0.05em] text-[rgba(232,220,200,0.62)]">
                                Dr. William Soto Santiago
                            </span>
                        </cite>
                    </blockquote>

                    <div className="mt-7 flex flex-col gap-3 sm:flex-row lg:mt-6 lg:flex-wrap lg:gap-4">
                        <Link
                            href="#explorar-archivo"
                            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-md bg-[#C8A843] px-7 py-3 text-center font-semibold text-[#0F0D0A] transition-colors duration-200 hover:bg-[#DFC06A] active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DFC06A] sm:w-auto"
                        >
                            Explorar el Archivo ↓
                        </Link>
                        <Link
                            href="/el-legado"
                            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-md border border-[rgba(200,168,67,0.28)] px-7 py-3 text-center font-semibold text-[#E8DCC8] transition-colors duration-200 hover:border-[#C8A843] hover:text-[#DFC06A] active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DFC06A] sm:w-auto"
                        >
                            Conocer El Legado
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
