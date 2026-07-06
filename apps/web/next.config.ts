import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/** Extrait l'origine (scheme + host + port) depuis une URL, retourne fallback si invalide. */
function parseOrigin(url: string | undefined, fallback = ""): string {
  if (!url) return fallback;
  try { return new URL(url).origin; }
  catch { return fallback; }
}

/** Convertit une origine HTTP en WebSocket (http→ws, https→wss). */
function httpToWs(origin: string): string {
  return origin.replace(/^https:\/\//, "wss://").replace(/^http:\/\//, "ws://");
}

/** Déduplique et filtre les chaînes vides. */
function cspList(values: string[]): string {
  return [...new Set(values.filter(Boolean))].join(" ");
}

// ─── Origines dérivées des variables d'env au build time ─────────────────────
// Les NEXT_PUBLIC_* sont disponibles en Node.js lors de la génération du config.
// En prod Docker, elles sont passées comme ARG de build (docker-compose.prod.yml).

const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1")
  .replace(/\/api\/v1\/?$/, "");
const apiOrigin = parseOrigin(apiBase, "http://localhost:3000");
const wsOrigin  = parseOrigin(process.env.NEXT_PUBLIC_WS_URL, apiOrigin);
const wsWsOrigin = httpToWs(wsOrigin);
const minioOrigin = parseOrigin(process.env.NEXT_PUBLIC_MINIO_URL, "http://localhost:9000");

// En dev, toujours inclure localhost même si les env vars pointent ailleurs
const devExtras = isDev
  ? {
      api:   ["http://localhost:3000", "http://127.0.0.1:3000"],
      ws:    ["ws://localhost:3000",   "ws://127.0.0.1:3000"],
      minio: ["http://localhost:9000", "http://127.0.0.1:9000"],
    }
  : { api: [], ws: [], minio: [] };

/** Origine API pour rewrites serveur (Docker: http://api:3000) */
function apiRewriteOrigin(): string {
  const internal = process.env.API_REWRITE_ORIGIN;
  if (internal) return internal.replace(/\/$/, "");
  return apiBase;
}

const nextConfig: NextConfig = {
  output: 'standalone',
  turbopack: {},
  async rewrites() {
    const origin = apiRewriteOrigin();
    return [
      {
        source: "/media",
        destination: `${origin}/api/v1/storage/object`,
      },
    ];
  },
  images: {
    // Dev local : MinIO sur localhost/127.0.0.1 — l'optimiseur Next bloque les IP privées (SSRF)
    dangerouslyAllowLocalIP: isDev,
    // Évite aussi les erreurs "upstream resolved to private ip" en dev
    unoptimized: isDev,
    remotePatterns: [
      { protocol: "http",  hostname: "localhost",   port: "9000", pathname: "/**" },
      { protocol: "http",  hostname: "127.0.0.1",   port: "9000", pathname: "/**" },
      { protocol: "http",  hostname: "localhost",   port: "3000", pathname: "/api/v1/storage/**" },
      { protocol: "http",  hostname: "127.0.0.1",   port: "3000", pathname: "/api/v1/storage/**" },
      { protocol: "https", hostname: "*.ivod.africa", pathname: "/**" },
    ],
  },
  async headers() {
    const cspDirectives = [
      "default-src 'self'",
      // Next.js App Router injecte des scripts inline pour l'hydratation RSC
      // 'unsafe-eval' requis uniquement en dev (Turbopack HMR + source maps React)
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
      // Tailwind v4 injecte des styles inline
      "style-src 'self' 'unsafe-inline'",
      // Images : self + data URIs + blob + MinIO (valeur exacte dérivée de NEXT_PUBLIC_MINIO_URL)
      `img-src 'self' data: blob: ${cspList([minioOrigin, ...devExtras.minio])}`,
      // Vidéo HLS : blob URLs générées par Video.js + MinIO
      `media-src 'self' blob: ${cspList([minioOrigin, ...devExtras.minio])}`,
      // Worker Video.js/hls.js (transmuxing) : chargé depuis une blob: URL.
      // Sans cette directive, le navigateur retombe sur script-src qui n'autorise
      // pas blob: — bloquait le lecteur HLS en prod. Trouvé le 2026-07-05.
      "worker-src 'self' blob:",
      // API (fetch) + WebSocket : origines exactes dérivées des env vars
      `connect-src 'self' ${cspList([apiOrigin, wsOrigin, wsWsOrigin, ...devExtras.api, ...devExtras.ws])}`,
      "font-src 'self' data:",
      // Bloque le clickjacking (redondant avec X-Frame-Options mais meilleure couverture)
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      ...(!isDev ? ["upgrade-insecure-requests"] : []),
    ].join("; ");

    return [
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/media",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(self), usb=()",
          },
          { key: "Content-Security-Policy", value: cspDirectives },
          // HSTS : uniquement en production (HTTPS uniquement)
          ...(!isDev
            ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
