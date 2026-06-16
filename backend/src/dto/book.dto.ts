import { z } from "zod";

const BookBaseSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, hyphens"),
  description: z.string().min(1, "Description is required"),
  price: z.number().positive("Price must be positive"),
  discountPrice: z.number().positive("Discount price must be positive").optional(),
  stock: z.number().int().nonnegative("Stock cannot be negative").default(0),
  isbn: z.string().min(1, "ISBN cannot be empty").optional(),
  publishedAt: z.coerce.date().optional(),
  language: z.string().min(1, "Language cannot be empty").optional(),
  pages: z.number().int().positive("Pages must be positive").optional(),
  coverImage: z.string().url("Cover image must be a valid URL"),
  mockupImage: z.string().url("Mockup image must be a valid URL").optional(),
  previewImages: z.array(z.string().url("Preview image must be a valid URL")).optional(),
  featured: z.boolean().default(false),
  trending: z.boolean().default(false),
  authorId: z.string().min(1, "Author ID cannot be empty").optional(),
  authorName: z.string().min(1, "Author name cannot be empty").optional(),
  publisherId: z.string().min(1, "Publisher ID cannot be empty").optional(),
  publisherName: z.string().min(1, "Publisher name cannot be empty").optional(),
  genreIds: z
    .array(z.string())
    .min(1, "At least one genre is required")
    .optional(),
  genreNames: z.array(z.string().min(1)).optional(),
});

export const CreateBookSchema = BookBaseSchema.refine(
  (data) => Boolean(data.authorId || data.authorName),
  { message: "Either authorId or authorName is required", path: ["authorId"] }
);

export const UpdateBookSchema = BookBaseSchema
  .omit({ slug: true })         
  .partial()                    
  .refine(
    (data) => {
      const hasAuthorId = data.authorId !== undefined;
      const hasAuthorName = data.authorName !== undefined;
      if (hasAuthorId || hasAuthorName) {
        return Boolean(data.authorId || data.authorName);
      }
      return true; 
    },
    { message: "Either authorId or authorName is required", path: ["authorId"] }
  );

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

// ─── Inferred Types ───────────────────────────────────────────────
export type CreateBookDto = z.infer<typeof CreateBookSchema>;

export type CreateBookDbDto = Omit<
  z.infer<typeof BookBaseSchema>,
  "authorName" | "publisherName" | "genreNames"
> & {
  authorId: string;
};

export type UpdateBookDto = z.infer<typeof UpdateBookSchema>;
export type BookQueryDto = z.infer<typeof BookQuerySchema>;