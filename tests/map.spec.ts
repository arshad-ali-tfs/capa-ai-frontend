import { test, expect, type Page } from "@playwright/test"
import fs from "node:fs"
const fixture = JSON.parse(
  fs.readFileSync(
    new URL("./fixtures/map-dataset.json", import.meta.url),
    "utf8",
  ),
)
const real = process.env.MAP_REAL_DATA === "1"
async function data(page: Page) {
  if (!real) return fixture
  const response = await page.request.get("/map/dataset")
  expect(response.ok()).toBeTruthy()
  return response.json()
}
test.beforeEach(async ({ page }) => {
  if (!real)
    await page.route("**/map/dataset", (route) =>
      route.fulfill({ json: fixture }),
    )
})
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(await page.evaluate(() => innerWidth))
}

test("the supplied home and navigation expose only the implemented MAP route", async ({
  page,
}, info) => {
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  await page.goto("/")
  await expect(
    page.getByRole("heading", { name: "Choose a workspace" }),
  ).toBeVisible()
  const navigation = page.getByRole("navigation", { name: "CAPA.AI modules" })
  await expect(navigation.getByRole("link")).toHaveText(["Home", "MAP"])
  await expect(
    page.getByRole("link", { name: "Open MATCH", exact: true }),
  ).toHaveCount(0)
  await expect(
    page.getByRole("link", { name: "Open AUTHOR", exact: true }),
  ).toHaveCount(0)
  await page.getByRole("link", { name: "Open MAP", exact: true }).click()
  await expect(
    page.getByRole("heading", { name: /Global cluster analysis/i }),
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Run analysis", exact: true }),
  ).toHaveCount(0)
  await expect(
    page.getByRole("link", { name: "Analysis workspace", exact: true }),
  ).toHaveCount(0)
  await noOverflow(page)
  expect(errors).toEqual([])
  await page.screenshot({
    path: ".local/" + info.project.name + "-map.png",
    fullPage: true,
  })
})

test("real contract drives filters, cluster records, source evidence and draft-only annotation", async ({
  page,
}, info) => {
  const dataset = await data(page)
  const posts: string[] = []
  page.on("request", (r) => {
    if (r.method() === "POST") posts.push(r.url())
  })
  await page.goto("/map")
  await expect(page.getByText("Active clusters", { exact: true })).toBeVisible()
  await expect(
    page.getByRole("button", { name: / cluster detail$/ }),
  ).toHaveCount(dataset.clusters.length)
  const selected = dataset.records[0].site
  await page.getByLabel("Sites", { exact: true }).selectOption(selected)
  const filtered = dataset.records.filter((r: any) => r.site === selected)
  await expect(
    page.getByText(
      new Set(filtered.map((r: any) => r.clusterId)).size +
        " clusters • " +
        filtered.length +
        " records",
      { exact: true },
    ),
  ).toBeVisible()
  await page.getByRole("button", { name: "Clear all", exact: true }).click()
  const cluster = dataset.clusters.find(
    (c: any) => c.id === dataset.records[0].clusterId,
  )
  await page
    .getByRole("button", {
      name: "Open " + cluster.title + " cluster detail",
      exact: true,
    })
    .click()
  await expect(
    page.getByRole("heading", {
      name: "Cluster detail • " + cluster.id,
      exact: true,
    }),
  ).toBeVisible()
  const record = dataset.records.find((r: any) => r.clusterId === cluster.id)
  await page
    .getByRole("button", {
      name: "Open evidence review for " + record.id,
      exact: true,
    })
    .click()
  await expect(page.locator("blockquote")).toHaveText(record.sourceNarrative)
  await page.getByText("Mixed / unclear", { exact: true }).click()
  await page
    .getByLabel("Reviewer note", { exact: true })
    .fill("FICTIONAL UI TEST: draft annotation only.")
  await expect(
    page.getByRole("radio", { name: "Mixed / unclear", exact: true }),
  ).toBeChecked()
  await expect(page.getByText(/Draft annotation only/)).toContainText(
    "not saved",
  )
  await expect(
    page.getByRole("button", { name: "Save annotation", exact: true }),
  ).toHaveCount(0)
  await expect(
    page.getByRole("button", { name: "Open in AUTHOR", exact: true }),
  ).toHaveCount(0)
  await noOverflow(page)
  await page.screenshot({
    path: ".local/" + info.project.name + "-evidence.png",
    fullPage: true,
  })
  await page.reload()
  await expect(page.getByLabel("Reviewer note", { exact: true })).toHaveValue(
    "",
  )
  expect(posts).toEqual([])
})

test("backend failures use the supplied retry screen and never fall back to sample results", async ({
  page,
}) => {
  const dataset = await data(page)
  let fail = true
  await page.route("**/map/dataset", async (route) => {
    await route.fulfill(
      fail
        ? {
            status: 503,
            json: { detail: "Fictional MAP connectivity failure" },
          }
        : { json: dataset },
    )
  })
  await page.goto("/map")
  await expect(page.getByRole("alert")).toContainText(
    "Fictional MAP connectivity failure",
  )
  await expect(page.getByText("Active clusters", { exact: true })).toHaveCount(
    0,
  )
  fail = false
  await page.getByRole("button", { name: "Try again", exact: true }).click()
  await expect(page.getByText("Active clusters", { exact: true })).toBeVisible()
  await noOverflow(page)
})

test("deep links and browser navigation stay within the supplied MAP screens", async ({
  page,
}) => {
  const dataset = await data(page),
    record = dataset.records[0]
  await page.goto(
    "/map/clusters/" + record.clusterId + "/evidence/" + record.id,
  )
  await expect(
    page.getByRole("heading", {
      name: "Evidence review • " + record.id,
      exact: true,
    }),
  ).toBeVisible()
  await page
    .getByRole("link", { name: "Global cluster overview", exact: true })
    .click()
  await expect(
    page.getByRole("heading", { name: /Global cluster analysis/i }),
  ).toBeVisible()
  await page.goBack()
  await expect(
    page.getByRole("heading", {
      name: "Evidence review • " + record.id,
      exact: true,
    }),
  ).toBeVisible()
  await page.goto("/map/clusters/does-not-exist")
  await expect(
    page.getByRole("heading", { name: "Page not found", exact: true }),
  ).toBeVisible()
  await noOverflow(page)
})

test("the common frontend proxy routes only the MAP backend", async ({
  page,
}) => {
  const response = await page.request.get("/map/dataset")
  if (real) expect(response.ok()).toBeTruthy()
  expect((await page.request.get("/api/v1/match/health")).status()).toBe(404)
  expect((await page.request.get("/api/v1/author/health")).status()).toBe(404)
  await page.goto("/author")
  await expect(
    page.getByRole("heading", { name: "Page not found", exact: true }),
  ).toBeVisible()
})
