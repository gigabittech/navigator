import { Card } from "@navigator/design-system/components";
import { WaitlistForm } from "./_components/WaitlistForm";

export default function WaitlistPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-20">
      <Card className="w-full max-w-md" elevation="floating">
        <h1 className="text-2xl font-bold mb-2">Join the waitlist</h1>
        <p className="text-fg-2 mb-6">
          We&rsquo;ll email you when Navigator opens up to your area. No spam, no
          marketing list — just one note when it&rsquo;s your turn.
        </p>
        <WaitlistForm />
      </Card>
    </main>
  );
}
