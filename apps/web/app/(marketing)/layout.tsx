import { Analytics } from "./_components/Analytics";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ?? "navigator.app";
  return (
    <>
      {children}
      {/* Cookieless analytics, gated on the Global Privacy Control signal. */}
      <Analytics domain={domain} />
    </>
  );
}
