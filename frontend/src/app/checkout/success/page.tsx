import Link from "next/link";
import { BACKEND_URL } from "@/lib/server-config";

const BACKEND_BASE_URL = BACKEND_URL;

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

function getQueryValue(value: string | string[] | undefined): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && value.length > 0 && typeof value[0] === "string") {
    return value[0];
  }

  return null;
}

function toSearchParams(params: Record<string, string | string[] | undefined>): URLSearchParams {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      query.append(key, value);
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        query.append(key, item);
      }
    }
  }

  return query;
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const pidx = getQueryValue(params.pidx);
  const purchaseOrderId = getQueryValue(params.purchase_order_id);

  if (!pidx) {
    return (
      <main className="min-h-screen pt-24 pb-20 px-6 md:px-10 max-w-[900px] mx-auto w-full">
        <section className="rounded-2xl border border-yellow-500/25 bg-yellow-500/10 p-8">
          <h1 className="font-display text-3xl font-semibold">Missing callback payload</h1>
          <p className="text-text-secondary mt-3">
            Payment callback details were not received.
          </p>
        </section>
      </main>
    );
  }

  let verification: VerificationResponse | null = null;
  try {
    const callbackQuery = toSearchParams(params);
    const endpoint = `${BACKEND_BASE_URL}/api/checkout/khalti/success?${callbackQuery.toString()}`;

    const response = await fetch(endpoint, {
      method: "GET",
      cache: "no-store",
    });

    verification = (await response.json()) as VerificationResponse;
  } catch {
    verification = null;
  }

  const paid = verification?.success && verification.data?.paymentStatus === "PAID";

  return (
    <main className="min-h-screen pt-24 pb-20 px-6 md:px-10 max-w-[900px] mx-auto w-full">
      <section className="rounded-2xl border border-white/10 bg-card/40 backdrop-blur-sm p-8">
        <h1 className="font-display text-3xl font-semibold">
          {paid ? "Payment confirmed" : "Payment verification failed"}
        </h1>
        <p className="text-text-secondary mt-3">
          {paid
            ? "Your order has been confirmed and your cart was updated."
            : verification?.message ?? "Unable to verify payment details."}
        </p>

        {verification?.data ? (
          <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4 text-sm">
            <p>Order ID: {verification.data.orderId}</p>
            <p>Transaction UUID: {verification.data.transactionUuid}</p>
            <p>Status Check: {verification.data.statusCheck}</p>
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/books"
            className="inline-flex items-center rounded-full bg-white text-black px-6 py-3 font-semibold hover:bg-gray-200 transition-colors"
          >
            Continue Shopping
          </Link>
          <Link
            href="/cart"
            className="inline-flex items-center rounded-full border border-white/20 px-6 py-3 font-semibold hover:border-white/40 transition-colors"
          >
            Back to Cart
          </Link>
        </div>
      </section>
    </main>
  );
}
