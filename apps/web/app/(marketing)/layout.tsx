import Script from "next/script";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ?? "navigator.app";
  return (
    <>
      {children}
      {process.env.NODE_ENV === "production" && (
        <Script
          defer
          data-domain={domain}
          src="https://plausible.io/js/script.js"
          strategy="afterInteractive"
        />
      )}
    </>
  );
}
