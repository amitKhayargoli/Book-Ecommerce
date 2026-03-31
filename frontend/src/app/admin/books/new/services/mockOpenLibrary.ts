import { OpenLibraryResult } from "../types";

interface OpenLibrarySearchDoc {
  key: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  isbn?: string[];
  publisher?: string[];
  language?: string[];
  subject?: string[];
  number_of_pages_median?: number;
  edition_count?: number;
}

interface OpenLibrarySearchResponse {
  docs?: OpenLibrarySearchDoc[];
}

function buildSearchUrl(query: string): string {
  const trimmed = query.trim();
  const isbnCandidate = trimmed.replace(/[-\s]/g, "");
  const isIsbn = /^(?:\d{10}|\d{13}|\d{9}[\dXx])$/.test(isbnCandidate);

  if (isIsbn) {
    return `https://openlibrary.org/search.json?isbn=${encodeURIComponent(isbnCandidate)}&limit=20`;
  }

  return `https://openlibrary.org/search.json?q=${encodeURIComponent(trimmed)}&limit=20`;
}

function mapDocToResult(doc: OpenLibrarySearchDoc): OpenLibraryResult | null {
  if (!doc.key || !doc.title) {
    return null;
  }

  return {
    key: doc.key,
    title: doc.title,
    authors: doc.author_name ?? [],
    year: doc.first_publish_year ?? null,
    coverImage: doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
      : null,
    isbn: doc.isbn?.[0] ?? null,
    publisher: doc.publisher?.[0] ?? null,
    language: doc.language?.[0] ?? null,
    subjects: doc.subject?.slice(0, 8) ?? [],
    pages: doc.number_of_pages_median ?? null,
    editionCount: doc.edition_count ?? 0,
    raw: doc,
  };
}

export async function searchMockOpenLibrary(query: string): Promise<OpenLibraryResult[]> {
  if (!query.trim()) return [];

  const response = await fetch(buildSearchUrl(query), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Open Library search failed with status ${response.status}`);
  }

  const data = (await response.json()) as OpenLibrarySearchResponse;
  const docs = data.docs ?? [];

  return docs
    .map(mapDocToResult)
    .filter((item): item is OpenLibraryResult => item !== null);
}
