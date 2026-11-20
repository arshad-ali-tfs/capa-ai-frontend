import { useEffect, useState } from "react"
import { Panel } from "@/shared/components"
import { downloadJson } from "@/shared/lib/download"
import { matchService } from "../services/matchService"
import type { EvidenceDecision, MatchRow, RecordDetail, SavedCase, SearchResult, SourcePassage } from "../types"

function sourceExcerpt(source:RecordDetail|undefined,pattern:RegExp):{text:string;field:string;start:number}|null {
  if(!source)return null
  const sections=[...source.sections,...source.literalSections??[]]
  for(const section of [...sections].sort((a,b)=>Number(b.label==="Conclusion")-Number(a.label==="Conclusion"))){
    const hit=pattern.exec(section.text)
    if(!hit)continue
    const start=Math.max(0,hit.index-100)
    return {text:section.text.slice(start,start+550),field:section.label,start}
  }
  return null
}

export function InvestigationWorkspace({result,ids,onIdsChange,onSelect,saved,onSaved,overviewLoading}:{
  result:SearchResult;ids:string[];onIdsChange:(ids:string[])=>void;onSelect:(row:MatchRow,passage?:SourcePassage)=>void
  saved:SavedCase|null;onSaved:(saved:SavedCase)=>void;overviewLoading:boolean
}){
  const draftKey=`match-investigation-draft:${JSON.stringify([result.snapshotId,result.indexGeneration,result.submittedCriteria??result.query])}`
  const [draft]=useState(()=>{
    if(saved)return null
    try{
      const value=JSON.parse(sessionStorage.getItem(draftKey)||"null")
      if(value&&typeof value.title==="string"&&typeof value.reviewer==="string"&&typeof value.notes==="string"&&Array.isArray(value.ids)&&value.ids.length<=6&&value.ids.every((id:unknown)=>typeof id==="string"&&result.rows.some(row=>row.deviationId===id))&&value.decisions&&Object.values(value.decisions).every((item:any)=>item&&["include","exclude"].includes(item.disposition)&&typeof item.rationale==="string")&&(value.ids.length||value.title||value.reviewer||value.notes))return value
    }catch{}
    return null
  })
  const [draftRestored,setDraftRestored]=useState(!!draft)
  const [sources,setSources]=useState<RecordDetail[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState("")
  const [title,setTitle]=useState(saved?.title??draft?.title??""),[reviewer,setReviewer]=useState(saved?.reviewer??draft?.reviewer??""),[notes,setNotes]=useState(saved?.notes??draft?.notes??"")
  const [decisions,setDecisions]=useState<Record<string,{disposition:"include"|"exclude";rationale:string}>>(()=>draft?.decisions??Object.fromEntries((saved?.decisions??[]).map(decision=>[decision.pr_id,decision])))
  const [saving,setSaving]=useState(false),[revision,setRevision]=useState(0)
  const rows=ids.map(id=>result.rows.find(row=>row.deviationId===id)).filter((row):row is MatchRow=>!!row)
  useEffect(()=>{if(draft&&!saved)onIdsChange(draft.ids)},[])
  useEffect(()=>{
    try{
      if(saved||!(ids.length||title||reviewer||notes))sessionStorage.removeItem(draftKey)
      else sessionStorage.setItem(draftKey,JSON.stringify({title,reviewer,notes,decisions,ids}))
    }catch{ /* Explicit server save remains available when tab storage is full. */ }
  },[saved?.id,title,reviewer,notes,decisions,ids.join("|"),draftKey])
  useEffect(()=>{if(saved){setTitle(saved.title);setReviewer(saved.reviewer);setNotes(saved.notes);setDecisions(Object.fromEntries(saved.decisions.map(decision=>[decision.pr_id,decision]))) }},[saved?.id])
  useEffect(()=>{
    const controller=new AbortController()
    let active=true
    setLoading(!!ids.length);setError("");setSources([])
    void Promise.allSettled(rows.map(row=>{
      const retained=saved?.sources.find(source=>source.deviationId===row.deviationId)
      return retained?Promise.resolve(retained):matchService.getRecord(row,controller.signal)
    })).then(values=>{
      if(!active)return
      setSources(values.flatMap(value=>value.status==="fulfilled"?[value.value]:[]))
      if(values.some(value=>value.status==="rejected"))setError("Some selected source records could not be loaded. Retry before relying on the comparison.")
      setLoading(false)
    })
    return()=>{active=false;controller.abort()}
  },[result,ids.join("|"),revision,saved?.id])
  const canSave=!!result.searchId&&!saved&&title.trim().length>=3&&!!reviewer.trim()&&rows.every(row=>(decisions[row.deviationId]?.rationale.trim().length??0)>=3)&&!loading&&!saving&&!overviewLoading&&sources.length===rows.length
  async function save(){
    if(!result.searchId)return
    setSaving(true);setError("")
    try{
      const chosen:EvidenceDecision[]=rows.map(row=>({pr_id:row.deviationId,disposition:decisions[row.deviationId]?.disposition??"include",rationale:decisions[row.deviationId]?.rationale??""}))
      onSaved(await matchService.saveCase(result.searchId,title,reviewer,notes,chosen))
    }catch(failure){setError(failure instanceof Error?failure.message:"The investigation could not be saved.")}
    finally{setSaving(false)}
  }
  const cell=(row:MatchRow,pattern:RegExp)=>{
    const source=sources.find(source=>source.deviationId===row.deviationId),quote=sourceExcerpt(source,pattern)
    return quote?<><p className="whitespace-pre-wrap break-words text-xs leading-5">“{quote.text}”</p><button type="button" className="mt-2 text-xs font-bold text-suite-blue underline" onClick={()=>onSelect(row)}>Open {quote.field.toLowerCase()} source</button></>:<span className="text-xs text-suite-muted">No explicit passage identified in the retained fields. Inspect the source and any attachments.</span>
  }
  return <div id="investigation-workspace" className="min-w-0 scroll-mt-4"><Panel title={`Investigation workspace · ${rows.length}/6 cases`} help="Compare source evidence and record why you include or exclude a precedent. Shared terms and assets do not establish a common cause.">
    <div className="flex flex-wrap items-end gap-3"><label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-bold">Add a returned case<select aria-label="Add case to comparison" value="" disabled={ids.length>=6||!!saved} onChange={event=>{if(event.target.value)onIdsChange([...ids,event.target.value])}} className="min-h-10 min-w-0 rounded border border-suite-line bg-white px-2 text-sm font-normal"><option value="">Choose a candidate</option>{result.rows.filter(row=>!ids.includes(row.deviationId)).map(row=><option key={row.deviationId} value={row.deviationId}>{row.deviationId} · {row.recordName}</option>)}</select></label>{saved&&<button type="button" className="map-secondary text-xs!" onClick={()=>downloadJson(`MATCH-investigation-${saved.id}.json`,saved.raw)}>Download evidence bundle</button>}</div>
    {draftRestored&&!saved&&<p role="status" className="mt-3 rounded bg-suite-info-wash p-3 text-xs leading-5 text-suite-blue">Investigation draft restored in this browser tab. Save it to retain evidence beyond this tab. <button type="button" className="font-bold underline" onClick={()=>{setTitle("");setReviewer("");setNotes("");setDecisions({});onIdsChange([]);setDraftRestored(false)}}>Discard restored draft</button></p>}
    {result.seed&&<p className="mt-3 rounded bg-suite-info-wash p-3 text-xs leading-5 text-suite-blue"><strong>Reference deviation {result.seed.deviationId}</strong> · {result.seed.title}. Compare event mechanisms and material differences; no current-case cause is inferred.</p>}
    {loading&&<p role="status" className="mt-3 text-xs text-suite-muted">Loading original evidence for the comparison…</p>}
    {error&&<p role="alert" className="mt-3 text-xs text-brand">{error} <button type="button" onClick={()=>setRevision(value=>value+1)} className="font-bold underline">Retry source loading</button></p>}
    {rows.length>0&&<div className="mt-4 max-w-full overflow-x-auto rounded border border-suite-line"><table aria-label="Historical case comparison" className="w-full min-w-[700px] border-collapse text-left"><thead><tr><th className="w-36 min-w-36 bg-suite-hover p-3 text-xs">Compare evidence</th>{rows.map(row=><th key={row.deviationId} className="min-w-64 max-w-sm bg-suite-hover p-3 text-sm"><button type="button" onClick={()=>onSelect(row)} className="font-bold text-suite-blue underline">{row.deviationId}</button>{!saved&&<button type="button" onClick={()=>onIdsChange(ids.filter(id=>id!==row.deviationId))} aria-label={`Remove ${row.deviationId} from comparison`} className="ml-3 text-xs text-suite-muted">Remove</button>}</th>)}</tr></thead><tbody>
      <tr className="border-t border-suite-line"><th className="p-3 text-xs">Recorded event</th>{rows.map(row=><td className="p-3 text-xs leading-5" key={row.deviationId}>{row.recordName}<p className="mt-2 text-suite-muted">{row.site} · Opened {row.openedDate}</p><p>{row.criticality} · {row.status}</p></td>)}</tr>
      <tr className="border-t border-suite-line"><th className="p-3 text-xs">Investigation finding excerpt</th>{rows.map(row=><td key={row.deviationId} className="p-3 align-top">{cell(row,/root cause|probable cause|contribut|investigation (?:found|determined)|cause (?:was|is|identified)/i)}</td>)}</tr>
      <tr className="border-t border-suite-line"><th className="p-3 text-xs">Documented action excerpt</th>{rows.map(row=><td key={row.deviationId} className="p-3 align-top">{cell(row,/corrective action|preventive action|CAPA\s*#|retrain|revis(?:ed|ion)|updat(?:ed|ing)|prohibit|reassess/i)}</td>)}</tr>
      <tr className="border-t border-suite-line"><th className="p-3 text-xs">Follow-up evidence excerpt</th>{rows.map(row=><td key={row.deviationId} className="p-3 align-top">{cell(row,/effectiveness|follow.up|subsequent.*(?:monitor|test|result)|reassess|no (?:further|repeat)|met (?:the )?(?:specification|acceptance)/i)}<p className="mt-2 text-[11px] text-suite-muted">An excerpt is not an approved CAPA-effectiveness conclusion.</p></td>)}</tr>
      <tr className="border-t border-suite-line"><th className="p-3 text-xs">Retained CAPA status</th>{rows.map(row=>{const source=sources.find(item=>item.deviationId===row.deviationId);return <td key={row.deviationId} className="p-3 align-top text-xs leading-5">{source?.capas.length?source.capas.map(capa=><p key={capa.capaId}>{capa.capaId} · {capa.status}{capa.dateClosed?` · closed ${capa.dateClosed}`:""}</p>):"No retained relationship; narrative mentions and attachments may contain additional actions."}</td>})}</tr>
      <tr className="border-t border-suite-line"><th className="p-3 text-xs">Differences and decision</th>{rows.map(row=><td key={row.deviationId} className="p-3 align-top"><label className="block text-xs">Use as precedent<select aria-label={`Evidence decision for ${row.deviationId}`} disabled={!!saved} value={decisions[row.deviationId]?.disposition??"include"} onChange={event=>setDecisions(current=>({...current,[row.deviationId]:{rationale:current[row.deviationId]?.rationale??"",disposition:event.target.value as "include"|"exclude"}}))} className="mt-1 min-h-9 w-full rounded border border-suite-line bg-white px-2"><option value="include">Include for source review</option><option value="exclude">Exclude from rationale</option></select></label><label className="mt-2 block text-xs">Evidence and material differences<textarea aria-label={`Rationale for ${row.deviationId}`} disabled={!!saved} value={decisions[row.deviationId]?.rationale??""} onChange={event=>setDecisions(current=>({...current,[row.deviationId]:{disposition:current[row.deviationId]?.disposition??"include",rationale:event.target.value}}))} rows={3} maxLength={2000} className="mt-1 w-full rounded border border-suite-line p-2" placeholder="What matches, what differs, and why this precedent is useful or unsuitable." /></label></td>)}</tr>
    </tbody></table></div>}
    <details className="mt-4 rounded-lg border border-suite-line p-3" open={!!saved}><summary className="cursor-pointer text-sm font-bold">{saved?`Saved investigation · ${saved.title}`:"Save investigation and rationale"}</summary>
      {saved?<div className="mt-3 space-y-2 text-xs"><p>{saved.reviewer} · {saved.createdAt}</p><p className="whitespace-pre-wrap">{saved.notes||"No additional notes."}</p><p className="text-suite-muted">Frozen search criteria and included source records are retained with their original source version. Start a new search to reassess current data.</p>{(saved.sourceChanged||saved.indexChanged)&&<p className="font-bold text-warn-ink">The current source or search index differs from this saved investigation. Its retained evidence has not been replaced.</p>}</div>:<div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold">Investigation title<input value={title} maxLength={200} onChange={event=>setTitle(event.target.value)} className="mt-1 min-h-10 w-full rounded border border-suite-line px-2 font-normal" /></label><label className="text-xs font-bold">Investigator<input value={reviewer} maxLength={200} onChange={event=>setReviewer(event.target.value)} className="mt-1 min-h-10 w-full rounded border border-suite-line px-2 font-normal" /></label><label className="text-xs font-bold sm:col-span-2">Investigation notes<textarea value={notes} maxLength={10000} onChange={event=>setNotes(event.target.value)} rows={3} className="mt-1 w-full rounded border border-suite-line p-2 font-normal" /></label><div className="sm:col-span-2"><button type="button" onClick={()=>void save()} disabled={!canSave} className="map-primary text-xs!">{saving?"Saving…":"Save investigation"}</button><p className="mt-2 text-[11px] leading-5 text-suite-muted">Enter a title, investigator and rationale for every selected case. Up to six included sources are retained; query, filters, selected results, versions and available overview are saved together.{overviewLoading?" The evidence overview is still preparing.":""}</p></div>
      </div>}
    </details>
  </Panel></div>
}
