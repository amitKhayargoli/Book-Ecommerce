import { Response } from "express";

/**
 * Normalize image URLs that may contain Docker-internal hostnames
 * so the browser can actually load them.
 *
 * Currently handles: http://backend:3001/ → http://localhost:4000/
 */
export function normalizeImageUrl(url: string | null): string | null {
  if (!url) return url;
  return url.replace("http://backend:3001/", "http://localhost:4000/");
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = "Success",
  statusCode = 200,
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const sendPaginated = <T>(
  res: Response,
  data: T[],
  meta: PaginationMeta,
  message = "Success",
) => {
  return res.status(200).json({
    success: true,
    message,
    data,
    meta,
  });
};

export const buildPaginationMeta = (
  total: number,
  page: number,
  limit: number,
): PaginationMeta => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
  hasNextPage: page < Math.ceil(total / limit),
  hasPrevPage: page > 1,
});
