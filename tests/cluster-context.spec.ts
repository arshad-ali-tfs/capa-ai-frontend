import { test, expect, type Page } from "@playwright/test"
import fs from "node:fs"
const fixture = JSON.parse(fs.readFileSync(new URL("./fixtures/map-dataset.json", import.meta.url), "utf8"))
const panel = (page: Page) => page.getByRole("region", { name: "Cluster context", exact: true })
test.skip(process.env.MAP_REAL_DATA === "1", "Context provenance boundaries use fictional saved analyses")

function sample() {
  const value = structuredClone(fixture), cluster = value.clusters[0]
  cluster.historicalContext = { title: cluster.title, summary: 'Historical fixture context: TEST-HISTORY. Primary Center=HPLC; Key Signals="HISTORY"; Secondary="OLD"; Confidence=Med' }
  cluster.analysisContext = { title: "Current analysis title", summary: 'Saved batch context: lot TEST-42; 20 mL on 12-May-2025.\nSecond line. Primary Center=Labels; Key Signals="TEST-42"; Secondary="20 mL"; Confidence=High',
    runId: value.analysis.runId, recordCount: value.records.filter((r: any) => r.clusterId === cluster.id).length }
  cluster.contextSource = "current_analysis"; cluster.titleSource = "historical"
  cluster.context = cluster.analysisContext.summary
  return { value, cluster }
}
async function open(page: Page, value: any, cluster: any) {
  await page.route("**/map/dataset", route => route.fulfill({ json: value }))
  await page.goto(`/map/clusters/${cluster.id}`)
  await expect(panel(page)).toBeVisible()
}

test("saved analysis context is primary, historical reference stays separate, and filters keep the full summary", async ({ page }, info) => {
  const { value, cluster } = sample()
  await open(page, value, cluster)
  await expect(panel(page)).toContainText("AI summary for this analysis")
  await expect(panel(page)).toContainText("Based on all 2 records")
  await expect(panel(page).getByText("AI confidence label", { exact: true })).toBeVisible()
  await expect(panel(page).getByText(/Historical fixture context/)).toBeHidden()
  await panel(page).getByText("Historical reference", { exact: true }).click()
  await expect(panel(page).getByText(/Historical fixture context/)).toBeVisible()
  await expect(panel(page).getByText("Historical confidence label", { exact: true })).toBeVisible()
  await page.getByLabel("Sites", { exact: true }).selectOption(value.records[0].site)
  await expect(panel(page)).toContainText("Based on all 2 records")
  await expect(panel(page)).toContainText("TEST-42; 20 mL on 12-May-2025")
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width)
  await panel(page).screenshot({ path: `.local/cluster-context/${info.project.name}-separate-contexts.png` })
})

test("clusters lacking historical descriptions use saved analysis titles and context", async ({ page }) => {
  const { value, cluster } = sample()
  cluster.historicalContext = null
  cluster.titleSource = "current_analysis"
  cluster.title = cluster.shortTitle = cluster.subtitle = cluster.analysisContext.title
  await page.route("**/map/dataset", route => route.fulfill({ json: value }))
  await page.goto("/map")
  await page.getByRole("link", { name: `Open ${cluster.title} cluster detail`, exact: true }).click()
  await expect(panel(page)).toContainText("AI summary for this analysis")
  await expect(panel(page)).toContainText("No historical reference summary is available")
  await expect(panel(page)).toContainText("TEST-42; 20 mL")
  await expect(page.getByRole("heading", { level: 1 })).toContainText(cluster.id)
  await expect(page.getByText("Historical label unavailable", { exact: true })).toHaveCount(0)
})

test("historical-only and unavailable results have truthful fallback states", async ({ page }) => {
  const { value, cluster } = sample()
  cluster.analysisContext = null; cluster.contextSource = "historical"
  cluster.context = cluster.historicalContext.summary
  await open(page, value, cluster)
  await expect(panel(page)).toContainText("No AI summary was saved for this analysis")
  await expect(panel(page).getByText("Historical analytical summary", { exact: true })).toBeVisible()
  cluster.historicalContext = null
  cluster.contextSource = cluster.titleSource = "unavailable"
  cluster.title = cluster.subtitle = cluster.shortTitle = `Cluster ${cluster.id}`
  cluster.context = "No saved summary is available for this cluster."
  await page.reload()
  await expect(panel(page)).toContainText("Summary unavailable")
  await expect(panel(page)).not.toContainText("AI summary for this analysis")
})

test("current context follows the selected saved run across navigation and reload", async ({ page }) => {
  const { value, cluster } = sample(), older = structuredClone(value), olderId = "a".repeat(32)
  older.analysis.runId = olderId
  older.clusters[0].analysisContext.runId = olderId
  older.clusters[0].analysisContext.summary = older.clusters[0].context = "Saved summary from the previous analysis."
  await page.route("**/map/dataset", route => route.fulfill({ json: value }))
  await page.route(`**/api/v1/map/runs/${olderId}/dataset`, route => route.fulfill({ json: older }))
  await page.route("**/api/v1/map/runs?*", route => route.fulfill({ json: { items: [
    { run_id: value.analysis.runId, status: "completed", source_mode: "historical", records: 3 },
    { run_id: olderId, status: "completed", source_mode: "historical", records: 3 },
  ] } }))
  await page.goto(`/map/clusters/${cluster.id}`)
  await expect(panel(page)).toContainText("TEST-42; 20 mL")
  await page.goto(`/map/clusters/${cluster.id}?run=${olderId}`)
  await expect(panel(page)).toContainText("Saved summary from the previous analysis")
  await page.reload()
  await expect(panel(page)).toContainText("Saved summary from the previous analysis")
  await expect(panel(page)).not.toContainText("TEST-42; 20 mL")
})

test("invalid provenance and mismatched run/count metadata never display as a valid summary", async ({ page }) => {
  let value: any
  await page.route("**/map/dataset", route => route.fulfill({ json: value }))
  for (const invalid of ["source", "run", "count", "missing", "partial"]) {
    const sampleValue = sample(); value = sampleValue.value; const cluster = sampleValue.cluster
    if (invalid === "source") cluster.contextSource = "unknown"
    if (invalid === "run") cluster.analysisContext.runId = "a".repeat(32)
    if (invalid === "count") cluster.analysisContext.recordCount = 999
    if (invalid === "missing") cluster.analysisContext = null
    if (invalid === "partial") delete cluster.titleSource
    await page.goto(`/map/clusters/${cluster.id}`)
    await expect(page.getByRole("alert")).toContainText("invalid dataset")
    await expect(panel(page)).toHaveCount(0)
  }
})
