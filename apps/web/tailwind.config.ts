import type { Config } from "tailwindcss";
import navigatorPreset from "@navigator/design-system/tailwind-preset";

const config: Config = {
  presets: [navigatorPreset],
  content: [
    "./app/**/*.{ts,tsx,mdx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "../../packages/design-system/src/**/*.{ts,tsx}",
  ],
  plugins: [],
};

export default config;
