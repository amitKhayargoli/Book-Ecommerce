import { BooksCatalog } from "./ui/BooksCatalog";
import { handleGetBooks } from "./actions/book-actions";

export interface AdminBookItem {
  id: string;
  title: string;
  author: string;
  frontendGenres: string[];
  appleBooksUrl?: string;
  sourceCoverUrl?: string;
  localCoverPath?: string;
  sourceType?: string;
  verified?: boolean;
}

interface ApiBookItem {
  id: string;
  title: string;
  author?: { name?: string };
  genres?: Array<{ name?: string }>;
  coverImage?: string;
}

function isApiBookArray(value: unknown): value is ApiBookItem[] {
  if (!Array.isArray(value)) return false;

  return value.every((item) => {
    if (!item || typeof item !== "object") return false;
    const candidate = item as { id?: unknown; title?: unknown };
    return (
      typeof candidate.id === "string" &&
      typeof candidate.title === "string"
    );
  });
}

export default async function AdminBooksPage() {
  const result = await handleGetBooks();

  const books: AdminBookItem[] = isApiBookArray(result.data)
    ? result.data.map((book) => ({
        id: book.id,
        title: book.title,
        author: book.author?.name ?? "Unknown author",
        frontendGenres: (book.genres ?? [])
          .map((genre) => genre.name)
          .filter((name): name is string => Boolean(name)),
        sourceCoverUrl: book.coverImage,
        sourceType: "database",
        verified: true,
      }))
    : [];

  return (
    <main className="min-h-screen bg-background pt-24 pb-20">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <BooksCatalog books={books} />
      </div>
    </main>
  );
}

