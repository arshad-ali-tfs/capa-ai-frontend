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
    await expect(page.getByRole("region", { name: "Cluster warnings" })).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width)
  }
})

test("missing catalogue information appears once on cluster detail and never flags its records", async ({ page }, info) => {
  const value = structuredClone(fixture), record = value.records[0]
  const cluster = value.clusters.find((c: any) => c.id === record.clusterId)
  const warning = `Cluster ${cluster.id} has no historical name or description in the cluster catalogue. The cluster description needs to be completed; this does not indicate that its records are incorrectly assigned.`
  value.records.forEach((r: any) => { r.warnings = [] })
  cluster.warnings = [warning]
  await page.route("**/map/dataset", route => route.fulfill({ json: value }))
  await page.goto("/map")
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  await expect(page.getByText(/needs? review/i)).toHaveCount(0)
  await expect(page.getByText(warning, { exact: true })).toHaveCount(0)
  await page.goto(`/map/clusters/${record.clusterId}`)
  const clusterAlert = page.getByRole("region", { name: "Cluster warnings" })
  await expect(clusterAlert).toHaveCount(1)
  await expect(clusterAlert).toContainText(warning)
  await expect(page.getByText(/needs? review/i)).toHaveCount(0)
  await page.getByLabel("Sites", { exact: true }).selectOption(record.site)
  await expect(clusterAlert).toContainText(warning)
  await clusterAlert.screenshot({ path: `.local/review-warnings/${info.project.name}-cluster.png` })
  for (const member of value.records.filter((r: any) => r.clusterId === cluster.id)) {
    await page.goto(`/map/clusters/${cluster.id}/evidence/${member.id}`)
    await expect(page.getByRole("heading", { level: 1 })).toContainText(member.id)
    await expect(page.getByRole("region", { name: "Record warnings" })).toHaveCount(0)
    await expect(page.getByRole("region", { name: "Cluster warnings" })).toHaveCount(0)
    await expect(page.getByText(/cluster catalogue/)).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width)
  }
})

test("record-specific warnings retain their count and evidence-page detail", async ({ page }) => {
  const value = structuredClone(fixture), record = value.records[0]
  const warning = `Review source information for record ${record.id}.`
  record.warnings = [warning]
  value.clusters[0].warnings = ["Cluster information needs completion."]
  await page.route("**/map/dataset", route => route.fulfill({ json: value }))
  await page.goto(`/map/clusters/${record.clusterId}`)
  await expect(page.getByRole("region", { name: "Cluster warnings" })).toBeVisible()
  await expect(page.getByRole("status").filter({ hasText: "1 record needs review" })).toBeVisible()
  await expect(page.getByText("Needs review", { exact: true }).filter({ visible: true })).toBeVisible()
  await page.getByRole("link", { name: `Open evidence review for ${record.id}`, exact: true }).click()
  const alert = page.getByRole("region", { name: "Record warnings" })
  await expect(alert).toContainText(warning)
  await expect(alert).not.toContainText("Close assignment")
  await expect(page.getByText("Cluster information needs completion.")).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width)
})

test("invalid cluster warning contracts are rejected", async ({ page }) => {
  const value = structuredClone(fixture)
  await page.route("**/map/dataset", route => route.fulfill({ json: value }))
  for (const invalid of [null, true, [42]]) {
    value.clusters[0].warnings = invalid
    await page.goto(`/map/clusters/${value.clusters[0].id}`)
    await expect(page.getByRole("alert")).toContainText("invalid dataset")
    await expect(page.getByRole("region", { name: "Cluster warnings" })).toHaveCount(0)
  }
})
