import { AdminDashboard } from "./components/AdminDashboard";

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-background pt-24 pb-20">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <AdminDashboard />
      </div>
    </main>
  );
}

