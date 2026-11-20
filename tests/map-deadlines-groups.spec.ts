import { test, expect, type Page } from "@playwright/test"
import fs from "node:fs"
const fixture=JSON.parse(fs.readFileSync(new URL("./fixtures/map-dataset.json",import.meta.url),"utf8"))
function value() {
  const data=structuredClone(fixture)
  const first=data.records[0], second=data.records.find((r:any)=>r.clusterId!==first.clusterId)||first
  data.records=[
    {...first,id:"D-ONTIME",criticality:"Minor",dueDate:"2026-01-10",closedDate:"2026-01-10",dueStatus:"closed_on_time"},
    {...first,id:"D-LATE",criticality:"Minor",dueDate:"2026-01-10",closedDate:"2026-01-11",dueStatus:"closed_late"},
    {...second,id:"D-OPEN",criticality:"Critical",status:"Open",dueDate:"2026-01-10",closedDate:null,dueStatus:"open_overdue"},
  ]
  data.analysis.recordCount=3;data.analysis.deadlineAsOf="2026-11-20";data.analysis.sourceAvailable=true
  data.capas=[
    {id:"C-DONE",description:"Fictional shared action",status:"Closed - Done",recordIds:["D-ONTIME","D-LATE"]},
    {id:"C-OPEN",description:"Fictional open action",status:"Implementation",recordIds:["D-LATE"]},
  ]
  for(const [index,c] of data.clusters.entries()) {
    c.parentTheme=index?"Packaging and labelling":"Analytical testing"
    c.capas=data.capas.filter((capa:any)=>capa.recordIds.some((id:string)=>data.records.some((r:any)=>r.id===id&&r.clusterId===c.id)))
    if(c.analysisContext)c.analysisContext.recordCount=data.records.filter((r:any)=>r.clusterId===c.id).length
  }
  return data
}
async function mock(page:Page,data=value()) {
  await page.route("**/map/dataset",route=>route.fulfill({json:data}))
  await page.route("**/api/v1/map/runs?*",route=>route.fulfill({json:{items:[]}}))
}
test("closure KPI shows criticality rates and excludes open records without inventing zero percent",async({page})=>{
  await mock(page);await page.goto("/map")
  const breakdown=page.getByLabel("On-time closure by criticality",{exact:true})
  const minor=breakdown.locator("div").filter({has:page.getByText("Minor",{exact:true})})
  await expect(minor).toContainText("50.0%")
  await expect(minor).toContainText("1 of 2 closed")
  await expect(breakdown.locator("dd").nth(2)).toContainText("—")
  await expect(page.getByText("Active clusters",{exact:true})).toHaveCount(0)
  await page.getByRole("button",{name:"About On-time closure",exact:true}).click()
  await expect(page.getByRole("tooltip")).toContainText("Same-day closure counts as on time")
  await page.keyboard.press("Escape")
})

test("CAPA and deadline filters combine, persist through groups/detail/evidence/reload, and clear together",async({page})=>{
  await mock(page);await page.goto("/map")
  await page.getByRole("combobox",{name:"CAPA linkage",exact:true}).selectOption("Linked CAPA")
  await page.getByRole("combobox",{name:"CAPA status",exact:true}).selectOption("Implementation")
  await page.getByRole("combobox",{name:"Due-date status",exact:true}).selectOption("Closed late")
  await page.getByRole("button",{name:/^Analytical testing/}).click()
  await expect(page).toHaveURL(/clusterGroup=Analytical/)
  await page.locator('a[href*="/map/clusters/"]').filter({visible:true}).first().click()
  const record=page.getByRole("link",{name:"Open evidence review for D-LATE",exact:true}).filter({visible:true}).first()
  await expect(record).toBeVisible();await record.click()
  await expect(page).toHaveURL(/evidence\/D-LATE/)
  await expect(page.getByText(/Due .*Closed .*Closed late/)).toBeVisible()
  await page.getByRole("link",{name:"Cluster overview",exact:true}).click()
  await page.reload()
  await expect(page.getByRole("combobox",{name:"CAPA status",exact:true})).toHaveValue("Implementation")
  await expect(page.getByRole("combobox",{name:"Due-date status",exact:true})).toHaveValue("Closed late")
  await expect(page.getByRole("button",{name:/^Analytical testing/})).toHaveAttribute("aria-pressed","true")
  await page.getByRole("button",{name:"Clear all",exact:true}).click()
  await expect(page.getByRole("combobox",{name:"CAPA status",exact:true})).toHaveValue("All")
  await expect(page.getByRole("button",{name:/^All groups/})).toHaveAttribute("aria-pressed","true")
  expect(new URL(page.url()).searchParams.has("clusterGroup")).toBe(false)
})

test("open overdue and no-link filters preserve empty and missing-source states honestly",async({page})=>{
  const data=value();await mock(page,data);await page.goto("/map")
  await page.getByRole("combobox",{name:"Due-date status",exact:true}).selectOption("Open overdue")
  await page.getByRole("combobox",{name:"CAPA linkage",exact:true}).selectOption("No retained CAPA link")
  await expect(page.getByRole("region",{name:"Analysis KPIs",exact:true})).toContainText("Out of 1 deviation")
  await page.getByRole("combobox",{name:"CAPA status",exact:true}).selectOption("Closed - Done")
  await expect(page.getByRole("region",{name:"Analysis KPIs",exact:true})).toContainText("Out of 0 deviations")
  await page.getByRole("button",{name:"Clear all",exact:true}).click()
  data.analysis.sourceAvailable=false
  for(const r of data.records){delete r.dueDate;delete r.closedDate;delete r.dueStatus}
  await page.reload()
  await expect(page.getByRole("combobox",{name:"CAPA linkage",exact:true})).toBeDisabled()
  await expect(page.getByRole("combobox",{name:"Due-date status",exact:true})).toBeDisabled()
  await expect(page.getByText("No closed deviations with valid due and closure dates.",{exact:true})).toBeVisible()
})

test("cluster groups retain source filters and old theme links, and fit a narrow screen",async({page})=>{
  await mock(page);await page.goto("/map?theme=Analytical%20testing")
  const group=page.getByRole("button",{name:/^Analytical testing/})
  await expect(group).toHaveAttribute("aria-pressed","true")
  await page.getByRole("combobox",{name:"Due-date status",exact:true}).selectOption("Closed on time")
  await expect(page).not.toHaveURL(/[?&]theme=/)
  await expect(group).toContainText("1 deviation")
  await page.setViewportSize({width:320,height:844})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false)
  expect(await page.getByLabel("On-time closure by criticality").locator("dd").evaluateAll(cells=>cells.every(cell=>cell.scrollWidth<=cell.clientWidth))).toBe(true)
})
