// Server-side helpers shared by the Vite dev/preview proxy and server.mjs.
// They turn the service registry plus environment variables into proxy rules.
import { SERVICES } from "./serviceRegistry.mjs"

/**
 * Read every service's target URL and optional token from the environment.
 * Throws a clear error when a target is not an HTTP(S) URL without credentials.
 */
export function resolveServices(env = process.env) {
  return Object.entries(SERVICES).map(([name, definition]) => {
    const raw =
      (env[definition.targetEnv] || "").trim() || definition.defaultTarget
    const invalid = () =>
      new Error(
        `${definition.targetEnv} must be an HTTP(S) URL without credentials.`,
      )
    let target
    try {
      target = new URL(raw)
    } catch {
      throw invalid()
    }
    if (
      !["http:", "https:"].includes(target.protocol) ||
      target.username ||
      target.password
    )
      throw invalid()
    return {
      name,
      label: definition.label,
      target,
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

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/** Vite `server.proxy` / `preview.proxy` rules for every service route. */
export function viteProxy(services) {
  const rules = {}
  for (const service of services) {
    for (const route of service.routes) {
      const key = route.endsWith("/")
        ? route
        : `^${escapeRegExp(route)}(?:\\?.*)?$`
      rules[key] = {
        target: service.target.href,
        changeOrigin: true,
        ...(service.token
          ? { headers: { Authorization: "Bearer " + service.token } }
          : {}),
      }
    }
  }
  return rules
}
