import Image from 'next/image';

export default function HeroSection() {
    return (
        <section className="relative w-full h-[600px] flex items-center bg-[#0a0a14] overflow-hidden">
            {/* Fondo oscuro */}
            <div className="absolute inset-0 bg-[#0a0a14] z-0"></div>

            {/* Columna Izquierda: Texto */}
            <div className="relative z-20 w-[55%] pl-10 md:pl-20">
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold whitespace-nowrap bg-clip-text text-transparent bg-gradient-to-r from-[#b99863] to-[#ebd39e]">
                    Nuestro Patrimonio
                </h1>
                <p className="mt-6 text-lg text-[#f6f1eb]/80 max-w-md">
                    Preservando el legado espiritual para las generaciones futuras con acceso instantáneo a miles de recursos multimedia.
                </p>
                {/* Aquí va tu buscador actual, mantenlo si ya lo tienes en otro componente */}
            </div>

            {/* Columna Derecha: Imagen y Luz */}
            <div className="absolute right-0 bottom-0 w-[45%] h-[95%] z-10 pointer-events-none">
                <Image
                    src="/images/hero-dr-william.png"
                    alt="Dr. William Soto Santiago"
                    fill
                    priority
                    className="object-contain object-bottom object-right"
                />
                {/* Contenedor de la Emanación - Posicionado sobre el libro */}
                <div className="absolute bottom-[20%] right-[32%] w-[10rem] h-[10rem] z-30 pointer-events-none mix-blend-soft-light">
                    {/* Capa 1: Glow Sutil de Base (Suave y Radial) */}
                    <div
                        className="absolute inset-0 blur-[70px] rounded-full"
                        style={{ background: 'radial-gradient(circle, rgba(235,211,158,0.2) 0%, transparent 70%)' }}
                    ></div>
                    {/* Capa 2: Rayo Focal / 'Conito' (Delicado y Vertical) */}
                    <div className="absolute inset-x-0 top-0 h-full w-[3.5rem] mx-auto bg-gradient-to-t from-[#EBD39E]/30 to-transparent blur-[35px] rounded-b-full scale-y-[1.8] origin-bottom"></div>
                </div>
            </div>
        </section>
    );
}
