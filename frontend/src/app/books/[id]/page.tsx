import Image from "next/image";
import Link from "next/link";
import { Star, ChevronRight, ThumbsUp, ThumbsDown } from "lucide-react";
import { notFound } from "next/navigation";
import { handleGetBooks, hanldeGetBookById } from "@/app/admin/books/actions/book-actions";
import { getReviewsAction } from "./actions/review-actions";
import WishlistButton from "./components/WishlistButton";
import AddReviewButton from "./components/AddReviewButton";
import AddToCartButton from "./components/AddToCartButton";

interface ApiBookDetail {
  id: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  coverImage?: string;
  mockupImage?: string | null;
  reviewCount: number;
  author?: { name?: string };
  genres?: Array<{ name?: string }>;
}

interface ApiBookListItem {
  id: string;
  title: string;
  price?: number;
  coverImage?: string;
  author?: { name?: string };
}

interface ApiReviewItem {
  id: string;
  rating: number;
  comment: string | null;
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
    return typeof candidate.id === "string" && typeof candidate.title === "string";
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
      createdAt?: unknown;
      user?: { id?: unknown; name?: unknown };
      bookId?: unknown;
    };

    return (
      typeof candidate.id === "string" &&
      typeof candidate.rating === "number" &&
      (typeof candidate.comment === "string" || candidate.comment === null) &&
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

function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

export default async function BookProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await hanldeGetBookById(id);

  if (!result.success || !isApiBookDetail(result.data)) {
    notFound();
  }

  const booksResult = await handleGetBooks();
  const allBooks = isApiBookList(booksResult.data) ? booksResult.data : [];
  const reviewsResult = await getReviewsAction(result.data.id);
  const reviews = reviewsResult.success && isApiReviewList(reviewsResult.data) ? reviewsResult.data : [];
  const totalReviewsFromMeta =
    typeof (reviewsResult.meta as { total?: unknown } | undefined)?.total === "number"
      ? ((reviewsResult.meta as { total: number }).total ?? 0)
      : 0;
  const totalReviews = Math.max(totalReviewsFromMeta, reviews.length, result.data.reviewCount);

  const relatedBooks = allBooks.filter((candidate) => candidate.id !== result.data.id).slice(0, 4);

  const images = [result.data.coverImage, result.data.mockupImage]
    .filter((image): image is string => Boolean(image))
    .concat(["/books/scifi.png", "/books/fantasy.png", "/books/mystery.png", "/books/romance.png"])
    .slice(0, 4);

  const averageRating =
    reviews.length > 0
      ? Number((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1))
      : 0;
  const roundedAverageRating = Math.round(averageRating);
  const ratingBreakdown = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((review) => review.rating === star).length;
    return {
      star,
      count,
      pct: totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0,
    };
  });

  const book = {
    id: result.data.id,
    title: result.data.title,
    author: result.data.author?.name ?? "Unknown author",
    price: formatPrice(result.data.price),
    rating: averageRating,
    roundedRating: roundedAverageRating,
    reviewCount: totalReviews,
    description: result.data.description,
    images,
    formats: ["Hardcover", "Paperback", "E-Book", "Audiobook"],
    genres: (result.data.genres ?? [])
      .map((genre) => genre.name)
      .filter((name): name is string => Boolean(name)),
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-romance/30 selection:text-white">
      <main className="flex-grow pt-24 pb-16 px-6 md:px-10 max-w-[1400px] mx-auto w-full">
        {/* Breadcrumbs */}
        <nav className="flex items-center text-sm text-text-secondary mb-10 w-full" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2">
            <li><Link href="/" className="hover:text-white transition-colors">Home</Link></li>
            <li><ChevronRight className="w-4 h-4 mx-1" /></li>
            <li><Link href="/books" className="hover:text-white transition-colors">Books</Link></li>
            <li><ChevronRight className="w-4 h-4 mx-1" /></li>
            <li><a href="#" className="hover:text-white transition-colors">{book.genres[0] ?? "Book"}</a></li>
          </ol>
        </nav>  

        {/* Hero Section: Media & Details */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 mb-24">
          
          {/* Left Column: Images */}
          <div className="flex flex-col gap-4">
            <div className="bg-card w-full aspect-[3/4] md:aspect-square rounded-xl flex items-center justify-center p-8 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-tr from-scifi/5 to-transparent opacity-50"></div>
              <Image 
                src={book.images[0]} 
                alt={book.title} 
                width={400} 
                height={600} 
                className="object-contain w-full h-full max-h-[600px] z-10 drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-transform duration-700 group-hover:scale-105"
                priority
              />
            </div>
            
            <div className="grid grid-cols-4 gap-4">
              {book.images.map((img, idx) => (
                <button key={idx} className="bg-card aspect-square rounded-lg flex items-center justify-center p-2 relative overflow-hidden border border-white/5 hover:border-white/20 transition-all">
                  <Image 
                    src={img} 
                    alt={`Thumbnail ${idx + 1}`} 
                    width={100} 
                    height={150} 
                    className="object-contain w-full h-full max-h-[100px] drop-shadow-[0_10px_20px_rgba(0,0,0,0.4)]"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: Product Info */}
          <div className="flex flex-col justify-start pt-4 lg:pr-10">
            <p className="text-text-secondary text-lg mb-2">{book.author}</p>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
              {book.title}
            </h1>
            
            <div className="text-3xl font-semibold mb-6 flex items-center gap-6">
              {book.price}
              
              <div className="flex items-center gap-2 text-sm font-normal text-text-secondary border-l border-white/10 pl-6">
                <div className="flex text-romance">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < book.roundedRating
                          ? "fill-romance text-romance"
                          : "fill-transparent text-romance/40"
                      }`}
                    />
                  ))}
                </div>
                <span>{book.rating}</span>
                <span className="text-text-secondary/60">({book.reviewCount} reviews)</span>
              </div>
            </div>

            <div className="mb-8 border-t border-white/10 pt-8">
              <h3 className="font-semibold text-lg mb-3">Description</h3>
              <p className="text-text-secondary leading-relaxed text-base">
                {book.description}
              </p>
            </div>

            {/* Selectors */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <span className="font-medium text-sm text-text-secondary uppercase tracking-widest">Format</span>
                <button className="text-xs text-text-secondary hover:text-white underline decoration-white/30 underline-offset-4">Size Guide</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {book.formats.map((format, idx) => (
                  <button 
                    key={format} 
                    className={`py-3 px-4 rounded-md border text-sm font-medium transition-all ${
                      idx === 0 
                        ? 'border-romance bg-romance/10 text-white' 
                        : 'border-white/10 bg-card hover:bg-white/5 hover:border-white/30 text-text-secondary'
                    }`}
                  >
                    {format}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 items-center">
              <AddToCartButton bookId={book.id} />
              <WishlistButton bookId={book.id} />
            </div>

            {/* Extra Snippet */}
            <div className="mt-8 pt-8 border-t border-white/10 text-sm text-text-secondary">
              <p>Delivery: Usually ships within 2-3 business days.</p>
              <p className="mt-1">Returns: 30 days return policy. <a href="#" className="underline">Learn more.</a></p>
            </div>
          </div>
        </section>

        {/* Similar Books / Related Products */}
        <section className="mb-24 pt-10 border-t border-white/5">
          <div className="flex items-center justify-between pb-8">
            <h2 className="font-display text-2xl md:text-3xl font-bold">Related Books</h2>
            <button className="text-sm font-medium hover:text-romance transition-colors">View All</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedBooks.map((relatedBook, index) => (
              <div key={relatedBook.id} className="group flex flex-col items-center p-6 bg-card rounded-xl border border-white/5 hover:border-white/20 transition-all cursor-pointer">
                <div className="w-full aspect-[3/4] relative mb-6">
                  <Image 
                    src={relatedBook.coverImage || book.images[index % book.images.length]} 
                    alt={relatedBook.title} 
                    fill 
                    className="object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.4)] transition-transform duration-500 group-hover:scale-105 group-hover:rotate-1"
                  />
                </div>
                <h3 className="font-display font-semibold mb-1 w-full truncate text-center">{relatedBook.title}</h3>
                <p className="text-sm text-text-secondary w-full text-center mb-3">{relatedBook.author?.name ?? "Unknown author"}</p>
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-romance">{formatPrice(relatedBook.price ?? result.data.price)}</span>
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
            <h2 className="font-display text-2xl md:text-3xl font-bold">Product Reviews</h2>
            <AddReviewButton bookId={book.id} />
          </div>
          
          <div className="flex flex-col lg:flex-row gap-16">
            
            {/* Left Side: Summary & Filters */}
            <div className="w-full lg:w-1/3 flex flex-col gap-10">
              {/* Score Summary */}
              <div className="flex items-start gap-6">
                <div className="w-24 h-24 rounded-full border-4 border-romance flex items-center justify-center flex-shrink-0">
                  <span className="text-3xl font-bold font-display">{book.rating}</span>
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
                  <p className="text-text-secondary">{book.reviewCount} Reviews</p>
                </div>
              </div>

              {/* Review Bars */}
              <div className="flex flex-col gap-3">
                {ratingBreakdown.map((row) => (
                  <div key={row.star} className="flex items-center gap-4 text-sm font-medium text-text-secondary">
                    <div className="flex items-center gap-1 w-8">
                      <span>{row.star}</span>
                      <Star className="w-3 h-3 fill-current" />
                    </div>
                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-white relative rounded-full" style={{ width: `${row.pct}%` }}></div>
                    </div>
                    <div className="w-10 text-right">{row.count}</div>
                  </div>
                ))}
              </div>

              {/* Filters (Simplified) */}
              <div className="border-t border-white/10 pt-8 mt-4">
                <h3 className="font-semibold mb-6">Review Filter</h3>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between cursor-pointer group">
                    <span className="text-text-secondary group-hover:text-white transition-colors">Rating</span>
                    <ChevronRight className="w-4 h-4 text-text-secondary group-hover:text-white transition-colors" />
                  </div>
                  <div className="flex items-center justify-between cursor-pointer group">
                    <span className="text-text-secondary group-hover:text-white transition-colors">Book Format</span>
                    <ChevronRight className="w-4 h-4 text-text-secondary group-hover:text-white transition-colors" />
                  </div>
                  <div className="flex items-center justify-between cursor-pointer group">
                    <span className="text-text-secondary group-hover:text-white transition-colors">Has Photos</span>
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
                  Displaying {reviews.length > 0 ? `1-${reviews.length}` : "0"} of {book.reviewCount}
                </div>
                <div className="flex gap-4">
                  <span className="text-sm text-text-secondary">Sort by:</span>
                  <select className="bg-transparent text-sm font-medium outline-none cursor-pointer">
                    <option className="bg-card text-white">Most Relevant</option>
                    <option className="bg-card text-white">Newest First</option>
                    <option className="bg-card text-white">Highest Rating</option>
                    <option className="bg-card text-white">Lowest Rating</option>
                  </select>
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
                  <div key={review.id} className="border-b border-white/5 pb-8 last:border-0">
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
                      <span className="text-xs text-text-secondary">{formatReviewDate(review.createdAt)}</span>
                    </div>

                    <p className="text-text-secondary leading-relaxed mb-6">
                      {review.comment && review.comment.trim().length > 0
                        ? review.comment
                        : "No written comment provided."}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-xs uppercase">
                          {review.user.name[0]}
                        </div>
                        <span className="text-sm font-medium">{review.user.name}</span>
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
