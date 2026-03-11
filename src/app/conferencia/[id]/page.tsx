import { ConferenceDetailWrapper } from "./ConferenceDetailWrapper";
import type { ConferenceData } from "@/components/ui";

/* ── Datos mockeados para validar renderizado ── */
const MOCK_CONFERENCES: Record<string, ConferenceData> = {
    "1": {
        id: "1",
        titulo: "La Estatura de un Hombre Perfecto",
        fecha: "Oct 14, 1962",
        lugar: "Jeffersonville, Indiana, EE.UU.",
        duracion: "2h 15min",
        categoria: "Conferencia",
        descripcion:
            "En esta conferencia, se expone la revelación completa del crecimiento espiritual del creyente a través de las siete virtudes descritas en 2 Pedro 1:5-7, desde la fe hasta la caridad perfecta.",
        citas_biblicas: [
            "2 Pedro 1:5-7",
            "Efesios 4:13",
            "Apocalipsis 10:7",
            "Malaquías 4:5-6",
        ],
        transcripcion: `Buenas noches, amigos. Es ciertamente un privilegio estar de regreso nuevamente esta noche en el Tabernáculo, para continuar con estos servicios.

Y ahora, esta noche quiero llevarles a un texto que considero muy importante para la iglesia en este tiempo. Hemos hablado acerca de diferentes temas, pero esta noche quiero hablarles acerca de "La Estatura de un Hombre Perfecto".

Ahora, abramos nuestras Biblias en Segunda de Pedro, capítulo uno. Y comenzaremos a leer desde el versículo cinco.

"Vosotros también, poniendo toda diligencia por esto mismo, añadid a vuestra fe virtud; a la virtud, conocimiento; al conocimiento, dominio propio; al dominio propio, paciencia; a la paciencia, piedad; a la piedad, afecto fraternal; y al afecto fraternal, amor."

Estas siete virtudes son como los peldaños de una escalera. Cada una debe ser añadida en orden, porque una depende de la otra. No podemos tener verdadero conocimiento sin antes tener virtud. Y no podemos tener dominio propio sin tener el conocimiento correcto.

Es como la construcción de un edificio. Primero se pone el fundamento — que es la fe. Luego, ladrillo por ladrillo, se va edificando hasta llegar a la cúspide, que es el amor. Y cuando todas estas virtudes están en su lugar, entonces tenemos la estatura de un hombre perfecto en Cristo Jesús.`,
        multimedia: {
            audio_url: "https://example.com/audio/estatura.mp3",
            pdf_url: "https://example.com/pdf/estatura.pdf",
            video_url: undefined,
        },
    },
};

interface ConferenciaPageProps {
    params: Promise<{ id: string }>;
}

export default async function ConferenciaPage({ params }: ConferenciaPageProps) {
    const { id } = await params;

    // En producción esto sería una consulta a Supabase
    const conference = MOCK_CONFERENCES[id];

    if (!conference) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-bg-primary)" }}>
                <div className="glass-card p-10 text-center max-w-md">
                    <div className="text-5xl mb-4">📭</div>
                    <h2
                        className="text-xl font-bold mb-2"
                        style={{ color: "var(--color-text-primary)" }}
                    >
                        Conferencia no encontrada
                    </h2>
                    <p className="text-sm mb-6" style={{ color: "var(--color-text-muted)" }}>
                        La conferencia con ID &ldquo;{id}&rdquo; no existe en el archivo.
                    </p>
                    <a href="/archivo" className="btn-gold inline-block text-sm">
                        Volver al Archivo
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen" style={{ background: "var(--color-bg-primary)" }}>
            <ConferenceDetailWrapper conference={conference} />
        </div>
    );
}
