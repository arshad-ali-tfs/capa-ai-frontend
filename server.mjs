// Production static server and server-side proxy for the backend services.
import http from "node:http"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { resolveServices } from "./config/serverProxy.mjs"
import { createApiMiddleware } from "./config/apiProxy.mjs"
const project = path.dirname(fileURLToPath(import.meta.url))
if (fs.existsSync(path.join(project, ".env")))
  process.loadEnvFile(path.join(project, ".env"))
const root = path.resolve(project, "dist")
const services = resolveServices(process.env)
const apiProxy = createApiMiddleware(process.env)
if (!fs.existsSync(path.join(root, "index.html")))
  throw new Error("Run npm run build first.")
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
function serveStatic(request, response) {
  let url
  try {
    url = new URL(request.url, "http://localhost")
  } catch {
    json(response, 400, "Invalid request.")
    return
  }
  const pathname = url.pathname
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
}
const server = http.createServer((request, response) =>
  apiProxy(request, response, () => serveStatic(request, response)),
)
const port = Number(process.env.DATABRICKS_APP_PORT || process.env.PORT || 8100)
server.listen(port, process.env.FRONTEND_HOST || "127.0.0.1", () => {
  console.log("CAPA.AI frontend listening on port " + port)
  for (const service of services)
    console.log("  " + service.label + " -> " + (service.target?.origin || `Databricks app ${service.appName}`))
})
