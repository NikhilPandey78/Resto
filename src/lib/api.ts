import { supabase } from '@/lib/supabase';

const API_URL = (import.meta.env.VITE_API_URL || 'https://apis.bhojmitra.in').replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function getAuthToken(): Promise<string | null> {
  if (typeof window !== 'undefined') {
    const ssoRaw = localStorage.getItem('bhojmitra_resto_sso');
    if (ssoRaw) {
      try {
        const parsed = JSON.parse(ssoRaw);
        if (parsed?.token) return parsed.token;
      } catch {}
    }
  }
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}${path.startsWith('/') ? path : `/${path}`}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const text = await response.text();
  const result = text ? JSON.parse(text) as { data?: T; error?: { message?: string } } : {};
  if (!response.ok) throw new ApiError(response.status, result.error?.message || `API request failed (${response.status})`);
  return (result.data === undefined ? result : result.data) as T;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};

export function isApiUnavailable(error: unknown): boolean {
  return error instanceof TypeError || (error instanceof ApiError && error.status >= 500);
}
