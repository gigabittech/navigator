import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const isProd = process.env.NODE_ENV === "production";
const __dirname = dirname(fileURLToPath(import.meta.url));

const securityHeaders = [
  // Keep cross-origin isolation (required for SharedArrayBuffer / PGlite WASM).
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
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
  output: "standalone",
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
    outputFileTracingRoot: join(__dirname, "../.."),
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
