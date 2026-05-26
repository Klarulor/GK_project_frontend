import { apiFetch } from "./client";

export type LoginResponse = {
  user_id: number;
  username: string;
  role: number;
  jwt_token: string;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/v1/auth/login", {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function register(email: string, username: string, password: string): Promise<void> {
  await apiFetch<void>("/v1/auth/register", {
    method: 'POST',
    body: JSON.stringify({ email, username, password }),
  });
}
