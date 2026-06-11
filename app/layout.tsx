import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./ThemeContext";
import { LanguageProvider } from "./LanguageContext";
import InstallAppPrompt from "@/components/pwa/InstallAppPrompt";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});


export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#000000",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://rivalfit.app"),
  title: "Rival Fit | El Futuro del Fitness 2026",
  description: "La primera red social creada para la mentalidad del 1%. Registra tus progresos, compite globalmente y accede a gimnasios de élite.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RivalFit",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('rival_theme') || 'dark';
                  document.documentElement.setAttribute('data-theme', theme);
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${outfit.variable} antialiased bg-background text-foreground transition-colors duration-300`}
        suppressHydrationWarning
      >
        <LanguageProvider>
          <ThemeProvider>
            {children}
            <InstallAppPrompt />
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
