import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/node_modules/**",
      "apps/web/public/sw.js",
    ],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      // Allow `any` where it's genuinely needed for escape hatches
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow unused vars prefixed with _
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      // Allow require() in config files
      "@typescript-eslint/no-require-imports": "warn",
    },
  },
);
