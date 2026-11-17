import { test, expect, type Page } from "@playwright/test"
import fs from "node:fs"
const fixture = JSON.parse(fs.readFileSync(new URL("./fixtures/map-dataset.json", import.meta.url), "utf8"))
const empty = () => ({ who: "", what: "", when: "", where: "", why: "", how: "" })
const region = (page: Page) => page.getByRole("region", { name: "5W1H extraction", exact: true })
const pathFor = (r: any) => `/map/clusters/${r.clusterId}/evidence/${r.id}`
test.skip(process.env.MAP_REAL_DATA === "1", "Extraction boundaries use fictional saved outputs")

test("six saved categories display exact output separately from the original source", async ({ page }, info) => {
  const value = structuredClone(fixture), record = value.records[0]
  record.fiveWh = {
    who: "  Operator TEST-42.\r\nSecond line.  ",
    what: "Lot AB-123; 20 mL; <literal event>.\nDate: 12-May-2025 at 12:45.",
    when: "12-May-2025 at 12:45", where: "EQ-104; Room 12",
    why: "Saved uncertainty: cause undetermined.", how: "Résultat: 未確認; 0.25 mg.",
  }
  await page.route("**/map/dataset", route => route.fulfill({ json: value }))
  await page.goto(pathFor(record))
  await expect(region(page)).toBeVisible()
  await expect(region(page)).toContainText("Saved AI output for this analysis")
  await expect(region(page).locator("dt")).toHaveText(["Who", "What", "When", "Where", "Why", "How"])
  expect(await region(page).locator("dd").evaluateAll(items => items.map(e => e.textContent))).toEqual(Object.values(record.fiveWh))
  expect(await page.locator("blockquote").textContent()).toBe(record.sourceNarrative)
  const source = await page.getByRole("region", { name: "Original source narrative", exact: true }).boundingBox()
  const output = await region(page).boundingBox()
  expect(output!.y).toBeGreaterThan(source!.y + source!.height)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width)
  await page.screenshot({ path: `.local/fivewh/${info.project.name}-saved-output.png`, fullPage: true })
})

test("older runs and unavailable values stay readable without invented facts", async ({ page }) => {
  const value = structuredClone(fixture), record = value.records[0]
  await page.route("**/map/dataset", route => route.fulfill({ json: value }))
  await page.goto(pathFor(record))
  await expect(region(page)).toContainText("No saved 5W1H output is available")
  await expect(region(page).locator("dd")).toHaveText(Array(6).fill("Not available"))
  record.fiveWh = { who: "not_available", what: "Saved event TEST-42", when: "", where: "N/A", why: "not available", how: "NONE" }
  await page.reload()
  await expect(region(page).locator("dd")).toHaveText(["Not available", "Saved event TEST-42", "Not available", "Not available", "Not available", "Not available"])
  await expect(region(page)).not.toContainText("No saved 5W1H output")
  await expect(page.getByRole("textbox", { name: "Reviewer note", exact: true })).toBeEnabled()
})

test("malformed extraction metadata is rejected rather than rendered as a valid output", async ({ page }) => {
  const value = structuredClone(fixture), record = value.records[0]
  await page.route("**/map/dataset", route => route.fulfill({ json: value }))
  for (const invalid of [null, [], { ...empty(), what: 42 }, { who: "Incomplete" }]) {
    record.fiveWh = invalid
    await page.goto(pathFor(record))
    await expect(page.getByRole("alert")).toContainText("invalid dataset")
    await expect(region(page)).toHaveCount(0)
  }
})

test("outputs follow the chosen record and saved analysis across reloads", async ({ page }) => {
  const current = structuredClone(fixture), first = current.records[0], second = current.records[1]
  first.fiveWh = { ...empty(), what: "First record current analysis" }
  second.fiveWh = { ...empty(), what: "Second record current analysis" }
  const older = structuredClone(current), olderId = "a".repeat(32)
  older.analysis.runId = olderId
  older.records[0].fiveWh.what = "First record previous analysis"
  await page.route("**/map/dataset", route => route.fulfill({ json: current }))
  await page.route(`**/api/v1/map/runs/${olderId}/dataset`, route => route.fulfill({ json: older }))
  await page.route("**/api/v1/map/runs?*", route => route.fulfill({ json: { items: [
    { run_id: current.analysis.runId, status: "completed", source_mode: "historical", records: 3 },
    { run_id: olderId, status: "completed", source_mode: "historical", records: 3 },
  ] } }))
  await page.goto(pathFor(first))
  await expect(region(page)).toContainText(first.fiveWh.what)
  await page.goto(pathFor(second))
  await expect(region(page)).toContainText(second.fiveWh.what)
  await expect(region(page)).not.toContainText(first.fiveWh.what)
  await page.goto(pathFor(first) + `?run=${olderId}`)
  await expect(region(page)).toContainText(older.records[0].fiveWh.what)
  await page.reload()
  await expect(region(page)).toContainText(older.records[0].fiveWh.what)
  await expect(page.getByRole("combobox", { name: "Analysis run", exact: true })).toHaveValue(olderId)
})
