"use server";

import { auth } from "@/auth";
import {
  authEndpoints,
  AuthTokensResponse,
  AuthUser,
  LoginPayload,
  RegisterPayload,
} from "@/lib/api/auth";

export interface ServerActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

type ApiError = {
  message?: string;
  response?: {
    data?: {
      message?: string;
      errors?: Array<{ field?: string; message?: string }>;
    };
  };
};

function getErrorMessage(err: unknown, fallback: string): string {
  const errorData =
    typeof err === "object" && err !== null ? (err as ApiError) : undefined;

  const validationMessages = errorData?.response?.data?.errors
    ?.map((issue) => issue?.message)
    .filter((message): message is string => Boolean(message));

  if (validationMessages && validationMessages.length > 0) {
    return validationMessages.join("; ");
  }

  return errorData?.response?.data?.message || errorData?.message || fallback;
}

export async function handleRegister(
  payload: RegisterPayload,
): Promise<ServerActionResult<AuthTokensResponse>> {
  try {
    const response = await authEndpoints.register(payload);
    return {
      success: response.data.success,
      data: response.data.data,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: getErrorMessage(err, "Failed to register user"),
    };
  }
}

export async function handleLogin(
  payload: LoginPayload,
): Promise<ServerActionResult<AuthTokensResponse>> {
  try {
    const response = await authEndpoints.login(payload);
    return {
      success: response.data.success,
      data: response.data.data,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: getErrorMessage(err, "Failed to login user"),
    };
  }
}

export async function handleGetProfile(): Promise<ServerActionResult<AuthUser>> {
  try {
    const session = await auth();

    if (!session?.accessToken) {
      return {
        success: false,
        error: "Authentication required",
      };
    }

    const response = await authEndpoints.me({
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    return {
      success: response.data.success,
      data: response.data.data,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: getErrorMessage(err, "Failed to fetch profile"),
    };
  }
}
