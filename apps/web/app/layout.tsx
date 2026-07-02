import type { Metadata, Viewport } from "next";
import { Rajdhani } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/providers/AuthProvider";
import { QueryProvider } from "@/lib/providers/QueryProvider";
import { SocketProvider } from "@/lib/providers/SocketProvider";
import { IvodToaster } from "@/components/ui/IvodToaster";

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  // Poids 300 retiré : glyf bbox incorrects dans Firefox + préchargements inutilisés.
  // font-light est mappé sur 400 via --font-weight-light dans globals.css.
  // Login n'utilise que 400/600 → évite le preload inutilisé des autres graisses.
  weight: ["400", "600", "700"],
  display: "optional",
  adjustFontFallback: true,
  preload: false,
  fallback: ["system-ui", "Segoe UI", "sans-serif"],
});

export const viewport: Viewport = {
  themeColor: "#00050d",
};

export const metadata: Metadata = {
  title: { default: "iVOD", template: "%s | iVOD" },
  description: "La plateforme VOD africaine — Films, Séries & Web-séries",
  keywords: ["VOD", "streaming", "films africains", "séries", "Afrique"],
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "iVOD" },
  openGraph: {
    type: "website",
    locale: "fr_CI",
    siteName: "iVOD",
    title: "iVOD — Streaming Africain",
    description: "La plateforme VOD africaine — Films, Séries & Web-séries",
  },
  twitter: { card: "summary_large_image", title: "iVOD", description: "La plateforme VOD africaine" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`ivod-app ${rajdhani.variable} font-sans antialiased min-h-screen bg-background text-foreground`}
      >
        <QueryProvider>
          <AuthProvider>
            <SocketProvider>
              {children}
              <IvodToaster />
            </SocketProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
