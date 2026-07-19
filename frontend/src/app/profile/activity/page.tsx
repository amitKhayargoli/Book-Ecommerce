import { CustomerActivityViewer } from "./components/CustomerActivityViewer";

export default function ActivityLogPage() {
  return (
    <main className="min-h-screen bg-background pt-32 pb-20">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <div className="mb-10">
          <p className="text-[0.7rem] uppercase tracking-[0.3em] text-text-secondary mb-2">
            Profile
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Account Activity
          </h1>
          <p className="mt-2 text-text-secondary font-sans text-sm">
            Review security events, logins, and changes made to your account.
          </p>
        </div>
        <CustomerActivityViewer />
      </div>
    </main>
  );
}
