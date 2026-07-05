import Image from "next/image";
import Link from "next/link";
import { Star, ChevronRight, ThumbsUp, ThumbsDown } from "lucide-react";
import { notFound } from "next/navigation";
import {
  handleGetBooks,
  hanldeGetBookById,
} from "@/app/admin/books/actions/book-actions";
import { getReviewsAction } from "./actions/review-actions";
import ImageGallery from "./components/ImageGallery";
import AddReviewButton from "./components/AddReviewButton";
import ReviewSortDropdown from "./components/ReviewSortDropdown";
import ReviewStarFilter from "./components/ReviewStarFilter";
import BookFormatSection from "./components/BookFormatSection";

interface ApiBookDetail {
  id: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  coverImage?: string;
  mockupImage?: string | null;
  previewImages?: string[];
  reviewCount: number;
  discountPrice?: number | null;
  author?: { name?: string };
  genres?: Array<{ name?: string }>;
  language?: string | null;
  publishedAt?: string | null;
  formatPrices?: Array<{ format: string; price: number }>;
}

interface ApiBookListItem {
  id: string;
  title: string;
  price?: number;
  discountPrice?: number | null;
  coverImage?: string;
  author?: { name?: string };
}

interface ApiReviewItem {
  id: string;
  rating: number;
  comment: string | null;
  images: string[];
  createdAt: string;
  user: {
    id: string;
    name: string;
  };
  bookId: string;
}

function isApiBookDetail(value: unknown): value is ApiBookDetail {
  if (!value || typeof value !== "object") return false;

  const candidate = value as {
    id?: unknown;
    title?: unknown;
    description?: unknown;
    price?: unknown;
    stock?: unknown;
    reviewCount?: unknown;
  };

  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.description === "string" &&
    typeof candidate.price === "number" &&
    typeof candidate.stock === "number" &&
    typeof candidate.reviewCount === "number"
  );
}

function isApiBookList(value: unknown): value is ApiBookListItem[] {
  if (!Array.isArray(value)) return false;

  return value.every((item) => {
    if (!item || typeof item !== "object") return false;
    const candidate = item as { id?: unknown; title?: unknown };
    return (
      typeof candidate.id === "string" && typeof candidate.title === "string"
    );
  });
}

function isApiReviewList(value: unknown): value is ApiReviewItem[] {
  if (!Array.isArray(value)) return false;

  return value.every((item) => {
    if (!item || typeof item !== "object") return false;
    const candidate = item as {
      id?: unknown;
      rating?: unknown;
      comment?: unknown;
      images?: unknown;
      createdAt?: unknown;
      user?: { id?: unknown; name?: unknown };
      bookId?: unknown;
    };

    return (
      typeof candidate.id === "string" &&
      typeof candidate.rating === "number" &&
      (typeof candidate.comment === "string" || candidate.comment === null) &&
      Array.isArray(candidate.images) &&
      candidate.images.every((img: unknown) => typeof img === "string") &&
      typeof candidate.createdAt === "string" &&
      typeof candidate.user?.id === "string" &&
      typeof candidate.user?.name === "string" &&
      typeof candidate.bookId === "string"
    );
  });
}

function formatReviewDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function isLocalUpload(url: string): boolean {
  return url.startsWith("http://localhost:4000/") || url.startsWith("http://backend:3001/");
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "NPR",
    minimumFractionDigits: 2,
  }).format(value);
}

export default async function BookProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sortBy?: string; sortOrder?: string; rating?: string }>;
}) {
  const { id } = await params;
  const { sortBy, sortOrder, rating: ratingFilter } = await searchParams;
  const result = await hanldeGetBookById(id);

  if (!result.success || !isApiBookDetail(result.data)) {
    notFound();
  }

  const bookData = result.data;

  const booksResult = await handleGetBooks();
  const allBooks = isApiBookList(booksResult.data) ? booksResult.data : [];
  const reviewsResult = await getReviewsAction(bookData.id, 1, 100, sortBy, sortOrder);
  const allReviews =
    reviewsResult.success && isApiReviewList(reviewsResult.data)
      ? reviewsResult.data
      : [];

  // Compute stats from the FULL unfiltered review list
  const totalReviewsFromMeta =
    typeof (reviewsResult.meta as { total?: unknown } | undefined)?.total ===
    "number"
      ? ((reviewsResult.meta as { total: number }).total ?? 0)
      : 0;
  const totalReviews = Math.max(
    totalReviewsFromMeta,
    allReviews.length,
    bookData.reviewCount,
  );

  const fullAverageRating =
    allReviews.length > 0
      ? Number(
          (
            allReviews.reduce((sum, review) => sum + review.rating, 0) /
            allReviews.length
          ).toFixed(1),
        )
      : 0;
  const roundedAverageRating = Math.round(fullAverageRating);
  const ratingBreakdown = [5, 4, 3, 2, 1].map((star) => {
    const count = allReviews.filter((review) => review.rating === star).length;
    return {
      star,
      count,
      pct: totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0,
    };
  });

  // Apply rating filter if set via search params (for the displayed list only)
  let reviews = allReviews;
  if (ratingFilter) {
    const starFilter = Number(ratingFilter);
    if (starFilter >= 1 && starFilter <= 5) {
      reviews = allReviews.filter((r) => r.rating === starFilter);
    }
  }

  const relatedBooks = allBooks
    .filter((candidate) => candidate.id !== bookData.id)
    .slice(0, 4);

  // Use previewImages from backend (populated from Google Books on import),
  // fall back to coverImage + mockupImage, then placeholders
  const images = bookData.previewImages && bookData.previewImages.length > 0
    ? bookData.previewImages.slice(0, 4)
    : [bookData.coverImage, bookData.mockupImage]
        .filter((image): image is string => Boolean(image))
        .concat([
          "/books/scifi.png",
          "/books/fantasy.png",
          "/books/mystery.png",
          "/books/romance.png",
        ])
        .slice(0, 4);

  const formatPrices = bookData.formatPrices ?? [];

  const book = {
    id: bookData.id,
    title: bookData.title,
    author: bookData.author?.name ?? "Unknown author",
    price: formatPrice(bookData.price),
    rating: fullAverageRating,
    roundedRating: roundedAverageRating,
    reviewCount: totalReviews,
    description: bookData.description,
    images,
    formats: ["Hardcover", "Paperback", "E-Book", "Audiobook"],
    genres: (bookData.genres ?? [])
      .map((genre) => genre.name)
      .filter((name): name is string => Boolean(name)),
    language: bookData.language ?? undefined,
    publishedAt: bookData.publishedAt ?? undefined,
    formatPrices,
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-romance/30 selection:text-white">
      <main className="flex-grow pt-24 pb-16 px-6 md:px-10 max-w-[1400px] mx-auto w-full">
        {/* Breadcrumbs */}
        <nav
          className="flex items-center text-sm text-text-secondary mb-10 w-full"
          aria-label="Breadcrumb"
        >
          <ol className="flex items-center space-x-2">
            <li>
              <Link href="/" className="hover:text-white transition-colors">
                Home
              </Link>
            </li>
            <li>
              <ChevronRight className="w-4 h-4 mx-1" />
            </li>
            <li>
              <Link
                href="/books"
                className="hover:text-white transition-colors"
              >
                Books
              </Link>
            </li>
            <li>
              <ChevronRight className="w-4 h-4 mx-1" />
            </li>
            <li>
              <span className="text-white/40">{book.genres[0] ?? "Book"}</span>
            </li>
          </ol>
        </nav>

        {/* Hero Section: Media & Details */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 mb-24">
          {/* Left Column: Images */}
          <ImageGallery images={book.images} title={book.title} />

          {/* Right Column: Product Info */}
          <div className="flex flex-col justify-start pt-4 lg:pr-10">
            <p className="text-text-secondary text-lg mb-2">{book.author}</p>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
              {book.title}
            </h1>

            <div className="mb-8 border-t border-white/10 pt-8">
              <h3 className="font-semibold text-lg mb-3">Description</h3>
              <p className="text-text-secondary leading-relaxed text-base">
                {book.description}
              </p>
            </div>

            {/* Selectors + Actions */}
            <BookFormatSection
              formats={book.formats}
              formatPrices={book.formatPrices}
              basePrice={bookData.price}
              rating={book.rating}
              roundedRating={book.roundedRating}
              reviewCount={book.reviewCount}
              language={book.language}
              publishedAt={book.publishedAt}
              genres={book.genres}
              author={book.author}
              bookId={book.id}
            />

            {/* Extra Snippet */}
            <div className="mt-8 pt-8 border-t border-white/10 text-sm text-text-secondary">
              <p>Delivery: Usually ships within 2-3 business days.</p>
              <p className="mt-1">
                Returns: 30 days return policy.{" "}
                <a href="#" className="underline">
                  Learn more.
                </a>
              </p>
            </div>
          </div>
        </section>

        {/* Similar Books / Related Products */}
        <section className="mb-24 pt-10 border-t border-white/5">
          <div className="flex items-center justify-between pb-8">
            <h2 className="font-display text-2xl md:text-3xl font-bold">
              Related Books
            </h2>
            <button className="text-sm font-medium hover:text-romance transition-colors">
              View All
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedBooks.map((relatedBook, index) => (
              <div
                key={relatedBook.id}
                className="group flex flex-col items-center p-6 bg-card rounded-xl border border-white/5 hover:border-white/20 transition-all cursor-pointer"
              >
                <div className="w-full aspect-[3/4] relative mb-6">
                  <Image
                    src={
                      relatedBook.coverImage ||
                      book.images[index % book.images.length]
                    }
                    alt={relatedBook.title}
                    fill
                    className="object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.4)] transition-transform duration-500 group-hover:scale-105 group-hover:rotate-1"
                    unoptimized={isLocalUpload(relatedBook.coverImage || book.images[index % book.images.length])}
                  />
                </div>
                <h3 className="font-display font-semibold mb-1 w-full truncate text-center">
                  {relatedBook.title}
                </h3>
                <p className="text-sm text-text-secondary w-full text-center mb-3">
                  {relatedBook.author?.name ?? "Unknown author"}
                </p>
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-romance">
                    {formatPrice(relatedBook.price ?? bookData.price)}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-text-secondary">
                    <Star className="w-3 h-3 fill-romance text-romance" />
                    <span>4.5</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Reviews Section */}
        <section className="mb-24 pt-10 border-t border-white/5">
          <div className="flex items-center justify-between pb-10 gap-4">
            <h2 className="font-display text-2xl md:text-3xl font-bold">
              Product Reviews
            </h2>
            <AddReviewButton bookId={book.id} />
          </div>

          <div className="flex flex-col lg:flex-row gap-16">
            {/* Left Side: Summary & Filters */}
            <div className="w-full lg:w-1/3 flex flex-col gap-10">
              {/* Score Summary */}
              <div className="flex items-start gap-6">
                <div className="w-24 h-24 rounded-full border-4 border-romance flex items-center justify-center flex-shrink-0">
                  <span className="text-3xl font-bold font-display">
                    {book.rating}
                  </span>
                </div>
                <div className="flex flex-col justify-center h-24 gap-2">
                  <div className="flex gap-1 text-romance">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${
                          i < book.roundedRating
                            ? "fill-romance text-romance"
                            : "fill-transparent text-romance/40"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-text-secondary">
                    {book.reviewCount} Reviews
                  </p>
                </div>
              </div>

              {/* Review Bars (clickable filter) */}
              <ReviewStarFilter breakdown={ratingBreakdown} />

              {/* Filters (Collapsed into star filter above) */}
              <div className="border-t border-white/10 pt-8 mt-4">
                <h3 className="font-semibold mb-6">Review Filter</h3>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between cursor-pointer group">
                    <span className="text-text-secondary group-hover:text-white transition-colors">
                      Has Photos
                    </span>
                    <ChevronRight className="w-4 h-4 text-text-secondary group-hover:text-white transition-colors" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side: Reviews List */}
            <div className="w-full lg:w-2/3 flex flex-col gap-10">
              {/* Sort Header */}
              <div className="flex justify-between items-center bg-card px-6 py-4 rounded-lg">
                <div className="text-sm font-medium text-text-secondary">
                  Displaying {reviews.length > 0 ? `1-${reviews.length}` : "0"}{" "}
                  of {book.reviewCount}
                </div>
                <div className="flex gap-4">
                  <span className="text-sm text-text-secondary">Sort by:</span>
                  <ReviewSortDropdown />
                </div>
              </div>

              {/* Reviews */}
              <div className="flex flex-col gap-8">
                {reviews.length === 0 && (
                  <div className="border border-white/10 rounded-xl p-6 text-text-secondary">
                    No reviews yet. Be the first to review this book.
                  </div>
                )}

                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="border-b border-white/5 pb-8 last:border-0"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex text-romance gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < review.rating
                                ? "fill-romance text-romance"
                                : "fill-transparent text-romance/40"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-text-secondary">
                        {formatReviewDate(review.createdAt)}
                      </span>
                    </div>

                    <p className="text-text-secondary leading-relaxed mb-4">
                      {review.comment && review.comment.trim().length > 0
                        ? review.comment
                        : "No written comment provided."}
                    </p>

                    {/* Review Images */}
                    {review.images && review.images.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {review.images.map((imgUrl, imgIdx) => (
                          <div
                            key={imgIdx}
                            className="relative w-20 h-20 rounded-lg overflow-hidden border border-white/10"
                          >
                            <Image
                              src={imgUrl}
                              alt={`Review photo ${imgIdx + 1}`}
                              fill
                              className="object-cover"
                              unoptimized={isLocalUpload(imgUrl)}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-xs uppercase">
                          {review.user.name[0]}
                        </div>
                        <span className="text-sm font-medium">
                          {review.user.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-medium text-text-secondary">
                        <span className="hidden sm:inline">Helpful?</span>
                        <button className="flex items-center gap-1 hover:text-white transition-colors">
                          <ThumbsUp className="w-4 h-4" />
                        </button>
                        <button className="flex items-center gap-1 hover:text-white transition-colors">
                          <ThumbsDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
