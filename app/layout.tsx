import type { Metadata } from "next";
import { Inter, Outfit, Lexend } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./ThemeContext";
import FloatingThemeToggle from "@/components/FloatingThemeToggle";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rival | El Futuro del Fitness 2026",
  description: "La primera red social creada para la mentalidad del 1%. Registra tus progresos, compite globalmente y accede a gimnasios de élite.",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
  openGraph: {
    title: "Rival | Face Yourself. Conquer All.",
    description: "Únete a la elite del fitness. Registra, compite y evoluciona en la red social definitiva para atletas.",
    url: "https://rival.fitness",
    siteName: "Rival",
    images: [
      {
        url: "/assets/hero-cinematic.png",
        width: 1200,
        height: 630,
        alt: "Rival Fitness App",
      },
    ],
    locale: "es_ES",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rival | El Futuro del Fitness",
    description: "Competencia real, progreso real.",
    images: ["/assets/hero-cinematic.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${outfit.variable} ${lexend.variable} antialiased bg-background text-foreground transition-colors duration-300`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          {children}
          <FloatingThemeToggle />
        </ThemeProvider>
      </body>
    </html>
  );
}
