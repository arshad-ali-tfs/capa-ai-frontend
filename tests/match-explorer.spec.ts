import { test, expect, type Page } from "@playwright/test"
import { index, details, sites, snapshotId } from "./fixtures/match-dataset"
import { explorerResponse, explorerRows, filterResponse } from "./fixtures/match-explorer"
import { emptyFilters } from "../src/features/match/searchModel"

const box=(page:Page)=>page.getByRole("textbox",{name:"Search history",exact:true})
const results=(page:Page)=>page.getByRole("region",{name:"Search results",exact:true})
async function mocks(page:Page,calls:any[]=[]) {
  await page.route("**/api/v1/match/index",r=>r.fulfill({json:index}))
  await page.route("**/api/v1/match/facets",r=>r.fulfill({json:filterResponse(r.request().postDataJSON())}))
  await page.route("**/api/v1/match/search",r=>{const body=r.request().postDataJSON();calls.push(body);return r.fulfill({json:explorerResponse(body)})})
  await page.route("**/api/v1/match/matched-records/*?*",r=>r.fulfill({json:details[0]}))
}
async function choose(page:Page,label:string,values:string[]) {
  await page.getByRole("button",{name:`${label} filters`,exact:true}).click()
  for(const value of values) await page.getByRole("checkbox",{name:value,exact:true}).check()
  await page.getByRole("button",{name:"Done",exact:true}).click()
}
test.beforeEach(async({page})=>{await mocks(page)})

test("filters alone browse historical records with explicit population counts and no similarity score",async({page})=>{
  const calls:any[]=[]; await mocks(page,calls)
  await page.goto("/match")
  await expect(page.getByLabel("Filter scope")).toContainText("3 deviations within filters")
  await choose(page,"Opened years",["2026"])
  await choose(page,"Criticality",["Major"])
  await expect(page.getByLabel("Filter scope")).toContainText("1 deviation within filters")
  await page.getByRole("button",{name:"Browse records",exact:true}).click()
  await expect(results(page)).toContainText("Showing 1–1 of 1 deviation")
  await expect(results(page)).toContainText("DEV-260184")
  await expect(results(page).getByText("Hybrid score",{exact:true})).toHaveCount(0)
  expect(calls[0].query).toBe("")
  expect(calls[0].filters.years).toEqual([2026])
  expect(calls[0].filters.criticalities).toEqual(["Major"])
})

test("identifier search highlights literal evidence and explains why each candidate appears",async({page})=>{
  await page.goto("/match")
  await box(page).fill("EQ-104")
  await page.getByRole("button",{name:"Search",exact:true}).click()
  await expect(results(page)).toContainText("Showing 1–2 of 2 deviations")
  await expect(results(page)).toContainText("Required identifiers: EQ-104")
  await expect(results(page).locator("mark")).toHaveText(["EQ-104","EQ104"])
  await expect(results(page).getByText("Hybrid score",{exact:true})).toHaveCount(0)
  await results(page).locator('button[aria-pressed="false"]').first().click()
  await expect(page.getByRole("list",{name:"Why this record appears",exact:true})).toContainText("Identifier EQ-104 found")
  await expect(page.getByRole("region",{name:"Selected source narrative",exact:true})).toBeVisible()
})

test("short record IDs and unknown equipment IDs do not trigger an unrelated fallback",async({page})=>{
  await page.goto("/match")
  await box(page).fill("DEV-260184")
  await page.getByRole("button",{name:"Search",exact:true}).click()
  await expect(results(page)).toContainText("Exact deviation ID")
  await expect(results(page).locator('button[aria-pressed="false"]')).toHaveCount(1)
  await box(page).fill("EQ-1040")
  await page.getByRole("button",{name:"Search",exact:true}).click()
  await expect(page.getByText(/No exact identifier match was found/)).toBeVisible()
  await expect(page.getByRole("region",{name:"Search results",exact:true})).toHaveCount(0)
})

test("year and criticality multi-selects, active chips and clear filters remain coherent",async({page})=>{
  await page.goto("/match")
  await expect(page.getByLabel("Filter scope")).toContainText("3 deviations")
  await choose(page,"Opened years",["2025","2026"])
  await choose(page,"Criticality",["Major","Critical"])
  await expect(page.getByRole("button",{name:"Remove Criticality: Critical",exact:true})).toBeVisible()
  await page.getByRole("button",{name:"Browse records",exact:true}).click()
  await expect(results(page)).toContainText("Showing 1–2 of 2 deviations")
  await page.getByRole("button",{name:"Remove Criticality: Critical",exact:true}).click()
  await expect(page.getByRole("status")).toContainText("still reflect the submitted criteria")
  await expect(results(page)).toContainText("Criticality: Critical")
  await page.getByRole("button",{name:"Clear filters",exact:true}).click()
  await expect(page.getByRole("button",{name:/Remove Criticality/})).toHaveCount(0)
})

test("date boundaries are validated and CAPA filters are sent as explicit criteria",async({page})=>{
  const calls:any[]=[]; await mocks(page,calls)
  await page.goto("/match")
  await page.getByText("More filters · department, dates and CAPA",{exact:true}).click()
  await page.getByLabel("Opened from",{exact:true}).fill("2026-09-01")
  await page.getByLabel("Opened to",{exact:true}).fill("2025-01-01")
  await expect(page.getByRole("alert")).toContainText("on or before")
  await expect(page.getByRole("button",{name:"Browse records",exact:true})).toBeDisabled()
  await page.getByLabel("Opened to",{exact:true}).fill("2026-12-31")
  await page.getByLabel("CAPA links",{exact:true}).selectOption("completed")
  await page.getByRole("button",{name:"Browse records",exact:true}).click()
  await expect(results(page)).toContainText("DEV-260184")
  expect(calls[0].filters.capa).toBe("completed")
  expect(calls[0].filters.date_from).toBe("2026-09-01")
})

test("Meaning mode uses its own score label and keeps submitted filters visible",async({page})=>{
  await page.goto("/match")
  await box(page).fill("unexpected instrument drift during verification")
  await page.getByLabel("Search mode",{exact:true}).selectOption("semantic")
  await page.getByRole("button",{name:"Search",exact:true}).click()
  await expect(results(page).getByText("Semantic score",{exact:true}).first()).toBeVisible()
  await expect(results(page)).toContainText("not an exhaustive match count")
  await box(page).fill("a different issue")
  await expect(page.getByRole("status")).toContainText("still reflect the submitted criteria")
  await expect(results(page)).toContainText("unexpected instrument drift")
})

test("source version mismatches in facets never populate filter choices",async({page})=>{
  await page.route("**/api/v1/match/facets",r=>r.fulfill({json:{...filterResponse(),source_snapshot_id:"b".repeat(64)}}))
  await page.goto("/match")
  await expect(page.getByText(/source index changed/)).toBeVisible()
  await page.getByRole("button",{name:"Opened years filters",exact:true}).click()
  await expect(page.getByRole("checkbox")).toHaveCount(0)
})

test("filter popovers support keyboard dismissal and 320px layouts retain all controls",async({page})=>{
  await page.setViewportSize({width:320,height:844})
  await page.goto("/match")
  await expect(page.getByLabel("Filter scope")).toContainText("3 deviations")
  const year=page.getByRole("button",{name:"Opened years filters",exact:true})
  await year.click()
  await page.getByRole("checkbox",{name:"2026",exact:true}).focus()
  await page.keyboard.press("Escape")
  await expect(year).toBeFocused()
  await expect(year).toHaveAttribute("aria-expanded","false")
  await page.getByText("More filters · department, dates and CAPA",{exact:true}).click()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  await box(page).fill("EQ-104")
  await page.getByRole("button",{name:"Search",exact:true}).click()
  await expect(results(page)).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
})

test("browse pages use the submitted criteria and pause pagination when the form changes",async({page})=>{
  const calls:any[]=[]
  await page.route("**/api/v1/match/index",r=>r.fulfill({json:{...index,searchable_records:25,allowed_sites:[{site:sites[0],deviation_count:25}]}}))
  await page.route("**/api/v1/match/facets",r=>r.fulfill({json:{...filterResponse(r.request().postDataJSON()),scope_record_count:25,eligible_record_count:25}}))
  await page.route("**/api/v1/match/search",r=>{
    const body=r.request().postDataJSON(); calls.push(body)
    const offset=body.offset ?? 0, limit=body.top_k
    const rows=Array.from({length:25},(_,i)=>({...explorerRows[0],pr_id:`PAGE-${String(i+1).padStart(3,"0")}`,match_kind:"browse",match_score:null,matched_spans:[],match_reasons:["Matches the applied filters"]})).slice(offset,offset+limit)
    return r.fulfill({json:{query:"",site:"All sites",all_sites:true,source_snapshot_id:snapshotId,mock_embeddings:false,requested_mode:"auto",search_mode:"browse",filters:emptyFilters(),scope_record_count:25,eligible_record_count:25,required_identifiers:[],offset,limit,has_more:offset+rows.length<25,total_matches:25,result_count:rows.length,results:rows}})
  })
  await page.goto("/match")
  await page.getByRole("button",{name:"Browse records",exact:true}).click()
  await expect(results(page)).toContainText("Showing 1–10 of 25 deviations")
  await page.getByRole("button",{name:"Next page",exact:true}).click()
  await expect(results(page)).toContainText("Showing 11–20 of 25 deviations")
  expect(calls[1].offset).toBe(10)
  await page.getByRole("button",{name:"Previous page",exact:true}).click()
  await expect(results(page)).toContainText("Showing 1–10 of 25 deviations")
  await box(page).fill("HPLC")
  await expect(page.getByRole("button",{name:"Next page",exact:true})).toBeDisabled()
  await expect(page.getByRole("status")).toContainText("still reflect the submitted criteria")
})

test("a cancelled search cannot replace the page with a late result",async({page})=>{
  let release:(()=>void)|undefined
  await page.route("**/api/v1/match/search",async route=>{
    const body=route.request().postDataJSON()
    await new Promise<void>(resolve=>{release=resolve})
    await route.fulfill({json:explorerResponse(body)}).catch(()=>{})
  })
  await page.goto("/match")
  await box(page).fill("HPLC")
  await page.getByRole("button",{name:"Search",exact:true}).click()
  await expect.poll(()=>!!release).toBe(true)
  await page.getByRole("button",{name:"Cancel search",exact:true}).click()
  release!()
  await expect(page.getByText("Search for precedent or browse filtered history",{exact:true})).toBeVisible()
  await expect(results(page)).toHaveCount(0)
})

test("local model preparation is visible while literal searches remain usable",async({page})=>{
  await page.route("**/api/v1/match/index",route=>route.fulfill({json:{...index,semantic_state:"warming"}}))
  await page.goto("/match")
  await expect(page.getByText(/Meaning search is warming up/)).toBeVisible()
  await box(page).fill("HPLC")
  await page.getByRole("button",{name:"Search",exact:true}).click()
  await expect(results(page)).toContainText("DEV-260184")
})

test("investigation-only identifier evidence is visible with its source field",async({page})=>{
  await page.route("**/api/v1/match/search",route=>{
    const response=explorerResponse(route.request().postDataJSON())
    return route.fulfill({json:{...response,results:response.results.map(row=>({...row,matched_field:"INVESTIGATION"}))}})
  })
  await page.route("**/api/v1/match/matched-records/*?*",route=>route.fulfill({json:{...details[0],literal_field_texts:{INVESTIGATION:"FICTIONAL equipment EQ-104; pressure >10 psi."}}}))
  await page.goto("/match")
  await box(page).fill("EQ-104")
  await page.getByRole("button",{name:"Search",exact:true}).click()
  await expect(results(page)).toContainText("Matched field: Investigation")
  await results(page).locator('button[aria-pressed="false"]').first().click()
  const narrative=page.getByRole("region",{name:"Selected source narrative",exact:true})
  await expect(narrative).toContainText("FICTIONAL equipment EQ-104; pressure >10 psi.")
  await expect(narrative.getByText("Literal search",{exact:true})).toBeVisible()
})
