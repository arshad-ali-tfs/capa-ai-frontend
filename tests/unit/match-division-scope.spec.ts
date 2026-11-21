import {test,expect} from "@playwright/test"
import {scopeFilters,parseScopeFilters,parseStatusCounts,rowMatchesScope} from "../../src/features/match/scopeModel"
import {emptyFilters,filterKey,filterChips} from "../../src/features/match/searchModel"
import {parseFilters} from "../../src/features/match/services/parse"
import {parseWatchlist} from "../../src/features/match/watchlist"
import {parseSearchResponse} from "../../src/features/match/services/parse"
import {assisted} from "../fixtures/match-assist"
import {watchlist} from "../fixtures/match-watchlist"

test("division/scope filters have deterministic keys and visible removable chips",()=>{
  const filters={...emptyFilters(),divisions:["DSD"," DPD ","DPD"],record_scope:"all" as const,include_cancelled:true}
  expect(scopeFilters(filters).divisions).toEqual(["DPD","DSD"])
  expect(filterKey(filters)).toBe(filterKey({...filters,divisions:["DPD","DSD"]}))
  expect(filterChips(filters).map(chip=>chip.label)).toEqual(expect.arrayContaining(["Division: DPD","Division: DSD","Investigation status: All investigations","Include cancelled"]))
  expect(filterKey(filters)).not.toBe(filterKey({...filters,include_cancelled:false}))
})
test("legacy saved filters acquire the completed-only default without losing previous criteria",()=>{
  const value=emptyFilters();delete value.divisions;delete value.statuses;delete value.record_scope;delete value.include_cancelled
  const parsed=parseFilters({...value,criticalities:["Critical"]})
  expect(parsed.record_scope).toBe("completed");expect(parsed.divisions).toEqual([]);expect(parsed.criticalities).toEqual(["Critical"])
  expect(parseFilters({...value,status:"open"}).record_scope).toBe("ongoing")
})
test("invalid workflow values and non-numeric counts are rejected",()=>{
  for(const change of [{divisions:[""]},{statuses:[42]},{record_scope:"open-ish"},{include_cancelled:"true"}])expect(()=>parseScopeFilters(change)).toThrow()
  expect(parseStatusCounts({completed:2,ongoing:1,cancelled:0,other:0})?.ongoing).toBe(1)
  expect(()=>parseStatusCounts({completed:2,ongoing:"1",cancelled:0,other:0})).toThrow()
})
test("result rows must match the effective division and workflow scope",()=>{
  const filters={...emptyFilters(),divisions:["DPD"]}
  expect(rowMatchesScope({division:"DPD",status:"Closed - Done"},filters)).toBe(true)
  for(const row of [{division:"DSD",status:"Closed - Done"},{division:"DPD",status:"Open - Investigation"},{division:"DPD",status:"Closed - Cancelled"}])expect(rowMatchesScope(row,filters)).toBe(false)
  expect(rowMatchesScope({division:"DPD",status:"Closed - Cancelled"},{...filters,record_scope:"all",include_cancelled:true})).toBe(true)
})
test("watchlist refuses a different division scope and contradictory status counts",()=>{
  const row=parseSearchResponse(assisted({query:"calibration",all_sites:true,mode:"auto",offset:0,top_k:10})).rows[0]
  const filters={...emptyFilters(),divisions:["DPD"]}
  const value={...watchlist(row.deviationId,row.site),filters:scopeFilters(filters),selected_in_scope:true,status_counts:{completed:4,ongoing:0,cancelled:0,other:0}}
  expect(parseWatchlist(value,row,"2026-11-21",filters).scope_record_count).toBe(4)
  expect(()=>parseWatchlist(value,row,"2026-11-21",{...filters,divisions:["DSD"]})).toThrow()
  expect(()=>parseWatchlist({...value,status_counts:{completed:4,ongoing:1,cancelled:0,other:0}},row,"2026-11-21",filters)).toThrow()
})
