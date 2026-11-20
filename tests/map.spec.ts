import { test, expect, type Page } from "@playwright/test"
import fs from "node:fs"
const fixture = JSON.parse(
  fs.readFileSync(
    new URL("./fixtures/map-dataset.json", import.meta.url),
    "utf8",
  ),
)
const real = process.env.MAP_REAL_DATA === "1"
const clone = () => structuredClone(fixture)
const root = "http://127.0.0.1:8100"
async function data(page: Page) {
  return real ? (await page.request.get("/map/dataset")).json() : clone()
}
const clusterLink = (page: Page, title: string) =>
  page.getByRole("link", { name: `Open ${title} cluster detail`, exact: true })
const recordLink = (page: Page, id: string) =>
  page.getByRole("link", {
    name: `Open evidence review for ${id}`,
    exact: true,
  })
const sourceTexts = (record: any) => record.sourceSections?.length
  ? record.sourceSections.map((section: any) => section.text)
  : [record.sourceNarrative]
const metric = (page: Page, label: string) =>
  page.getByRole("region", { name: "Analysis KPIs", exact: true }).getByText(label, { exact: true }).locator("..")
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(await page.evaluate(() => innerWidth))
}
async function mock(page: Page, value: any) {
  await page.route("**/map/dataset", (route) => route.fulfill({ json: value }))
}
test.beforeEach(async ({ page }) => {
  if (!real) await mock(page, clone())
})

test("home links MAP and MATCH, shows MAP's live coverage and has no planned-service links", async ({
  page,
}, info) => {
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  await page.goto("/")
  await expect(
    page.getByRole("heading", { name: "Choose a workspace" }),
  ).toBeVisible()
  await expect(
    page.getByRole("navigation", { name: "CAPA.AI modules" }).getByRole("link"),
  ).toHaveText(["Home", "MAP", "MATCH"])
  await page.getByRole("link", { name: "Open MAP", exact: true }).click()
  await expect(
    page.getByRole("heading", { name: /MAP.*Cluster analysis/ }),
  ).toBeVisible()
  const dataset = await data(page)
  await expect(
    page.getByRole("region", { name: "Analysis coverage" }),
  ).toContainText(dataset.records.length + " analysed records")
  await expect(
    page.getByRole("region", { name: "Analysis coverage" }),
  ).toContainText(
    dataset.analysis.sourceRecordCount.toLocaleString() +
      " records in source snapshot",
  )
  await expect(
    page.getByRole("button", { name: "Run analysis", exact: true }),
  ).toHaveCount(0)
  await expect(
    page
      .getByRole("navigation", { name: "CAPA.AI modules" })
      .getByRole("link", { name: "MAP", exact: true }),
  ).toHaveAttribute("aria-current", "page")
  await noOverflow(page)
  expect(errors).toEqual([])
  await page.screenshot({
    path: `.local/map-fixes/${info.project.name}-overview.png`,
    fullPage: true,
  })
})

test("site filters carry through cluster, evidence, back navigation and reload", async ({
  page,
}, info) => {
  const dataset = await data(page),
    record = dataset.records[0],
    cluster = dataset.clusters.find((c: any) => c.id === record.clusterId)
  await page.goto("/map")
  await page.getByLabel("Sites", { exact: true }).selectOption(record.site)
  await clusterLink(page, cluster.title).click()
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Cluster detail",
  )
  await expect(page.getByLabel("Sites", { exact: true })).toHaveValue(
    record.site,
  )
  const expected = dataset.records.filter(
    (r: any) => r.clusterId === cluster.id && r.site === record.site,
  )
  await expect(
    page.getByRole("link", { name: /Open evidence review for/ }),
  ).toHaveCount(expected.length)
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused()
  await page.screenshot({
    path: `.local/map-fixes/${info.project.name}-cluster.png`,
    fullPage: true,
  })
  await recordLink(page, record.id).click()
  await expect(page.locator("blockquote")).toHaveText(sourceTexts(record))
  expect(
    await page
      .locator("blockquote").first()
      .evaluate((e) => getComputedStyle(e).whiteSpace),
  ).toBe("pre-wrap")
  await noOverflow(page)
  await page.screenshot({
    path: `.local/map-fixes/${info.project.name}-evidence.png`,
    fullPage: true,
  })
  await page
    .getByRole("link", { name: "Cluster overview", exact: true })
    .click()
  await expect(page.getByLabel("Sites", { exact: true })).toHaveValue(
    record.site,
  )
  await page.reload()
  await expect(page.getByLabel("Sites", { exact: true })).toHaveValue(
    record.site,
  )
  await page.goBack()
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Evidence review",
  )
})

test("overview KPIs use filtered deviations, show the requested breakdowns and remove old cards", async ({
  page,
}) => {
  test.skip(real, "Controlled boundary values use a fictional response")
  const value = clone()
  value.records[0].criticality = "Major"
  value.records[1].criticality = "Minor"
  value.records[2].criticality = "Critical"
  value.records[1].drType = "Site Deviation"
  value.capas = [
    { id: "DONE-A", description: "Fictional completed action", status: "Closed - Done", recordIds: [value.records[0].id] },
    { id: "DONE-B", description: "Fictional second completed action", status: "Closed - Done", recordIds: [value.records[0].id] },
    { id: "CANCELLED", description: "Fictional cancelled action", status: "Closed - Cancelled", recordIds: [value.records[2].id] },
  ]
  await mock(page, value)
  await page.goto("/map")
  await page
    .getByLabel("Sites", { exact: true })
    .selectOption(value.records[0].site)
  await expect(metric(page, "Criticality")).toContainText("Out of 2 deviations")
  const severity = (level: string) => metric(page, "Criticality").locator("dt").filter({ hasText: new RegExp(`^${level}$`) }).locator("..").getByRole("definition")
  await expect(severity("Major")).toHaveText(/^1\s*50\.0%$/)
  await expect(severity("Minor")).toHaveText(/^0\s*0\.0%$/)
  await expect(severity("Critical")).toHaveText(/^1\s*50\.0%$/)
  await expect(metric(page, "Top DR types")).toContainText("Product Deviation")
  await expect(metric(page, "Top DR types")).toContainText("Top 1 combined · 2 of 2 deviations")
  await expect(metric(page, "CAPA implemented / raised")).toContainText("2 / 3")
  await expect(metric(page, "CAPA implemented / raised")).toContainText("66.7%")
  for (const label of ["Average cluster similarity", "Top 5 share", "Open cluster"]) {
    await expect(page.getByText(label, { exact: true })).toHaveCount(0)
  }
  await page.getByRole("button", { name: "Clear all", exact: true }).click()
  await expect(metric(page, "Criticality")).toContainText("Out of 3 deviations")
  await expect(metric(page, "Top DR types")).toContainText("Top 2 combined · 3 of 3 deviations")
  await expect(metric(page, "CAPA implemented / raised")).toContainText("2 / 3")
  value.records.forEach((r: any) => (r.similarity = null))
  value.clusters.forEach((c: any) => (c.match = null))
  value.analysis.sourceAvailable = false
  await page.getByRole("button", { name: "Refresh data", exact: true }).click()
  await expect(metric(page, "CAPA implemented / raised")).toContainText("Not available")
  await noOverflow(page)
})

test("overview KPIs explain ties and unknown classifications and count unassigned CAPA links", async ({ page }) => {
  test.skip(real, "KPI boundary cases use fictional data")
  const value = clone()
  value.records[0].criticality = "Not provided"
  value.records[1].criticality = "Unclassified"
  value.records[2].criticality = "Critical"
  value.records[0].drType = "Site Deviation"
  value.records[1].drType = "Product Deviation"
  value.records[2].drType = "Not provided"
  value.records[2].clusterId = ""
  value.capas = [{ id: "UNASSIGNED-CAPA", description: "Fictional completed action", status: "Closed - Done", recordIds: [value.records[2].id] }]
  await mock(page, value)
  await page.goto("/map")
  await expect(metric(page, "Criticality")).toContainText(/Other \/ unknown:\s*2 \(66\.7%\)/)
  await expect(metric(page, "Top DR types")).toContainText("Top 2 combined")
  await expect(metric(page, "Top DR types")).toContainText("Top 2 combined · 2 of 3 deviations · 1 unknown")
  await expect(metric(page, "CAPA implemented / raised")).toContainText("1 / 1")
  await page.getByRole("button", { name: "About Top DR types", exact: true }).click()
  await expect(page.getByRole("tooltip")).toContainText("Top three known deviation record types")
  await page.keyboard.press("Escape")
  await page.getByRole("combobox", { name: "Criticality", exact: true }).selectOption("Not provided")
  await expect(metric(page, "Criticality")).toContainText(/Other \/ unknown:\s*1 \(100\.0%\)/)
  await expect(metric(page, "CAPA implemented / raised")).toContainText("0 / 0")
  await noOverflow(page)
})

test("unavailable source filters are disabled and explained", async ({
  page,
}) => {
  await page.goto("/map")
  await page.getByText("More filters (6)", { exact: true }).click()
  for (const name of [
    "Building",
    "Room",
    "Suite",
    "Production area",
    "Production line",
  ]) {
    await expect(page.getByLabel(name, { exact: true })).toBeDisabled()
    await expect(page.getByLabel(name, { exact: true })).toContainText(
      "Not available in source",
    )
  }
})

test("CAPA context follows explicit parent links and current filters", async ({
  page,
}) => {
  test.skip(
    real,
    "The current historical pilot has no linked CAPAs; positive mappings use fictional data",
  )
  const value = clone(),
    record = value.records[0]
  await page.goto(
    `/map/clusters/${record.clusterId}?site=${encodeURIComponent(record.site)}`,
  )
  await page.getByText("Related CAPA context", { exact: true }).click()
  await expect(
    page.getByText("FICTIONAL-CAPA-" + record.id, { exact: true }),
  ).toBeVisible()
  const other = value.records.find(
    (r: any) => r.clusterId === record.clusterId && r.site !== record.site,
  )
  await expect(
    page.getByText("FICTIONAL-CAPA-" + other.id, { exact: true }),
  ).toHaveCount(0)
})

test("record annotations save, survive reload and handle failed saves without loss", async ({
  page,
}) => {
  test.skip(
    real,
    "UI save scenarios use fictional records; separate HTTP checks verify real backend persistence",
  )
  const value = clone(),
    record = value.records[0]
  let fail = true
  await mock(page, value)
  await page.route("**/annotation", async (route) => {
    if (fail) {
      await route.fulfill({
        status: 503,
        json: { detail: "Fictional save failure" },
      })
      return
    }
    const body = route.request().postDataJSON()
    record.annotation = {
      assessment: body.assessment,
      note: body.note,
      revision: 1,
      savedAt: "2026-11-13T08:00:00+00:00",
    }
    await route.fulfill({ json: record.annotation })
  })
  await page.goto(`/map/clusters/${record.clusterId}/evidence/${record.id}`)
  await page.getByText("Mixed / unclear", { exact: true }).click()
  await page
    .getByLabel("Reviewer note", { exact: true })
    .fill("FICTIONAL: Lot TEST-A; 20 mL; reviewer note.")
  await expect(
    page.getByRole("button", { name: "Refresh data", exact: true }),
  ).toBeDisabled()
  await page
    .getByRole("button", { name: "Save annotation", exact: true })
    .click()
  await expect(page.getByRole("alert")).toContainText("Fictional save failure")
  await expect(page.getByLabel("Reviewer note", { exact: true })).toHaveValue(
    "FICTIONAL: Lot TEST-A; 20 mL; reviewer note.",
  )
  fail = false
  await page
    .getByRole("button", { name: "Save annotation", exact: true })
    .click()
  await expect(page.getByText(/Revision 1/)).toBeVisible()
  record.annotation = {
    ...record.annotation,
    note: "FICTIONAL: later saved version from another reviewer.",
    revision: 2,
  }
  await page.getByRole("button", { name: "Refresh data", exact: true }).click()
  await expect(page.getByLabel("Reviewer note", { exact: true })).toHaveValue(
    record.annotation.note,
  )
  await expect(page.getByText(/Revision 2/)).toBeVisible()
  await page.reload()
  await expect(page.getByLabel("Reviewer note", { exact: true })).toHaveValue(
    record.annotation.note,
  )
  await expect(
    page.getByRole("radio", { name: "Mixed / unclear", exact: true }),
  ).toBeChecked()
  await page
    .getByLabel("Reviewer note", { exact: true })
    .fill("FICTIONAL conflicting edit")
  await page.route("**/annotation", (route) =>
    route.fulfill({
      status: 409,
      json: {
        detail:
          "This annotation was updated elsewhere. Refresh to load the latest version before saving.",
      },
    }),
  )
  await page
    .getByRole("button", { name: "Save annotation", exact: true })
    .click()
  await expect(page.getByRole("alert")).toContainText("updated elsewhere")
  await expect(page.getByLabel("Reviewer note", { exact: true })).toHaveValue(
    "FICTIONAL conflicting edit",
  )
  await page
    .getByRole("button", { name: "Discard changes", exact: true })
    .click()
  await expect(page.getByLabel("Reviewer note", { exact: true })).toHaveValue(
    record.annotation.note,
  )
})

test("malformed and unavailable API responses show retry, never a blank or sample page", async ({
  page,
}) => {
  const value = await data(page),
    errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  let failure: any = {}
  await page.route("**/map/dataset", (route) =>
    route.fulfill({ json: failure }),
  )
  await page.goto("/map")
  await expect(page.getByRole("alert")).toContainText("invalid dataset")
  failure = value
  await page.getByRole("button", { name: "Try again", exact: true }).click()
  await expect(page.getByText("Active clusters", { exact: true })).toBeVisible()
  expect(errors).toEqual([])
  await page.route("**/map/dataset", (route) =>
    route.fulfill({ status: 503, json: { detail: "Fictional MAP outage" } }),
  )
  await page.getByRole("button", { name: "Refresh data", exact: true }).click()
  await expect(page.getByRole("alert")).toContainText(
    "previous analysis remains displayed",
  )
  await expect(page.getByText("Active clusters", { exact: true })).toBeVisible()
})

test("empty and unassigned batches stay inspectable without invented scores", async ({
  page,
}) => {
  test.skip(real, "Empty/unassigned boundary cases use fictional responses")
  const value = clone()
  value.records = []
  value.clusters = []
  value.months = []
  value.analysis.recordCount = 0
  await mock(page, value)
  await page.goto("/map")
  await expect(
    page.getByText("This completed analysis contains no records.", {
      exact: true,
    }),
  ).toBeVisible()
  await expect(metric(page, "CAPA implemented / raised")).toContainText(
    "Not available",
  )
  const record = clone().records[0]
  record.clusterId = ""
  record.similarity = null
  record.warnings = ["No cluster assignment is available."]
  value.records = [record]
  value.analysis.recordCount = 1
  await page.getByRole("button", { name: "Refresh data", exact: true }).click()
  await expect(
    page.getByRole("heading", { name: /Unassigned records/ }),
  ).toBeVisible()
  await recordLink(page, record.id).click()
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Evidence review",
  )
  await expect(page.locator("blockquote")).toHaveText(record.sourceNarrative)
  await expect(
    page.getByRole("region", { name: "Record warnings" }),
  ).toContainText("No cluster assignment")
})

test("zero month counts have no bar and collapsed panels do not stretch", async ({
  page,
}) => {
  const value = await data(page),
    record = value.records[0]
  await page.goto("/map")
  await page.getByText("Active clusters", { exact: true }).waitFor()
  const panels = await page
    .locator("details.rounded-xl:not([open])")
    .evaluateAll((items) =>
      items.map((e) => ({
        height: e.getBoundingClientRect().height,
        summary: e.querySelector("summary")!.getBoundingClientRect().height,
      })),
    )
  for (const p of panels) expect(p.height).toBeLessThanOrEqual(p.summary + 4)
  if (!real) {
    const modified = clone()
    modified.months.push("2026-02")
    await mock(page, modified)
  }
  await page.goto(`/map/clusters/${record.clusterId}`)
  await page.getByText("Deviation occurrences", { exact: true }).click()
  const rows = await page
    .locator("details")
    .filter({ hasText: "Deviation occurrences" })
    .locator("div.border-t > div > div")
    .evaluateAll((items) =>
      items.map((e) => ({
        value: e.lastElementChild?.textContent,
        width: (e.querySelector("span[style]") as HTMLElement)?.style.width,
      })),
    )
  expect(rows.length).toBeGreaterThan(0)
  for (const row of rows) if (row.value === "0") expect(row.width).toBe("0%")
})

test("320px layouts keep all record details visible without sideways scrolling", async ({
  page,
}) => {
  const value = await data(page),
    record = value.records[0]
  await page.setViewportSize({ width: 320, height: 812 })
  for (const path of [
    "/map",
    `/map/clusters/${record.clusterId}`,
    `/map/clusters/${record.clusterId}/evidence/${record.id}`,
  ]) {
    await page.goto(path)
    await page.getByRole("heading", { level: 1 }).waitFor()
    await noOverflow(page)
  }
})

test("automatic focus refresh pauses during edits and resumes after discard", async ({
  page,
}) => {
  test.skip(real, "Controlled refresh assertions use fictional data")
  const value = clone(),
    record = value.records[0]
  let calls = 0
  await page.route("**/map/dataset", (route) => {
    calls++
    return route.fulfill({ json: value })
  })
  await page.goto(`/map/clusters/${record.clusterId}/evidence/${record.id}`)
  await page
    .getByLabel("Reviewer note", { exact: true })
    .fill("FICTIONAL unsaved note")
  const initial = calls
  await page.evaluate(() => window.dispatchEvent(new Event("focus")))
  await expect(
    page.getByRole("button", { name: "Refresh data", exact: true }),
  ).toBeDisabled()
  expect(calls).toBe(initial)
  await page
    .getByRole("button", { name: "Discard changes", exact: true })
    .click()
  await page.evaluate(() => window.dispatchEvent(new Event("focus")))
  await expect.poll(() => calls).toBeGreaterThan(initial)
})

test("deep links work and unregistered API paths are not forwarded", async ({
  page,
}) => {
  const value = await data(page),
    record = value.records[0]
  await page.goto(`/map/clusters/${record.clusterId}/evidence/${record.id}`)
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Evidence review",
  )
  await page.goto("/map/clusters/not-in-analysis")
  await expect(
    page.getByRole("heading", { name: "Page not found", exact: true }),
  ).toBeVisible()
  expect((await page.request.get("/api/v1/unknown/health")).status()).toBe(404)
  expect((await page.request.get("/api/v1/mapx/health")).status()).toBe(404)
})

test("long narratives retain every character in a keyboard-accessible scroll region", async ({
  page,
}) => {
  test.skip(real, "Long-text boundaries use a fictional response")
  const value = clone(),
    record = value.records[0]
  record.sourceNarrative =
    "FICTIONAL SOURCE LINE: Lot TEST-1; 20 mL; 12-May-2025.\n".repeat(300)
  await mock(page, value)
  await page.goto(`/map/clusters/${record.clusterId}/evidence/${record.id}`)
  await expect(page.locator("blockquote")).toHaveText(record.sourceNarrative)
  const region = page.getByRole("region", {
    name: "Original source narrative",
    exact: true,
  })
  await expect(region).toHaveAttribute("tabindex", "0")
  const size = await region.evaluate((e) => ({
    height: e.clientHeight,
    scroll: e.scrollHeight,
    view: innerHeight,
  }))
  expect(size.height).toBeLessThanOrEqual(size.view * 0.65 + 1)
  expect(size.scroll).toBeGreaterThan(size.height)
  await region.focus()
  await page.keyboard.press("End")
  await expect(
    page.getByRole("button", { name: "Save annotation", exact: true }),
  ).toBeAttached()
  await noOverflow(page)
})
