import { OpenLibraryResult } from "../types";

// ── Raw Google Books API types ─────────────────────────────────
interface GoogleBooksIndustryIdentifier {
  type: "ISBN_10" | "ISBN_13" | string;
  identifier: string;
}

interface GoogleBooksImageLinks {
  smallThumbnail?: string;
  thumbnail?: string;
  small?: string;
  medium?: string;
  large?: string;
  extraLarge?: string;
}

interface GoogleBooksVolumeInfo {
  title: string;
  subtitle?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  industryIdentifiers?: GoogleBooksIndustryIdentifier[];
  pageCount?: number;
  categories?: string[];
  language?: string;
  imageLinks?: GoogleBooksImageLinks;
  mainCategory?: string;
}

interface GoogleBooksItem {
  id: string;
  volumeInfo: GoogleBooksVolumeInfo;
}

interface GoogleBooksResponse {
  kind: string;
  totalItems: number;
  items?: GoogleBooksItem[];
}

// ── Helpers ────────────────────────────────────────────────────

/**
 * Extract the best available cover image URL from Google Books imageLinks.
 * Prefers larger sizes, falls back to smaller ones.
 */
function getBestCoverImage(links: GoogleBooksImageLinks | undefined): string | null {
  if (!links) return null;
  // Prefer larger sizes, fall back to smaller
  return (
    links.extraLarge ??
    links.large ??
    links.medium ??
    links.thumbnail ??
    links.smallThumbnail ??
    null
  );
}

/**
 * Extract thumbnail-sized cover URL (for search result cards).
 */
function getThumbnailCover(links: GoogleBooksImageLinks | undefined): string | null {
  if (!links) return null;
  return links.thumbnail ?? links.smallThumbnail ?? null;
}

/**
 * Extract ISBN_13 (preferred) or ISBN_10 from industry identifiers.
 */
function getIsbn(identifiers: GoogleBooksIndustryIdentifier[] | undefined): string | null {
  if (!identifiers || identifiers.length === 0) return null;
  // Prefer ISBN_13
  const isbn13 = identifiers.find((id) => id.type === "ISBN_13");
  if (isbn13) return isbn13.identifier;
  const isbn10 = identifiers.find((id) => id.type === "ISBN_10");
  return isbn10?.identifier ?? null;
}

/**
 * Extract a usable year from Google Books' publishedDate string.
 * publishedDate can be "2024", "2024-03", or "2024-03-15"
 */
function getYear(publishedDate: string | undefined): number | null {
  if (!publishedDate) return null;
  const match = publishedDate.match(/^(\d{4})/);
  return match ? parseInt(match[1], 10) : null;
}

// ── Search ─────────────────────────────────────────────────────

const GOOGLE_BOOKS_BASE = "https://www.googleapis.com/books/v1";

export async function searchGoogleBooks(query: string): Promise<OpenLibraryResult[]> {
  if (!query.trim()) return [];

  const trimmed = query.trim();
  const isbnCandidate = trimmed.replace(/[-\s]/g, "");
  const isIsbn = /^(?:\d{10}|\d{13}|\d{9}[\dXx])$/.test(isbnCandidate);

  // Build the query parameter — for ISBN searches, use id: prefix for precision
  const q = isIsbn ? `id:${isbnCandidate}` : encodeURIComponent(trimmed);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY ?? "";
  const keyParam = apiKey ? `&key=${apiKey}` : "";
  const url = `${GOOGLE_BOOKS_BASE}/volumes?q=${q}&maxResults=12${keyParam}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Google Books API search failed with status ${response.status}`);
  }

  const data = (await response.json()) as GoogleBooksResponse;
  const items = data.items ?? [];

  return items.map(mapItemToResult).filter((item): item is OpenLibraryResult => item !== null);
}

function mapItemToResult(item: GoogleBooksItem): OpenLibraryResult | null {
  const info = item.volumeInfo;
  if (!info || !info.title) return null;

  // Provide multiple cover sizes — the primary coverImage is the largest available
  const imageLinks = info.imageLinks;

  return {
    key: item.id,
    title: info.title,
    authors: info.authors ?? [],
    year: getYear(info.publishedDate),
    coverImage: getBestCoverImage(imageLinks),
    // Store additional cover sizes and raw data for richer display
    extraImages: {
      smallThumbnail: imageLinks?.smallThumbnail ?? null,
      thumbnail: getThumbnailCover(imageLinks),
      small: imageLinks?.small ?? null,
      medium: imageLinks?.medium ?? null,
      large: imageLinks?.large ?? null,
      extraLarge: imageLinks?.extraLarge ?? null,
    },
    isbn: getIsbn(info.industryIdentifiers),
    publisher: info.publisher ?? null,
    language: info.language ?? null,
    subjects: info.categories ?? [],
    pages: info.pageCount ?? null,
    editionCount: 0,
    raw: item,
  };
}
