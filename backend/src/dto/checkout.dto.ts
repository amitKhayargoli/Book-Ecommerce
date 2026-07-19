import { z } from "zod";

export const KhaltiInitiateSchema = z.object({
  addressId: z.string().optional(),
  customerName: z.string().optional(),
  customerEmail: z.string().email("Invalid email").optional(),
}).passthrough().optional().default({});

export const KhaltiVerifySchema = z.object({
  pidx: z.string().min(1, "pidx is required"),
  purchaseOrderId: z.string().optional(),
}).passthrough();

export type KhaltiInitiateDto = z.infer<typeof KhaltiInitiateSchema>;
export type KhaltiVerifyDto = z.infer<typeof KhaltiVerifySchema>;
