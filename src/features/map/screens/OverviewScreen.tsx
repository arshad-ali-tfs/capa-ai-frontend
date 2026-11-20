import { useState } from "react"
import { downloadJson } from "@/shared/lib/download"
import {
  FilterPanel,
  PageHeading,
  Panel,
} from "@/shared/components"
import type { Filters, MapFilterKey } from "../types"
import {
  filterRecords,
  formatDate,
  getFilterOptions,
} from "../utils"
import { overviewFields } from "../constants"
import { filterHelp, mapHelp } from "../helpText"
import { GuidedWorkspace } from "../components/GuidedWorkspace"
import { AnalysisStatus } from "../components/AnalysisStatus"
import { RecordList } from "../components/RecordList"
import { OverviewMetrics } from "../components/OverviewMetrics"
import { ClusterSummary } from "../components/ClusterSummary"
import { useMapData } from "../MapDataProvider"
import { RunComparison } from "../components/RunComparison"
export function OverviewScreen({
  filters,
  onFilterChange,
  onClear,
}: {
  filters: Filters<MapFilterKey>
  onFilterChange: (key: MapFilterKey, value: string) => void
  onClear: () => void
}) {
  const { clusters, records, capas, analysis, refreshedAt,review } = useMapData()
  const [theme,setTheme]=useState(()=>new URLSearchParams(window.location.search).get("theme")||"All")
  const [reviewOnly,setReviewOnly]=useState(()=>new URLSearchParams(window.location.search).get("review")==="1")
  const [sort,setSort]=useState(()=>new URLSearchParams(window.location.search).get("sort")||"risk")
  const scoped = filterRecords(records, filters)
  const filtered = scoped.filter(record=>(theme==="All"||clusters.find(cluster=>cluster.id===record.clusterId)?.parentTheme===theme)&&(!reviewOnly||record.warnings.length>0))
  const themes=[...new Set(clusters.map(cluster=>cluster.parentTheme).filter((value):value is string=>!!value))].sort().map(name=>({name,records:scoped.filter(record=>clusters.find(cluster=>cluster.id===record.clusterId)?.parentTheme===name)})).filter(item=>item.records.length)
  function view(next:{theme?:string;review?:boolean;sort?:string}){
    const params=new URLSearchParams(window.location.search)
    if(next.theme!==undefined){setTheme(next.theme);next.theme==="All"?params.delete("theme"):params.set("theme",next.theme)}
    if(next.review!==undefined){setReviewOnly(next.review);next.review?params.set("review","1"):params.delete("review")}
    if(next.sort!==undefined){setSort(next.sort);params.set("sort",next.sort)}
    window.history.replaceState({},"",window.location.pathname+(params.size?"?"+params:""))
  }
  const visible = clusters
    .map((cluster) => ({
      cluster,
      records: filtered.filter((r) => r.clusterId === cluster.id),
    }))
    .filter((group) => group.records.length)
    .sort((a, b) => sort==="risk" ? (b.records.filter(row=>row.criticality==="Critical").length-a.records.filter(row=>row.criticality==="Critical").length)||
      (b.records.filter(row=>row.criticality==="Major").length-a.records.filter(row=>row.criticality==="Major").length)||b.records.length-a.records.length : b.records.length-a.records.length)
  const unassigned = filtered.filter((r) => !r.clusterId)
  const fields = [
    ...overviewFields,
    ...(filters.division !== "All"
      ? [{ key: "division" as const, label: "Division" }]
      : []),
  ]
  return (
    <>
      <PageHeading
        title="MAP · Cluster analysis"
        subtitle="Explore patterns within the selected analysis and inspect their source records."
        status={`Analysis completed ${formatDate(refreshedAt, true)}`}
      />
      <AnalysisStatus />
      <GuidedWorkspace step={1}>
        <OverviewMetrics records={filtered} capas={capas} sourceAvailable={analysis.sourceAvailable} activeClusters={visible.length} />
        {themes.length>0&&<Panel title="Quality themes" help="Suggested parent themes organize the detailed clusters. Review and correct each theme against its members; these are not confirmed root causes.">
          <div className="mb-3 flex flex-wrap items-center gap-3"><button type="button" onClick={()=>view({theme:"All"})} aria-pressed={theme==="All"} className="map-secondary text-xs!">All themes · {scoped.length.toLocaleString()} deviations</button><span className="text-xs text-suite-muted">{themes.length} parent themes · detailed patterns remain available below</span></div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{themes.map(item=><button key={item.name} type="button" aria-pressed={theme===item.name} onClick={()=>view({theme:item.name})} className={`rounded-lg border p-3 text-left focus-visible:outline-2 focus-visible:outline-brand ${theme===item.name?"border-suite-blue bg-suite-info-wash":"border-suite-line bg-white hover:bg-suite-hover"}`}><span className="block text-sm font-bold">{item.name}</span><span className="mt-1 block text-xs text-suite-muted">{item.records.length.toLocaleString()} deviations · {new Set(item.records.map(row=>row.clusterId)).size} clusters</span>{item.records.some(row=>row.criticality==="Critical")&&<span className="mt-1 block text-xs font-bold text-brand">{item.records.filter(row=>row.criticality==="Critical").length} Critical</span>}</button>)}</div>
        </Panel>}
        <FilterPanel
          tooltip={mapHelp.filters}
          filters={filters}
          fields={fields.map((field) => ({
            ...field,
            options: getFilterOptions(records, field.key),
            tooltip: filterHelp[field.key],
          }))}
          onChange={onFilterChange}
          onClear={()=>{view({theme:"All",review:false});onClear()}}
          primaryCount={4}
          resultLabel={`${visible.length} clusters · ${filtered.length} ${filtered.length === 1 ? "record" : "records"}`}
        />
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-suite-line bg-white p-3">
          <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={reviewOnly} onChange={event=>view({review:event.target.checked})}/>Review queue · {scoped.filter(row=>row.warnings.length).length} flagged records</label>
          <label className="flex items-center gap-2 text-xs sm:ml-auto">Prioritize<select aria-label="Cluster order" value={sort} onChange={event=>view({sort:event.target.value})} className="min-h-9 rounded border border-suite-line bg-white px-2"><option value="risk">Critical, then Major, then volume</option><option value="volume">Deviation volume</option></select></label>
          <button type="button" className="map-secondary text-xs!" onClick={()=>downloadJson(`MAP-view-${analysis.runId.slice(0,8)}.json`,{exportedAt:new Date().toISOString(),analysis,filters,parentTheme:theme,reviewOnly,records:filtered,clusters:visible.map(group=>group.cluster),capas:capas?.filter(capa=>capa.recordIds.some(id=>filtered.some(record=>record.id===id))),review})}>Export this view</button>
        </div>
        <ClusterSummary
          groups={visible}
          viewTotal={filtered.reduce((sum,record)=>sum+record.volume,0)}
          emptyMessage={
            !records.length
              ? "This completed analysis contains no records."
              : unassigned.length
                ? "These records have no cluster assignment. Open them in the unassigned list below."
                : `No analysed records match this view. ${analysis.coverage?.openedFrom?`This run covers opened dates ${analysis.coverage.openedFrom} to ${analysis.coverage.openedTo}; an empty year does not establish that no source deviations exist. `:""}Clear source filters, the parent theme or the review queue to inspect available records.`
          }
        />
        <RunComparison key={analysis.runId} />
        {unassigned.length > 0 && (
          <Panel
            title={`Unassigned records · ${unassigned.length}`}
            help="These records are accounted for but have no assigned cluster. Open a record to inspect its source and add a review annotation."
          >
            <RecordList records={unassigned} />
          </Panel>
        )}
      </GuidedWorkspace>
    </>
  )
}
