import {test,expect,type Page} from "@playwright/test"
import {index,details} from "./fixtures/match-dataset"
import {filterResponse} from "./fixtures/match-explorer"
import {assisted} from "./fixtures/match-assist"
import {verifiedOverview,gapOverview,unavailableOverview} from "./fixtures/match-overview-recovery"
const panel=(page:Page)=>page.getByRole("region",{name:"Evidence overview",exact:true})
const results=(page:Page)=>page.getByRole("region",{name:"Search results",exact:true})
test.beforeEach(async({page})=>{
  await page.route("**/api/v1/match/index",r=>r.fulfill({json:index}))
  await page.route("**/api/v1/match/facets",r=>r.fulfill({json:filterResponse(r.request().postDataJSON())}))
  await page.route("**/api/v1/match/search",r=>r.fulfill({json:assisted(r.request().postDataJSON())}))
  await page.route("**/api/v1/match/cases",r=>r.fulfill({json:{items:[]}}))
  await page.route("**/api/v1/match/matched-records/*?*",r=>r.fulfill({json:details[0]}))
})
async function search(page:Page){
  await page.goto("/match");await page.getByRole("textbox",{name:"Search history",exact:true}).fill("What actions resolved the calibration failure?")
  await page.getByRole("button",{name:"Search",exact:true}).click();await expect(results(page)).toBeVisible()
}
test("automatic retry produces a cited answer while source details remain usable",async({page})=>{
  let calls=0
  await page.route("**/api/v1/match/overview",r=>++calls===1?r.fulfill({status:503,json:{detail:"Fictional temporary outage"}}):r.fulfill({json:verifiedOverview(r.request().postDataJSON().search_id)}))
  await search(page);await expect(panel(page)).toContainText("Cited answer")
  expect(calls).toBe(2);await expect(panel(page).getByRole("button",{name:"Retry overview",exact:true})).toHaveCount(0)
  await panel(page).getByText("Supporting source quotes",{exact:true}).click();await expect(panel(page).locator("blockquote")).toBeVisible()
  await results(page).locator('button[aria-pressed="false"]').first().click()
  await expect(page.getByRole("complementary",{name:"Selected deviation",exact:true})).toContainText(details[0].pr_id)
})
test("an unsupported question clearly reports insufficient evidence without a retry request",async({page})=>{
  let calls=0;await page.route("**/api/v1/match/overview",r=>{calls++;return r.fulfill({json:gapOverview(r.request().postDataJSON().search_id)})})
  await search(page);await expect(panel(page)).toContainText("Not enough evidence")
  await expect(panel(page)).toContainText("do not establish which action")
  await expect(panel(page)).not.toContainText("Cited answer");expect(calls).toBe(1)
  await expect(panel(page).getByRole("button",{name:"Retry overview",exact:true})).toHaveCount(0)
})
test("exhausted service retries do not claim the source evidence is missing",async({page})=>{
  let calls=0;await page.route("**/api/v1/match/overview",r=>{calls++;return r.fulfill({json:unavailableOverview(r.request().postDataJSON().search_id)})})
  await search(page);await expect(panel(page)).toContainText("Could not verify answer")
  await expect(panel(page)).toContainText("does not establish that the records lack an answer")
  await expect(panel(page)).not.toContainText("Not enough evidence");await expect(panel(page)).not.toContainText("Cited answer")
  await expect(panel(page).getByRole("button",{name:"Retry overview",exact:true})).toHaveCount(0)
  expect(calls).toBe(1);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})
