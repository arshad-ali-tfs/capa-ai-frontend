import { useEffect, useState } from "react"
import { addNavigationGuard, navigateTo } from "@/shared/lib/navigation"
import { Panel } from "@/shared/components"
import { useMapData } from "../MapDataProvider"
import type { Cluster, CurationChange, DeviationRecord } from "../types"

export function CurationPanel({cluster,record}:{cluster?:Cluster;record?:DeviationRecord}) {
  const {analysis,clusters,review,setCurationEditing,saveCuration}=useMapData()
  const [open,setOpen]=useState(false),[dirty,setDirty]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState("")
  const [reviewer,setReviewer]=useState("")
  const [rationale,setRationale]=useState("")
  const [title,setTitle]=useState(cluster?.title ?? "")
  const [theme,setTheme]=useState(cluster?.parentTheme ?? review?.themes[0] ?? "")
  const [target,setTarget]=useState(record?.clusterId ?? "")
  const [status,setStatus]=useState<"needs_review"|"reviewed">(cluster?.reviewStatus ?? "needs_review")
  const [baseRevision,setBaseRevision]=useState(review?.revision??0)
  useEffect(()=>{setCurationEditing(open||dirty||saving);return()=>setCurationEditing(false)},[open,dirty,saving,setCurationEditing])
  useEffect(()=>{
    if(!dirty&&!saving)return
    const unload=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue=""}
    const remove=addNavigationGuard(()=>{setError("Save or cancel the grouping changes before leaving this page.");return false})
    window.addEventListener("beforeunload",unload)
    return()=>{remove();window.removeEventListener("beforeunload",unload)}
  },[dirty,saving])
  if(!review)return null
  const changed=()=>{setDirty(true);setError("")}
  async function save(reset=false) {
    if(!review)return
    setSaving(true);setError("")
    try{
      let clusterId=target
      const revision=baseRevision
      if(record && target==="new" && !reset){
        clusterId=`review-${crypto.randomUUID().replaceAll("-","").slice(0,16)}`
      }
      const change:CurationChange=record
        ? {operation:reset?"reset_assignment":target==="new"?"split":"assignment",expected_revision:revision,cluster_id:clusterId,record_id:record.id,title,theme,reviewer,rationale}
        : {operation:reset?"reset_cluster":"cluster",expected_revision:revision,cluster_id:cluster?.id ?? "",title,theme,status,reviewer,rationale}
      await saveCuration(change)
      setDirty(false);setCurationEditing(false);setOpen(false);setRationale("")
      if(record){
        const id=reset ? record.originalClusterId : clusterId
        // Queue navigation until the unsaved-change guard has been removed.
        window.setTimeout(()=>navigateTo(id ? `/map/clusters/${id}/evidence/${record.id}` : `/map/records/${record.id}`),0)
      }
    }catch(failure){setError(failure instanceof Error?failure.message:"Review changes could not be saved.")}
    finally{setSaving(false)}
  }
  const enabled=reviewer.trim().length>0&&rationale.trim().length>=10&&(!record||!!target)&&(!(record&&target==="new")||!!title.trim())
  return <Panel title={record?"Review cluster assignment":"Review theme and membership"} help="Reviewer changes are versioned separately; the source and original AI analysis remain available.">
    <p className="text-xs leading-5 text-suite-muted">{record ? `Original assignment: ${record.originalClusterId || "Unassigned"}. Current assignment: ${record.clusterId || "Unassigned"}.` : `${cluster?.themeSource==="reviewed"?"Reviewer-assigned":"Suggested"} parent theme: ${cluster?.parentTheme ?? "Needs classification"}. ${cluster?.reviewStatus==="reviewed"?"Reviewed":"Awaiting review"}.`}</p>
    {!open?<button className="map-secondary mt-3 text-xs!" type="button" onClick={()=>{setTitle(cluster?.title??"");setTheme(cluster?.parentTheme??review.themes[0]??"");setStatus(cluster?.reviewStatus??"needs_review");setTarget(record?.clusterId??"");setBaseRevision(review.revision);setRationale("");setOpen(true)}}>{record?"Move or split this record":"Review this cluster"}</button>:<form className="mt-3 space-y-3" onSubmit={event=>{event.preventDefault();void save()}}>
      {record&&<label className="block text-xs font-bold">Target cluster<select aria-label="Target cluster" value={target} onChange={event=>{setTarget(event.target.value);changed()}} className="mt-1 min-h-10 w-full rounded border border-suite-line px-2 text-sm font-normal"><option value="">Choose a cluster</option>{clusters.map(item=><option key={item.id} value={item.id}>{item.id} · {item.title}</option>)}<option value="new">Create a separate subgroup</option></select></label>}
      {(!record||target==="new")&&<>
        <label className="block text-xs font-bold">Cluster title<input value={title} maxLength={300} onChange={event=>{setTitle(event.target.value);changed()}} className="mt-1 min-h-10 w-full rounded border border-suite-line px-2 text-sm font-normal" /></label>
        <label className="block text-xs font-bold">Parent theme<select aria-label="Parent theme" value={theme} onChange={event=>{setTheme(event.target.value);changed()}} className="mt-1 min-h-10 w-full rounded border border-suite-line px-2 text-sm font-normal">{review.themes.map(value=><option key={value}>{value}</option>)}</select></label>
      </>}
      {!record&&<label className="block text-xs font-bold">Membership review<select aria-label="Membership review" value={status} onChange={event=>{setStatus(event.target.value as typeof status);changed()}} className="mt-1 min-h-10 w-full rounded border border-suite-line px-2 text-sm font-normal"><option value="needs_review">Needs further review</option><option value="reviewed">Theme and members reviewed</option></select></label>}
      <label className="block text-xs font-bold">Reviewer<input value={reviewer} maxLength={200} onChange={event=>{setReviewer(event.target.value);changed()}} className="mt-1 min-h-10 w-full rounded border border-suite-line px-2 text-sm font-normal" /></label>
      <label className="block text-xs font-bold">Grouping rationale<textarea value={rationale} minLength={10} maxLength={4000} rows={3} onChange={event=>{setRationale(event.target.value);changed()}} className="mt-1 w-full rounded border border-suite-line p-2 text-sm font-normal" placeholder="Explain the evidence, differences and reason for this decision." /></label>
      <div className="flex flex-wrap gap-2"><button type="submit" disabled={!enabled||saving} className="map-primary text-xs!">{saving?"Saving…":"Save grouping review"}</button><button type="button" disabled={saving} className="map-secondary text-xs!" onClick={()=>{setDirty(false);setOpen(false);setError("");setRationale("");setTitle(cluster?.title??"");setTheme(cluster?.parentTheme??review.themes[0]);setTarget(record?.clusterId??"");setStatus(cluster?.reviewStatus??"needs_review")}}>Cancel changes</button>
        {(record?.assignmentReview||(!record&&cluster?.reviewedContext&&!cluster.id.startsWith("review-")))&&<button type="button" disabled={!enabled||saving} onClick={()=>void save(true)} className="map-secondary text-xs!">Restore original {record?"assignment":"label"}</button>}</div>
    </form>}
    {error&&<p role="alert" className="mt-3 text-xs text-brand">{error}</p>}
    {record?.assignmentReview&&<p className="mt-3 text-xs leading-5">Last assignment review: {record.assignmentReview.reviewer} · {record.assignmentReview.rationale}</p>}
    <p className="mt-3 text-[11px] text-suite-muted">Run {analysis.runId.slice(0,8)} · Review revision {review.revision}. Local investigation review does not change the QMS record.</p>
  </Panel>
}
