"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { reviewEndpoints, ReviewPayload } from "@/lib/api/reviews";

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

export async function addReviewAction(bookId: string, payload: ReviewPayload) {
  try {
    const session = await auth();
    if (!session?.accessToken) {
      return { success: false, message: "Unauthorized. Please log in first." };
    }

    const { data } = await reviewEndpoints.addReview(bookId, payload, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

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

export async function getReviewsAction(bookId: string, page = 1, limit = 100) {
  try {
    const { data } = await reviewEndpoints.getReviewsByBookId(bookId, page, limit);
    return { success: true, data: data.data, meta: data.meta };
  } catch (error: unknown) {
    console.error("Error fetching reviews:", error);
    return { success: false, data: [], meta: undefined };
  }
}
