import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Package, Clock, CreditCard, MapPin, ChevronRight } from "lucide-react";
import { auth } from "@/auth";
import { BACKEND_URL } from "@/lib/server-config";

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  book: {
    id: string;
    title: string;
    slug: string;
    coverImage: string;
    author: { name: string };
  };
}

interface Order {
  id: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  paymentProvider: string;
  paymentTransactionUuid: string;
  paymentRefId: string | null;
  createdAt: string;
  updatedAt: string;
  address: {
    fullName: string;
    street: string;
    city: string;
    state: string | null;
    postalCode: string;
    country: string;
  } | null;
  items: OrderItem[];
}

interface OrdersResponse {
  success: boolean;
  message?: string;
  data?: Order[];
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "NPR",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusColor(status: string): string {
  switch (status) {
    case "CONFIRMED":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/20";
    case "SHIPPED":
      return "bg-blue-500/15 text-blue-300 border-blue-500/20";
    case "DELIVERED":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/20";
    case "CANCELLED":
      return "bg-red-500/15 text-red-300 border-red-500/20";
    default:
      return "bg-amber-500/15 text-amber-300 border-amber-500/20";
  }
}

function paymentStatusColor(status: string): string {
  switch (status) {
    case "PAID":
      return "text-emerald-400";
    case "FAILED":
      return "text-red-400";
    case "REFUNDED":
      return "text-yellow-400";
    default:
      return "text-amber-400";
  }
}

export default async function OrdersPage() {
  const session = await auth();

  if (!session?.accessToken) {
    redirect(`/login?callbackUrl=${encodeURIComponent("/orders")}`);
  }

  let orders: Order[] = [];

  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/orders`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
      cache: "no-store",
    });

    if (response.ok) {
      const payload = (await response.json()) as OrdersResponse;
      if (payload.success && Array.isArray(payload.data)) {
        orders = payload.data;
      }
    }
  } catch {
    orders = [];
  }

  return (
    <main className="min-h-screen pt-24 pb-20 px-6 md:px-10 max-w-[1200px] mx-auto w-full">
      {/* Header */}
      <div className="mb-12">
        <div className="w-16 h-16 mb-5 rounded-2xl bg-white/10 flex items-center justify-center">
          <Package className="w-8 h-8 text-white" />
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent mb-3">
          My Orders
        </h1>
        <p className="text-text-secondary text-lg">
          {orders.length === 0
            ? "You haven&apos;t placed any orders yet."
            : `${orders.length} ${orders.length === 1 ? "order" : "orders"} placed.`}
        </p>
      </div>

      {orders.length === 0 ? (
        <section className="rounded-3xl border border-white/5 bg-gradient-to-b from-card/50 to-background/50 px-8 py-24 text-center shadow-2xl backdrop-blur-sm">
          <div className="w-20 h-20 mx-auto flex items-center justify-center rounded-full bg-white/5 border border-white/10 mb-6">
            <Package className="w-10 h-10 text-white/70" />
          </div>
          <h2 className="font-display text-3xl font-semibold">No orders yet</h2>
          <p className="text-text-secondary mt-4 mb-10 text-lg max-w-md mx-auto">
            When you place an order, it will appear here so you can track its status.
          </p>
          <Link
            href="/books"
            className="inline-flex items-center rounded-full bg-white text-black px-8 py-4 font-semibold hover:bg-gray-200 transition-transform hover:scale-105 active:scale-95 shadow-xl"
          >
            Browse Books
          </Link>
        </section>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <article
              key={order.id}
              className="rounded-3xl border border-white/5 bg-card/40 backdrop-blur-sm p-6 md:p-8 hover:border-white/10 transition-colors"
            >
              {/* Order header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-white/5">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h2 className="font-display text-lg font-semibold">
                      Order #{order.id.slice(-8).toUpperCase()}
                    </h2>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-[0.7rem] font-semibold uppercase tracking-wider border ${statusColor(order.status)}`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-text-secondary">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDate(order.createdAt)} at {formatTime(order.createdAt)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5" />
                      {order.paymentProvider}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className={`text-sm font-medium ${paymentStatusColor(order.paymentStatus)}`}>
                      {order.paymentStatus}
                    </p>
                    <p className="text-lg font-semibold font-display">
                      {formatPrice(order.totalAmount)}
                    </p>
                  </div>
                  <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10">
                    <ChevronRight className="w-4 h-4 text-text-secondary" />
                  </span>
                </div>
              </div>

              {/* Order items */}
              <div className="space-y-4">
                {order.items.map((item) => (
                  <Link
                    key={item.id}
                    href={`/books/${item.book.slug}`}
                    className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/[0.02] transition-colors group"
                  >
                    <div className="relative w-14 h-20 rounded-lg overflow-hidden bg-background/50 border border-white/10 shrink-0">
                      <Image
                        src={item.book.coverImage}
                        alt={item.book.title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate group-hover:text-white/80 transition-colors">
                        {item.book.title}
                      </p>
                      <p className="text-xs text-text-secondary mt-0.5">
                        {item.book.author.name}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold">{formatPrice(item.price)}</p>
                      <p className="text-xs text-text-secondary">x{item.quantity}</p>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Address */}
              {order.address && (
                <div className="mt-4 pt-4 border-t border-white/5 flex items-start gap-3 text-xs text-text-secondary">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>
                    {order.address.fullName} · {order.address.street}, {order.address.city}
                    {order.address.state ? `, ${order.address.state}` : ""}{" "}
                    {order.address.postalCode}, {order.address.country}
                  </span>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
