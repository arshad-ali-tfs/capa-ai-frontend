import { test, expect } from "@playwright/test"
import fs from "node:fs"
const fixture = JSON.parse(fs.readFileSync(new URL("./fixtures/map-dataset.json", import.meta.url), "utf8"))
test.skip(process.env.MAP_REAL_DATA === "1", "Warning boundaries use fictional responses")

test("records with no review issue have no warning badges or review alerts on any MAP page", async ({ page }) => {
  const value = structuredClone(fixture), record = value.records[0]
  value.records.forEach((r: any) => { r.warnings = [] })
  await page.route("**/map/dataset", route => route.fulfill({ json: value }))
  for (const path of ["/map", `/map/clusters/${record.clusterId}`, `/map/clusters/${record.clusterId}/evidence/${record.id}`]) {
    await page.goto(path)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await expect(page.getByText(/needs? review/i)).toHaveCount(0)
    await expect(page.getByRole("region", { name: "Record warnings" })).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width)
  }
})

test("a real missing-description warning still has a badge, correct count and specific evidence-page detail", async ({ page }) => {
  const value = structuredClone(fixture), record = value.records[0]
  const warning = `Cluster ${record.clusterId} has no historical name or description in the cluster catalogue. The cluster description needs to be completed; this does not indicate that record ${record.id} is incorrectly assigned.`
  record.warnings = [warning]
  await page.route("**/map/dataset", route => route.fulfill({ json: value }))
  await page.goto(`/map/clusters/${record.clusterId}`)
  await expect(page.getByRole("status").filter({ hasText: "1 record needs review" })).toBeVisible()
  await expect(page.getByText("Needs review", { exact: true }).filter({ visible: true })).toBeVisible()
  await page.getByRole("link", { name: `Open evidence review for ${record.id}`, exact: true }).click()
  const alert = page.getByRole("region", { name: "Record warnings" })
  await expect(alert).toContainText(warning)
  await expect(alert).not.toContainText("Close assignment")
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width)
})
