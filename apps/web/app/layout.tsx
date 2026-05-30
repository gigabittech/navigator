import type { Metadata, Viewport } from "next";
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
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAF7" },
    { media: "(prefers-color-scheme: dark)", color: "#0F172A" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
