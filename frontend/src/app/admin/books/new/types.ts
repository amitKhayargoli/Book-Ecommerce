export type BookStatus = 'DRAFT' | 'PUBLISHED';

export interface OpenLibraryResult {
  key: string;
  title: string;
  authors: string[];
  year: number | null;
  coverImage: string | null;
  isbn: string | null;
  publisher: string | null;
  language: string | null;
  subjects: string[];
  pages: number | null;
  editionCount: number;
  raw?: unknown;
}

export interface BookFormData {
  title: string;
  slug: string;
  description: string;
  author: string;
  publisher: string;
  isbn: string;
  language: string;
  pages: string | number; // allow string initially for controlled input
  publishedYear: string | number;
  genres: string[];
  subjects: string[];
  price: string | number;
  discountPrice: string | number;
  stock: string | number;
  isFeatured: boolean;
  isTrending: boolean;
  status: BookStatus;
  coverImageUrl: string;
  mockupImageUrl: string;
  previewImages: string[];
}

export interface ValidationErrors {
  [key: string]: string | undefined;
}
