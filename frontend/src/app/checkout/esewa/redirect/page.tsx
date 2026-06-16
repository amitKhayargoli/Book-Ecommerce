"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";

interface RedirectPayload {
  action: string;
  form: Record<string, string>;
}

function decodePayload(rawPayload: string | null): RedirectPayload | null {
  if (!rawPayload) {
    return null;
  }

  try {
    const decoded = atob(rawPayload);
    const parsed = JSON.parse(decoded) as RedirectPayload;
    if (typeof parsed.action !== "string" || !parsed.action.startsWith("http")) {
      return null;
    }

    if (!parsed.form || typeof parsed.form !== "object") {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function EsewaRedirectContent() {
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement | null>(null);

  const payload = useMemo(
    () => decodePayload(searchParams.get("payload")),
    [searchParams],
  );

  useEffect(() => {
    if (!payload) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      formRef.current?.submit();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [payload]);

  if (!payload) {
    return (
      <main className="min-h-screen pt-24 pb-20 px-6 md:px-10 max-w-[900px] mx-auto w-full">
        <section className="rounded-2xl border border-red-400/25 bg-red-500/10 p-8 text-center">
          <h1 className="font-display text-3xl font-semibold">Invalid checkout payload</h1>
          <p className="text-text-secondary mt-3">
            Start checkout again from your cart to continue.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-24 pb-20 px-6 md:px-10 max-w-[900px] mx-auto w-full">
      <section className="rounded-2xl border border-white/10 bg-card/40 backdrop-blur-sm p-8 text-center">
        <h1 className="font-display text-3xl font-semibold">Redirecting to eSewa</h1>
        <p className="text-text-secondary mt-3">
          Your secure payment session is being prepared.
        </p>

        <form ref={formRef} action={payload.action} method="POST" className="hidden">
          {Object.entries(payload.form).map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={value} />
          ))}
        </form>
      </section>
    </main>
  );
}

export default function EsewaRedirectPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen pt-24 pb-20 px-6 md:px-10 max-w-[900px] mx-auto w-full">
        <section className="rounded-2xl border border-white/10 bg-card/40 backdrop-blur-sm p-8 text-center">
          <h1 className="font-display text-3xl font-semibold">Loading</h1>
          <p className="text-text-secondary mt-3">Preparing your payment session...</p>
        </section>
      </main>
    }>
      <EsewaRedirectContent />
    </Suspense>
  );
}
