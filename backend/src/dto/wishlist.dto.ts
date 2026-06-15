import { z } from "zod";

export const AddWishlistItemSchema = z.object({
  bookId: z.string().min(1, "Book ID is required"),
});

export const WishlistBookParamSchema = z.object({
  bookId: z.string().min(1, "Book ID is required"),
});

export type AddWishlistItemDto = z.infer<typeof AddWishlistItemSchema>;
export type WishlistBookParamDto = z.infer<typeof WishlistBookParamSchema>;
