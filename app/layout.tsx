import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { SplashScreen } from "@/components/splash-screen";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const description = "Suivi de la disponibilité des produits TCG Pokémon en magasin";

export const metadata: Metadata = {
  // Requis par Next.js pour résoudre l'URL absolue de l'image Open Graph générée
  // (app/opengraph-image.tsx) ; VERCEL_PROJECT_PRODUCTION_URL est injecté automatiquement
  // par Vercel en prod, donc pas besoin de coder le domaine en dur.
  metadataBase: new URL(
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000"
  ),
  title: "PoketSecret",
  description,
  openGraph: {
    title: "PoketSecret",
    description,
    siteName: "PoketSecret",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PoketSecret",
    description,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // Teinte la barre d'adresse/barre de statut (même valeur que --background) : app
  // 100% sombre, pas besoin de variante claire.
  themeColor: "#101318",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={{ colorScheme: "dark" }}
    >
      <body className="flex h-dvh flex-col overflow-hidden">
        <SplashScreen />
        {children}
        <Toaster theme="dark" position="top-center" richColors />
      </body>
    </html>
  );
}
