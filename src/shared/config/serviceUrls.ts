// Pure URL helpers for the API clients. They do not read the environment.

/**
 * Validate an optional base-URL override. An empty value means "same origin":
 * the frontend server forwards the request to the service.
 */
export function normalizeBaseUrl(
  raw: string | undefined,
  envName: string,
): string {
  const value = (raw ?? "").trim()
  if (!value) return ""
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error(
      `${envName} must be an absolute http(s) URL, for example http://127.0.0.1:8101.`,
    )
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error(`${envName} must be an http(s) URL without credentials.`)
  return value.replace(/\/+$/, "")
}

/** Join a base URL and a request path with exactly one slash between them. */
export function joinUrl(baseUrl: string, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath
}
