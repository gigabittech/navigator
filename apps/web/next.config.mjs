import { createHash } from "node:crypto";

const isProd = process.env.NODE_ENV === "production";

// The Supabase project URL (auth, Edge Functions, sync) must be reachable from
// the browser, so it has to be allow-listed in connect-src. It's the only
// remote origin the app talks to.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";

// SHA-256 of the exact inline theme-init script rendered in app/layout.tsx.
// Reconstructed here from the same literal so the hash stays correct if the
// storage key changes — keeping script-src strict (no 'unsafe-inline').
const THEME_KEY = "navigator.theme";
const themeInitScript = `try{var t=localStorage.getItem('${THEME_KEY}');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}`;
const themeScriptHash = `'sha256-${createHash("sha256")
  .update(themeInitScript, "utf8")
  .digest("base64")}'`;

// connect-src: self for same-origin, the Supabase origin for auth + Edge
// Functions + sync. In dev, allow ws: for HMR.
const connectSrc = [
  "'self'",
  supabaseUrl || null,
  isProd ? null : "ws:",
  isProd ? null : "http://localhost:*",
]
  .filter(Boolean)
  .join(" ");

// script-src: self + the hashed theme-init script. PGlite compiles WASM, which
// needs 'wasm-unsafe-eval' (it does NOT need full 'unsafe-eval'). In dev,
// Next's HMR runtime needs 'unsafe-eval', so we relax it for dev only.
const scriptSrc = [
  "'self'",
  themeScriptHash,
  "'wasm-unsafe-eval'",
  isProd ? null : "'unsafe-eval'",
]
  .filter(Boolean)
  .join(" ");

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  // Tailwind + the design system inject inline <style>; allow it. style-src
  // does not weaken script execution, so the tradeoff is acceptable.
  "style-src 'self' 'unsafe-inline'",
  // data: for inlined SVG/PNG icons; blob: for PGlite's worker + WASM bootstrap.
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src ${connectSrc}`,
  // blob: + worker-src for the PGlite WASM worker.
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "manifest-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  ...(isProd ? ["upgrade-insecure-requests"] : []),
]
  .filter(Boolean)
  .join("; ");

const securityHeaders = [
  // Keep cross-origin isolation (required for SharedArrayBuffer / PGlite WASM).
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // HSTS only in production — never send it from dev/http so localhost isn't
  // pinned to https.
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Cross-origin isolation headers required for SharedArrayBuffer (PGlite WASM).
  // PWA install also benefits from this. Plus a strong CSP + standard security
  // headers — see securityHeaders above.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  experimental: {
    // Allow importing TS source files from workspace packages directly,
    // so we don't need a separate build step for design-system / schema.
    externalDir: true,
  },
  transpilePackages: [
    "@navigator/design-system",
    "@navigator/schema",
    "@navigator/report",
  ],
  webpack: (config) => {
    // PGlite ships .wasm — let Next serve it.
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    // Workspace packages use NodeNext-style ".js" import specifiers that point
    // at ".ts"/".tsx" sources. tsc (Bundler resolution) understands this; teach
    // webpack the same mapping so transpilePackages can resolve them.
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".jsx": [".tsx", ".jsx"],
    };
    // Import .sql migration files as raw strings (the local PGlite schema).
    config.module.rules.push({ test: /\.sql$/, type: "asset/source" });
    return config;
  },
};

export default nextConfig;
