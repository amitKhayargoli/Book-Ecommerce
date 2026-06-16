import { api } from "../api-client";

export interface UploadResponse {
  success: boolean;
  data?: {
    url: string;
    filename: string;
  };
  message?: string;
}

/**
 * Upload an image file to the backend.
 * Returns the public URL of the uploaded image.
 * Requires auth token for the admin endpoint.
 */
export async function uploadImage(
  file: File,
  accessToken?: string,
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("image", file);

  try {
    const response = await api.post<UploadResponse>("/api/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    });
    return response.data;
  } catch (err: unknown) {
    const errorData =
      typeof err === "object" && err !== null
        ? (err as {
            response?: { data?: { message?: string } };
            message?: string;
          })
        : undefined;
    return {
      success: false,
      message: errorData?.response?.data?.message ?? errorData?.message ?? "Upload failed",
    };
  }
}
