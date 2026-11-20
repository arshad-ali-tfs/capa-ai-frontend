import { test, expect } from "@playwright/test"
import { SERVICES } from "../../config/serviceRegistry.mjs"
import {
  findService,
  resolveServices,
  upstreamHeaders,
  upstreamUrl,
} from "../../config/serverProxy.mjs"

test.describe("service registry", () => {
  const entries = Object.entries(SERVICES)

  test("registers map, match and author", () => {
    expect(Object.keys(SERVICES)).toEqual(["map", "match", "author"])
  })

  test("every service has distinct ports, env names and routes", () => {
    const ports = entries.map(([, s]) => new URL(s.defaultTarget).port)
    const envNames = entries.flatMap(([, s]) => [
      s.targetEnv,
      s.tokenEnv,
      s.browserUrlEnv,
    ])
    const routes = entries.flatMap(([, s]) => [...s.routes])
    expect(new Set(ports).size).toBe(entries.length)
    expect(new Set(envNames).size).toBe(envNames.length)
    expect(new Set(routes).size).toBe(routes.length)
  })

  test("browser variables use the VITE_ prefix and server ones do not", () => {
    for (const [, s] of entries) {
      expect(s.browserUrlEnv.startsWith("VITE_")).toBe(true)
      expect(s.targetEnv.startsWith("VITE_")).toBe(false)
      expect(s.tokenEnv.startsWith("VITE_")).toBe(false)
    }
  })

  test("no route is claimed by two services", () => {
    const services = resolveServices({})
    for (const service of services)
      for (const route of service.routes) {
        const probe = route.endsWith("/") ? route + "x" : route
        expect(findService(probe, services)?.name).toBe(service.name)
      }
  })
})

test.describe("resolveServices", () => {
  test("uses the registry defaults when nothing is configured", () => {
    const services = resolveServices({})
    expect(services.map((s) => [s.name, s.target!.origin])).toEqual([
      ["map", "http://127.0.0.1:8101"],
      ["match", "http://127.0.0.1:8102"],
      ["author", "http://127.0.0.1:8103"],
    ])
    expect(services.every((s) => s.token === "")).toBe(true)
  })

  test("reads targets and tokens from the environment", () => {
    const services = resolveServices({
      MATCH_API_TARGET: "https://match.internal.example/",
      MATCH_API_BEARER_TOKEN: " secret ",
    })
    const match = services.find((s) => s.name === "match")!
    expect(match.target!.origin).toBe("https://match.internal.example")
    expect(match.token).toBe("secret")
    expect(services.find((s) => s.name === "map")!.token).toBe("")
  })

  test("fails fast with the variable name when a target is invalid", () => {
    expect(() => resolveServices({ AUTHOR_API_TARGET: "not a url" })).toThrow(
      /AUTHOR_API_TARGET must be an HTTP\(S\) URL without credentials/,
    )
    expect(() => resolveServices({ MAP_API_TARGET: "ftp://host" })).toThrow(
      /MAP_API_TARGET/,
    )
    expect(() =>
      resolveServices({ MATCH_API_TARGET: "http://u:p@host" }),
    ).toThrow(/MATCH_API_TARGET/)
  })
})

test.describe("routing", () => {
  const services = resolveServices({})

  test("routes each service's paths to that service", () => {
    expect(findService("/map/dataset", services)?.name).toBe("map")
    expect(findService("/api/v1/map/runs/1", services)?.name).toBe("map")
    expect(findService("/api/v1/match/search", services)?.name).toBe("match")
    expect(findService("/api/v1/author/cases", services)?.name).toBe("author")
  })

  test("leaves page routes and unknown paths alone", () => {
    expect(findService("/map", services)).toBeNull()
    expect(findService("/map/clusters/1", services)).toBeNull()
    expect(findService("/map/datasetx", services)).toBeNull()
    expect(findService("/api/v1/mapx", services)).toBeNull()
    expect(findService("/api/v1/other/x", services)).toBeNull()
    expect(findService("/match", services)).toBeNull()
  })

  test("keeps a path prefix from the target URL", () => {
    const [service] = resolveServices({
      MAP_API_TARGET: "https://host.example/apps/map/",
    })
    expect(upstreamUrl(service, "/api/v1/map/runs", "?limit=5").href).toBe(
      "https://host.example/apps/map/api/v1/map/runs?limit=5",
    )
  })

  test("sends a bearer token only when one is configured", () => {
    const [map, match] = resolveServices({ MATCH_API_BEARER_TOKEN: "t" })
    expect(
      upstreamHeaders(map, { "content-type": "application/json" }),
    ).toEqual({
      accept: "application/json",
      "content-type": "application/json",
    })
    expect(upstreamHeaders(match, {}).authorization).toBe("Bearer t")
  })

  test("accepts app-resource names only in Databricks Apps", () => {
    const [map] = resolveServices({ DATABRICKS_APP_NAME: "frontend", MAP_API_TARGET: "map-backend" })
    expect(map.appName).toBe("map-backend")
    expect(map.target).toBeNull()
    expect(() => resolveServices({ MAP_API_TARGET: "map-backend" })).toThrow(/outside Databricks Apps/)
  })

  test("normalizes a deployed hostname without a scheme", () => {
    const [map] = resolveServices({ MAP_API_TARGET: "map.example.com/apps/map" })
    expect(map.target!.href).toBe("https://map.example.com/apps/map")
  })
})
