import { z } from "zod";

export const AddCartItemSchema = z.object({
  bookId: z.string().min(1, "Book ID is required"),
});

export const CartBookParamSchema = z.object({
  bookId: z.string().min(1, "Book ID is required"),
});

export type AddCartItemDto = z.infer<typeof AddCartItemSchema>;
export type CartBookParamDto = z.infer<typeof CartBookParamSchema>;
