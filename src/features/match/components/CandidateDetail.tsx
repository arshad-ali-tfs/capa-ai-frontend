import { SelectedTabs } from "./SelectedTabs"
import { WatchlistPanel } from "./WatchlistPanel"
import { useEffect, useRef, useState } from "react"
import { Badge, EmptyState } from "@/shared/components"
import type { DetailState, MatchRow, RecordDetail } from "../types"
import { criticalityTone, siteLine, statusTone } from "../utils"
import { HighlightedText } from "./HighlightedText"
import { modeLabel } from "../searchModel"

export function CandidateDetail({ selected, detailState, detailError, recordDetail, onRetry }: {
  selected: MatchRow | undefined
  detailState: DetailState
  detailError: string
  recordDetail: RecordDetail | null
  onRetry: () => void
}) {
  const selectionKey=selected?`${selected.snapshotId}:${selected.site}:${selected.deviationId}`:""
  const [tab,setTab]=useState<{key:string;value:"details"|"watchlist"}>({key:"",value:"details"})
  const [openedWatch,setOpenedWatch]=useState("")
  const activeTab=tab.key===selectionKey?tab.value:"details"
  function changeTab(value:"details"|"watchlist") {setTab({key:selectionKey,value});if(value==="watchlist")setOpenedWatch(selectionKey)}
  useEffect(()=>{if(detailState==="loading")setTab({key:selectionKey,value:"details"})},[detailState,selectionKey])
  const panel = useRef<HTMLElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (selected && window.matchMedia("(max-width: 1279px)").matches) {
      panel.current?.scrollIntoView({ block: "start", behavior: "instant" })
      heading.current?.focus({ preventScroll: true })
    }
  }, [selected?.deviationId])
  return (
    <aside id="match-selected-deviation" ref={panel} aria-label="Selected deviation" className="map-review-sidebar min-w-0 scroll-mt-4">
      <div className="rounded-xl border border-suite-line-strong bg-white p-4 shadow-sm">
        {!selected ? <EmptyState message="Select a candidate deviation to inspect its indexed source text and related CAPA details." /> : <>
          <div className="border-b border-suite-line-soft pb-3">
            <p className="text-[10px] font-bold tracking-wide text-suite-muted uppercase">Selected deviation</p>
            <h2 ref={heading} tabIndex={-1} className="mt-1 rounded-sm text-lg font-bold text-brand focus-visible:outline-2 focus-visible:outline-brand">{selected.deviationId}</h2>
            <p className="mt-1 text-[11px] text-suite-muted">{siteLine(selected)}</p>
            {selected.recordName && <p className="mt-2 text-sm font-bold [overflow-wrap:anywhere]">{selected.recordName}</p>}
            {(selected.drType || selected.department) && <p className="mt-2 text-xs leading-5 text-suite-muted">{[selected.drType, selected.department].filter(Boolean).join(" · ")}</p>}
            <button type="button" className="map-secondary mt-3 text-xs! xl:hidden" onClick={() => {
              const results = document.getElementById("match-results")
              results?.scrollIntoView({ block: "start", behavior: "instant" })
              results?.focus({ preventScroll: true })
            }}>Back to results ↑</button>
          </div>
          <div className="pt-3">
            <div className="flex flex-wrap gap-2">
              {selected.criticality && <Badge tone={criticalityTone(selected.criticality)}>{selected.criticality}</Badge>}
              {selected.status && <Badge tone={statusTone(selected.status)}>{selected.status}</Badge>}
            </div>
          </div>
          <SelectedTabs value={activeTab} onChange={changeTab}/>
          <div id="match-details-panel" role="tabpanel" aria-labelledby="match-details-tab" hidden={activeTab!=="details"}>
          <div className="pt-3">
            <p className="mt-3 text-[11px] font-bold text-suite-blue">{modeLabel[selected.matchKind]} · {selected.matchedField || "Indexed text"}</p>
            <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed [overflow-wrap:anywhere]"><HighlightedText text={selected.excerpt} spans={selected.spans} /></p>
            {selected.reasons.length > 0 && <ul aria-label="Why this record appears" className="mt-3 list-inside list-disc space-y-1 text-xs leading-5 text-suite-blue">{selected.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>}
          </div>
          {detailState === "loading" && <p className="mt-4 text-xs text-suite-muted" role="status" aria-busy="true">Loading source and CAPA details…</p>}
          {detailState === "error" && (
            <div className="mt-4 rounded-lg border border-[#efc4b5] bg-[#fff7f3] p-3" role="alert">
              <p className="text-xs font-bold">Record details unavailable</p>
              <p className="mt-1 text-xs leading-relaxed">{detailError}</p>
              <button type="button" onClick={onRetry} className="map-secondary mt-2 min-h-8 px-2 py-1 text-xs">Try again</button>
            </div>
          )}
          {detailState === "success" && recordDetail && <>
            <div className="mt-4 border-t border-suite-line-soft pt-4">
              <h3 className="text-sm font-bold">Retained source text</h3>
              <p className="mt-1 text-[11px] text-suite-muted">Indexed fields and any additional investigation text from the same source snapshot. Investigation text is included in literal searches. Verify the complete record in the QMS.</p>
              {recordDetail.sections.length || recordDetail.literalSections?.length ? (
                <div role="region" aria-label="Selected source narrative" tabIndex={0} className="mt-3 max-h-[55dvh] space-y-4 overflow-y-auto rounded-lg border border-suite-line-soft p-3 outline-none focus-visible:ring-2 focus-visible:ring-brand">
                  {recordDetail.sections.map(section => <section key={section.label}>
                    <h4 className="text-xs font-bold">{section.label}</h4>
                    <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed [overflow-wrap:anywhere]">{section.text}</p>
                  </section>)}
                  {recordDetail.literalSections?.map(section => <section key={`literal:${section.label}`}>
                    <h4 className="text-xs font-bold">{section.label} <span className="ml-1 rounded bg-suite-info-wash px-1.5 py-0.5 text-[10px] font-normal text-suite-blue">Literal search</span></h4>
                    <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed [overflow-wrap:anywhere]">{section.text}</p>
                  </section>)}
                </div>
              ) : <p className="mt-3 text-xs text-suite-muted">No source text was retained for this record.</p>}
            </div>
            <div className="mt-4 border-t border-suite-line-soft pt-4">
              <h3 className="text-sm font-bold">Related CAPA details</h3>
              {!recordDetail.capas.length ? <div className="mt-3"><EmptyState message="No related CAPA details were returned for this deviation." /></div> : (
                <ul className="mt-3 space-y-2">
                  {recordDetail.capas.map(capa => <li key={capa.capaId} className="rounded-lg bg-suite-surface p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-brand">{capa.capaId}</span>
                      {capa.status && <Badge tone={statusTone(capa.status)}>{capa.status}</Badge>}
                    </div>
                    {capa.title && <p className="mt-2 text-xs font-bold">{capa.title}</p>}
                    {capa.summary && <p className="mt-1 text-xs leading-relaxed text-suite-slate [overflow-wrap:anywhere]">{capa.summary}</p>}
                    {capa.capaType && <p className="mt-2 text-[11px] text-suite-muted">Type: {capa.capaType}</p>}
                  </li>)}
                </ul>
              )}
              <p className="mt-3 text-[11px] text-suite-muted">Links use source parent IDs. No link found does not establish whether a CAPA is needed or exists elsewhere.</p>
            </div>
          </>}
          </div>
          <div id="match-watchlist-panel" role="tabpanel" aria-labelledby="match-watchlist-tab" hidden={activeTab!=="watchlist"}>
            {openedWatch===selectionKey&&<WatchlistPanel key={selectionKey} selected={selected}/>}
          </div>
        </>}
      </div>
    </aside>
  )
}
