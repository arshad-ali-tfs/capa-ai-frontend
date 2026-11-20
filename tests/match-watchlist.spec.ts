import {test,expect,type Page} from "@playwright/test"
import {index,details} from "./fixtures/match-dataset"
import {filterResponse} from "./fixtures/match-explorer"
import {assisted,overview} from "./fixtures/match-assist"
import {watchlist,quote} from "./fixtures/match-watchlist"
const results=(page:Page)=>page.getByRole("region",{name:"Search results",exact:true})
const selected=(page:Page)=>page.getByRole("complementary",{name:"Selected deviation",exact:true})
const watch=(page:Page)=>page.getByRole("tabpanel",{name:"Watchlist",exact:true})
async function search(page:Page){await page.goto("/match");await page.getByRole("textbox",{name:"Search history",exact:true}).fill("What actions addressed the calibration failure?");await page.getByRole("button",{name:"Search",exact:true}).click();await expect(results(page)).toBeVisible()}
async function openFirst(page:Page){await results(page).locator('button[aria-pressed="false"]').first().click();await expect(selected(page).getByRole("heading",{name:"Retained source text",exact:true})).toBeVisible()}
test.beforeEach(async({page})=>{
  await page.route("**/api/v1/match/index",route=>route.fulfill({json:index}))
  await page.route("**/api/v1/match/facets",route=>route.fulfill({json:filterResponse(route.request().postDataJSON())}))
  await page.route("**/api/v1/match/search",route=>route.fulfill({json:assisted(route.request().postDataJSON())}))
  await page.route("**/api/v1/match/overview",route=>route.fulfill({json:{...overview(route.request().postDataJSON().search_id),is_question:true,question_intent:"actions",answer_status:"answered",lines:[{text:"The fictional analyst corrected the instrument setup and repeated the test.",references:[details[0].pr_id]},...overview().lines.slice(1)],citations:[[{record_id:details[0].pr_id,field:"DETAILED_DESCRIPTION",start:0,end:quote.length,quote}],[]]}}))
  await page.route("**/api/v1/match/matched-records/*?*",route=>{
    const id=decodeURIComponent(new URL(route.request().url()).pathname.split("/").pop()!)
    return route.fulfill({json:{...(details.find(row=>row.pr_id===id)||details[0]),pr_id:id,original_field_texts:{DETAILED_DESCRIPTION:quote}}})
  })
  await page.route("**/api/v1/match/matched-records/*/watchlist?*",route=>{
    const url=new URL(route.request().url()),id=decodeURIComponent(url.pathname.split("/").at(-2)!)
    return route.fulfill({json:watchlist(id,url.searchParams.get("site")!,url.searchParams.get("as_of")!)})
  })
})
test("question summary leads with the answer and exposes supporting source quotes",async({page})=>{
  await search(page)
  const summary=page.getByRole("region",{name:"Evidence overview",exact:true})
  await expect(summary.getByRole("heading",{name:"Answer to your question",exact:true})).toBeVisible()
  await expect(summary).toContainText("Cited answer")
  await expect(summary).toContainText("analyst corrected the instrument setup")
  await summary.getByText("Supporting source quotes",{exact:true}).click()
  await expect(summary.getByText(quote,{exact:true})).toBeVisible()
})
test("watchlist is lazy, lives beneath badges and keeps both tabs usable without another AI summary",async({page})=>{
  let calls=0,summaries=0
  page.on("request",request=>{if(request.url().includes("/watchlist?"))calls++;if(request.url().endsWith("/overview"))summaries++})
  await search(page);await openFirst(page);expect(calls).toBe(0)
  const tab=selected(page).getByRole("tab",{name:"Watchlist",exact:true})
  expect((await tab.boundingBox())!.y).toBeGreaterThan((await selected(page).getByRole("heading").first().boundingBox())!.y)
  await tab.click();await expect(watch(page)).toContainText("EQ-001")
  await expect(watch(page)).toContainText("4 searchable deviations")
  await expect(watch(page)).toContainText("2 other records mention this equipment ID")
  await expect(watch(page)).toContainText("selected deviation is excluded")
  await selected(page).getByRole("tab",{name:"Details",exact:true}).click()
  await expect(selected(page).getByRole("heading",{name:"Retained source text",exact:true})).toBeVisible()
  await tab.click();await expect(watch(page)).toContainText("EQ-001")
  expect(calls).toBe(1);expect(summaries).toBe(1)
})
test("other historical records outside the returned candidates expose exact evidence and retained source",async({page})=>{
  await search(page);await openFirst(page);await selected(page).getByRole("tab",{name:"Watchlist",exact:true}).click()
  await watch(page).getByText(/^Supporting deviations/).click()
  await watch(page).getByText("Deviation HISTORY-1",{exact:true}).click()
  await expect(watch(page).getByRole("blockquote").first()).toContainText("EQ-001 calibration failed")
  await watch(page).getByRole("button",{name:"Read retained source for HISTORY-1",exact:true}).click()
  await expect(watch(page).getByRole("region",{name:"Source for deviation HISTORY-1",exact:true})).toContainText(quote)
})
test("watchlist failures can be retried and do not hide selected record details",async({page})=>{
  let failed=true
  await page.route("**/api/v1/match/matched-records/*/watchlist?*",async route=>{if(failed){failed=false;return route.fulfill({status:503,json:{detail:"Fictional source offline"}})}await route.fallback()})
  await search(page);await openFirst(page);await selected(page).getByRole("tab",{name:"Watchlist",exact:true}).click()
  await expect(watch(page)).toContainText("Watchlist unavailable")
  await watch(page).getByRole("button",{name:"Retry watchlist",exact:true}).click();await expect(watch(page)).toContainText("EQ-001")
  await selected(page).getByRole("tab",{name:"Details",exact:true}).click()
  await expect(selected(page).getByRole("heading",{name:"Retained source text",exact:true})).toBeVisible()
})
test("tabs support keyboard navigation and the watchlist fits a narrow phone",async({page})=>{
  await search(page);await openFirst(page)
  await selected(page).getByRole("tab",{name:"Details",exact:true}).focus();await page.keyboard.press("ArrowRight")
  await expect(selected(page).getByRole("tab",{name:"Watchlist",exact:true})).toHaveAttribute("aria-selected","true")
  await expect(watch(page)).toContainText("EQ-001")
  await page.setViewportSize({width:320,height:844})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.keyboard.press("ArrowLeft")
  await expect(selected(page).getByRole("tab",{name:"Details",exact:true})).toHaveAttribute("aria-selected","true")
})
