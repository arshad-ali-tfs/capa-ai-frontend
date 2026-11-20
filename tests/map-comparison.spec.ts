import {test,expect} from "@playwright/test"
import fs from "node:fs"
const fixture=JSON.parse(fs.readFileSync(new URL("./fixtures/map-dataset.json",import.meta.url),"utf8"))
const other="a".repeat(32)

test("run comparisons remain scoped to the selected saved analysis",async({page})=>{
  const older={...fixture,analysis:{...fixture.analysis,runId:other}}
  await page.route("**/map/dataset",r=>r.fulfill({json:fixture}))
  await page.route(`**/runs/${other}/dataset`,r=>r.fulfill({json:older}))
  await page.route("**/api/v1/map/runs?*",r=>r.fulfill({json:{items:[{run_id:other,status:"completed",source_mode:"historical",records:3,created_at:"2026-01-01"}]}}))
  let wrong=false
  await page.route("**/compare?*",r=>r.fulfill({json:{runId:wrong?other:fixture.analysis.runId,otherRunId:other,sharedRecords:3,changedRecords:1,assignmentChanges:1,interpretation:"Original saved outputs, excluding reviewer overlays.",changes:[{id:fixture.records[0].id,fromCluster:"7",toCluster:"8",changedExtractionFields:["why"],sourceChanged:false,assignmentChanged:true}]}}))
  await page.goto("/map")
  await page.getByText("Analysis changes and review history",{exact:true}).click()
  await page.getByLabel("Compare with saved analysis",{exact:true}).selectOption(other)
  await page.getByRole("button",{name:"Compare saved outputs",exact:true}).click()
  await expect(page.getByText(/3 shared records/)).toContainText("1 different original assignments")
  wrong=true
  await page.getByRole("button",{name:"Compare saved outputs",exact:true}).click()
  await expect(page.getByRole("alert")).toContainText("invalid dataset")
  await page.getByRole("combobox",{name:"Analysis run",exact:true}).selectOption(other)
  await page.getByText("Analysis changes and review history",{exact:true}).click()
  await expect(page.getByText(/3 shared records/)).toHaveCount(0)
  await expect(page.getByLabel("Compare with saved analysis",{exact:true})).toHaveValue("")
})
