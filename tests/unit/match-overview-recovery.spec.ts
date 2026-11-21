import {test,expect} from "@playwright/test"
import {parseEvidenceOverview,parseSearchResponse} from "../../src/features/match/services/parse"
import {matchService} from "../../src/features/match/services/matchService"
import {matchApi} from "../../src/shared/api/clients"
import {ApiError} from "../../src/shared/api/httpClient"
import {assisted} from "../fixtures/match-assist"
import {verifiedOverview,gapOverview,unavailableOverview} from "../fixtures/match-overview-recovery"
const result=()=>parseSearchResponse(assisted({query:"What action resolved the calibration failure?",all_sites:true,mode:"auto",assist:true,top_k:10}))
const original=matchApi.requestJson
test.afterEach(()=>{matchApi.requestJson=original})

test("source-verified answers retain their automatic attempt counts",()=>{
  const parsed=parseEvidenceOverview(verifiedOverview(),result())
  expect(parsed.verificationStatus).toBe("verified");expect(parsed.verificationRetries).toBe(1)
  expect(parsed.verificationAttempts).toEqual({draft:2,grounding:1});expect(parsed.citations?.[0]).toHaveLength(1)
})
test("valid evidence gaps and service unavailability remain different outcomes",()=>{
  expect(parseEvidenceOverview(gapOverview(),result()).verificationStatus).toBe("insufficient_evidence")
  expect(parseEvidenceOverview(unavailableOverview(),result()).verificationStatus).toBe("unavailable")
})
test("verification metadata cannot bless missing quotes, incomplete checks or excess attempts",()=>{
  const base=verifiedOverview()
  for(const value of [{...base,citations:[]},{...base,verification_status:"unavailable"},{...base,support_check:{direct_answer_verified:false}},
    {...base,verification_attempts:{draft:3,grounding:1},verification_retries:2},
    {...base,verification_attempts:{draft:1,grounding:0},verification_retries:0},
    {...base,verification_retries:0}])expect(()=>parseEvidenceOverview(value,result())).toThrow()
})
test("the leading answer must have quotes for every cited source",()=>{
  const base=verifiedOverview(),all=result().rows.map(row=>row.deviationId)
  const other=all.find(id=>id!==base.reviewed_ids[0])!
  const value={...base,reviewed_ids:[...base.reviewed_ids,other],lines:[{...base.lines[0],references:[base.reviewed_ids[0],other]},...base.lines.slice(1)]}
  expect(()=>parseEvidenceOverview(value,result())).toThrow(/source quotes/)
})
test("a temporary HTTP failure is retried internally without user action",async()=>{
  let calls=0
  matchApi.requestJson=(async()=>{if(++calls===1)throw new ApiError("Fictional temporary failure","match",503);return verifiedOverview()}) as typeof original
  expect((await matchService.getOverview(result())).answerStatus).toBe("answered");expect(calls).toBe(2)
})
test("HTTP retries terminate and never retry authentication or source-validation failures",async()=>{
  let calls=0
  matchApi.requestJson=(async()=>{calls++;throw new ApiError("Fictional failure","match",503)}) as typeof original
  await expect(matchService.getOverview(result())).rejects.toThrow();expect(calls).toBe(2)
  calls=0;matchApi.requestJson=(async()=>{calls++;throw new ApiError("Fictional forbidden scope","match",403)}) as typeof original
  await expect(matchService.getOverview(result())).rejects.toThrow();expect(calls).toBe(1)
  calls=0;matchApi.requestJson=(async()=>{calls++;return {...verifiedOverview(),source_snapshot_id:"foreign"}}) as typeof original
  await expect(matchService.getOverview(result())).rejects.toThrow();expect(calls).toBe(1)
})
test("cancelling a search aborts the pending retry before another request",async()=>{
  const controller=new AbortController();let calls=0
  matchApi.requestJson=(async()=>{calls++;throw new ApiError("Fictional disconnected service","match",0)}) as typeof original
  const pending=matchService.getOverview(result(),controller.signal).catch(error=>error)
  await expect.poll(()=>calls).toBe(1);controller.abort()
  expect((await pending).name).toBe("AbortError");expect(calls).toBe(1)
})
