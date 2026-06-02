import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "@navigator/design-system/tokens.css";
import "./globals.css";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { PwaRegister } from "@/lib/pwa/register";

export const metadata: Metadata = {
  title: {
    default: "Navigator — Walk into every appointment prepared.",
    template: "%s · Navigator",
  },
  description:
    "A local-first PWA for parents managing a child's complex psychiatric care. Log doses and observations in seconds. Generate a 90-day clinical report in one tap.",
  applicationName: "Navigator",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Navigator",
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon-180.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAF7" },
    { media: "(prefers-color-scheme: dark)", color: "#0F172A" },
  ],
  width: "device-width",
  initialScale: 1,
  // No maximumScale / userScalable:false — users must be able to pinch-zoom (WCAG 1.4.4).
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = headers().get("x-nonce") ?? undefined;

  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
