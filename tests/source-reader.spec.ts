import { test, expect, type Page } from "@playwright/test"
import fs from "node:fs"

const fixture = JSON.parse(fs.readFileSync(new URL("./fixtures/map-dataset.json", import.meta.url), "utf8"))
test.skip(process.env.MAP_REAL_DATA === "1", "Controlled reader boundaries use fictional records")

function sample() {
  const value = structuredClone(fixture), record = value.records[0]
  record.sourceSections = [
    { key: "detailed_description", label: "Description", text: '  FICTIONAL: Lot AB-123; 20 mL; 12-May-2025.\r\nINVESTIGATION:\nThis heading belongs to the description.  ' },
    { key: "investigation", label: "Investigation", text: 'Résultat: 未確認; TEST-42; 20 µL. <literal text>\n\n'.repeat(220) },
    { key: "conclusion", label: "Conclusion", text: "Original fictional conclusion.\n" },
  ]
  record.sourceNarrative = record.sourceSections.map((s: any) => s.key.toUpperCase() + ":\n" + s.text).join("\n\n")
  return { value, record }
}
async function open(page: Page, value: any, record: any) {
  await page.route("**/map/dataset", route => route.fulfill({ json: value }))
  await page.goto(`/map/clusters/${record.clusterId}/evidence/${record.id}`)
  await expect(page.getByRole("heading", { name: "Source narrative", exact: true })).toBeVisible()
}
const reader = (page: Page) => page.getByRole("region", { name: "Original source narrative", exact: true })

test("source fields retain exact text, real headings and keyboard jump targets", async ({ page }) => {
  const { value, record } = sample()
  await open(page, value, record)
  await expect(page.getByRole("heading", { level: 3 })).toHaveText(["Description", "Investigation", "Conclusion"])
  expect(await page.locator("blockquote").evaluateAll(items => items.map(e => e.textContent))).toEqual(record.sourceSections.map((s: any) => s.text))
  await expect(reader(page)).toHaveAttribute("tabindex", "0")
  const jump = page.getByRole("navigation", { name: "Source fields", exact: true }).getByRole("button", { name: "Conclusion", exact: true })
  await jump.focus()
  await page.keyboard.press("Enter")
  const heading = page.getByRole("heading", { name: "Conclusion", level: 3, exact: true })
  await expect(heading).toBeFocused()
  const regionBox = (await reader(page).boundingBox())!, headingBox = (await heading.boundingBox())!
  expect(headingBox.y).toBeGreaterThanOrEqual(regionBox.y - 2)
  expect(headingBox.y + headingBox.height).toBeLessThanOrEqual(regionBox.y + regionBox.height + 2)
  expect(await reader(page).evaluate(e => e.scrollTop)).toBeGreaterThan(0)
})

test("all narrative lengths share a viewport-based reader and full-text option", async ({ page }) => {
  const { value, record } = sample()
  const heights: number[] = []
  for (const count of [100, 300]) {
    const text = "FICTIONAL: TEST-1; 20 mL; 12-May-2025.\n".repeat(count)
    record.sourceSections = [{ key: "investigation", label: "Investigation", text }]
    record.sourceNarrative = "INVESTIGATION:\n" + text
    await open(page, value, record)
    const sizes = await reader(page).evaluate(e => ({ height: e.clientHeight, scroll: e.scrollHeight, view: innerHeight }))
    heights.push(sizes.height)
    expect(sizes.height).toBeLessThanOrEqual(sizes.view * .65 + 1)
    expect(sizes.scroll).toBeGreaterThan(sizes.height)
  }
  expect(Math.abs(heights[0] - heights[1])).toBeLessThanOrEqual(1)
  await page.getByRole("button", { name: "Expand full text", exact: true }).click()
  await expect(page.getByRole("button", { name: "Use scroll view", exact: true })).toHaveAttribute("aria-expanded", "true")
  const expanded = await reader(page).evaluate(e => ({ height: e.clientHeight, scroll: e.scrollHeight }))
  expect(expanded.height).toBeGreaterThanOrEqual(expanded.scroll - 1)
  expect(await page.locator("blockquote").textContent()).toBe(record.sourceSections[0].text)
  await page.getByRole("button", { name: "Return to scroll view", exact: true }).click()
  await expect(page.getByRole("button", { name: "Expand full text", exact: true })).toBeFocused()
  expect(await reader(page).evaluate(e => e.clientHeight)).toBeLessThanOrEqual(page.viewportSize()!.height * .65 + 1)
})

test("reading and reviewing stay connected without losing the draft or reading position", async ({ page }) => {
  const { value, record } = sample()
  let saves = 0
  await page.route("**/annotation", route => { saves++; return route.abort() })
  await open(page, value, record)
  await page.getByRole("navigation", { name: "Source fields", exact: true }).getByRole("button", { name: "Investigation", exact: true }).click()
  await reader(page).evaluate(e => { e.scrollTop += 300 })
  const before = await reader(page).evaluate(e => e.scrollTop)
  if (page.viewportSize()!.width >= 1024) {
    const source = (await page.getByRole("heading", { name: "Source narrative", exact: true }).boundingBox())!
    const matching = (await page.getByRole("heading", { name: "Matching details", exact: true }).boundingBox())!
    const annotation = (await page.getByRole("heading", { name: "Reviewer annotation", exact: true }).boundingBox())!
    expect(matching.x).toBeGreaterThan(source.x)
    expect(Math.abs(matching.y - source.y)).toBeLessThan(3)
    expect(annotation.x).toBe(matching.x)
    expect(annotation.y).toBeLessThan((await reader(page).boundingBox())!.y + (await reader(page).boundingBox())!.height)
  } else {
    await page.getByRole("button", { name: "Review this record ↓", exact: true }).click()
    await expect(page.getByRole("textbox", { name: "Reviewer note", exact: true })).toBeInViewport()
  }
  await page.getByRole("textbox", { name: "Reviewer note", exact: true }).fill("FICTIONAL draft preserved while reading")
  if (page.viewportSize()!.width < 1024) await page.getByRole("button", { name: "Back to source ↑", exact: true }).click()
  expect(await reader(page).evaluate(e => e.scrollTop)).toBe(before)
  await page.getByRole("button", { name: "Expand full text", exact: true }).click()
  await page.getByRole("button", { name: "Return to scroll view", exact: true }).click()
  await expect(page.getByRole("textbox", { name: "Reviewer note", exact: true })).toHaveValue("FICTIONAL draft preserved while reading")
  expect(saves).toBe(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width)
})

test("older source responses stay intact and invalid section metadata is rejected", async ({ page }) => {
  const { value, record } = sample()
  record.sourceSections = []
  await open(page, value, record)
  await expect(page.getByRole("heading", { level: 3, name: "Source text", exact: true })).toBeVisible()
  expect(await page.locator("blockquote").textContent()).toBe(record.sourceNarrative)
  record.sourceSections = [{ key: "same", label: "Description", text: "Original text" }, { key: "same", label: "Investigation", text: "Duplicate key" }]
  await page.reload()
  await expect(page.getByRole("alert")).toContainText("invalid dataset")
})
