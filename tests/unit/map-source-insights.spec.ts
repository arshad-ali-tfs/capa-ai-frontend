import { test, expect } from "@playwright/test"
import { localCalendarDate, validateSourceInsights } from "../../src/features/map/sourceInsights"

function ranking() {return {rows:[{label:"Client A",count:3,percent:75}],knownCount:3,missingCount:1,distinctCount:1,topCount:3,topShare:75,cutoffTied:false,fields:["client"],recordedCount:3,mappedCount:0,basis:"Recorded source field",unavailableReason:""}}
function data() {return {runId:"d".repeat(32),scope:"source_snapshot",available:true,snapshotId:"a".repeat(64),asOf:"2026-11-21",dateFrom:"2025-11-21",dateTo:"2026-11-21",sourceRecordCount:10,deviationCount:7,windowDeviationCount:4,undatedCount:0,futureDatedCount:0,latestOpened:"2026-10-01",clients:ranking(),stages:ranking(),products:ranking()}}
test("full-source ranking contract preserves scope and count coverage",()=>{
  const value=validateSourceInsights(data())
  expect(value.deviationCount).toBe(7);expect(value.windowDeviationCount).toBe(4)
  expect(value.clients.missingCount).toBe(1)
})
test("inconsistent totals, duplicate ranks and invalid dates are rejected",()=>{
  for(const mutate of [
    (v:any)=>v.clients.missingCount=2,
    (v:any)=>v.clients.topCount=4,
    (v:any)=>v.clients.rows[0].percent=100,
    (v:any)=>v.dateFrom="2026-02-30",
    (v:any)=>v.dateFrom="2027-01-01",
    (v:any)=>v.clients.rows.push({...v.clients.rows[0]}),
    (v:any)=>v.windowDeviationCount=100,
    (v:any)=>v.clients.mappedCount=3,
  ]) {const value=data();mutate(value);expect(()=>validateSourceInsights(value)).toThrow()}
})
test("unavailable source is represented by unknown totals, not zero deviations",()=>{
  const value:any=data();value.available=false;value.snapshotId=null
  value.sourceRecordCount=value.deviationCount=value.windowDeviationCount=null
  for(const key of ["clients","stages","products"])value[key]={...ranking(),rows:[],knownCount:0,missingCount:0,distinctCount:0,topCount:0,topShare:0,recordedCount:0,unavailableReason:"Source unavailable"}
  expect(validateSourceInsights(value).windowDeviationCount).toBeNull()
})
test("local reporting date uses the browser calendar date",()=>{
  const date=new Date(2026,10,21,0,5)
  expect(localCalendarDate(date)).toBe("2026-11-21")
})
