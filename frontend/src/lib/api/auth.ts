import { AxiosRequestConfig } from "axios";
import { api } from "../api-client";

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface AuthTokensResponse {
  accessToken: string;
  user: AuthUser;
}

export interface AuthResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Array<{ field?: string; message?: string }>;
}

export const authEndpoints = {
  register: (payload: RegisterPayload, config?: AxiosRequestConfig) =>
    api.post<AuthResponse<AuthTokensResponse>>("/api/auth/register", payload, config),

  login: (payload: LoginPayload, config?: AxiosRequestConfig) =>
    api.post<AuthResponse<AuthTokensResponse>>("/api/auth/login", payload, config),

  me: (config?: AxiosRequestConfig) =>
    api.get<AuthResponse<AuthUser>>("/api/auth/me", config),
};
