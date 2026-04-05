import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import RemoveWishlistButton from "./components/RemoveWishlistButton";

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

interface WishlistPageItem {
  id: string;
  bookId: string;
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

interface WishlistApiResponse {
  success: boolean;
  message?: string;
  data?: {
    items?: WishlistPageItem[];
  };
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

export default async function WishlistPage() {
  const session = await auth();

  if (!session?.accessToken) {
    redirect(`/login?callbackUrl=${encodeURIComponent("/wishlist")}`);
  }

  let items: WishlistPageItem[] = [];

  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/wishlist`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
      cache: "no-store",
    });

    if (response.ok) {
      const payload = (await response.json()) as WishlistApiResponse;
      items = payload.success && Array.isArray(payload.data?.items) ? payload.data.items : [];
    }
  } catch {
    items = [];
  }

  return (
    <main className="min-h-screen pt-24 pb-20 px-6 md:px-10 max-w-[1400px] mx-auto w-full">
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            Your Wishlist
          </h1>
          <p className="text-text-secondary mt-3 text-lg">
            {items.length} {items.length === 1 ? "book" : "books"} saved for later.
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h2 className="font-display text-3xl font-semibold">Your wishlist feels a bit light</h2>
          <p className="text-text-secondary mt-4 mb-10 text-lg max-w-md mx-auto">
            Discover new worlds and save your favorite books here.
          </p>
          <Link
            href="/books"
            className="inline-flex items-center rounded-full bg-white text-black px-8 py-4 font-semibold hover:bg-gray-200 transition-transform hover:scale-105 active:scale-95 shadow-xl"
          >
            Explore the Catalog
          </Link>
        </section>
      ) : (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-8">
          {items.map((item) => (
            <article
              key={item.id}
              className="group flex flex-col gap-5"
            >
              <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden bg-card/40 shadow-xl border border-white/5">
                <Link href={`/books/${item.bookId}`} className="block w-full h-full">
                  <Image
                    src={item.book.coverImage}
                    alt={item.book.title}
                    fill
                    className="object-cover transition-all duration-700 group-hover:scale-110 group-hover:opacity-90"
                    unoptimized
                  />
                  {/* Subtle Gradient Overlay on Hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                </Link>
                
                <div className="absolute top-4 right-4 z-10 w-10 h-10">
                  <RemoveWishlistButton bookId={item.bookId} />
                </div>
              </div>

              {/* <div className="space-y-2 px-1">
                <Link href={`/books/${item.bookId}`} className="block">
                  <h3 className="font-display text-lg font-semibold line-clamp-1 group-hover:text-white/80 transition-colors">
                    {item.book.title}
                  </h3>
                </Link>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-text-secondary line-clamp-1">{item.book.author.name}</p>
                  <p className="font-semibold text-white/90">{formatPrice(item.book.price)}</p>
                </div>
              </div> */}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
