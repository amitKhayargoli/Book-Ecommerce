import { z } from "zod";

export const KhaltiInitiateSchema = z.object({
  addressId: z.string().optional(),
}).passthrough().optional().default({});

export const KhaltiSuccessQuerySchema = z
  .object({
    pidx: z.string().min(1, "pidx is required"),
  })
  .passthrough();

export type KhaltiInitiateDto = z.infer<typeof KhaltiInitiateSchema>;
export type KhaltiSuccessQueryDto = z.infer<typeof KhaltiSuccessQuerySchema>;
