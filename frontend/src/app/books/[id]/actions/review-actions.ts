"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { reviewEndpoints, ReviewPayload, ReviewItem } from "@/lib/api/reviews";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000";

type ApiError = {
  message?: string;
  response?: {
    status?: number;
    data?: {
      message?: string;
    };
  };
};

function parseApiError(error: unknown): ApiError | undefined {
  return typeof error === "object" && error !== null ? (error as ApiError) : undefined;
}

export async function addReviewAction(bookId: string, payload: ReviewPayload, imageFiles?: File[]) {
  try {
    const session = await auth();
    if (!session?.accessToken) {
      return { success: false, message: "Unauthorized. Please log in first." };
    }

    // Upload images first, if any
    let imageUrls: string[] = [];
    if (imageFiles && imageFiles.length > 0) {
      for (const file of imageFiles) {
        const formData = new FormData();
        formData.append("image", file);

        const res = await fetch(`${BACKEND_URL}/api/upload`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: formData,
        });
        const json = await res.json();
        if (json.success && json.data?.url) {
          imageUrls.push(json.data.url);
        }
      }
    }

    const { data } = await reviewEndpoints.addReview(
      bookId,
      { ...payload, images: imageUrls.length > 0 ? imageUrls : undefined },
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      },
    );

    revalidatePath(`/books/${bookId}`);
    return { success: true, message: data.message || "Review added successfully!" };
  } catch (error: unknown) {
    console.error("Error adding review:", error);

    const apiError = parseApiError(error);

    if (apiError?.response?.status === 409) {
      return { success: false, message: "You have already reviewed this book." };
    }

    return {
      success: false,
      message:
        apiError?.response?.data?.message ||
        apiError?.message ||
        "Failed to add review.",
    };
  }
}

export async function getReviewsAction(bookId: string, page = 1, limit = 100, sortBy?: string, sortOrder?: string) {
  try {
    const { data } = await reviewEndpoints.getReviewsByBookId(bookId, page, limit, sortBy, sortOrder);
    return { success: true, data: data.data, meta: data.meta };
  } catch (error: unknown) {
    // Log full error details to understand the 400
    if (error && typeof error === "object" && "response" in error) {
      const axiosErr = error as { response?: { status?: number; data?: unknown } };
      console.error("Reviews API 400 - status:", axiosErr.response?.status, "body:", JSON.stringify(axiosErr.response?.data));
    } else {
      console.error("Error fetching reviews:", error);
    }
    return { success: false, data: [], meta: undefined };
  }
}

export async function updateReviewAction(bookId: string, reviewId: string, payload: ReviewPayload, imageFiles?: File[]) {
  try {
    const session = await auth();
    if (!session?.accessToken) {
      return { success: false, message: "Unauthorized. Please log in first." };
    }

    // Upload images first, if any
    let imageUrls: string[] = [];
    if (imageFiles && imageFiles.length > 0) {
      for (const file of imageFiles) {
        const formData = new FormData();
        formData.append("image", file);

        const res = await fetch(`${BACKEND_URL}/api/upload`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: formData,
        });
        const json = await res.json();
        if (json.success && json.data?.url) {
          imageUrls.push(json.data.url);
        }
      }
    }

    const { data } = await reviewEndpoints.updateReview(
      bookId,
      reviewId,
      { ...payload, images: imageUrls.length > 0 ? imageUrls : undefined },
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      },
    );

    revalidatePath(`/books/${bookId}`);
    return { success: true, message: data.message || "Review updated successfully!" };
  } catch (error: unknown) {
    console.error("Error updating review:", error);

    const apiError = parseApiError(error);
    return {
      success: false,
      message:
        apiError?.response?.data?.message ||
        apiError?.message ||
        "Failed to update review.",
    };
  }
}

export async function getMyReviewAction(bookId: string): Promise<{ success: boolean; data: ReviewItem | null }> {
  try {
    const session = await auth();
    if (!session?.accessToken) {
      return { success: false, data: null };
    }

    const { data } = await reviewEndpoints.getMyReview(bookId, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    const raw = data.data as (ReviewItem & { images?: string[] | null }) | null | undefined;
    if (!raw) return { success: true, data: null };
    return { success: true, data: { ...raw, images: raw.images ?? [] } };
  } catch (error: unknown) {
    console.error("Error fetching my review:", error);
    return { success: false, data: null };
  }
}
