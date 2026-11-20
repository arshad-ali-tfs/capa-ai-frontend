// Server-side configuration shared by Vite and the production server.
import { SERVICES } from "./serviceRegistry.mjs"

/**
 * Normalize an explicit HTTP(S) address, including a host without a scheme.
 * Credentials must always be supplied separately from the URL.
 */
export function httpUrl(value, variableName) {
  const raw = String(value || "").trim()
  const invalid = () =>
    new Error(`${variableName} must be an HTTP(S) URL without credentials.`)
  let url
  try {
    url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`)
  } catch {
    throw invalid()
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password)
    throw invalid()
  return url
}

/** Read explicit URLs or Databricks app-resource names without network I/O. */
export function resolveServices(env = process.env) {
  return Object.entries(SERVICES).map(([name, definition]) => {
    const raw =
      (env[definition.targetEnv] || "").trim() || definition.defaultTarget
    const isAppName = /^[a-z\d][a-z\d-]*$/i.test(raw) && raw !== "localhost"
    const appName = isAppName && env.DATABRICKS_APP_NAME ? raw : ""
    if (isAppName && !appName)
      throw new Error(
        `${definition.targetEnv} must be an HTTP(S) URL without credentials outside Databricks Apps.`,
      )
    const target = appName ? null : httpUrl(raw, definition.targetEnv)
    return {
      name,
      label: definition.label,
      target,
      appName,
      targetEnv: definition.targetEnv,
      configured: Boolean((env[definition.targetEnv] || "").trim()),
      token: (env[definition.tokenEnv] || "").trim(),
      routes: definition.routes,
    }
  })
}

const matchesRoute = (route, pathname) =>
  route.endsWith("/") ? pathname.startsWith(route) : pathname === route

/** The service that owns a request path, or null when none does. */
export function findService(pathname, services) {
  return (
    services.find((service) =>
      service.routes.some((route) => matchesRoute(route, pathname)),
    ) ?? null
  )
}

/** The full upstream URL for a request, keeping any path in the target URL. */
export function upstreamUrl(service, pathname, search = "") {
  const url = new URL(service.target.href)
  url.pathname = service.target.pathname.replace(/\/$/, "") + pathname
  url.search = search
  return url
}

/** Headers sent upstream: JSON accept, the body type, and the optional token. */
export function upstreamHeaders(service, requestHeaders = {}) {
  const headers = { accept: "application/json" }
  if (requestHeaders["content-type"])
    headers["content-type"] = requestHeaders["content-type"]
  if (service.token) headers.authorization = "Bearer " + service.token
  return headers
}
