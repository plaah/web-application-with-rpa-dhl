const BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getToken(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/irrs_token=([^;]+)/);
  return m ? m[1] : null;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Only set Content-Type to JSON when body is not FormData
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers as Record<string, string>),
    },
  });

  if (res.status === 401) {
    clearAuthCookie();
    clearUserCookie();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data?.message || data?.detail || `HTTP ${res.status}`
    );
  }

  return data as T;
}

export function setAuthCookie(token: string) {
  document.cookie = `irrs_token=${token}; Max-Age=${8 * 60 * 60}; path=/; SameSite=Strict`;
}

export function clearAuthCookie() {
  document.cookie = "irrs_token=; Max-Age=0; path=/";
}

export function setUserCookie(user: {
  id: string;
  username: string;
  role: string;
}) {
  const v = encodeURIComponent(JSON.stringify(user));
  document.cookie = `irrs_user=${v}; Max-Age=${8 * 60 * 60}; path=/; SameSite=Strict`;
}

export function getUserFromCookie(): {
  id: string;
  username: string;
  role: string;
} | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/irrs_user=([^;]+)/);
  if (!m) return null;
  try {
    return JSON.parse(decodeURIComponent(m[1]));
  } catch {
    return null;
  }
}

export function clearUserCookie() {
  document.cookie = "irrs_user=; Max-Age=0; path=/";
}
