import { authStorage } from "../storage";

export const API_BASE = (import.meta as {env?: {VITE_API_BASE?: string}}).env?.VITE_API_BASE ?? "http://localhost:3300";

type ApiErrorBody = {
  message?: string | string[];
  error?: string;
};

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = authStorage.getToken();
  const headers = new Headers(init.headers);

  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      authStorage.clear();
    }

    const error = await readError(response);
    throw new Error(error);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as T;
  }
}

async function readError(response: Response) {
  const text = await response.text();
  if (!text) {
    return "Request failed";
  }

  try {
    const body = JSON.parse(text) as ApiErrorBody;
    if (Array.isArray(body.message)) {
      return body.message.join(", ");
    }
    return body.message ?? body.error ?? text;
  } catch {
    return text;
  }
}
