import { test, expect } from "@playwright/test"
import { parseFilterOptions, parseRecordDetail, parseSearchResponse } from "../../src/features/match/services/parse"
import { details } from "../fixtures/match-dataset"
import { canonicalFilters, dateError, emptyFilters, filterChips, filterKey, inputKey, validQuery } from "../../src/features/match/searchModel"
import { explorerResponse, filterResponse } from "../fixtures/match-explorer"

test("browse and literal results retain truthful totals without a fabricated similarity score", () => {
  const result = parseSearchResponse(explorerResponse({query:"",all_sites:true,top_k:2}))
  expect(result.searchMode).toBe("browse")
  expect(result.totalMatches).toBe(3)
  expect(result.eligibleCount).toBe(3)
  expect(result.rows).toHaveLength(2)
  expect(result.hasMore).toBe(true)
  expect(result.rows.every(row=>row.score==="")).toBe(true)
  const literal = parseSearchResponse(explorerResponse({query:"EQ-104",all_sites:true}))
  expect(literal.requiredIdentifiers).toEqual(["EQ-104"])
  expect(literal.rows[0].reasons).toContain("Identifier EQ-104 found in retained source text")
})

test("source highlight spans preserve Unicode and reject invalid or overlapping evidence offsets", () => {
  const result=explorerResponse({query:"EQ-104",all_sites:true})
  const row=result.results[0]
  row.matched_excerpt="🧪 EQ-104 <literal>"
  row.matched_spans=[{start:2,end:8}]
  const parsed=parseSearchResponse({...result,results:[row],result_count:1})
  const span=parsed.rows[0].spans[0]
  expect(parsed.rows[0].excerpt.slice(span.start,span.end)).toBe("EQ-104")
  for (const bad of [[{start:-1,end:2}],[{start:4,end:400}],[{start:2,end:8},{start:4,end:9}],[{start:4,end:4}]]) {
    expect(()=>parseSearchResponse({...result,results:[{...row,matched_spans:bad}],result_count:1})).toThrow("unexpected response")
  }
})

test("search responses reject misleading counts, modes and score types", () => {
  const value=explorerResponse({query:"",all_sites:true})
  for (const patch of [
    {eligible_record_count:4}, {total_matches:1}, {has_more:true}, {search_mode:"made-up"}, {limit:0},
    {search_mode:"hybrid",results:value.results.map(row=>({...row,match_kind:"hybrid",match_score:null}))},
  ]) expect(()=>parseSearchResponse({...value,...patch})).toThrow("unexpected response")
})

test("event-aware relevance is labelled separately from its retained narrative score", () => {
  const value=explorerResponse({query:"instrument drift",mode:"semantic",all_sites:true})
  const result=parseSearchResponse({...value,ranking_explanation:"Relevance combines narrative and the recorded event title.",results:value.results.map(row=>({...row,relevance_score:.71}))})
  expect(result.rows[0].scoreLabel).toBe("Relevance score")
  expect(result.rows[0].score).toBe("0.710")
  expect(result.rankingHelp).toContain("recorded event title")
  expect(()=>parseSearchResponse({...value,results:value.results.map(row=>({...row,relevance_score:1.1}))})).toThrow("unexpected response")
})

test("additional investigation evidence remains separate from the embedded fields", () => {
  const result=parseSearchResponse(explorerResponse({query:"EQ-104",all_sites:true}))
  const original="FICTIONAL: EQ-104; concentration <0.1 mg/mL and pressure >10 psi."
  const detail=parseRecordDetail({...details[0],literal_field_texts:{INVESTIGATION:original}},result.rows[0])
  expect(detail.literalSections).toEqual([{label:"Investigation",text:original}])
  expect(detail.sections).toHaveLength(2)
  expect(()=>parseRecordDetail({...details[0],literal_field_texts:{INVESTIGATION:42}},result.rows[0])).toThrow("unexpected response")
})

test("facets validate their scope counts and preserve selected source filter values", () => {
  const value=filterResponse({filters:{criticalities:["Major"]}})
  const result=parseFilterOptions(value)
  expect(result.eligibleCount).toBe(1)
  expect(result.facets.criticalities).toHaveLength(3)
  expect(result.filters.criticalities).toEqual(["Major"])
  for (const patch of [{eligible_record_count:5},{missing_opened_dates:-1},{facets:{...value.facets,years:[{value:"2026",count:2}]}}])
    expect(()=>parseFilterOptions({...value,...patch})).toThrow("unexpected response")
})

test("filter keys are deterministic and metadata is visible as removable criteria", () => {
  const filters={...emptyFilters(),years:[2026,2025,2026],criticalities:["Major","Critical"]}
  expect(canonicalFilters(filters).years).toEqual([2025,2026])
  expect(filterKey(filters)).toBe(filterKey({...filters,criticalities:["Critical","Major"]}))
  expect(filterChips(filters).some(chip=>chip.label==="Criticality: Critical")).toBe(true)
  expect(dateError({...emptyFilters(),date_from:"2026-01-02",date_to:"2025-01-01"})).toContain("on or before")
  const input={query:"HPLC",site:"",topK:10,mode:"auto" as const,filters,offset:0}
  expect(inputKey(input)).toBe(inputKey({...input,query:" HPLC ",offset:20}))
})

test("blank browse, short identifiers and acronyms work; meaningless input stays invalid", () => {
  for (const query of [""," ","42","EQ1","pH","HPLC"]) expect(validQuery(query)).toBe(true)
  for (const query of ["?","___","a","x".repeat(30001)]) expect(validQuery(query)).toBe(false)
})
