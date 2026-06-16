import { AdminDashboard } from "./components/AdminDashboard";
import { handleGetProfile } from "../(auth)/actions/auth-action";

export default async function AdminPage() {
  const profileResult = await handleGetProfile();
  const profile = profileResult.success ? profileResult.data : null;

  return (
    <main className="min-h-screen bg-background pt-24 pb-20">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <AdminDashboard initialProfile={profile} />
      </div>
    </main>
  );
}

