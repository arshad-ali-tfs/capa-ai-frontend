import {test,expect} from "@playwright/test"
import fs from "node:fs"
import {index,snapshotId} from "./fixtures/match-dataset"
import {filterResponse,explorerRows} from "./fixtures/match-explorer"
import {assisted,overview,token} from "./fixtures/match-assist"

test("a missing tab-stored search never silently becomes an all-record browse",async({page})=>{
  let searches=0
  await page.route("**/api/v1/match/index",r=>r.fulfill({json:index}))
  await page.route("**/api/v1/match/facets",r=>r.fulfill({json:filterResponse(r.request().postDataJSON())}))
  await page.route("**/api/v1/match/cases",r=>r.fulfill({json:{items:[]}}))
  await page.route("**/api/v1/match/search",r=>{searches++;return r.fulfill({json:assisted(r.request().postDataJSON())})})
  await page.goto("/match?search=1&state=01234567-0123-4123-8123-012345678901")
  await expect(page.getByText(/This long search is no longer retained/)).toBeVisible()
  expect(searches).toBe(0)
})

test("MATCH preserves the source, restores a draft, and reopens excluded evidence without a new source lookup",async({page})=>{
  let response:any,saved:any,sourceCalls=0,searches=0
  const source=(id:string)=>({pr_id:id,site:explorerRows.find(row=>row.pr_id===id)!.site,source_snapshot_id:snapshotId,
    indexed_field_texts:{DETAILED_DESCRIPTION:"Normalized retrieval copy."},
    original_field_texts:{DETAILED_DESCRIPTION:"Original limit <0.10%; observed result >0.20%.",CONCLUSION:"Root cause was a fictional procedural error. Corrective action: revised verification instructions."},related_capas:[]})
  await page.route("**/api/v1/match/index",r=>r.fulfill({json:index}))
  await page.route("**/api/v1/match/facets",r=>r.fulfill({json:filterResponse(r.request().postDataJSON())}))
  await page.route("**/api/v1/match/search",r=>{searches++;response={...assisted(r.request().postDataJSON()),search_id:token,index_generation:"generation-1"};return r.fulfill({json:response})})
  await page.route("**/api/v1/match/overview",r=>r.fulfill({json:overview()}))
  await page.route("**/api/v1/match/matched-records/*?*",r=>{sourceCalls++;return r.fulfill({json:source(decodeURIComponent(new URL(r.request().url()).pathname.split("/").at(-1)!))})})
  await page.route("**/api/v1/match/cases",r=>{
    if(r.request().method()==="GET")return r.fulfill({json:{items:saved?[saved]:[]}})
    const body=r.request().postDataJSON()
    saved={...body,id:"d".repeat(32),created_at:"2026-11-20T12:00:00Z",revision:1,result:response,
      sources:body.decisions.map((item:any)=>source(item.pr_id)),overview:overview(),source_changed:false,index_changed:false}
    return r.fulfill({status:201,json:saved})
  })
  await page.route("**/api/v1/match/cases/*",r=>r.fulfill({json:saved}))
  await page.goto("/match")
  await page.getByRole("textbox",{name:"Search history",exact:true}).fill("Instrument verification failures")
  await page.getByRole("button",{name:"Search",exact:true}).click()
  await page.getByLabel("Add case to comparison",{exact:true}).selectOption(explorerRows[0].pr_id)
  await page.getByLabel(`Evidence decision for ${explorerRows[0].pr_id}`,{exact:true}).selectOption("exclude")
  await page.getByLabel(`Rationale for ${explorerRows[0].pr_id}`,{exact:true}).fill("Different mechanism; retain source to explain exclusion.")
  await page.getByText("Save investigation and rationale",{exact:true}).click()
  await page.getByLabel("Investigation title",{exact:true}).fill("Fictional verification investigation")
  await page.getByLabel("Investigator",{exact:true}).fill("Fictional quality reviewer")
  await page.reload()
  await expect(page.getByText(/Investigation draft restored in this browser tab/)).toBeVisible()
  await expect(page.getByLabel(`Rationale for ${explorerRows[0].pr_id}`,{exact:true})).toHaveValue("Different mechanism; retain source to explain exclusion.")
  await page.getByText("Save investigation and rationale",{exact:true}).click()
  await expect(page.getByLabel("Investigation title",{exact:true})).toHaveValue("Fictional verification investigation")
  await page.getByRole("button",{name:"Save investigation",exact:true}).click()
  await expect(page.getByText("Saved investigation · Fictional verification investigation",{exact:true})).toBeVisible()
  expect(saved.decisions[0].disposition).toBe("exclude")
  const before=sourceCalls,searchesBefore=searches
  await page.reload()
  await expect(page.getByRole("table",{name:"Historical case comparison"})).toBeVisible()
  await page.getByRole("table",{name:"Historical case comparison"}).getByRole("button",{name:explorerRows[0].pr_id,exact:true}).click()
  const narrative=page.getByRole("region",{name:"Selected source narrative",exact:true})
  await expect(narrative).toContainText("Original limit <0.10%; observed result >0.20%.")
  await expect(narrative).not.toContainText("Normalized retrieval copy")
  expect(sourceCalls).toBe(before);expect(searches).toBe(searchesBefore)
})

test("MAP splits into a subgroup in one save and navigates to the reviewed assignment",async({page})=>{
  const value=JSON.parse(fs.readFileSync(new URL("./fixtures/map-dataset.json",import.meta.url),"utf8"))
  const record=value.records[0];record.originalClusterId=record.clusterId
  value.review={revision:0,themes:["Analytical testing","Other / needs classification"],taxonomyVersion:"v1",clusters:{},assignments:{},history:[]}
  const writes:any[]=[]
  await page.route("**/dataset",r=>r.fulfill({json:value}))
  await page.route("**/api/v1/map/runs?*",r=>r.fulfill({json:{items:[]}}))
  await page.route("**/curation",r=>{
    const body=r.request().postDataJSON();writes.push(body)
    const original=value.clusters[0]
    value.clusters.push({...original,id:body.cluster_id,title:body.title,shortTitle:body.title,subtitle:body.title,capas:[],parentTheme:body.theme,match:null})
    record.clusterId=body.cluster_id;record.assignmentReview={clusterId:body.cluster_id,reviewer:body.reviewer,rationale:body.rationale,updatedAt:"2026-11-20"}
    value.review.revision=1
    return r.fulfill({json:value.review})
  })
  await page.goto(`/map/clusters/${record.clusterId}/evidence/${record.id}`)
  await page.getByRole("button",{name:"Move or split this record",exact:true}).click()
  await expect(page.getByRole("button",{name:"Refresh data",exact:true})).toBeDisabled()
  await page.getByLabel("Target cluster",{exact:true}).selectOption("new")
  await page.getByLabel("Cluster title",{exact:true}).fill("Fictional separate mechanism")
  await page.getByLabel("Reviewer",{exact:true}).fill("Fictional reviewer")
  await page.getByLabel("Grouping rationale",{exact:true}).fill("The documented mechanism differs from the original group.")
  await page.getByRole("button",{name:"Save grouping review",exact:true}).click()
  await expect(page).toHaveURL(/clusters\/review-[a-f0-9]+\/evidence\//)
  expect(writes).toHaveLength(1);expect(writes[0].operation).toBe("split");expect(writes[0].expected_revision).toBe(0)
  await expect(page.getByText("Last assignment review:",{exact:false})).toContainText("Fictional reviewer")
  await expect(page.getByRole("button",{name:"Refresh data",exact:true})).toBeEnabled()
})
