import { test, expect, type Page } from "@playwright/test"
import { index, details, snapshotId } from "./fixtures/match-dataset"
import { filterResponse } from "./fixtures/match-explorer"
import { assisted, overview, token } from "./fixtures/match-assist"
const box=(page:Page)=>page.getByRole("textbox",{name:"Search history",exact:true})
const results=(page:Page)=>page.getByRole("region",{name:"Search results",exact:true})
const summary=(page:Page)=>page.getByRole("region",{name:"Evidence overview",exact:true})
async function search(page:Page,query="instrument calibration problems") {
  await box(page).fill(query);await page.getByRole("button",{name:"Search",exact:true}).click()
}
test.beforeEach(async({page})=>{
  await page.route("**/api/v1/match/index",r=>r.fulfill({json:index}))
  await page.route("**/api/v1/match/facets",r=>r.fulfill({json:filterResponse(r.request().postDataJSON())}))
  await page.route("**/api/v1/match/search",r=>r.fulfill({json:assisted(r.request().postDataJSON())}))
  await page.route("**/api/v1/match/overview",r=>r.fulfill({json:overview(r.request().postDataJSON().search_id)}))
  await page.route("**/api/v1/match/matched-records/*?*",r=>r.fulfill({json:details[0]}))
})

test("search leads the page and filters are discoverable but collapsed",async({page})=>{
  await page.goto("/match")
  await expect(box(page)).toBeVisible()
  const toggle=page.getByRole("button",{name:"Filters",exact:true})
  await expect(toggle).toHaveAttribute("aria-expanded","false")
  await expect(page.getByLabel("Search scope",{exact:true})).toBeHidden()
  await toggle.click()
  await expect(page.getByLabel("Search scope",{exact:true})).toBeVisible()
  await page.getByRole("button",{name:"Criticality filters",exact:true}).click()
  await page.getByRole("checkbox",{name:"Major",exact:true}).check();await page.keyboard.press("Escape")
  await toggle.click()
  await expect(page.getByLabel("Active filters")).toContainText("Criticality: Major")
  await expect(toggle).toContainText("1")
  expect(await box(page).evaluate(el=>el.getBoundingClientRect().top)).toBeLessThan(await toggle.evaluate(el=>el.getBoundingClientRect().top))
})

test("interpreted wording and three cited overview lines accompany source results",async({page})=>{
  await page.goto("/match");await search(page)
  await expect(page.getByLabel("Search interpretation")).toContainText("HPLC calibration drift")
  await expect(summary(page)).toContainText("Fictional historical records")
  await expect(summary(page).getByRole("button")).toHaveCount(3)
  await expect(results(page).getByText("Relevance score",{exact:true})).toHaveCount(0)
})

test("overview citations open the existing source detail without another search",async({page})=>{
  let searches=0
  await page.route("**/api/v1/match/search",r=>{searches++;return r.fulfill({json:assisted(r.request().postDataJSON())})})
  await page.goto("/match");await search(page)
  await expect(summary(page)).toContainText("Fictional historical records")
  await expect(summary(page)).toContainText("1 of 3 returned records reviewed")
  await expect(summary(page).getByRole("button")).toHaveCount(3)
  await summary(page).getByRole("button").first().click()
  await expect(page.getByRole("complementary",{name:"Selected deviation",exact:true})).toContainText(details[0].pr_id)
  expect(searches).toBe(1)
})

test("slow overview never blocks browsing or opening source records",async({page})=>{
  let release:(()=>void)|undefined
  await page.route("**/api/v1/match/overview",async r=>{
    await new Promise<void>(resolve=>release=resolve);await r.fulfill({json:overview()}).catch(()=>{})
  })
  await page.goto("/match");await search(page)
  await expect(results(page)).toBeVisible()
  await expect(summary(page)).toContainText("Reading historical findings")
  await results(page).locator('button[aria-pressed="false"]').first().click()
  await expect(page.getByRole("complementary",{name:"Selected deviation",exact:true})).toContainText(details[0].pr_id)
  release!();await expect(summary(page)).toContainText("Fictional historical records")
})

test("overview failures stay contained and can be retried",async({page})=>{
  let calls=0
  await page.route("**/api/v1/match/overview",r=>++calls===1?r.fulfill({status:503,json:{detail:"test failure"}}):r.fulfill({json:overview()}))
  await page.goto("/match");await search(page)
  await expect(results(page)).toBeVisible()
  await summary(page).getByRole("button",{name:"Retry overview",exact:true}).click()
  await expect(summary(page)).toContainText("Fictional historical records")
  expect(calls).toBe(2)
})

test("a different search or source version cannot supply overview evidence",async({page})=>{
  await page.route("**/api/v1/match/overview",r=>r.fulfill({json:{...overview(),source_snapshot_id:"b".repeat(64)}}))
  await page.goto("/match");await search(page)
  await expect(summary(page)).toContainText("overview is unavailable")
  await expect(summary(page).getByText("Fictional historical records describe HPLC calibration issues.")).toHaveCount(0)
  await expect(results(page)).toBeVisible()
})

test("natural filter-only browsing preserves submitted query and displays applied criteria",async({page})=>{
  await page.route("**/api/v1/match/search",r=>{
    const value=assisted(r.request().postDataJSON())
    return r.fulfill({json:{...value,search_mode:"browse",total_matches:3,interpretation:{query:"",origin:"llm"},
      filters:{...value.filters,years:[2026]},results:value.results.map(row=>({...row,match_kind:"browse",match_score:null,relevance_score:undefined}))}})
  })
  await page.goto("/match");await search(page,"show deviations in 2026")
  await expect(results(page)).toContainText("Year: 2026")
  await expect(page.getByLabel("Search interpretation")).toContainText("Browsing:")
  await expect(box(page)).toHaveValue("show deviations in 2026")
})

test("an overview from a previous search cannot replace current evidence",async({page})=>{
  let release:(()=>void)|undefined
  await page.route("**/api/v1/match/search",r=>r.fulfill({json:assisted(r.request().postDataJSON(),r.request().postDataJSON().query==="first issue"?token:"c".repeat(32))}))
  await page.route("**/api/v1/match/overview",async r=>{
    const id=r.request().postDataJSON().search_id
    if(id===token)await new Promise<void>(resolve=>release=resolve)
    const value=overview(id)
    value.lines[0].text=id===token?"OLD fictional evidence":"CURRENT fictional evidence"
    await r.fulfill({json:value}).catch(()=>{})
  })
  await page.goto("/match");await search(page,"first issue")
  await expect.poll(()=>!!release).toBe(true)
  await search(page,"second issue")
  await expect(summary(page)).toContainText("CURRENT fictional evidence")
  release!()
  await expect(summary(page)).not.toContainText("OLD fictional evidence")
})
