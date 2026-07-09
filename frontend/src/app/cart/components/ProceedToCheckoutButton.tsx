"use client";

import { useRouter } from "next/navigation";

export default function ProceedToCheckoutButton() {
  const router = useRouter();

  return (
    <div className="mt-8">
      <button
        type="button"
        onClick={() => router.push("/checkout")}
        className="w-full rounded-full bg-white text-black px-6 py-4 font-semibold hover:bg-gray-200 transition-colors duration-300"
      >
        Proceed to Checkout
      </button>
    </div>
  );
}
