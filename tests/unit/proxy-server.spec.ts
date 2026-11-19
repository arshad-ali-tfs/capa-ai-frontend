import { test, expect } from "@playwright/test"
import { spawn, type ChildProcess } from "node:child_process"
import fs from "node:fs"
import http from "node:http"
import net from "node:net"

const built = fs.existsSync(new URL("../../dist/index.html", import.meta.url))

type Seen = {
  method?: string
  url?: string
  authorization?: string
  body: string
}

async function freePort(): Promise<number> {
  return new Promise((resolve) => {
    const probe = net.createServer().listen(0, "127.0.0.1", () => {
      const { port } = probe.address() as net.AddressInfo
      probe.close(() => resolve(port))
    })
  })
}

async function fakeBackend(name: string, seen: Seen[]) {
  const port = await freePort()
  const server = http.createServer((request, response) => {
    let body = ""
    request.on("data", (chunk) => (body += chunk))
    request.on("end", () => {
      seen.push({
        method: request.method,
        url: request.url,
        authorization: request.headers.authorization,
        body,
      })
      response.writeHead(200, { "Content-Type": "application/json" })
      response.end(JSON.stringify({ from: name }))
    })
  })
  await new Promise<void>((resolve) =>
    server.listen(port, "127.0.0.1", resolve),
  )
  return { port, server }
}

async function waitFor(url: string) {
  for (let i = 0; i < 60; i++) {
    try {
      await fetch(url)
      return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }
  throw new Error("frontend server did not start")
}

test.describe("production server proxy", () => {
  test.skip(!built, "Run npm run build first.")

  let frontend: ChildProcess
  let base = ""
  let matchServer: http.Server
  const mapSeen: Seen[] = []
  const matchSeen: Seen[] = []
  const authorSeen: Seen[] = []
  const servers: http.Server[] = []

  test.beforeAll(async () => {
    const map = await fakeBackend("map", mapSeen)
    const match = await fakeBackend("match", matchSeen)
    const author = await fakeBackend("author", authorSeen)
    matchServer = match.server
    servers.push(map.server, match.server, author.server)
    const port = await freePort()
    base = `http://127.0.0.1:${port}`
    frontend = spawn(process.execPath, ["server.mjs"], {
      cwd: new URL("../../", import.meta.url),
      env: {
        ...process.env,
        PORT: String(port),
        DATABRICKS_APP_PORT: "",
        MAP_API_TARGET: `http://127.0.0.1:${map.port}`,
        MATCH_API_TARGET: `http://127.0.0.1:${match.port}`,
        AUTHOR_API_TARGET: `http://127.0.0.1:${author.port}`,
        MATCH_API_BEARER_TOKEN: "match-secret",
        MAP_API_BEARER_TOKEN: "",
        AUTHOR_API_BEARER_TOKEN: "",
      },
      stdio: "ignore",
    })
    await waitFor(base)
  })

  test.afterAll(async () => {
    frontend?.kill()
    await Promise.all(
      servers.map((server) => new Promise((resolve) => server.close(resolve))),
    )
  })

  test("forwards each service's paths to its own backend", async () => {
    expect(await (await fetch(`${base}/map/dataset`)).json()).toEqual({
      from: "map",
    })
    expect(
      await (await fetch(`${base}/api/v1/map/runs?limit=2`)).json(),
    ).toEqual({ from: "map" })
    expect(await (await fetch(`${base}/api/v1/author/cases`)).json()).toEqual({
      from: "author",
    })
    expect(mapSeen.map((s) => s.url)).toEqual([
      "/map/dataset",
      "/api/v1/map/runs?limit=2",
    ])
    expect(authorSeen.map((s) => s.url)).toEqual(["/api/v1/author/cases"])
  })

  test("forwards method and body, and adds only that service's token", async () => {
    const response = await fetch(`${base}/api/v1/match/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer from-browser",
      },
      body: JSON.stringify({ query: "label mismatch" }),
    })
    expect(await response.json()).toEqual({ from: "match" })
    const call = matchSeen.at(-1)!
    expect(call.method).toBe("POST")
    expect(call.body).toBe('{"query":"label mismatch"}')
    expect(call.authorization).toBe("Bearer match-secret")
    expect(mapSeen.every((s) => s.authorization === undefined)).toBe(true)
    expect(authorSeen.every((s) => s.authorization === undefined)).toBe(true)
  })

  test("answers 404 for unknown API paths and serves the app for page routes", async () => {
    const unknown = await fetch(`${base}/api/v1/other/x`)
    expect(unknown.status).toBe(404)
    expect(await unknown.json()).toEqual({ detail: "Unknown service." })
    const page = await fetch(`${base}/map/clusters/abc`)
    expect(page.status).toBe(200)
    expect(page.headers.get("content-type")).toContain("text/html")
  })

  test("reports one unavailable service without affecting the others", async () => {
    await new Promise((resolve) => matchServer.close(resolve))
    const down = await fetch(`${base}/api/v1/match/search`, {
      method: "POST",
      body: "{}",
    })
    expect(down.status).toBe(502)
    expect(await down.json()).toEqual({
      detail: "MATCH is unavailable. Check the backend service.",
    })
    expect((await fetch(`${base}/map/dataset`)).status).toBe(200)
  })
})
