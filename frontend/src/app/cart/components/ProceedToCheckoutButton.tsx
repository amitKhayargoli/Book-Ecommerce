"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CheckoutProvider = "esewa" | "khalti";

interface InitiateCheckoutPayload {
  success: boolean;
  message?: string;
  data?: {
    paymentProvider: "ESEWA" | "KHALTI";
    action?: string;
    form?: Record<string, string>;
    paymentUrl?: string;
  };
}

function encodeRedirectPayload(payload: { action: string; form: Record<string, string> }): string {
  const serialized = JSON.stringify(payload);
  return btoa(serialized);
}

export default function ProceedToCheckoutButton() {
  const [activeProvider, setActiveProvider] = useState<CheckoutProvider | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleCheckout = async (provider: CheckoutProvider) => {
    if (activeProvider) {
      return;
    }

    setActiveProvider(provider);
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/checkout/${provider}/initiate`, {
        method: "POST",
      });

      if (response.status === 401) {
        router.push(`/login?callbackUrl=${encodeURIComponent("/cart")}`);
        return;
      }

      const payload = (await response.json()) as InitiateCheckoutPayload;
      if (!response.ok || !payload.success || !payload.data) {
        setErrorMessage(payload.message ?? "Unable to start checkout. Please try again.");
        return;
      }

      if (
        payload.data.paymentProvider === "KHALTI" &&
        typeof payload.data.paymentUrl === "string" &&
        payload.data.paymentUrl.length > 0
      ) {
        window.location.assign(payload.data.paymentUrl);
        return;
      }

      if (
        payload.data.paymentProvider === "ESEWA" &&
        typeof payload.data.action === "string" &&
        payload.data.action.length > 0 &&
        payload.data.form &&
        typeof payload.data.form === "object"
      ) {
        const encodedPayload = encodeRedirectPayload({
          action: payload.data.action,
          form: payload.data.form,
        });

        router.push(`/checkout/esewa/redirect?payload=${encodeURIComponent(encodedPayload)}`);
        return;
      }

      setErrorMessage("Unexpected checkout response. Please try again.");
    } catch {
      setErrorMessage("Failed to reach checkout service. Please try again.");
    } finally {
      setActiveProvider(null);
    }
  };

  return (
    <div className="mt-8 space-y-3">
      <button
        type="button"
        onClick={() => {
          void handleCheckout("esewa");
        }}
        disabled={activeProvider !== null}
        className="w-full rounded-full bg-white text-black px-6 py-4 font-semibold hover:bg-gray-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {activeProvider === "esewa" ? "Redirecting to eSewa..." : "Pay with eSewa"}
      </button>

      <button
        type="button"
        onClick={() => {
          void handleCheckout("khalti");
        }}
        disabled={activeProvider !== null}
        className="w-full rounded-full border border-white/25 px-6 py-4 font-semibold hover:border-white/50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {activeProvider === "khalti" ? "Redirecting to Khalti..." : "Pay with Khalti"}
      </button>

      {errorMessage ? (
        <p className="text-sm text-red-300 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
