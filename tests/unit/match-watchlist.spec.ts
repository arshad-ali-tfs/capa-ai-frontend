import {test,expect} from "@playwright/test"
import {parseSearchResponse} from "../../src/features/match/services/parse"
import {parseWatchlist} from "../../src/features/match/watchlist"
import {parseAnswerMetadata} from "../../src/features/match/summaryEvidence"
import {assisted} from "../fixtures/match-assist"
import {watchlist,quote} from "../fixtures/match-watchlist"
const row=()=>parseSearchResponse(assisted({query:"calibration",all_sites:true,mode:"auto",offset:0,top_k:10})).rows[0]
test("watchlist keeps complete site counts and evidence outside the search's top results",()=>{
  const selected=row(),value=parseWatchlist(watchlist(selected.deviationId,selected.site),selected,"2026-11-21")
  expect(value.scope_record_count).toBe(4);expect(value.signals[0].other_record_count).toBe(2)
  expect(value.signals[0].evidence[0].pr_id).toBe("HISTORY-1")
})
test("wrong identity, scope, duplicate records and malformed evidence cannot supply a watchlist",()=>{
  const selected=row()
  for(const change of [
    (v:any)=>v.site="OTHER SITE",(v:any)=>v.pr_id="OTHER ID",(v:any)=>v.source_snapshot_id="other",
    (v:any)=>v.signals[0].other_record_count=99,(v:any)=>v.scope_record_count=5,
    (v:any)=>v.signals[0].evidence[0].pr_id=selected.deviationId,
    (v:any)=>v.signals[0].evidence[1].pr_id="HISTORY-1",
    (v:any)=>v.signals[0].evidence[0].end=1,
  ]){const value=watchlist(selected.deviationId,selected.site);change(value);expect(()=>parseWatchlist(value,selected,"2026-11-21")).toThrow()}
})
test("a direct-answer status cannot contradict its question metadata or cite another record",()=>{
  const value={is_question:true,answer_status:"answered",question_intent:"actions",citations:[[{record_id:"A",field:"CONCLUSION",start:0,end:quote.length,quote}]]}
  expect(parseAnswerMetadata(value,["A"]).answerStatus).toBe("answered")
  expect(()=>parseAnswerMetadata({...value,is_question:false},["A"])).toThrow()
  expect(()=>parseAnswerMetadata(value,["B"])).toThrow()
})
