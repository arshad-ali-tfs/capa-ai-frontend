import http from "node:http"
import https from "node:https"
import { createServiceResolver } from "./databricksAuth.mjs"
import { findService, resolveServices, upstreamHeaders, upstreamUrl } from "./serverProxy.mjs"

function json(response, status, detail) {
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  })
  response.end(JSON.stringify({ detail }))
}

/** One streaming API boundary for production, Vite development and preview. */
export function createApiMiddleware(env = process.env) {
  const services = resolveServices(env)
  const resolveService = createServiceResolver(env)
  return async (request, response, next) => {
    let url
    try {
      url = new URL(request.url || "/", "http://localhost")
    } catch {
      json(response, 400, "Invalid request.")
      return
    }
    const service = findService(url.pathname, services)
    if (!service) {
      if (url.pathname.startsWith("/api/")) json(response, 404, "Unknown service.")
      else next()
      return
    }
    let resolved
    try {
      resolved = await resolveService(service)
    } catch {
      // Do not log credentials, returned OAuth bodies or user search text.
      console.error(`${service.label} target/authentication setup failed. Check app identity, target and resource permissions.`)
      if (!response.destroyed)
        json(response, 502, `${service.label} authentication or app target is unavailable. Check the frontend app identity, target and app resource permission.`)
      return
    }
    if (request.destroyed || response.destroyed) return
    const target = upstreamUrl(resolved, url.pathname, url.search)
    const client = target.protocol === "https:" ? https : http
    const proxy = client.request(
      target,
      {
        method: request.method,
        headers: upstreamHeaders(resolved, request.headers),
        timeout: 180000,
      },
      (result) => {
        const headers = {
          "Content-Type": result.headers["content-type"] || "application/json",
          "Cache-Control": "no-store",
        }
        if (result.headers["x-request-id"])
          headers["X-Request-ID"] = result.headers["x-request-id"]
        response.writeHead(result.statusCode || 502, headers)
        result.on("error", () => response.destroy())
        result.pipe(response)
      },
    )
    proxy.on("timeout", () => proxy.destroy(new Error("Backend request timed out.")))
    proxy.on("error", () => {
      console.error(`${service.label} upstream request failed.`)
      if (!response.destroyed && !response.headersSent)
        json(response, 502, `${service.label} is unavailable. Check the backend service.`)
      else response.destroy()
    })
    request.on("aborted", () => proxy.destroy())
    response.on("close", () => {
      if (!response.writableEnded) proxy.destroy()
    })
    request.pipe(proxy)
  }
}
