import { StatusCountsView } from "./ScopeControls"
import { AnswerNotes } from "./AnswerNotes"
import type { EvidenceOverview as Overview, MatchRow, SearchResult } from "../types"

export function EvidenceOverview({result, value, state, onSelect, onRetry}: {
  result: SearchResult; value: Overview | null; state: "idle" | "loading" | "success" | "error"
  onSelect: (row: MatchRow) => void; onRetry: () => void
}) {
  if (!result.summaryId) return null
  const unavailable=value?.verificationStatus==="unavailable"
  const gap=value?.verificationStatus==="insufficient_evidence"
  const label=unavailable?"Could not verify answer":gap?"Not enough evidence":value?.answerStatus==="answered"?"Cited answer":value?.isQuestion?"Evidence gap":"Source-checked overview"
  return <section aria-label="Evidence overview" aria-busy={state === "loading"} className="min-w-0 rounded-xl border border-suite-line bg-white p-4 sm:p-5">
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <h2 className="text-base font-bold">{value?.isQuestion ? "Answer to your question" : "Evidence overview"}</h2>
      <span className="rounded-full bg-suite-info-wash px-2 py-1 text-[10px] font-bold text-suite-blue">{unavailable?"Source review":"AI generated"}</span>
      {(value?.isQuestion||value?.verificationStatus)&&<span className={`rounded-full px-2 py-1 text-[10px] font-bold ${!unavailable&&!gap&&value?.answerStatus!=="not_established"?"bg-suite-info-wash text-suite-blue":"bg-warn-wash text-warn-ink"}`}>{label}</span>}
      <span className="text-xs text-suite-muted sm:ml-auto">{value ? unavailable?`${value.reviewedIds.length} source records available for review`:`${value.reviewedIds.length} of ${value.returnedCount} returned records reviewed` : "Based on the leading source results"}</span>
    </div>
    {state === "loading" && <p role="status" className="text-sm leading-6 text-suite-muted">Reading historical findings and CAPA evidence… <span className="block text-xs">You can open the source records below while this prepares.</span></p>}
    {state === "error" && <p className="text-sm leading-6 text-suite-muted">The overview is unavailable right now. Your source results are ready below; this does not establish that the evidence is insufficient. <button type="button" onClick={onRetry} className="min-h-8 font-bold text-suite-blue underline">Retry overview</button></p>}
    {value && <div className="space-y-2.5">{value.lines.map((line, index) => <p key={index} className="text-sm leading-6 text-suite-ink [overflow-wrap:anywhere]">
      {line.text} <span className="inline-flex flex-wrap gap-1 align-baseline">{line.references.map(id => <button key={id} type="button" aria-label={`Open cited deviation ${id}`} onClick={() => { const row=result.rows.find(row=>row.deviationId===id); if(row) {onSelect(row); window.requestAnimationFrame(()=>document.getElementById("match-selected-deviation")?.scrollIntoView({block:"start",behavior:"smooth"}))} }} className="min-h-7 rounded bg-suite-info-wash px-1.5 text-[11px] font-bold text-suite-blue hover:underline">{id}</button>)}</span>
    </p>)}</div>}
    {value?.reviewedStatusCounts&&<div className="mt-3"><StatusCountsView counts={value.reviewedStatusCounts} label={unavailable?"Available workflow statuses":"Reviewed workflow statuses"}/>{value.reviewedStatusCounts.ongoing>0&&<p className="mt-1 text-xs text-warn-ink">Ongoing investigation findings are provisional and may change.</p>}{value.reviewedStatusCounts.cancelled>0&&<p className="mt-1 text-xs text-warn-ink">Cancelled records are included for context and are not completed investigation precedents.</p>}</div>}
    {value && <AnswerNotes value={value} />}
    <p className="mt-3 border-t border-suite-line-soft pt-2 text-[11px] leading-5 text-suite-muted">Selected historical excerpts, not a conclusion for the current case. Check the cited sources before using the findings.</p>
  </section>
}
