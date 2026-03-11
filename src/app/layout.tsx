import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { Navbar } from "@/components/layout";
import { PersistentPlayer } from "@/components/player";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["700"],
});

export const metadata: Metadata = {
  title: "Legado Patrimonial WSS — Archivo Digital de Conferencias",
  description:
    "Preservando el legado espiritual para las generaciones futuras. Acceso instantáneo a miles de conferencias, audios, videos y documentos.",
  keywords: ["conferencias", "archivo digital", "legado patrimonial", "WSS", "multimedia"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} ${playfair.variable} antialiased`} suppressHydrationWarning>
        <Navbar />
        <main style={{ paddingTop: "64px" }}>
          {children}
        </main>
        <PersistentPlayer />
      </body>
    </html>
  );
}

