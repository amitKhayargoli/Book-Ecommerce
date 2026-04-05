import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import RemoveCartItemButton from "./components/RemoveCartItemButton";

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

interface CartPageItem {
  id: string;
  bookId: string;
  quantity: number;
  createdAt: string;
  book: {
    id: string;
    title: string;
    price: number;
    coverImage: string;
    author: {
      id: string;
      name: string;
      slug: string;
    };
  };
}

interface CartPageResponse {
  success: boolean;
  message?: string;
  data?: {
    items?: CartPageItem[];
    summary?: {
      itemsCount?: number;
      subtotal?: number;
    };
  };
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

export default async function CartPage() {
  const session = await auth();

  if (!session?.accessToken) {
    redirect(`/login?callbackUrl=${encodeURIComponent("/cart")}`);
  }

  let items: CartPageItem[] = [];
  let itemsCount = 0;
  let subtotal = 0;

  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/cart`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
      cache: "no-store",
    });

    if (response.ok) {
      const payload = (await response.json()) as CartPageResponse;
      if (payload.success) {
        items = Array.isArray(payload.data?.items) ? payload.data.items : [];
        itemsCount =
          typeof payload.data?.summary?.itemsCount === "number"
            ? payload.data.summary.itemsCount
            : items.reduce((acc, item) => acc + item.quantity, 0);
        subtotal =
          typeof payload.data?.summary?.subtotal === "number"
            ? payload.data.summary.subtotal
            : items.reduce((acc, item) => acc + item.book.price * item.quantity, 0);
      }
    }
  } catch {
    items = [];
    itemsCount = 0;
    subtotal = 0;
  }

  return (
    <main className="min-h-screen pt-24 pb-20 px-6 md:px-10 max-w-[1400px] mx-auto w-full">
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            Your Cart
          </h1>
          <p className="text-text-secondary mt-3 text-lg">
            {itemsCount} {itemsCount === 1 ? "item" : "items"} ready for checkout.
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <section className="rounded-3xl border border-white/5 bg-gradient-to-b from-card/50 to-background/50 px-8 py-24 text-center shadow-2xl backdrop-blur-sm">
          <div className="w-20 h-20 mx-auto flex items-center justify-center rounded-full bg-white/5 border border-white/10 mb-6">
            <svg
              className="w-10 h-10 text-white/40"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.1 5.2A1 1 0 006.9 20h10.2a1 1 0 001-.8L19 13M10 20a1 1 0 100 2 1 1 0 000-2zm8 0a1 1 0 100 2 1 1 0 000-2z"
              />
            </svg>
          </div>
          <h2 className="font-display text-3xl font-semibold">Your cart is empty</h2>
          <p className="text-text-secondary mt-4 mb-10 text-lg max-w-md mx-auto">
            Add a few titles to begin your next reading adventure.
          </p>
          <Link
            href="/books"
            className="inline-flex items-center rounded-full bg-white text-black px-8 py-4 font-semibold hover:bg-gray-200 transition-transform hover:scale-105 active:scale-95 shadow-xl"
          >
            Browse Books
          </Link>
        </section>
      ) : (
        <section className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-8 items-start">
          <div className="rounded-2xl border border-white/10 bg-card/40 backdrop-blur-sm overflow-hidden">
            <div className="hidden md:grid grid-cols-[100px_1fr_auto_auto] gap-6 px-6 py-4 text-xs uppercase tracking-widest text-text-secondary border-b border-white/10">
              <span>Cover</span>
              <span>Book</span>
              <span>Price</span>
              <span className="text-right">Action</span>
            </div>

            <div>
              {items.map((item) => (
                <article
                  key={item.id}
                  className="grid grid-cols-1 md:grid-cols-[100px_1fr_auto_auto] gap-4 md:gap-6 px-6 py-6 border-b border-white/10 last:border-b-0"
                >
                  <Link
                    href={`/books/${item.bookId}`}
                    className="relative h-[140px] md:h-[120px] rounded-xl overflow-hidden bg-background/50 border border-white/10"
                  >
                    <Image
                      src={item.book.coverImage}
                      alt={item.book.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </Link>

                  <div className="flex flex-col justify-center min-w-0">
                    <Link
                      href={`/books/${item.bookId}`}
                      className="font-display text-xl font-semibold truncate hover:text-white/80 transition-colors"
                    >
                      {item.book.title}
                    </Link>
                    <p className="text-text-secondary mt-1">{item.book.author.name}</p>
                    <p className="text-text-secondary text-sm mt-2">Quantity: {item.quantity}</p>
                  </div>

                  <div className="flex items-center font-semibold text-lg text-white md:justify-end">
                    {formatPrice(item.book.price * item.quantity)}
                  </div>

                  <div className="flex items-center md:justify-end">
                    <RemoveCartItemButton bookId={item.bookId} />
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside className="rounded-2xl border border-white/10 bg-card/40 backdrop-blur-sm p-6 sticky top-24">
            <h2 className="font-display text-2xl font-semibold mb-6">Order Summary</h2>

            <div className="space-y-4 text-sm">
              <div className="flex justify-between text-text-secondary">
                <span>Items</span>
                <span>{itemsCount}</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Shipping</span>
                <span>Calculated at checkout</span>
              </div>
              <div className="h-px bg-white/10" />
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
            </div>

            <button
              type="button"
              className="mt-8 w-full rounded-full bg-white text-black px-6 py-4 font-semibold hover:bg-gray-200 transition-colors"
            >
              Proceed to Checkout
            </button>
          </aside>
        </section>
      )}
    </main>
  );
}
