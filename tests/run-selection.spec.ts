import { test, expect } from "@playwright/test"
import fs from "node:fs"

const fixture = JSON.parse(fs.readFileSync(new URL("./fixtures/map-dataset.json", import.meta.url), "utf8"))
const olderId = "a".repeat(32)
test.skip(process.env.MAP_REAL_DATA === "1", "Run switching uses isolated fictional analyses")

test.beforeEach(async ({ page }) => {
  const older = structuredClone(fixture)
  older.analysis.runId = olderId
  older.records = older.records.slice(0, 1)
  older.analysis.recordCount = 1
  older.clusters = older.clusters.filter((c: any) => c.id === older.records[0].clusterId)
  await page.route("**/map/dataset", route => route.fulfill({ json: fixture }))
  await page.route("**/api/v1/map/runs?*", route => route.fulfill({ json: { items: [
    { run_id: fixture.analysis.runId, status: "completed", source_mode: "historical", records: 3, created_at: "2026-11-17T10:00:00Z" },
    { run_id: olderId, status: "completed", source_mode: "historical", records: 1, created_at: "2026-11-16T10:00:00Z" },
    { run_id: "c".repeat(32), status: "running", source_mode: "historical", created_at: "2026-11-17T11:00:00Z" },
  ] } }))
  await page.route(`**/api/v1/map/runs/${olderId}/dataset`, route => route.fulfill({ json: older }))
})

test("selecting a previous run persists through navigation, filters, reload and browser history", async ({ page }) => {
  await page.goto("/map")
  const selection = page.getByRole("combobox", { name: "Analysis run", exact: true })
  await expect(selection.locator("option")).toHaveCount(3)
  await selection.selectOption(olderId)
  await expect(page).toHaveURL(new RegExp(`/map\\?run=${olderId}$`))
  await expect(page.getByRole("region", { name: "Analysis coverage" })).toContainText("1 analysed record")
  await expect(selection).toHaveValue(olderId)
  await page.getByRole("button", { name: "Clear all", exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`run=${olderId}`))
  const record = fixture.records[0]
  const cluster = fixture.clusters.find((c: any) => c.id === record.clusterId)
  await page.getByRole("link", { name: `Open ${cluster.title} cluster detail`, exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/map/clusters/${record.clusterId}\\?run=${olderId}`))
  await page.getByRole("link", { name: `Open evidence review for ${record.id}`, exact: true }).click()
  await page.reload()
  await expect(selection).toHaveValue(olderId)
  await expect(page.getByRole("heading", { level: 1 })).toContainText(record.id)
  await selection.selectOption("")
  await expect(page).toHaveURL(/\/map\??$/)
  await expect(page.getByRole("region", { name: "Analysis coverage" })).toContainText("3 analysed records")
  await page.goBack()
  await expect(selection).toHaveValue(olderId)
  await expect(page.getByRole("region", { name: "Analysis coverage" })).toContainText("1 analysed record")
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width)
})

test("a failed run switch keeps the current analysis and selection", async ({ page }) => {
  await page.route(`**/api/v1/map/runs/${olderId}/dataset`, route => route.fulfill({ status: 404, json: { detail: "Saved run unavailable" } }))
  await page.goto("/map")
  const selection = page.getByRole("combobox", { name: "Analysis run", exact: true })
  await selection.selectOption(olderId)
  await expect(page.getByRole("alert")).toContainText("Saved run unavailable")
  await expect(selection).toHaveValue("")
  await expect(page.getByRole("region", { name: "Analysis coverage" })).toContainText("3 analysed records")
  await expect(page).toHaveURL(/\/map$/)
})

test("unsaved reviewer notes prevent run switching", async ({ page }) => {
  const record = fixture.records[0]
  await page.goto(`/map/clusters/${record.clusterId}/evidence/${record.id}`)
  const selection = page.getByRole("combobox", { name: "Analysis run", exact: true })
  const note = page.getByRole("textbox", { name: "Reviewer note", exact: true })
  await expect(selection).toBeEnabled()
  await note.fill("FICTIONAL unsaved reviewer note")
  await expect(selection).toBeDisabled()
  await expect(note).toHaveValue("FICTIONAL unsaved reviewer note")
})

test("a response for the wrong run never replaces the selected analysis", async ({ page }) => {
  await page.route(`**/api/v1/map/runs/${olderId}/dataset`, route => route.fulfill({ json: fixture }))
  await page.goto("/map")
  await page.getByRole("combobox", { name: "Analysis run", exact: true }).selectOption(olderId)
  await expect(page.getByRole("alert")).toContainText("different analysis")
  await expect(page.getByRole("combobox", { name: "Analysis run", exact: true })).toHaveValue("")
  await expect(page).toHaveURL(/\/map$/)
})
