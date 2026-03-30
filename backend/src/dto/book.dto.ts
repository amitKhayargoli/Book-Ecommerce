import { z } from "zod";

// ─── Create Book ────────────────────────────────────────────────
export const CreateBookSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, hyphens"),
  description: z.string().min(1, "Description is required"),
  price: z.number().positive("Price must be positive"),
  stock: z.number().int().nonnegative("Stock cannot be negative").default(0),
  coverImage: z.string().url("Cover image must be a valid URL"),
  mockupImage: z.string().url("Mockup image must be a valid URL").optional(),
  featured: z.boolean().default(false),
  trending: z.boolean().default(false),
  authorId: z.string().min(1, "Author ID is required"),
  genreIds: z
    .array(z.string())
    .min(1, "At least one genre is required")
    .optional(),
});

// ─── Update Book ────────────────────────────────────────────────
export const UpdateBookSchema = CreateBookSchema.partial().omit({
  slug: true, // slug is immutable after creation
});

// ─── Query / Filter ─────────────────────────────────────────────
export const BookQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(12),
  search: z.string().optional(),
  authorId: z.string().optional(),
  genreId: z.string().optional(),
  featured: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  trending: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  sortBy: z.enum(["createdAt", "price", "title", "stock"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// ─── Inferred Types ──────────────────────────────────────────────
export type CreateBookDto = z.infer<typeof CreateBookSchema>;
export type UpdateBookDto = z.infer<typeof UpdateBookSchema>;
export type BookQueryDto = z.infer<typeof BookQuerySchema>;
