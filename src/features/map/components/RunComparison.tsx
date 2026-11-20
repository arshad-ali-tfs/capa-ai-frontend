import { useState } from "react"
import { DisclosurePanel } from "@/shared/components"
import { useMapData } from "../MapDataProvider"
import { mapService } from "../services/mapService"
import { formatDate } from "../utils"

export function RunComparison(){
  const {analysis,runs,review}=useMapData()
  const [other,setOther]=useState(""),[loading,setLoading]=useState(false),[error,setError]=useState("")
  const [value,setValue]=useState<Awaited<ReturnType<typeof mapService.compareRuns>>|null>(null)
  async function compare(){setLoading(true);setError("");try{setValue(await mapService.compareRuns(analysis.runId,other))}catch(failure){setError(failure instanceof Error?failure.message:"Comparison unavailable.")}finally{setLoading(false)}}
  return <DisclosurePanel title="Analysis changes and review history" help="Compare original saved extractions and assignments; reviewer overlays are recorded separately.">
    <div className="flex flex-wrap items-end gap-3"><label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-bold">Compare with saved analysis<select aria-label="Compare with saved analysis" value={other} disabled={loading} onChange={event=>{setOther(event.target.value);setValue(null)}} className="min-h-10 min-w-0 rounded border border-suite-line bg-white px-2 font-normal"><option value="">Choose an analysis</option>{runs.filter(run=>run.id!==analysis.runId).map(run=><option key={run.id} value={run.id}>{run.records ?? "Unknown"} records · {formatDate(run.createdAt)} · {run.id.slice(0,8)}</option>)}</select></label><button type="button" disabled={!other||loading} onClick={()=>void compare()} className="map-secondary text-xs!">{loading?"Comparing…":"Compare saved outputs"}</button></div>
    {error&&<p role="alert" className="mt-3 text-xs text-brand">{error}</p>}
    {value&&<div className="mt-4 space-y-3 text-xs"><p><strong>{value.sharedRecords}</strong> shared records · <strong>{value.changedRecords}</strong> changed saved outputs · <strong>{value.assignmentChanges}</strong> different original assignments.</p><p className="text-suite-muted">{value.interpretation}</p><div className="max-h-72 overflow-auto"><table className="w-full text-left"><thead><tr><th className="p-2">Record</th><th className="p-2">Original assignment</th><th className="p-2">Changed extraction fields</th></tr></thead><tbody>{value.changes.map(row=><tr key={row.id} className="border-t border-suite-line-soft"><td className="p-2">{row.id}</td><td className="p-2">{row.fromCluster??"None"} → {row.toCluster??"None"}</td><td className="p-2">{row.changedExtractionFields.join(", ")||"None"}{row.sourceChanged?" · source text changed":""}</td></tr>)}</tbody></table></div></div>}
    {review&&<details className="mt-4 border-t border-suite-line-soft pt-3"><summary className="cursor-pointer text-xs font-bold">Grouping review history · {review.history.length} changes</summary>{review.history.length?<ol className="mt-3 space-y-3 text-xs">{[...review.history].reverse().map(entry=><li key={entry.revision}><strong>Revision {entry.revision} · {entry.reviewer}</strong> · {formatDate(entry.updatedAt,true)}<p>{entry.operation.replaceAll("_"," ")} {entry.recordId||entry.clusterId}: {entry.rationale}</p></li>)}</ol>:<p className="mt-2 text-xs text-suite-muted">No grouping decisions have been saved for this analysis.</p>}</details>}
  </DisclosurePanel>
}
