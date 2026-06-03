// CommonJS PostCSS config — works with require() on all platforms.
// postcss-load-config finds .cjs before .mjs, so this takes precedence
// without needing dynamic import().

module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
