export function getApiBaseUrl() {
  const configured = import.meta.env.VITE_API_BASE_URL
  if (typeof configured === "string" && configured.trim()) {
    return configured.trim().replace(/\/+$/, "")
  }
  return ""
}

export function buildApiUrl(path: string) {
  const baseUrl = getApiBaseUrl()
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function messageFromPayload(payload: unknown): string {
  if (!payload || typeof payload !== "object") return ""
  const body = payload as { detail?: unknown; message?: unknown }
  const value = body.detail ?? body.message
  if (value === undefined || value === null) return ""
  return typeof value === "string" ? value : JSON.stringify(value)
}

export async function requestJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers ?? {})
  if (init.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  const response = await fetch(buildApiUrl(path), { ...init, headers })
  const text = await response.text()
  const payload = text ? parseJson(text) : null

  if (!response.ok) {
    throw new Error(
      messageFromPayload(payload) ||
        text ||
        `Request failed with status ${response.status}`,
    )
  }

  return (payload ?? {}) as T
}
