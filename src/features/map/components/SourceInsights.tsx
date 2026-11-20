import { useEffect, useState } from "react"
import { HelpTooltip, MetricCard } from "@/shared/components"
import { loadSourceInsights, localCalendarDate, type InsightRanking, type SourceDeviationInsights } from "../sourceInsights"

function dateLabel(value: string) {
  return new Intl.DateTimeFormat(undefined,{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"}).format(new Date(value+"T00:00:00Z"))
}
const count=(value: number)=>value.toLocaleString()

function RankingCard({name,ranking,total}: {name:"clients"|"stages"|"products";ranking:InsightRanking;total:number|null}) {
  const singular=name==="stages"?"stage":name==="clients"?"client":"product"
  return <MetricCard label={`Top 3 ${name}`} tooltip={name==="stages"
    ? "Distinct deviations opened in the displayed 12-month period. Uses a recorded stage where available; otherwise groups specific process steps, then unambiguous responsible departments, into Manufacturing, Packaging, QC and other stages. Unmapped values are excluded from ranking and shown in coverage. This grouping is not a confirmed root cause."
    : `Distinct deviations opened in the displayed 12-month period, ranked using recorded ${singular} names or identifiers. Blank and unavailable values are excluded from ranking and shown in coverage. Names are not inferred from narrative text. Shares use all deviations in the period.`}
    help={total===null?"Source coverage unavailable":`${count(ranking.knownCount)} of ${count(total)} deviations have a usable ${singular}${ranking.missingCount?` · ${count(ranking.missingCount)} unavailable`:""}`}>
    {ranking.rows.length ? <>
      <ol aria-label={`Top three ${name}`} className="space-y-2.5">{ranking.rows.map((row,index)=><li key={row.label} className="flex min-w-0 items-start gap-2 text-sm leading-5">
        <span className="flex size-5 shrink-0 items-center justify-center rounded bg-suite-surface text-[11px] font-bold text-suite-muted">{index+1}</span>
        <span className="min-w-0 flex-1 break-words font-bold text-suite-ink [overflow-wrap:anywhere]">{row.label}</span>
        <span className="shrink-0 text-right font-bold tabular-nums">{count(row.count)}<span className="block text-xs font-normal text-suite-muted">{row.percent.toFixed(1)}%</span></span>
      </li>)}</ol>
      <p className="mt-3 border-t border-suite-line-soft pt-2 text-xs leading-5 text-suite-muted"><strong className="text-suite-blue">{ranking.topShare.toFixed(1)}%</strong> combined share · {count(ranking.topCount)} deviations</p>
    </> : <div className="rounded-lg bg-suite-surface/70 p-3">
      <p className="text-sm font-bold text-suite-slate">{total===0?"No deviations in this period":"Data unavailable"}</p>
      <p className="mt-1 text-xs leading-5 text-suite-muted">{ranking.unavailableReason}</p>
    </div>}
    {name==="stages"&&ranking.knownCount>0&&<p className="mt-2 text-[11px] leading-4 text-suite-muted">{ranking.mappedCount?`${count(ranking.mappedCount)} grouped from process step / department`:"Uses recorded stage values"}{ranking.recordedCount&&ranking.mappedCount?` · ${count(ranking.recordedCount)} recorded stages`:""}</p>}
    {ranking.cutoffTied&&<p className="mt-1 text-[11px] leading-4 text-suite-muted">Third place is tied; alphabetical order selects the three shown.</p>}
  </MetricCard>
}

export function SourceInsights({runId,snapshotId,refreshKey}: {runId:string;snapshotId:string|null;refreshKey:string}) {
  const [asOf,setAsOf]=useState(localCalendarDate),[retry,setRetry]=useState(0)
  const [data,setData]=useState<SourceDeviationInsights|null>(null),[error,setError]=useState("")
  useEffect(()=>{const timer=window.setInterval(()=>setAsOf(localCalendarDate()),60000);return()=>window.clearInterval(timer)},[])
  useEffect(()=>{
    const controller=new AbortController()
    setData(null);setError("")
    loadSourceInsights(runId,asOf,snapshotId,controller.signal).then(value=>{if(!controller.signal.aborted)setData(value)}).catch((reason:unknown)=>{
      if(!controller.signal.aborted)setError(reason instanceof Error?reason.message:"Source rankings could not be loaded.")
    })
    return()=>controller.abort()
  },[runId,snapshotId,refreshKey,asOf,retry])
  return <section aria-label="Past 12 months source rankings" className="border-t border-suite-line pt-4">
    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
      <div>
        <h3 className="flex items-center gap-1.5 text-sm font-bold">Past 12 months <HelpTooltip label="Source ranking scope">These three rankings cover every deviation in the verified source snapshot for the selected analysis. The analysis filters and Cluster groups below do not change these source-wide rankings. Date opened determines inclusion; missing dates and future dates are excluded. Each deviation counts once per ranking.</HelpTooltip></h3>
        <p className="mt-1 text-xs leading-5 text-suite-muted">{data?`${dateLabel(data.dateFrom)} – ${dateLabel(data.dateTo)} · by date opened`:"Loading the recorded source period…"}</p>
      </div>
      {data?.available&&<p className="rounded-full bg-suite-info-wash px-3 py-1.5 text-xs font-bold tabular-nums text-suite-blue">{count(data.windowDeviationCount!)} deviations in period</p>}
    </div>
    {error ? <div role="status" className="rounded-lg border border-suite-line bg-white p-4 text-sm">
      <p className="font-bold">Source rankings could not be loaded</p><p className="mt-1 text-xs leading-5 text-suite-muted">{error}</p>
      <button type="button" onClick={()=>setRetry(value=>value+1)} className="map-secondary mt-3 text-xs!">Retry source rankings</button>
    </div> : data ? <>
      <p className="mb-3 text-xs leading-5 text-suite-muted">{data.available
        ? <>Source-wide · {count(data.deviationCount!)} deviation records checked in {count(data.sourceRecordCount!)} total source records. {data.latestOpened&&<>Latest deviation opened {dateLabel(data.latestOpened)}. </>}Analysis filters apply to the four KPIs above.</>
        : "The verified source snapshot is unavailable. Rankings cannot be established from the analysed sample."}</p>
      <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-3">{(["clients","stages","products"] as const).map(name=><RankingCard key={name} name={name} ranking={data[name]} total={data.windowDeviationCount}/>)}</div>
      {(data.undatedCount>0||data.futureDatedCount>0)&&<p className="mt-2 text-[11px] leading-4 text-suite-muted">Outside date coverage: {count(data.undatedCount)} missing / invalid opened dates · {count(data.futureDatedCount)} future-dated deviations.</p>}
    </> : <div role="status" className="grid grid-cols-1 gap-3 md:grid-cols-3">{["clients","stages","products"].map(name=><div key={name} className="min-h-48 rounded-xl border border-suite-line bg-white p-4"><p className="text-[13px] font-bold text-suite-slate">Top 3 {name}</p><p className="mt-4 text-xs text-suite-muted">Checking the verified source…</p></div>)}</div>}
  </section>
}
