import {useEffect,useState} from "react"
import {Badge,HelpTooltip} from "@/shared/components"
import type {MatchRow,RecordDetail} from "../types"
import {loadWatchlist,type Watchlist,type WatchEvidence,type WatchSignal} from "../watchlist"
import {matchService} from "../services/matchService"
import {fieldLabel} from "../services/parse"
import {criticalityTone} from "../utils"

const count=(v:number)=>v.toLocaleString()
function dateLabel(v:string|null){if(!v)return "Date unavailable";const date=new Date(v.slice(0,10)+"T00:00:00Z");return Number.isNaN(date.valueOf())?"Date unavailable":new Intl.DateTimeFormat(undefined,{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"}).format(date)}

function RelatedEvidence({reference,selected}:{reference:WatchEvidence;selected:MatchRow}) {
  const [detail,setDetail]=useState<RecordDetail|null>(null),[error,setError]=useState(""),[loading,setLoading]=useState(false),[request,setRequest]=useState(0)
  useEffect(()=>{
    if(!request)return
    const controller=new AbortController();setLoading(true);setError("")
    matchService.getRecord({...selected,deviationId:reference.pr_id,site:reference.site},controller.signal).then(value=>{if(!controller.signal.aborted)setDetail(value)}).catch(reason=>{if(!controller.signal.aborted)setError(reason instanceof Error?reason.message:"Source could not be loaded.")}).finally(()=>{if(!controller.signal.aborted)setLoading(false)})
    return()=>controller.abort()
  },[request,selected.deviationId,selected.snapshotId,reference.pr_id,reference.site])
  return <details className="rounded-lg border border-suite-line bg-white p-3">
    <summary className="cursor-pointer list-none text-xs leading-5"><span className="font-bold text-suite-blue">Deviation {reference.pr_id}</span><span className="ml-2 text-[11px] text-suite-muted">{dateLabel(reference.date_opened)}</span><span className="mt-1 block font-bold [overflow-wrap:anywhere]">{reference.record_name||"Untitled deviation"}</span><span className="mt-1 block text-[11px] text-suite-muted">View matching evidence ↓</span></summary>
    <div className="mt-3 flex flex-wrap items-center gap-2"><Badge tone={criticalityTone(reference.criticality)}>{reference.criticality||"Criticality unavailable"}</Badge><span className="text-[11px] text-suite-muted">{reference.status}</span></div>
    <p className="mt-3 text-[11px] font-bold text-suite-slate">{fieldLabel(reference.field)} · retained excerpt</p>
    <blockquote className="mt-1 border-l-2 border-suite-line pl-3 text-xs leading-5 whitespace-pre-wrap [overflow-wrap:anywhere]">{reference.quote}</blockquote>
    {!detail&&<button type="button" disabled={loading} className="map-secondary mt-3 text-xs!" onClick={()=>setRequest(value=>value+1)}>{loading?"Loading retained source…":error?`Retry source for ${reference.pr_id}`:`Read retained source for ${reference.pr_id}`}</button>}
    {error&&<p role="alert" className="mt-2 text-xs text-brand">{error}</p>}
    {detail&&<div role="region" aria-label={`Source for deviation ${reference.pr_id}`} tabIndex={0} className="mt-3 max-h-80 space-y-3 overflow-auto rounded border border-suite-line p-3 outline-none focus-visible:ring-2 focus-visible:ring-brand">{[...detail.sections,...detail.literalSections??[]].map((section,index)=><section key={index}><h5 className="text-xs font-bold">{section.label}</h5><p className="mt-1 whitespace-pre-wrap text-xs leading-5 [overflow-wrap:anywhere]">{section.text}</p></section>)}</div>}
  </details>
}

function Signal({signal,selected}:{signal:WatchSignal;selected:MatchRow}) {
  const [seedOpen,setSeedOpen]=useState(false)
  return <section className="min-w-0 rounded-xl border border-suite-line bg-suite-surface/40 p-3">
    <p className="text-[10px] font-bold tracking-wide text-suite-muted uppercase">{signal.kind==="equipment"?"Equipment ID":signal.kind==="location"?"Location":"Recorded event indicators"}</p>
    <h4 className="mt-1 text-sm font-bold [overflow-wrap:anywhere]">{signal.label}</h4>
    <div className="mt-3 flex flex-wrap items-baseline gap-2"><strong className="text-2xl tabular-nums">{count(signal.other_record_count)}</strong>{" "}<span className="text-xs text-suite-slate">{signal.kind==="pattern"?"other records with matching indicators":"other records mention this "+(signal.kind==="equipment"?"equipment ID":"location")}</span></div>
    <div className="mt-2 grid grid-cols-2 gap-3 text-[11px] leading-5 text-suite-muted"><p><strong className="block text-xs tabular-nums text-suite-ink">{count(signal.last_12_months)}</strong>in the past 12 months</p><p><strong className="block text-xs text-suite-ink">{dateLabel(signal.last_opened)}</strong>latest other record</p></div>
    {signal.kind==="equipment"&&signal.failure_indicator_count>0&&<p className="mt-2 rounded bg-suite-info-wash p-2 text-[11px] leading-5 text-suite-blue">{count(signal.failure_indicator_count)} {signal.failure_indicator_count===1?"record has":"records have"} nearby failure wording and matching event indicators. Review the evidence to confirm involvement.</p>}
    <button type="button" aria-expanded={seedOpen} onClick={()=>setSeedOpen(value=>!value)} className="mt-3 min-h-8 text-xs font-bold text-suite-blue underline">Why this signal appears</button>
    {seedOpen&&<p className="mt-1 whitespace-pre-wrap rounded bg-white p-2 text-xs leading-5 [overflow-wrap:anywhere]">{signal.seed_evidence.quote}<span className="mt-1 block text-[11px] text-suite-muted">Selected deviation · {fieldLabel(signal.seed_evidence.field)}</span></p>}
    {!!signal.year_counts.length&&<details className="mt-1 text-xs"><summary className="min-h-8 cursor-pointer py-1.5 font-bold text-suite-slate">History by opened year</summary><dl className="mt-1 grid grid-cols-3 gap-2">{signal.year_counts.map(row=><div key={row.year} className="rounded bg-white p-2 text-center"><dt className="text-[11px] text-suite-muted">{row.year}</dt><dd className="mt-1 font-bold tabular-nums">{count(row.count)}</dd></div>)}</dl></details>}
    {signal.evidence.length?<details className="mt-3"><summary className="min-h-8 cursor-pointer py-1.5 text-xs font-bold text-suite-blue">Supporting deviations · {signal.evidence.length} of {count(signal.other_record_count)}</summary><div className="mt-2 space-y-2"><p className="text-[11px] text-suite-muted">Showing the newest dated records first.</p>{signal.evidence.map(reference=><RelatedEvidence key={reference.pr_id} reference={reference} selected={selected}/>)}</div></details>:<p className="mt-2 text-xs leading-5 text-suite-muted">No other same-site indexed record matched this signal. This does not establish that no other events exist.</p>}
  </section>
}

export function WatchlistPanel({selected}:{selected:MatchRow}) {
  const [value,setValue]=useState<Watchlist|null>(null),[error,setError]=useState(""),[retry,setRetry]=useState(0)
  useEffect(()=>{
    const controller=new AbortController();setValue(null);setError("")
    loadWatchlist(selected,controller.signal).then(data=>{if(!controller.signal.aborted)setValue(data)}).catch(reason=>{if(!controller.signal.aborted)setError(reason instanceof Error?reason.message:"Watchlist could not be loaded.")})
    return()=>controller.abort()
  },[selected.deviationId,selected.site,selected.snapshotId,retry])
  return <div className="mt-4 min-w-0">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="flex items-center gap-1 text-sm font-bold">Historical watchlist <HelpTooltip label="Watchlist counts">Counts scan all indexed deviations at the selected site, independent of the submitted search filters. Each other deviation counts once per signal. Literal mentions and matching text indicators need investigation; they do not establish common root cause, ongoing failure or CAPA ineffectiveness. Counts across signals can overlap.</HelpTooltip></h3><button type="button" onClick={()=>setRetry(v=>v+1)} className="min-h-8 text-xs font-bold text-suite-blue underline">Refresh watchlist</button></div>
    {!value&&!error&&<p role="status" aria-busy="true" className="mt-3 text-sm leading-6 text-suite-muted">Checking the full indexed history at this site…</p>}
    {error&&<div role="alert" className="mt-3 rounded-lg border border-suite-line p-3"><p className="text-sm font-bold">Watchlist unavailable</p><p className="mt-1 text-xs leading-5 [overflow-wrap:anywhere]">{error}</p><button type="button" className="map-secondary mt-3 text-xs!" onClick={()=>setRetry(v=>v+1)}>Retry watchlist</button></div>}
    {value&&<>
      <p className="mt-2 text-xs font-bold text-suite-blue">{value.site} · {count(value.scope_record_count)} searchable deviations</p>
      <p className="mt-1 text-[11px] leading-5 text-suite-muted">All available opened dates: {dateLabel(value.opened_from)} – {dateLabel(value.opened_to)}. Uses this site's full indexed history, independent of search filters; the selected deviation is excluded from the counts.</p>
      <p className="mt-2 rounded-lg bg-suite-info-wash p-2.5 text-xs leading-5 text-suite-blue">Historical signals for review. A repeated equipment mention does not establish a repeated failure or shared cause.</p>
      <div className="mt-4 space-y-3">{value.signals.map(signal=><Signal key={signal.key} signal={signal} selected={selected}/>)}</div>
      {!value.signals.length&&<p className="mt-3 rounded-lg border border-suite-line p-3 text-sm leading-6">No specific equipment IDs, coded locations or supported event indicators were identified in the retained text. Recurrence could not be assessed from this record.</p>}
      {value.available_signals>value.signals.length&&<p className="mt-3 text-[11px] text-suite-muted">Showing {value.signals.length} of {value.available_signals} detected signals, prioritised by other-record count.</p>}
      <p className="mt-3 border-t border-suite-line pt-3 text-[11px] leading-5 text-suite-muted">Recent window: {dateLabel(value.recent_from)} – {dateLabel(value.as_of)}. {value.undated_count>0?`${count(value.undated_count)} records have no usable opened date. `:""}{value.future_dated_count>0?`${count(value.future_dated_count)} future-dated records are excluded from the dated breakdowns. `:""}This history covers MATCH-eligible indexed deviations, rather than every source deviation.</p>
    </>}
  </div>
}
