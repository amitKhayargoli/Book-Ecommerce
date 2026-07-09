import { z } from "zod";

export const CreateAddressSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(100),
  phone: z.string().min(7, "Enter a valid phone number").max(20),
  country: z.string().min(2, "Country is required").max(100).optional(),
  city: z.string().min(2, "City is required").max(100),
  state: z.string().max(100).optional(),
  postalCode: z.string().min(2, "Postal code is required").max(20).optional(),
  street: z.string().min(5, "Street address must be at least 5 characters").max(200),
});

export const UpdateAddressSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(100).optional(),
  phone: z.string().min(7, "Enter a valid phone number").max(20).optional(),
  country: z.string().min(2, "Country is required").max(100).optional(),
  city: z.string().min(2, "City is required").max(100).optional(),
  state: z.string().max(100).optional(),
  postalCode: z.string().min(2, "Postal code is required").max(20).optional(),
  street: z.string().min(5, "Street address must be at least 5 characters").max(200).optional(),
});

export type CreateAddressDto = z.infer<typeof CreateAddressSchema>;
export type UpdateAddressDto = z.infer<typeof UpdateAddressSchema>;
