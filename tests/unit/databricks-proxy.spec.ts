import { test, expect } from "@playwright/test"
import { spawn, type ChildProcess } from "node:child_process"
import fs from "node:fs"
import http from "node:http"
import os from "node:os"
import path from "node:path"
import { createServiceResolver } from "../../config/databricksAuth.mjs"
import { resolveServices } from "../../config/serverProxy.mjs"

const appsEnv = {
  DATABRICKS_APP_NAME: "frontend",
  DATABRICKS_HOST: "https://workspace.example",
  DATABRICKS_CLIENT_ID: "fake-client",
  DATABRICKS_CLIENT_SECRET: "fake-secret",
  MAP_API_TARGET: "map-backend",
  MATCH_API_TARGET: "https://match.example",
  AUTHOR_API_TARGET: "https://author.example",
}
const reply = (body: unknown, status = 200) => Response.json(body, { status })

test.describe("Databricks app identity", () => {
  test("coalesces OAuth and app lookups across concurrent requests", async () => {
    const calls: string[] = []
    const resolve = createServiceResolver(appsEnv, {
      fetchImpl: async (input, init) => {
        const url = String(input)
        calls.push(url)
        await new Promise((done) => setTimeout(done, 5))
        if (url.endsWith("/oidc/v1/token")) {
          expect(init?.method).toBe("POST")
          expect(new Headers(init?.headers).get("authorization")).toBe(
            "Basic " + Buffer.from("fake-client:fake-secret").toString("base64"),
          )
          expect(String(init?.body)).toBe("grant_type=client_credentials&scope=all-apis")
          return reply({ access_token: "managed-token", expires_in: 3600 })
        }
        expect(new Headers(init?.headers).get("authorization")).toBe("Bearer managed-token")
        return reply({ url: "https://map.example/prefix/" })
      },
    })
    const [map, match] = resolveServices(appsEnv)
    const results = await Promise.all([
      ...Array.from({ length: 10 }, () => resolve(map)), resolve(match),
    ])
    expect(calls.filter((url) => url.endsWith("/oidc/v1/token"))).toHaveLength(1)
    expect(calls.filter((url) => url.endsWith("/apps/map-backend"))).toHaveLength(1)
    expect(results[0].target.href).toBe("https://map.example/prefix/")
    expect(results.at(-1)!.target.href).toBe("https://match.example/")
    expect(results.every((service) => service.token === "managed-token")).toBe(true)
  })

  test("renews OAuth before expiry while retaining the resolved app URL", async () => {
    let time = 0
    let tokens = 0
    let lookups = 0
    const resolve = createServiceResolver(appsEnv, {
      now: () => time,
      fetchImpl: async (input) => {
        if (String(input).endsWith("/oidc/v1/token"))
          return reply({ access_token: `token-${++tokens}`, expires_in: 3600 })
        lookups++
        return reply({ url: "https://map.example" })
      },
    })
    const [map] = resolveServices(appsEnv)
    expect((await resolve(map)).token).toBe("token-1")
    time = 3_539_000
    expect((await resolve(map)).token).toBe("token-1")
    time = 3_541_000
    expect((await resolve(map)).token).toBe("token-2")
    expect(tokens).toBe(2)
    expect(lookups).toBe(1)
  })

  test("keeps explicit tokens isolated from managed OAuth and other services", async () => {
    const env = { ...appsEnv, MAP_API_BEARER_TOKEN: "map-override" }
    const authorization: string[] = []
    const resolve = createServiceResolver(env, {
      fetchImpl: async (input, init) => {
        authorization.push(new Headers(init?.headers).get("authorization")!)
        return String(input).endsWith("/oidc/v1/token")
          ? reply({ access_token: "managed-token", expires_in: 3600 })
          : reply({ url: "https://map.example" })
      },
    })
    const [map, match, author] = resolveServices(env)
    expect((await resolve(map)).token).toBe("map-override")
    expect(authorization).toEqual(["Bearer map-override"])
    expect((await resolve(match)).token).toBe("managed-token")
    expect((await resolve(author)).token).toBe("managed-token")
    expect(authorization).toHaveLength(2)
  })

  test("retries failed token acquisition and failed app resolution", async () => {
    let tokens = 0
    let lookups = 0
    const resolve = createServiceResolver(appsEnv, {
      fetchImpl: async (input) => {
        if (String(input).endsWith("/oidc/v1/token")) {
          tokens++
          return tokens === 1 ? reply({}, 503) : reply({ access_token: "token", expires_in: 3600 })
        }
        lookups++
        return lookups === 1 ? reply({}, 403) : reply({ url: "https://map.example" })
      },
    })
    const [map] = resolveServices(appsEnv)
    await expect(resolve(map)).rejects.toThrow(/OAuth token request failed \(503\)/)
    await expect(resolve(map)).rejects.toThrow(/resource lookup failed \(403\)/)
    expect((await resolve(map)).target.origin).toBe("https://map.example")
    expect(tokens).toBe(2)
    expect(lookups).toBe(2)
  })

  for (const body of [
    { access_token: "", expires_in: 3600 },
    { access_token: "token", expires_in: 0 },
    { access_token: "token", expires_in: "3600" },
  ]) {
    test(`rejects malformed OAuth response ${JSON.stringify(body)}`, async () => {
      const resolve = createServiceResolver(appsEnv, { fetchImpl: async () => reply(body) })
      await expect(resolve(resolveServices(appsEnv)[1])).rejects.toThrow(/invalid token response/)
    })
  }

  test("rejects credential-bearing app URLs without exposing their value", async () => {
    const env = { ...appsEnv, MAP_API_BEARER_TOKEN: "override" }
    const resolve = createServiceResolver(env, {
      fetchImpl: async () => reply({ url: "https://user:do-not-log@map.example" }),
    })
    await expect(resolve(resolveServices(env)[0])).rejects.toThrow(
      "MAP app URL must be an HTTP(S) URL without credentials.",
    )
  })

  test("does not silently fall back to anonymous requests or localhost in Apps", async () => {
    const env = { ...appsEnv, DATABRICKS_CLIENT_SECRET: "", AUTHOR_API_TARGET: "" }
    const resolve = createServiceResolver(env, {
      fetchImpl: async () => { throw new Error("must not call a workspace") },
    })
    const [, match, author] = resolveServices(env)
    await expect(resolve(match)).rejects.toThrow(/OAuth credentials are unavailable/)
    await expect(resolve(author)).rejects.toThrow(/AUTHOR_API_TARGET must be configured/)
  })

  test("keeps local service access anonymous without Databricks credentials", async () => {
    const resolve = createServiceResolver({}, {
      fetchImpl: async () => { throw new Error("must not call a workspace") },
    })
    expect((await resolve(resolveServices({})[0])).token).toBe("")
  })
})

// Real HTTP boundaries and a separate Node process verify the deployment entry
// point. Everything, including OAuth and source payloads, is fictional/loopback.
test.describe("production Databricks proxy", () => {
  let frontend: ChildProcess
  let base = ""
  let project = ""
  let output = ""
  let oauthCalls = 0
  const lookups: string[] = []
  const seen: { url: string; auth?: string; body: string }[] = []
  const servers: http.Server[] = []

  async function listen(server: http.Server) {
    servers.push(server)
    await new Promise<void>((done) => server.listen(0, "127.0.0.1", done))
    return `http://127.0.0.1:${(server.address() as import("node:net").AddressInfo).port}`
  }

  test.beforeAll(async () => {
    const backend = await listen(http.createServer((request, response) => {
      let body = ""
      request.on("data", (chunk) => { body += chunk })
      request.on("end", () => {
        seen.push({ url: request.url!, auth: request.headers.authorization, body })
        response.writeHead(200, { "Content-Type": "application/json", "X-Request-ID": "fake-trace-123" })
        response.end(JSON.stringify({ ok: true }))
      })
    }))
    const workspace = await listen(http.createServer((request, response) => {
      response.setHeader("Content-Type", "application/json")
      if (request.url === "/oidc/v1/token") {
        oauthCalls++
        response.end(JSON.stringify({ access_token: "managed-token", expires_in: 3600 }))
      } else {
        lookups.push(request.url!)
        if (request.url === "/api/2.0/apps/broken-app") {
          response.writeHead(403)
          response.end(JSON.stringify({ message: "untrusted-sensitive-body" }))
        } else response.end(JSON.stringify({ url: backend + "/prefix" }))
      }
    }))
    const probe = http.createServer()
    const address = await listen(probe)
    await new Promise<void>((done) => probe.close(() => done()))
    base = address
    project = fs.mkdtempSync(path.join(os.tmpdir(), "capa-frontend-proxy-"))
    fs.copyFileSync(new URL("../../server.mjs", import.meta.url), path.join(project, "server.mjs"))
    fs.cpSync(new URL("../../config", import.meta.url), path.join(project, "config"), { recursive: true })
    fs.mkdirSync(path.join(project, "dist"))
    fs.writeFileSync(path.join(project, "dist/index.html"), "<html>test frontend</html>")
    frontend = spawn(process.execPath, ["server.mjs"], {
      cwd: project,
      env: {
        ...process.env, ...appsEnv,
        DATABRICKS_APP_PORT: new URL(base).port,
        FRONTEND_HOST: "127.0.0.1",
        DATABRICKS_HOST: workspace,
        MAP_API_TARGET: "map-backend",
        MATCH_API_TARGET: backend,
        AUTHOR_API_TARGET: "broken-app",
        MAP_API_BEARER_TOKEN: "",
        MATCH_API_BEARER_TOKEN: "match-override",
        AUTHOR_API_BEARER_TOKEN: "",
      },
      stdio: ["ignore", "pipe", "pipe"],
    })
    frontend.stdout?.on("data", (chunk) => { output += chunk })
    frontend.stderr?.on("data", (chunk) => { output += chunk })
    for (let attempt = 0; attempt < 60; attempt++) {
      try { await fetch(base); return } catch { /* wait for the listener */ }
      await new Promise((done) => setTimeout(done, 100))
    }
    throw new Error("Isolated frontend did not start: " + output)
  })

  test.afterAll(async () => {
    if (frontend && frontend.exitCode === null) {
      const stopped = new Promise((done) => frontend.once("exit", done))
      frontend.kill()
      await stopped
    }
    await Promise.all(servers.map((server) => new Promise((done) => server.close(done))))
    // Leave the tiny temporary fixture for diagnostics; no destructive cleanup.
  })

  test("resolves the resource, authenticates, and returns the request ID", async () => {
    const response = await fetch(base + "/api/v1/map/runs?limit=2", {
      headers: { Authorization: "Bearer browser-token" },
    })
    expect(response.status).toBe(200)
    expect(response.headers.get("x-request-id")).toBe("fake-trace-123")
    expect(response.headers.get("cache-control")).toBe("no-store")
    expect(seen.at(-1)).toEqual({ url: "/prefix/api/v1/map/runs?limit=2", auth: "Bearer managed-token", body: "" })
    expect(oauthCalls).toBe(1)
    expect(lookups).toEqual(["/api/2.0/apps/map-backend"])
  })

  test("preserves POST bodies and each service's override", async () => {
    const response = await fetch(base + "/api/v1/match/search", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: '{"query":"label mismatch"}',
    })
    expect(response.status).toBe(200)
    expect(seen.at(-1)).toEqual({ url: "/api/v1/match/search", auth: "Bearer match-override", body: '{"query":"label mismatch"}' })
    expect(oauthCalls).toBe(1)
  })

  test("contains app-resource failure and keeps the other workspaces working", async () => {
    const response = await fetch(base + "/api/v1/author/cases")
    expect(response.status).toBe(502)
    expect((await response.json()).detail).toContain("AUTHOR authentication or app target is unavailable")
    expect((await fetch(base + "/map/dataset")).status).toBe(200)
    expect((await fetch(base + "/api/v1/unknown/path")).status).toBe(404)
    expect((await fetch(base + "/map")).status).toBe(200)
    for (const secret of ["fake-secret", "managed-token", "browser-token", "match-override", "untrusted-sensitive-body"])
      expect(output).not.toContain(secret)
  })
})
