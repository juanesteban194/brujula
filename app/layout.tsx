import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "sonner";
import Providers from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brújula — Camina con rumbo",
  description:
    "El mapa que optimiza por seguridad, no solo por tiempo. Rutas peatonales inteligentes para Medellín.",
  keywords: ["Medellín", "seguridad", "rutas", "caminata", "mapa", "brújula"],
  authors: [{ name: "Brújula" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Brújula",
  },
  openGraph: {
    title: "Brújula — Camina con rumbo",
    description: "Rutas peatonales en Medellín optimizadas por seguridad.",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Brújula — Camina con rumbo",
    images: ["/og-image-square.png"],
  },
  icons: {
    icon: "/favicon.svg",
    apple: "/icons/icon-apple-180.png",
    shortcut: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  userScalable: false,
  themeColor: "#0D0A08",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Brújula" />
        <link rel="apple-touch-icon" href="/icons/icon-apple-180.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0D0A08" />
      </head>
      <body className="bg-bg-base text-text-primary antialiased">
        <Providers>
          {children}
        </Providers>
        <Toaster
          theme="dark"
          position="bottom-center"
          toastOptions={{
            style: {
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-primary)",
            },
          }}
        />
      </body>
    </html>
  );
}
