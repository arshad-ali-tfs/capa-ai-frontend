import { HelpTooltip } from "@/shared/components"
import type { MatchFilters } from "../types"
import { scopeFilters,scopeLabels,workflowState,type StatusCounts } from "../scopeModel"

export function StatusCountsView({counts,label="Workflow status counts"}:{counts?:StatusCounts;label?:string}){
  if(!counts)return null
  return <p aria-label={label} className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] leading-5 text-suite-muted"><span><strong className="tabular-nums text-suite-ink">{counts.completed.toLocaleString()}</strong> completed</span><span><strong className="tabular-nums text-suite-ink">{counts.ongoing.toLocaleString()}</strong> ongoing</span>{counts.cancelled>0&&<span><strong className="tabular-nums text-suite-ink">{counts.cancelled.toLocaleString()}</strong> cancelled</span>}{counts.other>0&&<span>{counts.other.toLocaleString()} other status</span>}</p>
}
export function RecordStatusNotice({status}:{status:string}){
  const state=workflowState(status)
  if(state!=="ongoing"&&state!=="cancelled")return null
  return <p className="mt-3 rounded-lg bg-warn-wash p-2.5 text-xs leading-5 text-warn-ink">{state==="ongoing"?"Ongoing investigation — findings and proposed actions may change. Verify the current source record before drawing conclusions.":"Cancelled deviation — retained for context, not a completed investigation precedent."}</p>
}
export function ScopeControls({filters,onChange,counts,onOpenDivisions}:{filters:MatchFilters;onChange:(value:MatchFilters)=>void;counts?:StatusCounts;onOpenDivisions:()=>void}){
  const scope=scopeFilters(filters)
  return <div className="mt-4 rounded-lg border border-suite-line bg-suite-surface/50 p-3">
    <div className="flex flex-wrap items-end gap-3">
      <label className="min-w-0 flex-1 text-xs font-bold text-suite-slate sm:max-w-64">Investigation status<select aria-label="Investigation status" value={scope.record_scope} onChange={event=>onChange({...filters,record_scope:event.target.value as MatchFilters["record_scope"],include_cancelled:false,statuses:[],...("status" in filters?{status:"any" as const}:{})})} className="mt-1 block min-h-10 w-full rounded-lg border border-suite-line-field bg-white px-2 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-brand">{Object.entries(scopeLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      <button type="button" onClick={onOpenDivisions} aria-label="Division filter" className="map-secondary min-h-10 max-w-full text-xs! [overflow-wrap:anywhere]">Division: {scope.divisions.length?scope.divisions.join(" + "):"All"} <span aria-hidden="true">⌄</span></button>
      <HelpTooltip label="Investigation scope">Completed means Closed - Done. Ongoing includes non-closed investigations and their provisional findings. All investigations includes both and any unclassified statuses. Cancelled deviations are excluded unless Include cancelled is selected inside Filters. Division and status are applied before ranking and summaries.</HelpTooltip>
    </div>
    <div className="mt-2"><p className="mb-0.5 text-[10px] text-suite-muted">Available before status selection</p><StatusCountsView counts={counts} label="Available workflow statuses"/></div>
    {scope.record_scope==="ongoing"&&counts?.ongoing===0&&<p role="status" className="mt-2 text-xs leading-5 text-suite-blue">No ongoing deviations are indexed within these filters. A source export containing ongoing investigations is needed to make those records searchable.</p>}
    {scope.include_cancelled&&<p className="mt-2 text-[11px] text-suite-muted">Cancelled records are included and labelled separately.</p>}
  </div>
}
