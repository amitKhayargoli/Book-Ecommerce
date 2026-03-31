import CustomCursor from "../../components/CustomCursor";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { AdminDashboard } from "./components/AdminDashboard";

export default function AdminPage() {
  return (
    <>
      <CustomCursor />
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-20">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <AdminDashboard />
        </div>
      </main>
      <Footer />
    </>
  );
}

