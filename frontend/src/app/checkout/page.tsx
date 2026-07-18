"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart,
  MapPin,
  CreditCard,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ArrowLeft,
  ShieldCheck,
  Star,
  Truck,
  Package,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────

interface CartItem {
  id: string;
  bookId: string;
  format: string | null;
  unitPrice: number;
  quantity: number;
  createdAt: string;
  book: {
    id: string;
    title: string;
    price: number;
    coverImage: string;
    author: { id: string; name: string; slug: string };
  };
}

interface CartResponse {
  success: boolean;
  data?: {
    items?: CartItem[];
    summary?: { itemsCount?: number; subtotal?: number };
  };
}

interface Address {
  id: string;
  fullName: string;
  phone: string;
  country: string;
  city: string;
  state: string | null;
  postalCode: string;
  street: string;
  isDefault: boolean;
}

interface InitiateResponse {
  success: boolean;
  message?: string;
  data?: {
    paymentProvider: "ESEWA" | "KHALTI";
    action?: string;
    form?: Record<string, string>;
    paymentUrl?: string;
    pidx?: string;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────

function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "NPR",
    minimumFractionDigits: 2,
  }).format(value);
}

const PAYMENT_OPTIONS = [
  {
    id: "khalti" as const,
    label: "Khalti",
    description: "Pay via Khalti wallet",
    icon: "/payments/khalti.svg",
  },
];

// ─── Component ────────────────────────────────────────────────────

export default function CheckoutPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [itemsCount, setItemsCount] = useState(0);
  const [loadingCart, setLoadingCart] = useState(true);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  const [paymentMethod, setPaymentMethod] = useState<"khalti" | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);

  // ── Auth redirect ─────────────────────────────────────────────
  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/login?callbackUrl=/checkout");
    }
  }, [sessionStatus, router]);

  // ── Fetch cart ────────────────────────────────────────────────
  const fetchCart = useCallback(async () => {
    setLoadingCart(true);
    try {
      const res = await fetch("/api/cart", { cache: "no-store" });
      const json = (await res.json()) as CartResponse;
      if (json.success && json.data) {
        const items = json.data.items ?? [];
        setCartItems(items);
        setItemsCount(json.data.summary?.itemsCount ?? items.reduce((a, i) => a + i.quantity, 0));
        setSubtotal(json.data.summary?.subtotal ?? items.reduce((a, i) => a + (i.unitPrice ?? i.book.price) * i.quantity, 0));
      }
    } catch {
      setCartItems([]);
    } finally {
      setLoadingCart(false);
    }
  }, []);

  // ── Fetch addresses ───────────────────────────────────────────
  const fetchAddresses = useCallback(async () => {
    setLoadingAddresses(true);
    try {
      const res = await fetch("/api/addresses", { cache: "no-store" });
      const json = (await res.json()) as { success?: boolean; data?: Address[] };
      if (json.success && json.data) {
        const sorted = [...json.data].sort((a, b) => {
          if (a.isDefault && !b.isDefault) return -1;
          if (!a.isDefault && b.isDefault) return 1;
          return 0;
        });
        setAddresses(sorted);
        // Pre-select the default address, or the first one
        const defaultAddr = sorted.find((a) => a.isDefault) ?? sorted[0];
        if (defaultAddr) setSelectedAddressId(defaultAddr.id);
      }
    } catch {
      // silent
    } finally {
      setLoadingAddresses(false);
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      fetchCart();
      fetchAddresses();
    }
  }, [sessionStatus, fetchCart, fetchAddresses]);

  // ── Place order ───────────────────────────────────────────────
  const handlePlaceOrder = async () => {
    if (!paymentMethod) return;

    setProcessing(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {};
      if (selectedAddressId) body.addressId = selectedAddressId;

      const res = await fetch(`/api/checkout/${paymentMethod}/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 401) {
        router.push("/login?callbackUrl=/checkout");
        return;
      }

      const json = (await res.json()) as InitiateResponse;
      if (!res.ok || !json.success || !json.data) {
        setError(json.message ?? "Unable to start checkout. Please try again.");
        setProcessing(false);
        return;
      }

      const data = json.data;

      if (data.paymentUrl) {
        window.location.assign(data.paymentUrl);
        return;
      }

      setError("Unexpected checkout response. Please try again.");
      setProcessing(false);
    } catch {
      setError("Failed to reach checkout service. Please try again.");
      setProcessing(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────
  if (sessionStatus === "loading" || loadingCart) {
    return (
      <main className="min-h-screen bg-background pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="mb-10 flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-white/10 animate-pulse mb-5" />
            <div className="h-9 w-48 bg-white/10 rounded-lg animate-pulse mb-2" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-2xl bg-white/[0.03] border border-white/5 animate-pulse" />
              ))}
            </div>
            <div className="h-64 rounded-2xl bg-white/[0.03] border border-white/5 animate-pulse" />
          </div>
        </div>
      </main>
    );
  }

  // ── Empty cart ──────────────────────────────────────────────
  if (cartItems.length === 0) {
    return (
      <main className="min-h-screen bg-background pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-white/5 bg-gradient-to-b from-card/50 to-background/50 px-8 py-24 text-center"
          >
            <div className="w-20 h-20 mx-auto flex items-center justify-center rounded-full bg-white/5 border border-white/10 mb-6">
              <ShoppingCart className="w-10 h-10 text-white/70" />
            </div>
            <h2 className="font-display text-3xl font-semibold">Your cart is empty</h2>
            <p className="text-text-secondary mt-4 text-lg max-w-md mx-auto">
              Add some books to your cart before checking out.
            </p>
          </motion.div>
        </div>
      </main>
    );
  }

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);

  return (
    <main className="min-h-screen bg-background pt-32 pb-20">
      {/* Background ambience */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[20%] -left-[10%] w-[60vw] h-[60vw] min-w-[500px] opacity-20 mix-blend-screen"
          style={{ backgroundImage: "radial-gradient(circle at center, var(--color-romance) 0%, transparent 65%)" }} />
        <div className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] min-w-[500px] opacity-20 mix-blend-screen"
          style={{ backgroundImage: "radial-gradient(circle at center, var(--color-romance) 0%, transparent 65%)" }} />
      </div>

      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-10"
        >
          <button
            onClick={() => router.push("/cart")}
            className="flex items-center gap-2 text-sm text-text-secondary hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Cart
          </button>
          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-5">
            <CreditCard className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Checkout
          </h1>
          <p className="mt-2 text-text-secondary font-sans text-sm">
            Review your order, select a shipping address, and choose your payment method.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">
          {/* ─── Left column: Address + Payment ─────────────────── */}
          <div className="space-y-8">
            {/* Shipping Address */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="bg-black/40 backdrop-blur-[40px] border border-white/[0.08] rounded-[2rem] p-6 md:p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-white/60" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Shipping Address</h2>
                  <p className="text-xs text-text-secondary">Where should we deliver?</p>
                </div>
              </div>

              {loadingAddresses ? (
                <div className="h-12 bg-white/[0.03] rounded-xl animate-pulse" />
              ) : addresses.length === 0 ? (
                <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 text-center">
                  <MapPin className="w-6 h-6 text-white/30 mx-auto mb-2" />
                  <p className="text-xs text-text-secondary mb-3">No saved addresses</p>
                  <button
                    onClick={() => router.push("/addresses")}
                    className="text-xs font-medium text-white/70 hover:text-white underline underline-offset-4 transition-colors"
                  >
                    Add an address
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <button
                    onClick={() => setShowAddressDropdown(!showAddressDropdown)}
                    className="w-full bg-black/50 border border-white/[0.08] rounded-xl p-4 text-left hover:border-white/20 transition-all"
                  >
                    {selectedAddress ? (
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-white/40 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-white truncate">
                              {selectedAddress.fullName}
                            </p>
                            {selectedAddress.isDefault && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[0.5rem] font-semibold uppercase tracking-wider">
                                <Star className="w-2 h-2" />
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-text-secondary mt-1">
                            {selectedAddress.street}, {selectedAddress.city}
                            {selectedAddress.state ? `, ${selectedAddress.state}` : ""}
                          </p>
                          <p className="text-xs text-text-secondary/60 mt-0.5">
                            {selectedAddress.phone}
                          </p>
                        </div>
                        <ChevronRight className={`w-4 h-4 text-white/30 mt-1 transition-transform duration-200 ${showAddressDropdown ? "rotate-90" : ""}`} />
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-white/40" />
                        <span className="text-sm text-white/50">Select an address</span>
                      </div>
                    )}
                  </button>

                  {/* Dropdown */}
                  <AnimatePresence>
                    {showAddressDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute top-full left-0 right-0 mt-2 z-20 rounded-xl bg-black/95 border border-white/[0.08] overflow-hidden shadow-2xl"
                      >
                        {addresses.map((addr) => (
                          <button
                            key={addr.id}
                            onClick={() => {
                              setSelectedAddressId(addr.id);
                              setShowAddressDropdown(false);
                            }}
                            className={`w-full text-left px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0 ${
                              addr.id === selectedAddressId ? "bg-white/5" : ""
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-white">{addr.fullName}</p>
                              {addr.isDefault && (
                                <span className="text-[0.5rem] uppercase tracking-wider text-amber-300/70">Default</span>
                              )}
                            </div>
                            <p className="text-xs text-text-secondary mt-0.5">
                              {addr.street}, {addr.city}, {addr.country} - {addr.postalCode}
                            </p>
                          </button>
                        ))}
                        <div className="px-4 py-3 border-t border-white/5">
                          <button
                            onClick={() => { router.push("/addresses"); setShowAddressDropdown(false); }}
                            className="text-xs text-text-secondary hover:text-white transition-colors"
                          >
                            + Manage addresses
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>

            {/* Payment Method */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="bg-black/40 backdrop-blur-[40px] border border-white/[0.08] rounded-[2rem] p-6 md:p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-white/60" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Payment Method</h2>
                  <p className="text-xs text-text-secondary">Choose how to pay</p>
                </div>
              </div>

              <div className="space-y-3">
                {PAYMENT_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setPaymentMethod(opt.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 ${
                      paymentMethod === opt.id
                        ? "bg-white/10 border-white/30"
                        : "bg-black/50 border-white/[0.08] hover:border-white/20"
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold ${
                      paymentMethod === opt.id
                        ? "bg-white text-black"
                        : "bg-white/10 text-white/60"
                    }`}>
                      K
                    </div>
                    <div className="text-left">
                      <p className={`text-sm font-semibold ${paymentMethod === opt.id ? "text-white" : "text-white/70"}`}>
                        {opt.label}
                      </p>
                      <p className="text-xs text-text-secondary mt-0.5">{opt.description}</p>
                    </div>
                    {paymentMethod === opt.id && (
                      <CheckCircle2 className="w-5 h-5 text-white ml-auto shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-sm text-red-300"
                >
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ─── Right column: Order Summary ───────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="bg-black/40 backdrop-blur-[40px] border border-white/[0.08] rounded-[2rem] p-6 md:p-8 sticky top-24"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                <Package className="w-5 h-5 text-white/60" />
              </div>
              <h2 className="text-lg font-semibold">Order Summary</h2>
            </div>

            {/* Items */}
            <div className="space-y-3 mb-6">
              {cartItems.map((item) => {
                const effectivePrice = item.unitPrice ?? item.book.price;
                return (
                  <div key={item.id} className="flex items-center gap-3 text-sm">
                    <div className="w-10 h-14 rounded-lg bg-white/5 border border-white/10 shrink-0 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.book.coverImage} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{item.book.title}</p>
                      <p className="text-[0.65rem] text-text-secondary">{item.book.author.name}</p>
                      {item.format && (
                        <p className="text-[0.65rem] text-romance font-medium">{item.format}</p>
                      )}
                      <p className="text-[0.65rem] text-text-secondary">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-xs font-semibold shrink-0">
                      {formatPrice(effectivePrice * item.quantity)}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Totals */}
            <div className="space-y-3 text-sm pt-4 border-t border-white/[0.06]">
              <div className="flex justify-between text-text-secondary">
                <span>Items ({itemsCount})</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Shipping</span>
                <span>Free</span>
              </div>
              <div className="h-px bg-white/[0.06]" />
              <div className="flex justify-between text-base font-semibold">
                <span>Total</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
            </div>

            {/* Notes */}
            <div className="mt-4 mb-6 flex items-start gap-2 text-[0.65rem] text-text-secondary/60">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                Your payment is processed securely through the Khalti payment gateway.
              </span>
            </div>

            {/* Place Order button */}
            <button
              onClick={handlePlaceOrder}
              disabled={processing || !paymentMethod || !selectedAddressId}
              className="w-full bg-white text-black font-semibold font-sans rounded-xl h-13 py-4 flex items-center justify-center gap-2 hover:bg-white/90 transition-all duration-300 disabled:opacity-50 text-sm"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Redirecting to Khalti...
                </>
              ) : (
                <>
                  Place Order - {formatPrice(subtotal)}
                </>
              )}
            </button>

            {(!paymentMethod || !selectedAddressId) && !processing && (
              <p className="text-xs text-text-secondary/50 text-center mt-3">
                {!selectedAddressId && addresses.length > 0 ? "Select a shipping address" : ""}
                {!paymentMethod && selectedAddressId ? "Select a payment method" : ""}
                {!paymentMethod && !selectedAddressId ? "Select a shipping address and payment method" : ""}
              </p>
            )}
          </motion.div>
        </div>
      </div>
    </main>
  );
}
