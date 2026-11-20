import { test,expect } from "@playwright/test"
import fs from "node:fs"
const fixture=JSON.parse(fs.readFileSync(new URL("./fixtures/map-dataset.json",import.meta.url),"utf8"))

test("approved DR and CAPA KPIs and stacked chart reconcile with the current view",async({page})=>{
  const value=structuredClone(fixture)
  value.records[0].criticality="Minor";value.records[0].drType="A"
  value.records[1].criticality="Major";value.records[1].drType="B"
  value.records[2].criticality="Critical";value.records[2].drType="C"
  value.records.push({...structuredClone(value.records[0]),id:"EXTRA-A",drType:"A"},
    {...structuredClone(value.records[1]),id:"EXTRA-B",drType:"B"},
    {...structuredClone(value.records[0]),id:"EXTRA-U",drType:"Not provided",criticality:"Not provided",clusterId:""})
  value.analysis.recordCount=value.records.length
  value.capas=[{id:"DONE-1",status:"Closed - Done",description:"Fictional action",recordIds:[value.records[0].id,value.records[1].id]},
    {id:"DONE-2",status:"Closed - Done",description:"Fictional action",recordIds:[value.records[0].id]},
    {id:"OPEN",status:"Implementation",description:"Fictional action",recordIds:[value.records[2].id]},
    {id:"CANCELLED",status:"Closed - Cancelled",description:"Fictional action",recordIds:[value.records[2].id]}]
  await page.route("**/map/dataset",route=>route.fulfill({json:value}))
  await page.route("**/api/v1/map/runs?*",route=>route.fulfill({json:{items:[]}}))
  await page.goto("/map")
  const kpis=page.getByRole("region",{name:"Analysis KPIs",exact:true})
  const dr=kpis.getByText("Top DR types",{exact:true}).locator("..")
  await expect(dr).toContainText("83.3%")
  await expect(dr).toContainText("Top 3 combined · 5 of 6 deviations")
  await expect(dr.getByRole("listitem")).toHaveCount(3)
  const capa=kpis.getByText("CAPA implemented / raised",{exact:true}).locator("..")
  await expect(capa).toContainText("2 / 4")
  await expect(capa).toContainText("50.0%")
  const toggle=page.getByRole("group",{name:"Cluster summary view",exact:true})
  await expect(toggle.getByRole("button",{name:"Table",exact:true})).toHaveAttribute("aria-pressed","true")
  await toggle.getByRole("button",{name:"Chart",exact:true}).click()
  const chart=page.getByRole("region",{name:"Deviation volume by cluster",exact:true})
  await expect(chart).toBeVisible()
  await expect(chart).toContainText("1 unassigned deviations remain in the view total")
  const legend=chart.getByLabel("Source criticality legend")
  await expect(legend).toContainText("Minor");await expect(legend).toContainText("Major");await expect(legend).toContainText("Critical")
  await expect(chart.getByRole("button").first()).toHaveAttribute("aria-label",/Minor \d+, Major \d+, Critical \d+/)
  await expect(page.locator(".map-cluster-table")).toHaveCount(0)
  await expect(page.getByRole("heading",{name:"Deviation volume by cluster",exact:true})).toHaveCount(0)
  await page.reload()
  await expect(chart).toBeVisible()
  await toggle.getByRole("button",{name:"Table",exact:true}).click()
  await expect(chart).toHaveCount(0)
  const table=page.locator(".map-cluster-table")
  if(await table.isVisible())await expect(table.getByRole("columnheader")).toHaveText(["Cluster summary","Deviations","Minor","Major","Critical","Similarity"])
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false)
})

test("stacked cluster bars open the original cluster and retain source filters",async({page})=>{
  await page.route("**/map/dataset",route=>route.fulfill({json:fixture}))
  await page.route("**/api/v1/map/runs?*",route=>route.fulfill({json:{items:[]}}))
  await page.goto("/map")
  await page.getByRole("group",{name:"Cluster summary view"}).getByRole("button",{name:"Chart",exact:true}).click()
  const chart=page.getByRole("region",{name:"Deviation volume by cluster",exact:true})
  await chart.getByRole("button").first().click()
  await expect(page.getByRole("heading",{name:/Cluster detail/})).toBeVisible()
  await expect(page).toHaveURL(/clusterView=chart/)
  await page.getByRole("link",{name:"Cluster overview",exact:true}).click()
  await expect(chart).toBeVisible()
})
