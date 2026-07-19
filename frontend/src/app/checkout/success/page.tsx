"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/components/CartProvider";

interface VerificationResponse {
  success: boolean;
  message?: string;
  data?: {
    orderId: string;
    transactionUuid: string;
    paymentStatus: "PAID" | "FAILED";
    orderStatus: "CONFIRMED" | "PENDING";
    statusCheck: string;
    alreadyProcessed: boolean;
  };
}

function VerifyContent() {
  const searchParams = useSearchParams();
  const { refreshCount } = useCart();
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const [verification, setVerification] = useState<VerificationResponse["data"] | null>(null);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const pidx = searchParams.get("pidx");
    const paymentStatus = searchParams.get("status");
    const purchaseOrderId = searchParams.get("purchase_order_id") ?? undefined;

    // User cancelled from the Khalti hosted page
    if (paymentStatus === "User canceled") {
      setMessage("You cancelled the payment. Your order was not charged.");
      setStatus("failed");
      return;
    }

    if (!pidx) {
      setMessage("Payment callback details were not received.");
      setStatus("failed");
      return;
    }

    let cancelled = false;
    const verify = async () => {
      try {
        const res = await fetch("/api/checkout/khalti/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pidx, purchaseOrderId }),
          cache: "no-store",
        });

        const json = (await res.json()) as VerificationResponse;
        if (cancelled) return;

        if (json.success && json.data?.paymentStatus === "PAID") {
          setVerification(json.data);
          setStatus("success");
          // Refresh cart count in Navbar since the cart was cleared after payment
          refreshCount();
        } else if (res.status === 401) {
          // Session expired mid-redirect — the charge may still have succeeded.
          setMessage(
            "Please sign in again, then check your orders to confirm the payment.",
          );
          setStatus("failed");
        } else {
          setMessage(
            json.message ?? "Unable to verify payment details. Please contact support.",
          );
          setStatus("failed");
        }
      } catch {
        if (cancelled) return;
        setMessage("Unable to verify payment details. Please contact support.");
        setStatus("failed");
      }
    };

    void verify();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <main className="min-h-screen pt-24 pb-20 px-6 md:px-10 max-w-[900px] mx-auto w-full">
      <section className="rounded-2xl border border-white/10 bg-card/40 backdrop-blur-sm p-8">
        {status === "loading" && (
          <div className="flex flex-col items-center py-10 text-center">
            <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <h1 className="font-display text-3xl font-semibold mt-6">
              Verifying payment...
            </h1>
            <p className="text-text-secondary mt-3">
              Please wait while we confirm your payment with Khalti.
            </p>
          </div>
        )}

        {status === "success" && (
          <>
            <h1 className="font-display text-3xl font-semibold">Payment confirmed</h1>
            <p className="text-text-secondary mt-3">
              Your order has been confirmed and your cart was updated.
            </p>

            {verification ? (
              <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4 text-sm">
                <p>Order ID: {verification.orderId}</p>
                <p>Transaction UUID: {verification.transactionUuid}</p>
                <p>Status Check: {verification.statusCheck}</p>
              </div>
            ) : null}

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/orders"
                className="inline-flex items-center rounded-full bg-white text-black px-6 py-3 font-semibold hover:bg-gray-200 transition-colors"
              >
                View Your Orders
              </Link>
              <Link
                href="/books"
                className="inline-flex items-center rounded-full border border-white/20 px-6 py-3 font-semibold hover:border-white/40 transition-colors"
              >
                Continue Shopping
              </Link>
            </div>
          </>
        )}

        {status === "failed" && (
          <>
            <h1 className="font-display text-3xl font-semibold">
              Payment not completed
            </h1>
            <p className="text-text-secondary mt-3">
              {message || "Your payment was cancelled or failed."}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/cart"
                className="inline-flex items-center rounded-full bg-white text-black px-6 py-3 font-semibold hover:bg-gray-200 transition-colors"
              >
                Return to Cart
              </Link>
              <Link
                href="/books"
                className="inline-flex items-center rounded-full border border-white/20 px-6 py-3 font-semibold hover:border-white/40 transition-colors"
              >
                Browse Books
              </Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen pt-24 pb-20 px-6 md:px-10 max-w-[900px] mx-auto w-full">
          <section className="rounded-2xl border border-white/10 bg-card/40 backdrop-blur-sm p-8">
            <div className="flex flex-col items-center py-10 text-center">
              <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          </section>
        </main>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
