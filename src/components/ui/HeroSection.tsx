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
                <p className="mt-6 text-base text-[#f6f1eb]/80 max-w-lg leading-relaxed text-justify line-clamp-6">
                    &ldquo;El Mensaje de Dios para cada etapa, edad o dispensación, luego que es dado, es un patrimonio del pueblo de Dios. Mientras está el mensajero, el mensajero tiene control, pero cuando se va el mensajera, ya ni los familiares del mensajero pueden hacer nada, porque ya ese patrimonio fue dado para la Iglesia, para el pueblo de Dios. Porque si un mensajero es enviado a la Iglesia y le trae un mensaje para la Iglesia, queda como propiedad de la Iglesia; porque es para la Iglesia&rdquo;&hellip;
                </p>
            </div>

            {/* Columna Derecha: Imagen */}
            <div className="absolute right-0 bottom-0 w-[45%] h-[85%] z-10 pointer-events-none">
                <img
                    src="/images/hero-dr-william.png"
                    alt="Dr. William Soto Santiago"
                    className="absolute inset-0 w-full h-full object-contain object-bottom object-right drop-shadow-2xl"
                />
            </div>
        </section>
    );
}


