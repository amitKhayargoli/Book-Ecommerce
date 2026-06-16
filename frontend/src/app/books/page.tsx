import { PublicBooksCatalog } from "./ui/PublicBooksCatalog";
import { handleGetBooks } from "../admin/books/actions/book-actions";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

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

export default async function BooksPage() {
  const result = await handleGetBooks();

  const books = isApiBookArray(result.data)
    ? result.data.map((book) => ({
        id: book.id,
        title: book.title,
        author: book.author?.name ?? "Unknown author",
        genres: (book.genres ?? [])
          .map((genre) => genre.name)
          .filter((name): name is string => Boolean(name)),
        coverUrl: book.coverImage,
      }))
    : [];

  return (
    <main className="min-h-screen pt-24 pb-16 px-6 md:px-10 max-w-[1400px] mx-auto relative w-full overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
        {/* <div className="absolute -top-[10%] -right-[10%] w-[60vw] h-[60vw] min-w-[600px] opacity-[0.12] mix-blend-screen" style={{ backgroundImage: 'radial-gradient(circle at center, var(--color-mystery) 0%, transparent 65%)' }} /> */}
        {/* <div className="absolute top-[40%] w-[50vw] h-[50vw] min-w-[500px] opacity-[0.10] mix-blend-screen" style={{ backgroundImage: 'radial-gradient(circle at center, var(--color-scifi) 0%, transparent 65%)' }} /> */}
      </div>

      <nav className="flex items-center text-sm text-text-secondary mb-10 w-full" aria-label="Breadcrumb">
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
            <Link href="/books" className="hover:text-white transition-colors">
              Books
            </Link>
          </li>
        </ol>
      </nav>
      
      <PublicBooksCatalog books={books} />
    </main>
  );
}
