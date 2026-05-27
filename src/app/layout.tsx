import type { Metadata } from "next";
import { EB_Garamond, Outfit } from "next/font/google";
import "@/app/globals.css";

const displayFont = EB_Garamond({
    subsets: ["latin"],
    variable: "--font-display",
    display: "swap",
});

const bodyFont = Outfit({
    subsets: ["latin"],
    variable: "--font-body",
    display: "swap",
});

export const metadata: Metadata = {
    title: {
        default: "Legado Patrimonial El Séptimo Sello",
        template: "%s | Legado Patrimonial El Séptimo Sello",
    },
    description: "Portal editorial y archivo patrimonial de conferencias, audio, video y documentos de Legado Patrimonial El Séptimo Sello.",
};

type RootLayoutProps = Readonly<{
    children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
    return (
        <html lang="es" className={`${displayFont.variable} ${bodyFont.variable}`}>
            <body
                className={bodyFont.className}
                style={{
                    background: "var(--color-bg-primary)",
                    color: "var(--color-text-primary)",
                }}
            >
                {children}
            </body>
        </html>
    );
}
