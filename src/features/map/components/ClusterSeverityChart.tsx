import { navigateTo } from "@/shared/lib/navigation"
import { criticalityMetrics, formatShare } from "../overviewMetrics"
import type { Cluster, DeviationRecord } from "../types"

const colors={Minor:"#587590",Major:"#b77d0b",Critical:"#e10c17",Unknown:"#cbd5df"}
export function ClusterSeverityChart({groups,viewTotal}:{groups:{cluster:Cluster;records:DeviationRecord[]}[];viewTotal?:number}){
  const rows=groups.map(group=>({...group,metrics:criticalityMetrics(group.records)}))
  const max=Math.max(1,...rows.map(row=>row.metrics.total)),clustered=rows.reduce((sum,row)=>sum+row.metrics.total,0),total=viewTotal??clustered
  const unknown=rows.some(row=>row.metrics.unknownCriticality>0)
  return <div role="region" aria-label="Deviation volume by cluster" className="min-w-0">
    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs" aria-label="Source criticality legend">{Object.entries(colors).filter(([name])=>name!=="Unknown"||unknown).map(([name,color])=><span key={name} className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="size-2.5 rounded-sm" style={{backgroundColor:color}}/>{name==="Unknown"?"Other / unknown":name}</span>)}</div>
    <p className="mb-4 text-xs leading-5 text-suite-muted">Bar length compares deviation counts. Segments show source criticality; the right label shows each cluster’s count and share of this view.</p>
    {total>clustered&&<p className="mb-3 text-xs text-suite-muted">{total-clustered} unassigned deviations remain in the view total and are listed separately.</p>}
    <ol className="space-y-2">{rows.map(({cluster,metrics})=>{
      const parts=[...metrics.criticality.map(item=>({...item,color:colors[item.label]})),...(metrics.unknownCriticality?[{label:"Other / unknown",count:metrics.unknownCriticality,color:colors.Unknown}]:[])]
      return <li key={cluster.id}><button type="button" onClick={()=>navigateTo(`/map/clusters/${cluster.id}`)} aria-label={`Open ${cluster.title} cluster detail. ${metrics.total} deviations; ${parts.map(item=>`${item.label} ${item.count}`).join(", ")}.`} className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-lg border border-suite-line-soft p-3 text-left hover:bg-suite-hover focus-visible:outline-2 focus-visible:outline-brand xl:grid-cols-[minmax(180px,.9fr)_minmax(0,1.3fr)_auto]">
        <span className="min-w-0 break-words text-xs font-bold xl:row-span-2">{cluster.title}</span>
        <span className="col-span-2 row-start-2 block h-4 min-w-0 rounded bg-suite-hover xl:col-span-1 xl:col-start-2 xl:row-start-1" aria-hidden="true"><span className="flex h-full overflow-hidden rounded" style={{width:`${metrics.total/max*100}%`}}>{parts.filter(item=>item.count>0).map(item=><span key={item.label} className="block h-full" style={{backgroundColor:item.color,width:`${item.count/metrics.total*100}%`}}/>)}</span></span>
        <span className="shrink-0 text-right text-sm font-bold tabular-nums xl:col-start-3 xl:row-start-1">{metrics.total.toLocaleString()}<span className="ml-2 text-[11px] font-normal text-suite-muted">{formatShare(metrics.total,total)}</span></span>
        <span className="col-span-2 flex flex-wrap gap-x-3 text-[10px] tabular-nums text-suite-muted xl:col-span-2 xl:col-start-2 xl:row-start-2">{parts.map(item=><span key={item.label}>{item.label} {item.count.toLocaleString()}</span>)}</span>
      </button></li>
    })}</ol>
  </div>
}
