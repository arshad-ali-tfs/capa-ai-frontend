import { test, expect } from "@playwright/test"
import { joinUrl, normalizeBaseUrl } from "../../src/shared/config/serviceUrls"

test.describe("normalizeBaseUrl", () => {
  test("treats empty or missing values as same-origin", () => {
    expect(normalizeBaseUrl(undefined, "VITE_X")).toBe("")
    expect(normalizeBaseUrl("", "VITE_X")).toBe("")
    expect(normalizeBaseUrl("   ", "VITE_X")).toBe("")
  })

  test("trims and removes trailing slashes", () => {
    expect(normalizeBaseUrl(" http://127.0.0.1:8101/ ", "VITE_X")).toBe(
      "http://127.0.0.1:8101",
    )
    expect(normalizeBaseUrl("https://api.example.com/v1//", "VITE_X")).toBe(
      "https://api.example.com/v1",
    )
  })

  test("rejects values that are not absolute http(s) URLs", () => {
    expect(() =>
      normalizeBaseUrl("localhost:8101", "VITE_MAP_API_URL"),
    ).toThrow(/VITE_MAP_API_URL/)
    expect(() => normalizeBaseUrl("/relative", "VITE_X")).toThrow()
    expect(() => normalizeBaseUrl("ftp://host", "VITE_X")).toThrow()
  })

  test("rejects embedded credentials", () => {
    expect(() => normalizeBaseUrl("http://user:pass@host", "VITE_X")).toThrow(
      /without credentials/,
    )
  })
})

test.describe("joinUrl", () => {
  test("uses exactly one slash", () => {
    expect(joinUrl("", "/api/v1/map/runs")).toBe("/api/v1/map/runs")
    expect(joinUrl("", "api/v1/map/runs")).toBe("/api/v1/map/runs")
    expect(joinUrl("http://h:1", "/x")).toBe("http://h:1/x")
    expect(joinUrl("http://h:1", "x")).toBe("http://h:1/x")
  })
})
