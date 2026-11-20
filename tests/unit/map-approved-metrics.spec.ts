import { test,expect } from "@playwright/test"
import fs from "node:fs"
import { overviewMetrics,formatShare } from "../../src/features/map/overviewMetrics"
import type { MapDataset } from "../../src/features/map/types"
const fixture:MapDataset=JSON.parse(fs.readFileSync(new URL("../fixtures/map-dataset.json",import.meta.url),"utf8"))

test("top three DR types use all deviations for individual and cumulative percentages",()=>{
  const records=[...Array(4).fill("A"),...Array(3).fill("B"),...Array(2).fill("C"),"D","Not provided"].map((drType,index)=>({...fixture.records[0],id:String(index),drType,volume:1}))
  const result=overviewMetrics(records,[],true)
  expect(result.topDrTypes).toEqual([{label:"A",count:4},{label:"B",count:3},{label:"C",count:2}])
  expect(result.topDrCumulativeCount).toBe(9)
  expect(formatShare(result.topDrCumulativeCount,result.total)).toBe("81.8%")
  expect(result.unknownDrType).toBe(1)
})

test("implemented and raised count distinct CAPAs, including a shared CAPA only once",()=>{
  const [a,b,c]=fixture.records
  const capa=(id:string,status:string,recordIds:string[])=>({id,status,recordIds,description:"Fictional action"})
  const shared=capa("shared","Closed - Done",[a.id,b.id])
  const all=[shared,shared,capa("second","Closed - Done",[a.id]),capa("cancelled","Closed - Cancelled",[c.id]),capa("open","Implementation",[c.id])]
  const result=overviewMetrics(fixture.records,all,true)
  expect(result.implemented).toBe(2);expect(result.raised).toBe(4)
  expect(formatShare(result.implemented!,result.raised!)).toBe("50.0%")
  const restricted=overviewMetrics([c],all,true)
  expect(restricted.implemented).toBe(0);expect(restricted.raised).toBe(2)
  expect(overviewMetrics([a],[],true).raised).toBe(0)
  expect(formatShare(0,0)).toBe("—")
})

test("third-place ties are deterministic without counting an extra DR type",()=>{
  const records=["A","A","B","C","D"].map((drType,index)=>({...fixture.records[0],id:String(index),drType,volume:1}))
  const result=overviewMetrics(records,[],true)
  expect(result.topDrTypes.map(type=>type.label)).toEqual(["A","B","C"])
  expect(result.drTypeCutoffTied).toBe(true)
  expect(result.topDrCumulativeCount).toBe(4)
})
