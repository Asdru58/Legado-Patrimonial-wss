import type { Metadata } from "next";
import "@/app/globals.css";
import { Navbar } from "@/components/layout";
import PersistentPlayer from "@/components/player/PersistentPlayer";

export const metadata: Metadata = {
    title: "Legado Patrimonial WSS",
    description: "Archivo documental cronológico de conferencias, audio, video y PDF.",
};

type RootLayoutProps = Readonly<{
    children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
    return (
        <html lang="es">
            <body
                style={{
                    background: "var(--color-bg-primary)",
                    color: "var(--color-text-primary)",
                }}
            >
                <Navbar />
                {children}
                <PersistentPlayer />
            </body>
        </html>
    );
}
