import { test, expect, type Page } from "@playwright/test"
import fs from "node:fs"

const fixture = JSON.parse(fs.readFileSync(new URL("./fixtures/map-dataset.json", import.meta.url), "utf8"))
test.skip(process.env.MAP_REAL_DATA === "1", "Tooltip interactions use fictional responses")

test.beforeEach(async ({ page }) => {
  await page.route("**/map/dataset", route => route.fulfill({ json: fixture }))
  await page.route("**/api/v1/map/runs?*", route => route.fulfill({ json: { items: [] } }))
})

async function withinViewport(page: Page) {
  const bounds = (await page.getByRole("tooltip").boundingBox())!
  const viewport = page.viewportSize()!
  expect(bounds.x).toBeGreaterThanOrEqual(0)
  expect(bounds.y).toBeGreaterThanOrEqual(0)
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width)
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width)
}

test("keyboard help is described, dismissible and does not change filters", async ({ page }) => {
  await page.goto("/map")
  const help = page.getByRole("button", { name: "About CAPA implemented", exact: true })
  await help.focus()
  const tip = page.getByRole("tooltip")
  await expect(tip).toContainText("Closed - Done is used as the completion indicator")
  await expect(help).toHaveAttribute("aria-describedby", (await tip.getAttribute("id"))!)
  await withinViewport(page)
  await page.keyboard.press("Escape")
  await expect(tip).toHaveCount(0)
  await expect(help).toBeFocused()
  await page.getByRole("button", { name: "About Criticality filter", exact: true }).focus()
  await expect(tip).toContainText("not inferred by MAP")
  await page.keyboard.press("Tab")
  await expect(page.getByRole("combobox", { name: "Criticality", exact: true })).toBeFocused()
  await expect(tip).toHaveCount(0)
  await expect(page.getByRole("combobox", { name: "Criticality", exact: true })).toHaveValue("All")
  await expect(page).toHaveURL(/\/map$/)
})

test("pointer help is hoverable and tap help toggles without navigating a row", async ({ page, isMobile }) => {
  await page.goto("/map")
  const help = page.getByRole("button", { name: "About Minor", exact: true }).filter({ visible: true }).first()
  const tip = page.getByRole("tooltip")
  if (isMobile) {
    await help.tap()
    await expect(tip).toContainText("including those with unavailable criticality")
    await withinViewport(page)
    await expect(page).toHaveURL(/\/map$/)
    await help.tap()
    await expect(tip).toHaveCount(0)
    await help.tap()
    await expect(tip).toBeVisible()
    await page.getByRole("heading", { level: 1 }).tap()
  } else {
    await help.hover()
    await expect(tip).toContainText("including those with unavailable criticality")
    await withinViewport(page)
    await tip.hover()
    await expect(tip).toBeVisible()
    await page.getByRole("heading", { level: 1 }).hover()
  }
  await expect(tip).toHaveCount(0)
  await expect(page).toHaveURL(/\/map$/)
})

test("cluster and evidence help leaves saved data and review drafts intact", async ({ page }) => {
  const writes: string[] = []
  page.on("request", request => { if (!["GET", "HEAD"].includes(request.method())) writes.push(request.url()) })
  const record = fixture.records[0]
  await page.goto(`/map/clusters/${record.clusterId}`)
  await page.getByRole("button", { name: "About Median days open", exact: true }).click()
  await expect(page.getByRole("tooltip")).toContainText("Middle historical duration")
  await withinViewport(page)
  await page.keyboard.press("Escape")
  await page.getByRole("button", { name: "About Status", exact: true }).filter({ visible: true }).first().click()
  await expect(page.getByRole("tooltip")).toContainText("time of the source snapshot")
  await withinViewport(page)
  await page.keyboard.press("Escape")
  await page.getByRole("link", { name: `Open evidence review for ${record.id}`, exact: true }).click()
  for (const [label, text] of [
    ["5W1H extraction", "Compare each statement with the original source"],
    ["Why", "not a confirmed root cause"],
    ["Reviewer assessment", "too little evidence to assess"],
    ["Reviewer annotation", "does not reassign the record"],
  ]) {
    await page.getByRole("button", { name: `About ${label}`, exact: true }).click()
    await expect(page.getByRole("tooltip")).toContainText(text)
    await withinViewport(page)
    await page.keyboard.press("Escape")
  }
  await expect(page.getByRole("textbox", { name: "Reviewer note", exact: true })).toHaveValue(record.annotation.note)
  await expect(page.getByRole("radio", { checked: true })).toHaveCount(record.annotation.assessment ? 1 : 0)
  await expect(page.getByRole("button", { name: "Save annotation", exact: true })).toBeDisabled()
  expect(writes).toEqual([])
})
