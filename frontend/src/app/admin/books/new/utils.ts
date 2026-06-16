import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { BookFormData, OpenLibraryResult, ValidationErrors } from "./types";

const KNOWN_GENRES = [
  "Romance", "Comedy", "Tragedy", "Fantasy",
  "Science Fiction", "Mystery", "Thriller",
  "Horror", "Adventure", "Drama",
];

/**
 * Map Open Library 3-letter language codes to readable names.
 */
const LANGUAGE_MAP: Record<string, string> = {
  eng: "English",
  spa: "Spanish",
  fre: "French",
  fra: "French",
  dut: "Dutch",
  nld: "Dutch",
  ger: "German",
  deu: "German",
  ita: "Italian",
  por: "Portuguese",
  rus: "Russian",
  chi: "Chinese",
  zho: "Chinese",
  jpn: "Japanese",
  kor: "Korean",
  ara: "Arabic",
  hin: "Hindi",
  ben: "Bengali",
  tur: "Turkish",
  pol: "Polish",
  swe: "Swedish",
  dan: "Danish",
  nor: "Norwegian",
  fin: "Finnish",
  heb: "Hebrew",
  tha: "Thai",
  vie: "Vietnamese",
  cze: "Czech",
  ces: "Czech",
  hun: "Hungarian",
  rum: "Romanian",
  ron: "Romanian",
  gre: "Greek",
  ell: "Greek",
  ukr: "Ukrainian",
  bul: "Bulgarian",
  srp: "Serbian",
  hrv: "Croatian",
  slv: "Slovenian",
  lit: "Lithuanian",
  lav: "Latvian",
  est: "Estonian",
  gle: "Irish",
  cym: "Welsh",
  gla: "Scottish Gaelic",
  lat: "Latin",
};

/**
 * Normalise a genre/subject string so casing & punctuation don't prevent a match.
 */
function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Match imported subjects against the known-genre list.
 */
function matchGenresFromSubjects(subjects: string[]): string[] {
  const matched: string[] = [];
  for (const subject of subjects) {
    const norm = normalise(subject);
    for (const genre of KNOWN_GENRES) {
      const normGenre = normalise(genre);
      // Direct match or the subject contains the genre name
      if (norm === normGenre || norm.includes(normGenre) || normGenre.includes(norm)) {
        if (!matched.includes(genre)) {
          matched.push(genre);
        }
      }
    }
  }
  return matched;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export function mapOpenLibraryToFormData(result: OpenLibraryResult): Partial<BookFormData> {
  const subjects = result.subjects || [];

  return {
    title: result.title,
    slug: generateSlug(result.title),
    author: result.authors.length > 0 ? result.authors[0] : "",
    language: LANGUAGE_MAP[result.language ?? ""] || result.language || "",
    publishedYear: result.year ? String(result.year) : "",
    subjects,
    genres: matchGenresFromSubjects(subjects),
    coverImageUrl: result.coverImage || "",
  };
}

export function validateBookForm(data: BookFormData): ValidationErrors {
  const errors: ValidationErrors = {};
  
  if (!data.title.trim()) errors.title = "Title is required";
  if (!data.slug.trim()) errors.slug = "Slug is required";
  if (!data.author.trim()) errors.author = "Author is required";
  
  const price = Number(data.price);
  if (!Number.isFinite(price) || price <= 0) {
    errors.price = "Price must be greater than 0";
  }
  
  if (data.discountPrice) {
    const discountPrice = Number(data.discountPrice);
    if (isNaN(discountPrice) || discountPrice < 0) errors.discountPrice = "Check discount price";
    if (discountPrice > price) errors.discountPrice = "Discount cannot exceed price";
  }
  
  const stock = Number(data.stock);
  if (isNaN(stock) || stock < 0) errors.stock = "Stock must be 0 or more";
  
  if (data.publishedYear) {
    const year = Number(data.publishedYear);
    const maxYear = new Date().getFullYear() + 5;
    if (isNaN(year) || year < 1000 || year > maxYear) errors.publishedYear = "Enter a valid year";
  }
  
  return errors;
}
