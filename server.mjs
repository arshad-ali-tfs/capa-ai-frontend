// Production static server and MAP-only server-side proxy.
import http from "node:http"
import https from "node:https"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
const project = path.dirname(fileURLToPath(import.meta.url))
if (fs.existsSync(path.join(project, ".env")))
  process.loadEnvFile(path.join(project, ".env"))
const root = path.resolve(project, "dist")
const upstream = new URL(process.env.MAP_API_TARGET || "http://127.0.0.1:8101")
if (
  !["http:", "https:"].includes(upstream.protocol) ||
  upstream.username ||
  upstream.password
)
  throw new Error("MAP_API_TARGET must be an HTTP(S) URL without credentials.")
if (!fs.existsSync(path.join(root, "index.html")))
  throw new Error("Run npm run build first.")
let databricksToken = ""
let databricksTokenExpiresAt = 0
let pendingTokenRequest = null

async function mapBearerToken() {
  const configuredToken = process.env.MAP_API_BEARER_TOKEN?.trim()
  if (configuredToken) return configuredToken

  const host = process.env.DATABRICKS_HOST?.trim()
  const clientId = process.env.DATABRICKS_CLIENT_ID?.trim()
  const clientSecret = process.env.DATABRICKS_CLIENT_SECRET?.trim()
  if (!host || !clientId || !clientSecret) {
    if (process.env.DATABRICKS_APP_NAME)
      throw new Error("Databricks app OAuth credentials are unavailable.")
    return ""
  }

  if (databricksToken && Date.now() < databricksTokenExpiresAt - 60_000)
    return databricksToken
  if (!pendingTokenRequest) {
    pendingTokenRequest = (async () => {
      const tokenUrl = new URL("/oidc/v1/token", host)
      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
          "content-type": "application/x-www-form-urlencoded",
          accept: "application/json",
        },
        body: new URLSearchParams({ grant_type: "client_credentials", scope: "all-apis" }),
        signal: AbortSignal.timeout(15_000),
      })
      if (!response.ok) throw new Error(`Databricks OAuth token request failed (${response.status}).`)
      const token = await response.json()
      if (typeof token.access_token !== "string" || !Number.isFinite(token.expires_in))
        throw new Error("Databricks OAuth returned an invalid token response.")
      databricksToken = token.access_token
      databricksTokenExpiresAt = Date.now() + token.expires_in * 1000
      return databricksToken
    })().finally(() => { pendingTokenRequest = null })
  }
  return pendingTokenRequest
}
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".png": "image/png",
  ".json": "application/json",
}
function json(response, status, detail) {
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  })
  response.end(JSON.stringify({ detail }))
}
const server = http.createServer(async (request, response) => {
  let url
  try {
    url = new URL(request.url, "http://localhost")
  } catch {
    json(response, 400, "Invalid request.")
    return
  }
  const pathname = url.pathname
  if (pathname === "/map/dataset" || pathname.startsWith("/api/v1/map/")) {
    const target = new URL(upstream.href)
    target.pathname = upstream.pathname.replace(/\/$/, "") + pathname
    target.search = url.search
    const headers = { accept: "application/json" }
    if (request.headers["content-type"])
      headers["content-type"] = request.headers["content-type"]
    try {
      const bearer = await mapBearerToken()
      if (bearer) headers.authorization = "Bearer " + bearer
    } catch (error) {
      console.error("MAP OAuth authentication failed:", error.message)
      json(response, 502, "MAP authentication is unavailable. Check the frontend app's Databricks identity and MAP app permission.")
      return
    }
    const client = target.protocol === "https:" ? https : http
    const proxy = client.request(
      target,
      { method: request.method, headers, timeout: 180000 },
      (result) => {
        response.writeHead(result.statusCode || 502, {
          "Content-Type": result.headers["content-type"] || "application/json",
          "Cache-Control": "no-store",
        })
        result.pipe(response)
      },
    )
    proxy.on("timeout", () =>
      proxy.destroy(new Error("MAP request timed out.")),
    )
    proxy.on("error", () => {
      if (!response.headersSent)
        json(response, 502, "MAP is unavailable. Check the backend service.")
      else response.destroy()
    })
    request.pipe(proxy)
    return
  }
  if (pathname.startsWith("/api/")) {
    json(response, 404, "Unknown service.")
    return
  }
  if (!["GET", "HEAD"].includes(request.method)) {
    json(response, 405, "Method not allowed.")
    return
  }
  let decoded
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    json(response, 400, "Invalid path.")
    return
  }
  const candidate = path.resolve(root, "." + decoded)
  if (candidate !== root && !candidate.startsWith(root + path.sep)) {
    json(response, 404, "Not found.")
    return
  }
  let target = candidate
  try {
    if (!fs.statSync(target).isFile()) target = path.join(root, "index.html")
  } catch {
    if (path.extname(decoded)) {
      json(response, 404, "Not found.")
      return
    }
    target = path.join(root, "index.html")
  }
  response.writeHead(200, {
    "Content-Type": mime[path.extname(target)] || "application/octet-stream",
    "Cache-Control": target.endsWith("index.html")
      ? "no-store"
      : "public, max-age=3600",
    "X-Content-Type-Options": "nosniff",
  })
  if (request.method === "HEAD") response.end()
  else fs.createReadStream(target).pipe(response)
})
const port = Number(process.env.DATABRICKS_APP_PORT || process.env.PORT || 8100)
server.listen(port, process.env.FRONTEND_HOST || "127.0.0.1", () =>
  console.log("CAPA.AI frontend listening on port " + port),
)
