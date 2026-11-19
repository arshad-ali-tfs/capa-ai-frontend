import { test, expect, type Page } from "@playwright/test"
import fs from "node:fs"
import { details, index, rows, searchResponse, sites } from "./fixtures/match-dataset"

async function mockMatch(page: Page, calls: unknown[] = []) {
  await page.route("**/api/v1/match/index", route => route.fulfill({ json: index }))
  await page.route("**/api/v1/match/search", route => {
    const body = route.request().postDataJSON()
    calls.push(body)
    return route.fulfill({ json: searchResponse(body.query, body.site) })
  })
  await page.route("**/api/v1/match/matched-records/*?*", route => {
    const url = new URL(route.request().url())
    const id = decodeURIComponent(url.pathname.split("/").at(-1)!)
    const record = details.find(row => row.pr_id === id && row.site === url.searchParams.get("site"))
    return record ? route.fulfill({ json: record }) : route.fulfill({ status: 404, json: { detail: "Record not found" } })
  })
}
const searchBox = (page: Page) => page.getByRole("textbox", { name: "Deviation description", exact: true })
const resultList = (page: Page) => page.getByRole("region", { name: "Search results", exact: true })
const detailPanel = (page: Page) => page.getByRole("complementary", { name: "Selected deviation", exact: true })
async function search(page: Page, query = "plate alert") {
  await searchBox(page).fill(query)
  await page.getByRole("button", { name: "Search", exact: true }).click()
}
test.beforeEach(async ({ page }) => { await mockMatch(page) })

test("opens from navigation and reports actual index coverage", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("link", { name: "Open MATCH", exact: true }).click()
  await expect(page).toHaveURL(/\/match$/)
  await expect(page.getByText("3 searchable deviations · 2 allowed sites")).toBeVisible()
  await expect(page.getByText("Start with a deviation description")).toBeVisible()
  await expect(page.getByRole("button", { name: "Search", exact: true })).toBeDisabled()
  await expect(page.getByRole("navigation", { name: "CAPA.AI modules" }).getByRole("link")).toHaveText(["Home", "MAP", "MATCH"])
})

test("searches within an explicit scope and opens the selected record with CAPA links", async ({ page }) => {
  const calls: unknown[] = []
  await mockMatch(page, calls)
  await page.goto("/match")
  await search(page, "  settle plate alert  ")
  await expect(page.getByText("2 matches returned")).toBeVisible()
  expect(calls).toEqual([{ query: "settle plate alert", all_sites: true, top_k: 10 }])
  const candidates = resultList(page).locator('button[aria-pressed="false"]')
  await expect(candidates).toHaveCount(2)
  await expect(candidates.first()).toContainText("18 Sep 2026")
  await candidates.first().click()
  await expect(detailPanel(page).getByText("CAPA-104", { exact: true })).toBeVisible()
  await expect(page.getByRole("region", { name: "Selected source narrative" })).toContainText(details[0].indexed_field_texts.DETAILED_DESCRIPTION)
  await resultList(page).locator('button[aria-pressed="false"]').click()
  await expect(detailPanel(page)).toContainText("No related CAPA details were returned")
  await expect(detailPanel(page).getByText("CAPA-104", { exact: true })).toHaveCount(0)
})

test("single-site search retains exact site and requested result limit", async ({ page }) => {
  const calls: unknown[] = []
  await mockMatch(page, calls)
  await page.goto("/match")
  await page.getByRole("combobox", { name: "Search scope", exact: true }).selectOption(sites[1])
  await page.getByRole("combobox", { name: "Maximum results", exact: true }).selectOption("50")
  await search(page)
  await expect(page.getByText("1 match returned", { exact: true })).toBeVisible()
  expect(calls).toEqual([{ query: "plate alert", site: sites[1], top_k: 50 }])
  await expect(resultList(page)).toContainText(sites[1])
  await expect(resultList(page)).not.toContainText(sites[0])
})

test("validates minimum input and supports Ctrl+Enter", async ({ page }) => {
  await page.goto("/match")
  await searchBox(page).fill("short")
  await expect(page.getByRole("button", { name: "Search", exact: true })).toBeDisabled()
  await expect(searchBox(page)).toHaveAttribute("maxlength", "30000")
  await searchBox(page).fill("plate alert")
  await searchBox(page).press("Control+Enter")
  await expect(page.getByText("2 matches returned")).toBeVisible()
})

test("shows an empty state and recovers from a search service error", async ({ page }) => {
  await page.goto("/match")
  await search(page, "nothing relevant")
  await expect(page.getByText(/No historical deviations matched/)).toBeVisible()
  let attempts = 0
  await page.route("**/api/v1/match/search", route => ++attempts === 1
    ? route.fulfill({ status: 503, json: { detail: "Index is rebuilding." } })
    : route.fulfill({ json: searchResponse("plate alert") }))
  await search(page)
  await expect(page.getByRole("alert")).toContainText("Index is rebuilding.")
  await page.getByRole("alert").getByRole("button", { name: "Try again" }).click()
  await expect(page.getByText("2 matches returned")).toBeVisible()
})

test("detail failures remain contained and retry without repeating a search", async ({ page }) => {
  let attempts = 0, searches = 0
  page.on("request", request => { if (request.url().endsWith("/match/search")) searches++ })
  await page.route("**/api/v1/match/matched-records/*?*", route => ++attempts === 1
    ? route.fulfill({ status: 503, json: { detail: "Source lookup failed." } })
    : route.fulfill({ json: details[0] }))
  await page.goto("/match")
  await search(page)
  await resultList(page).locator('button[aria-pressed="false"]').first().click()
  await expect(detailPanel(page).getByRole("alert")).toContainText("Source lookup failed.")
  await detailPanel(page).getByRole("button", { name: "Try again" }).click()
  await expect(detailPanel(page).getByText("CAPA-104", { exact: true })).toBeVisible()
  expect(searches).toBe(1)
})

test("index metadata failure does not block an all-allowed-sites search", async ({ page }) => {
  await page.route("**/api/v1/match/index", route => route.fulfill({ status: 503, json: { detail: "unavailable" } }))
  await page.goto("/match")
  await expect(page.getByText("Index details unavailable")).toBeVisible()
  await search(page)
  await expect(page.getByText("2 matches returned")).toBeVisible()
})

test("mock embeddings are labelled as unsuitable for real search", async ({ page }) => {
  await page.route("**/api/v1/match/index", route => route.fulfill({ json: { ...index, mock_embeddings: true } }))
  await page.goto("/match")
  await expect(page.getByRole("status")).toContainText("unsuitable for real search")
})

test("another record or source version cannot populate the selected detail", async ({ page }) => {
  await page.route("**/api/v1/match/matched-records/*?*", route => route.fulfill({ json: { ...details[0], source_snapshot_id: "b".repeat(64) } }))
  await page.goto("/match")
  await search(page)
  await resultList(page).locator('button[aria-pressed="false"]').first().click()
  await expect(detailPanel(page).getByRole("alert")).toContainText("different record, site or source version")
  await expect(detailPanel(page).getByText("CAPA-104", { exact: true })).toHaveCount(0)
})

test("switching candidates cannot show stale source or CAPA details", async ({ page }) => {
  let release: (() => void) | undefined
  await page.route("**/api/v1/match/matched-records/*?*", async route => {
    if (route.request().url().includes(rows[0].pr_id)) {
      await new Promise<void>(resolve => { release = resolve })
      await route.fulfill({ json: details[0] }).catch(() => {})
    } else await route.fulfill({ json: details[1] })
  })
  await page.goto("/match")
  await search(page)
  await resultList(page).locator('button[aria-pressed="false"]').first().click()
  await expect.poll(() => Boolean(release)).toBe(true)
  await resultList(page).locator('button[aria-pressed="false"]').click()
  await expect(detailPanel(page)).toContainText("No related CAPA details were returned")
  release!()
  await expect(detailPanel(page).getByRole("heading", { level: 2 })).toHaveText(rows[1].pr_id)
  await expect(detailPanel(page).getByText("CAPA-104", { exact: true })).toHaveCount(0)
})

test("results retain their submitted scope when the search form changes", async ({ page }) => {
  await page.goto("/match")
  await search(page)
  await searchBox(page).fill("a different description")
  await page.getByRole("combobox", { name: "Search scope", exact: true }).selectOption(sites[0])
  await expect(resultList(page)).toContainText("Results for: plate alert")
  await expect(resultList(page).getByText("All allowed sites", { exact: true })).toBeVisible()
})

test("long source text stays readable and layouts do not overflow", async ({ page }) => {
  await page.route("**/api/v1/match/matched-records/*?*", route => route.fulfill({ json: { ...details[0], indexed_field_texts: { DETAILED_DESCRIPTION: "Fictional long retained source text. ".repeat(500) } } }))
  await page.goto("/match")
  await search(page)
  await resultList(page).locator('button[aria-pressed="false"]').first().click()
  const source = page.getByRole("region", { name: "Selected source narrative", exact: true })
  await expect(source).toHaveAttribute("tabindex", "0")
  expect(await source.evaluate(element => element.scrollHeight)).toBeGreaterThan(await source.evaluate(element => element.clientHeight))
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width)
  if (page.viewportSize()!.width < 1280) {
    await expect(detailPanel(page).getByRole("heading", { level: 2 })).toBeFocused()
    await expect(detailPanel(page).getByRole("heading", { level: 2 })).toBeInViewport()
    await detailPanel(page).getByRole("button", { name: "Back to results ↑", exact: true }).click()
    await expect(resultList(page)).toBeFocused()
  }
})

test("leaving MAP for MATCH respects unsaved reviewer notes", async ({ page }) => {
  const value = JSON.parse(fs.readFileSync(new URL("./fixtures/map-dataset.json", import.meta.url), "utf8"))
  const record = value.records[0]
  await page.route("**/map/dataset", route => route.fulfill({ json: value }))
  await page.route("**/api/v1/map/runs?*", route => route.fulfill({ json: { items: [] } }))
  await page.goto(`/map/clusters/${record.clusterId}/evidence/${record.id}`)
  const note = page.getByRole("textbox", { name: "Reviewer note", exact: true })
  await note.fill("Fictional investigator note to retain")
  page.once("dialog", dialog => dialog.dismiss())
  await page.getByRole("navigation", { name: "CAPA.AI modules" }).getByRole("link", { name: "MATCH", exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/map/clusters/${record.clusterId}/evidence/${record.id}$`))
  await expect(note).toHaveValue("Fictional investigator note to retain")
  await page.getByRole("button", { name: "Discard changes", exact: true }).click()
  await page.getByRole("navigation", { name: "CAPA.AI modules" }).getByRole("link", { name: "MATCH", exact: true }).click()
  await expect(page).toHaveURL(/\/match$/)
  await expect(page.getByRole("heading", { level: 1 })).toContainText("MATCH")
})
