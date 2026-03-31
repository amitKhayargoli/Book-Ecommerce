import CustomCursor from "../../../components/CustomCursor";
import Navbar from "../../../components/Navbar";
import Footer from "../../../components/Footer";
import { BooksCatalog } from "./ui/BooksCatalog";
import booksData from "../../../data/books.json";

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

export default function AdminBooksPage() {
  const books = booksData as AdminBookItem[];

  return (
    <>
      <CustomCursor />
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-20">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <BooksCatalog books={books} />
        </div>
      </main>
      <Footer />
    </>
  );
}

