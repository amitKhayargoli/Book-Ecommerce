"use server";

import { bookEndpoints, BookPayload } from "@/lib/api/books";

export interface ServerActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function handleCreateBook(
  payload: BookPayload,
): Promise<ServerActionResult<unknown>> {
  try {
    const response = await bookEndpoints.createBook(payload);
    return {
      success: response.data.success,
      data: response.data.data,
    };
  } catch (err: unknown) {
    const errorData =
      typeof err === "object" && err !== null
        ? (err as {
            message?: string;
            response?: {
              data?: {
                message?: string;
                errors?: Array<{ field?: string; message?: string }>;
              };
            };
          })
        : undefined;

    const validationMessages = errorData?.response?.data?.errors
      ?.map((issue) => issue?.message)
      .filter((message): message is string => Boolean(message));

    const message =
      validationMessages && validationMessages.length > 0
        ? validationMessages.join("; ")
        : errorData?.response?.data?.message ||
          errorData?.message ||
          "Failed to create book";

    return {
      success: false,
      error: message,
    };
  }
}

export async function handleGetBooks(): Promise<ServerActionResult<unknown>> {
  try {
    const response = await bookEndpoints.getBooks();
    return {
      success: response.data.success,
      data: response.data.data,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch books";
    return {
      success: false,
      error: message,
    };
  }
}

export async function hanldeGetBookById(
  id: string,
): Promise<ServerActionResult<unknown>> {
  try {
    const response = await bookEndpoints.getBookById(id);
    return {
      success: response.data.success,
      data: response.data.data,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch book";
    return {
      success: false,
      error: message,
    };
  }
}

export async function handleUpdateBook(
  id: string,
  payload: Partial<BookPayload>,
): Promise<ServerActionResult<unknown>> {
  try {
    const response = await bookEndpoints.updateBook(id, payload);
    return {
      success: response.data.success,
      data: response.data.data,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to update book";
    return {
      success: false,
      error: message,
    };
  }
}

export async function handleDeleteBook(
  id: string,
): Promise<ServerActionResult<unknown>> {
  try {
    const response = await bookEndpoints.deleteBook(id);
    return {
      success: response.data.success,
      data: response.data.data,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to delete book";
    return {
      success: false,
      error: message,
    };
  }
}
