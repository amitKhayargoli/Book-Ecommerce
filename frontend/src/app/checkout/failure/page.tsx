import Link from "next/link";
import { BACKEND_URL } from "@/lib/server-config";

const BACKEND_BASE_URL = BACKEND_URL;

interface FailureResponse {
  success: boolean;
  message?: string;
  data?: {
    handled: boolean;
    orderId: string | null;
    transactionUuid: string | null;
    paymentStatus: "FAILED" | "PAID" | null;
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

function normalizeProvider(value: string | null): "esewa" | "khalti" | null {
  if (!value) {
    return null;
  }

  const normalized = value.toLowerCase();
  if (normalized.startsWith("khalti")) {
    return "khalti";
  }
  if (normalized.startsWith("esewa")) {
    return "esewa";
  }

  return null;
}

export default async function CheckoutFailurePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const providerParam = getQueryValue(params.provider);
  const pidx = getQueryValue(params.pidx);
  const purchaseOrderId = getQueryValue(params.purchase_order_id);
  const provider =
    normalizeProvider(providerParam) ??
    (pidx ? "khalti" : null) ??
    (purchaseOrderId?.startsWith("KHL-") ? "khalti" : null) ??
    "esewa";
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

  let failureResult: FailureResponse | null = null;
  try {
    const endpoint =
      provider === "khalti"
        ? `${BACKEND_BASE_URL}/api/checkout/khalti/failure?${query.toString()}`
        : `${BACKEND_BASE_URL}/api/checkout/esewa/failure?${query.toString()}`;

    const response = await fetch(
      endpoint,
      {
        method: "GET",
        cache: "no-store",
      },
    );

    failureResult = (await response.json()) as FailureResponse;
  } catch {
    failureResult = null;
  }

  return (
    <main className="min-h-screen pt-24 pb-20 px-6 md:px-10 max-w-[900px] mx-auto w-full">
      <section className="rounded-2xl border border-red-400/25 bg-red-500/10 p-8">
        <h1 className="font-display text-3xl font-semibold">Payment not completed</h1>
        <p className="text-text-secondary mt-3">
          {failureResult?.message ?? "Your payment was cancelled or failed."}
        </p>

        <p className="text-text-secondary mt-2 text-sm uppercase tracking-wide">
          Provider: {provider === "khalti" ? "Khalti" : "eSewa"}
        </p>

        {failureResult?.data ? (
          <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4 text-sm">
            <p>Handled: {failureResult.data.handled ? "Yes" : "No"}</p>
            <p>Transaction UUID: {failureResult.data.transactionUuid ?? "Not provided"}</p>
          </div>
        ) : null}

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
      </section>
    </main>
  );
}
