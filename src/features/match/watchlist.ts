import {matchApi} from "@/shared/api/clients"
import {scopeFilters,watchScopeKey,parseStatusCounts,type StatusCounts} from "./scopeModel"
import type {MatchFilters,MatchRow} from "./types"

export interface WatchProof {field:string;start:number;end:number;quote:string}
export interface WatchEvidence extends WatchProof {division?:string;pr_id:string;site:string;record_name:string;date_opened:string;criticality:string;status:string}
export interface WatchSignal {
  status_counts?:StatusCounts
  key:string;kind:"equipment"|"location"|"pattern";label:string;other_record_count:number;failure_indicator_count:number
  last_12_months:number;last_opened:string|null;year_counts:{year:number;count:number}[];evidence:WatchEvidence[]
  seed_evidence:WatchProof;search_query:string|null
}
export interface Watchlist {
  filters?:ReturnType<typeof scopeFilters>;selected_in_scope?:boolean;status_counts?:StatusCounts;available_status_counts?:StatusCounts
  version:string;pr_id:string;site:string;source_snapshot_id:string;method:"deterministic";as_of:string;recent_from:string
  scope:"same_site_indexed_history";scope_record_count:number;other_record_count:number;opened_from:string|null;opened_to:string|null
  undated_count:number;future_dated_count:number;available_signals:number;signals:WatchSignal[];interpretation:string
}
const object=(v:unknown):v is Record<string,any>=>!!v&&typeof v==="object"&&!Array.isArray(v)
const count=(v:unknown):v is number=>Number.isSafeInteger(v)&&(v as number)>=0
const day=(v:unknown):v is string=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+"T00:00:00Z"))&&new Date(v+"T00:00:00Z").toISOString().slice(0,10)===v
const nullableDay=(v:unknown)=>v===null||day(v)
const fail=()=>new Error("The watchlist does not match this deviation, site or source version. Retry after searching again.")
function proof(v:unknown):v is WatchProof & Record<string,any> {
  return object(v)&&typeof v.field==="string"&&typeof v.quote==="string"&&!!v.quote&&count(v.start)&&count(v.end)&&v.end>v.start&&Array.from(v.quote).length===v.end-v.start
}
export function parseWatchlist(v:unknown,expected:MatchRow,asOf:string,filters?:MatchFilters):Watchlist {
  if(!object(v)||v.pr_id!==expected.deviationId||v.site!==expected.site||v.source_snapshot_id!==expected.snapshotId||v.method!=="deterministic"||v.scope!=="same_site_indexed_history"||v.as_of!==asOf||!day(v.as_of)||!day(v.recent_from)||v.recent_from>v.as_of||![v.opened_from,v.opened_to].every(nullableDay)||
    ![v.scope_record_count,v.other_record_count,v.undated_count,v.future_dated_count,v.available_signals].every(count)||v.scope_record_count!==v.other_record_count+(v.selected_in_scope===false?0:1)||!Array.isArray(v.signals)||v.signals.length>8||v.signals.length>v.available_signals||typeof v.interpretation!=="string"||typeof v.version!=="string")throw fail()
  if(v.filters&&watchScopeKey(v.filters)!==watchScopeKey(filters))throw fail()
  for(const field of ["status_counts","available_status_counts"]){const counts=parseStatusCounts(v[field]);if(counts&&field==="status_counts"&&Object.values(counts).reduce((a,b)=>a+b,0)!==v.scope_record_count)throw fail()}
  const keys=new Set<string>()
  for(const signal of v.signals){
    if(!object(signal)||typeof signal.key!=="string"||keys.has(signal.key)||!["equipment","location","pattern"].includes(signal.kind)||typeof signal.label!=="string"||!signal.label.trim()||![signal.other_record_count,signal.failure_indicator_count,signal.last_12_months].every(count)||signal.other_record_count>v.other_record_count||signal.failure_indicator_count>signal.other_record_count||signal.last_12_months>signal.other_record_count||!nullableDay(signal.last_opened)||!proof(signal.seed_evidence)||!Array.isArray(signal.evidence)||signal.evidence.length>5||signal.evidence.length>signal.other_record_count||!Array.isArray(signal.year_counts)||!(signal.search_query===null||typeof signal.search_query==="string"))throw fail()
    const statusCounts=parseStatusCounts(signal.status_counts);if(statusCounts&&Object.values(statusCounts).reduce((a,b)=>a+b,0)!==signal.other_record_count)throw fail()
    keys.add(signal.key)
    const ids=new Set<string>()
    for(const ref of signal.evidence){
      if(!proof(ref)||!object(ref)||typeof ref.pr_id!=="string"||ref.pr_id===expected.deviationId||ids.has(ref.pr_id)||ref.site!==expected.site||![ref.record_name,ref.date_opened,ref.criticality,ref.status].every(value=>typeof value==="string"))throw fail()
      ids.add(ref.pr_id)
    }
    if(signal.year_counts.some((row:unknown)=>!object(row)||!count(row.year)||row.year<1||!count(row.count))||signal.year_counts.reduce((sum:number,row:{count:number})=>sum+row.count,0)>signal.other_record_count)throw fail()
  }
  return v as Watchlist
}
export function reportingDate(now=new Date()){return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`}
export async function loadWatchlist(row:MatchRow,signal?:AbortSignal,filters?:MatchFilters) {
  const asOf=reportingDate(),query=new URLSearchParams({site:row.site,as_of:asOf})
  const scope=scopeFilters(filters);query.set("record_scope",scope.record_scope);query.set("include_cancelled",String(scope.include_cancelled));scope.divisions.forEach(value=>query.append("divisions",value));scope.statuses.forEach(value=>query.append("statuses",value))
  return parseWatchlist(await matchApi.requestJson(`/api/v1/match/matched-records/${encodeURIComponent(row.deviationId)}/watchlist?${query}`,{signal}),row,asOf,filters)
}
