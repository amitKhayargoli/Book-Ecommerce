import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { BookFormData, OpenLibraryResult, ValidationErrors } from "./types";

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
  return {
    title: result.title,
    slug: generateSlug(result.title),
    author: result.authors.length > 0 ? result.authors[0] : "",
    publisher: result.publisher || "",
    isbn: result.isbn || "",
    language: result.language || "",
    pages: result.pages || "",
    publishedYear: result.year || "",
    subjects: result.subjects || [],
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
  
  if (data.pages) {
    const pages = Number(data.pages);
    if (!Number.isFinite(pages) || pages <= 0) {
      errors.pages = "Pages must be greater than 0";
    }
  }
  
  if (data.publishedYear) {
    const year = Number(data.publishedYear);
    const maxYear = new Date().getFullYear() + 5;
    if (isNaN(year) || year < 1000 || year > maxYear) errors.publishedYear = "Enter a valid year";
  }
  
  return errors;
}
