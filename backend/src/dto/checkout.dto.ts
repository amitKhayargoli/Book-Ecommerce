import { z } from "zod";

export const EsewaInitiateSchema = z.object({}).passthrough().optional().default({});
export const KhaltiInitiateSchema = z.object({}).passthrough().optional().default({});

export const EsewaSuccessQuerySchema = z.object({
  data: z.string().min(1, "data is required"),
});

export const KhaltiSuccessQuerySchema = z
  .object({
    pidx: z.string().min(1, "pidx is required"),
  })
  .passthrough();

export type EsewaInitiateDto = z.infer<typeof EsewaInitiateSchema>;
export type EsewaSuccessQueryDto = z.infer<typeof EsewaSuccessQuerySchema>;
export type KhaltiInitiateDto = z.infer<typeof KhaltiInitiateSchema>;
export type KhaltiSuccessQueryDto = z.infer<typeof KhaltiSuccessQuerySchema>;
