import { test, expect } from "@playwright/test"
import fs from "node:fs"
import { onTimeClosureMetrics } from "../../src/features/map/deadlines"
import { filterRecords, getFilterOptions, emptyMapFilters } from "../../src/features/map/utils"
import { validateDataset } from "../../src/features/map/services/mapService"
import { LINKED_CAPA, NO_CAPA_LINK, PAST_DUE } from "../../src/features/map/recordFilters"
import type { MapDataset } from "../../src/features/map/types"
const fixture: MapDataset = JSON.parse(fs.readFileSync(new URL("../fixtures/map-dataset.json",import.meta.url),"utf8"))

function data() {
  const result = structuredClone(fixture)
  result.records = ([
    ["Minor","closed_on_time"], ["Minor","closed_late"],
    ["Major","closed_on_time"], ["Major","closed_late"],
    ["Critical","open_overdue"], ["Critical","cancelled"], ["Unclassified","closed_on_time"],
  ] as const).map(([criticality,dueStatus],index)=>({
    ...structuredClone(fixture.records[0]), id:String(index), criticality, dueStatus,
    dueDate:"2026-01-10", closedDate:dueStatus==="open_overdue"?null:dueStatus==="closed_late"?"2026-01-11":"2026-01-10",
  }))
  result.analysis.recordCount=result.records.length
  result.analysis.sourceAvailable=true
  result.analysis.deadlineAsOf="2026-11-20"
  result.clusters[0].parentTheme="Analytical testing"
  result.capas=[
    {id:"DONE",description:"Fictional shared action",status:"Closed - Done",recordIds:["0","1"]},
    {id:"OPEN",description:"Fictional open action",status:"Implementation",recordIds:["1"]},
  ]
  return result
}

test("on-time rates use assessable closures for each criticality and never turn missing data into 0%",()=>{
  const result=onTimeClosureMetrics(data().records)
  expect(result.eligible).toBe(5)
  expect(result.onTime).toBe(3)
  expect(result.levels).toEqual([
    {label:"Minor",eligible:2,onTime:1}, {label:"Major",eligible:2,onTime:1}, {label:"Critical",eligible:0,onTime:0},
  ])
  expect(result.unknownCriticality).toBe(1)
  expect(onTimeClosureMetrics(fixture.records).eligible).toBe(0)
})

test("CAPA linkage and exact source status filter deviations, including shared CAPAs",()=>{
  const value=data()
  expect(filterRecords(value.records,{...emptyMapFilters(),capaLink:LINKED_CAPA},value).map(r=>r.id)).toEqual(["0","1"])
  expect(filterRecords(value.records,{...emptyMapFilters(),capaStatus:"Implementation",dueStatus:"Closed late"},value).map(r=>r.id)).toEqual(["1"])
  expect(filterRecords(value.records,{...emptyMapFilters(),capaLink:NO_CAPA_LINK},value).map(r=>r.id)).toEqual(["2","3","4","5","6"])
  expect(filterRecords(value.records,{...emptyMapFilters(),capaLink:NO_CAPA_LINK,capaStatus:"Closed - Done"},value)).toHaveLength(0)
})

test("unknown CAPA source coverage cannot masquerade as no linked CAPA",()=>{
  const value=data();value.analysis.sourceAvailable=false
  expect(filterRecords(value.records,{...emptyMapFilters(),capaLink:NO_CAPA_LINK},value)).toHaveLength(0)
  expect(getFilterOptions(value.records,"capaLink",value)).toEqual(["Not available"])
  expect(getFilterOptions(fixture.records,"dueStatus",fixture)).toEqual(["Not available"])
})

test("past due distinguishes closed late from open overdue and combines with cluster groups",()=>{
  const value=data()
  expect(filterRecords(value.records,{...emptyMapFilters(),dueStatus:PAST_DUE},value).map(r=>r.id)).toEqual(["1","3","4"])
  expect(filterRecords(value.records,{...emptyMapFilters(),dueStatus:"Open overdue",clusterGroup:"Analytical testing"},value).map(r=>r.id)).toEqual(["4"])
  expect(filterRecords(value.records,{...emptyMapFilters(),clusterGroup:"Packaging and labelling"},value)).toHaveLength(0)
})

test("dataset validation rejects impossible deadline dates, statuses and contradictory outcomes",()=>{
  // Keep the original fixture's membership/context constraints intact here.
  const original=structuredClone(fixture)
  Object.assign(original.records[0],{dueDate:"2026-01-10",closedDate:"2026-01-10",dueStatus:"closed_on_time"})
  expect(()=>validateDataset(original)).not.toThrow()
  for(const fields of [
    {dueDate:"2026-02-30"},{dueStatus:"guessed"},{dueStatus:"closed_late"},
    {closedDate:null},{dueStatus:"open_overdue"},
  ]) {
    const invalid=structuredClone(original)
    Object.assign(invalid.records[0],fields)
    expect(()=>validateDataset(invalid)).toThrow(/invalid dataset/)
  }
})
