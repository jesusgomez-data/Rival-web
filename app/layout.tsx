import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./ThemeContext";
import { LanguageProvider } from "./LanguageContext";
import InstallAppPrompt from "@/components/pwa/InstallAppPrompt";
import PushNotificationManager from "@/components/pwa/PushNotificationManager";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

import { Bungee, Montserrat, Anton, Sacramento } from "next/font/google";

const bungee = Bungee({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bungee",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
});

const sacramento = Sacramento({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-sacramento",
});


export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://rivalfit.app"),
  title: "Rival Fit | El Futuro del Fitness 2026",
  description: "La primera red social creada para la mentalidad del 1%. Registra tus progresos, compite globalmente y accede a gimnasios de élite.",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
  openGraph: {
    title: "Rival Fit | Face Yourself. Conquer All.",
    description: "Únete a la elite del fitness. Registra, compite y evoluciona en la red social definitiva para atletas.",
    url: "https://rivalfit.app",
    siteName: "Rival Fit",
    images: [
      {
        url: "/assets/hero-cinematic.png",
        width: 1200,
        height: 630,
        alt: "Rival Fit App",
      },
    ],
    locale: "es_ES",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rival Fit | El Futuro del Fitness",
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
        className={`${inter.variable} ${outfit.variable} ${bungee.variable} ${montserrat.variable} ${anton.variable} ${sacramento.variable} antialiased bg-background text-foreground transition-colors duration-300`}
        suppressHydrationWarning
      >
        <LanguageProvider>
          <ThemeProvider>
            <InstallAppPrompt />
            <PushNotificationManager />
            {children}
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
