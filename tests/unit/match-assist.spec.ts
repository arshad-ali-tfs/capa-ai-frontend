import {test,expect} from "@playwright/test"
import {parseEvidenceOverview,parseSearchResponse} from "../../src/features/match/services/parse"
import {emptyFilters,inputKey} from "../../src/features/match/searchModel"
import {assisted,overview,token} from "../fixtures/match-assist"

const body={query:"instrument drift",all_sites:true,mode:"auto",assist:true,top_k:10}
test("submitted criteria compare by value regardless of property order",()=>{
  const fromForm={query:body.query,site:"",topK:10,filters:emptyFilters(),mode:"auto" as const,offset:0}
  const fromApi=parseSearchResponse(assisted(body)).submittedCriteria!
  expect(inputKey(fromApi)).toBe(inputKey(fromForm))
})
test("assisted results retain original query, interpreted wording and independent summary identity",()=>{
  const parsed=parseSearchResponse(assisted(body))
  expect(parsed.query).toBe(body.query)
  expect(parsed.interpretation?.query).toContain("HPLC")
  expect(parsed.summaryId).toBe(token)
  expect(parsed.rows.every(row=>row.score==="")).toBe(true)
  expect(parseEvidenceOverview(overview(),parsed).lines).toHaveLength(3)
})
test("overview evidence rejects foreign citations, stale search IDs, extra records and wrong snapshots",()=>{
  const parsed=parseSearchResponse(assisted(body))
  for(const payload of [
    {...overview(),search_id:"b".repeat(32)},
    {...overview(),source_snapshot_id:"b".repeat(64)},
    {...overview(),reviewed_ids:["UNKNOWN"]},
    {...overview(),returned_count:99},
    {...overview(),lines:overview().lines.map(line=>({...line,references:["UNKNOWN"]}))},
  ])expect(()=>parseEvidenceOverview(payload,parsed)).toThrow()
})
test("filter-only natural language preserves original input while using truthful browse totals",()=>{
  const value=assisted(body)
  const parsed=parseSearchResponse({...value,search_mode:"browse",total_matches:3,interpretation:{query:"",origin:"llm"},
    results:value.results.map(row=>({...row,match_kind:"browse",match_score:null,relevance_score:undefined}))})
  expect(parsed.searchMode).toBe("browse")
  expect(parsed.query).toBe(body.query)
})
