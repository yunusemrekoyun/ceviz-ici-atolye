export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.error || "Bir hata oluştu");
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get:   <T>(path: string)                    => request<T>("GET",    path),
  post:  <T>(path: string, body: unknown)     => request<T>("POST",   path, body),
  patch: <T>(path: string, body: unknown)     => request<T>("PATCH",  path, body),
  del:   <T = void>(path: string)             => request<T>("DELETE", path),
};
