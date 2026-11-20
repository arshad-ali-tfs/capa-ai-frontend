import { test, expect, type Route } from "@playwright/test"
import fs from "node:fs"

const fixture = JSON.parse(fs.readFileSync(new URL("./fixtures/map-dataset.json", import.meta.url), "utf8"))
test.skip(process.env.MAP_REAL_DATA === "1", "Controlled delayed-save and presentation checks use fictional records")

test("pending annotation saves survive navigation and protect subsequent notes", async ({ page }) => {
  const value = structuredClone(fixture), record = value.records[0]
  let pending: Route | undefined, requests = 0
  await page.route("**/map/dataset", route => route.fulfill({ json: value }))
  await page.route("**/annotation", route => { pending = route; requests++ })
  await page.goto(`/map/clusters/${record.clusterId}/evidence/${record.id}`)
  const note = page.getByRole("textbox", { name: "Reviewer note", exact: true })
  const save = page.getByRole("button", { name: "Save annotation", exact: true })
  await note.fill("FICTIONAL first note; TEST-1; 20 mL")
  await save.click()
  await expect.poll(() => requests).toBe(1)
  await page.getByRole("link", { name: `Cluster ${record.clusterId}`, exact: true }).click()
  await page.getByRole("link", { name: `Open evidence review for ${record.id}`, exact: true }).click()
  await expect(note).toBeDisabled()
  await expect(note).toHaveValue("FICTIONAL first note; TEST-1; 20 mL")
  await expect(page.getByRole("button", { name: "Saving…", exact: true })).toBeDisabled()
  await expect(page.getByRole("button", { name: "Refresh data", exact: true })).toBeDisabled()
  record.annotation = { assessment: "", note: "FICTIONAL first note; TEST-1; 20 mL", revision: 1, savedAt: "2026-11-13T08:00:00Z" }
  await pending!.fulfill({ json: record.annotation })
  await expect(note).toBeEnabled()
  await expect(page.getByText(/Revision 1/)).toBeVisible()
  await note.fill("FICTIONAL second note with new evidence")
  await save.click()
  await expect.poll(() => requests).toBe(2)
  expect(pending!.request().postDataJSON()).toEqual({ assessment: "", note: "FICTIONAL second note with new evidence", expected_revision: 1 })
  record.annotation = { ...record.annotation, note: "FICTIONAL second note with new evidence", revision: 2 }
  await pending!.fulfill({ json: record.annotation })
  await expect(page.getByText(/Revision 2/)).toBeVisible()
  await expect(note).toHaveValue(record.annotation.note)
})

test("a save failure after leaving a record remains visible and keeps the draft", async ({ page }) => {
  const value = structuredClone(fixture), record = value.records[0]
  let pending: Route | undefined
  await page.route("**/map/dataset", route => route.fulfill({ json: value }))
  await page.route("**/annotation", route => { pending = route })
  await page.goto(`/map/clusters/${record.clusterId}/evidence/${record.id}`)
  await page.getByRole("textbox", { name: "Reviewer note", exact: true }).fill("FICTIONAL note retained on conflict")
  await page.getByRole("button", { name: "Save annotation", exact: true }).click()
  await expect.poll(() => Boolean(pending)).toBe(true)
  await page.getByRole("link", { name: `Cluster ${record.clusterId}`, exact: true }).click()
  await pending!.fulfill({ status: 409, json: { detail: "FICTIONAL annotation updated elsewhere" } })
  await page.getByRole("link", { name: `Open evidence review for ${record.id}`, exact: true }).click()
  await expect(page.getByRole("alert")).toContainText("updated elsewhere")
  await expect(page.getByRole("textbox", { name: "Reviewer note", exact: true })).toHaveValue("FICTIONAL note retained on conflict")
})

test("mockup panels, broad row targets and review cues remain usable at each breakpoint", async ({ page }) => {
  const value = structuredClone(fixture), record = value.records[0], cluster = value.clusters.find((c: any) => c.id === record.clusterId)
  cluster.context = 'Primary Center = Original prose. Lot AB-123; 20 mL on 12-May-2025. Primary Center=HPLC; Key Signals="AB-123"; Secondary="20 mL"; Confidence=High'
  await page.route("**/map/dataset", route => route.fulfill({ json: value }))
  await page.goto("/map")
  const coverage = page.getByRole("region", { name: "Analysis coverage" })
  await expect(page.locator("#analysis-details")).toBeHidden()
  await page.getByRole("button", { name: "Analysis details", exact: true }).click()
  await expect(coverage).toContainText("Configured analysis")
  await expect(page.locator("#analysis-details")).toBeVisible()
  await page.getByRole("button", { name: "Analysis details", exact: true }).click()
  const table = await page.getByRole("heading", { name: "Cluster summary · Top patterns", exact: true }).locator("..").boundingBox()
  const chart = await page.locator("details").filter({ hasText: "Deviation volume by cluster" }).boundingBox()
  if (page.viewportSize()!.width >= 1280) {
    expect(chart!.y + chart!.height).toBeLessThanOrEqual(table!.y)
    expect(Math.abs(table!.width - chart!.width)).toBeLessThan(2)
    expect((await coverage.boundingBox())!.height).toBeLessThan(45)
  }
  await page.getByRole("link", { name: `Open ${cluster.title} cluster detail`, exact: true }).click()
  const included = await page.getByRole("heading", { name: "Included deviations", exact: true }).locator("..").boundingBox()
  const capa = await page.locator("details").filter({ hasText: "Related CAPA context" }).boundingBox()
  if (page.viewportSize()!.width >= 1280) {
    expect(Math.abs(included!.y - capa!.y)).toBeLessThan(2)
    expect(capa!.x).toBeGreaterThan(included!.x)
  }
  await expect(page.getByText("Pattern grouping only", { exact: true })).toBeVisible()
  await expect(page.getByText("Primary Center = Original prose. Lot AB-123; 20 mL on 12-May-2025.", { exact: true })).toBeVisible()
  await expect(page.getByText("Historical confidence label", { exact: true })).toBeVisible()
  await expect(page.getByText('"AB-123"', { exact: true })).toBeVisible()
  await page.getByText("Deviation occurrences", { exact: true }).click()
  await expect(page.getByText("Jan 2026", { exact: true })).toBeVisible()
  for (const description of await page.getByText(record.shortDescription, { exact: true }).all()) {
    if (await description.isVisible()) {
      await description.click()
      break
    }
  }
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Evidence review")
  await expect(page.getByRole("heading", { name: "Matching details", exact: true })).toBeVisible()
  await expect(page.getByText("INTERPRETATION · reviewer aid", { exact: true })).toBeVisible()
  await expect(page.getByText("Pattern grouping only", { exact: true })).toBeVisible()
  const colours = await page.locator('fieldset label > span').evaluateAll(items => items.map(e => getComputedStyle(e).backgroundColor))
  expect(new Set(colours).size).toBe(4)
  await page.getByText("Mixed / unclear", { exact: true }).click()
  await expect(page.getByRole("radio", { name: "Mixed / unclear", exact: true })).toBeChecked()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width)
})
