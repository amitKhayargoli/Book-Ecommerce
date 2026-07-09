import { IpAccessManager } from "./components/IpAccessManager";

export default function IpAccessPage() {
  return (
    <main className="min-h-screen bg-background pt-24 pb-20">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <div className="mb-10">
          <p className="text-[0.7rem] uppercase tracking-[0.3em] text-text-secondary mb-2">
            Admin
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            IP Access Control
          </h1>
          <p className="mt-2 text-text-secondary font-sans text-sm">
            Manage allow and block rules for IP addresses. Blocked IPs are denied access to the
            entire application. Allowed IPs bypass all rate-limiting restrictions.
          </p>
        </div>
        <IpAccessManager />
      </div>
    </main>
  );
}
