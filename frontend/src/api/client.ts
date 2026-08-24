/**
 * Thin fetch wrapper for the CarPilot API. In development Vite proxies `/api`
 * through to the ASP.NET server; in production the server hosts this bundle,
 * so the same relative path works in both.
 */
const BASE_URL = "/api";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface ProblemDetails {
  title?: string;
  detail?: string;
}

const readError = async (response: Response): Promise<string> => {
  try {
    const problem: ProblemDetails = await response.json();
    const message = [problem.title, problem.detail].filter(Boolean).join(" — ");
    if (message) return message;
  } catch {
    // Non-JSON error bodies fall through to the generic message below.
  }
  return `Request failed with status ${response.status}`;
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: init?.body
      ? { "Content-Type": "application/json", ...init.headers }
      : init?.headers,
  });

  if (!response.ok) {
    throw new ApiError(response.status, await readError(response));
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
};

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  // JSON.stringify drops undefined properties, which the API reads as "clear this field".
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body ?? {}) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
