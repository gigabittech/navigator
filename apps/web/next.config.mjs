/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Cross-origin isolation headers required for SharedArrayBuffer (PGlite WASM).
  // PWA install also benefits from this.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
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
