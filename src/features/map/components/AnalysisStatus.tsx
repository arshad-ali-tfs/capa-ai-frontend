import { useState } from "react"
import { useMapData } from "../MapDataProvider"
import { formatDate } from "../utils"
export function AnalysisStatus() {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const { analysis, refresh, refreshing, refreshError, lastChecked, editing } =
    useMapData()
  return (
    <section
      aria-label="Analysis coverage"
      className="text-xs text-suite-muted"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p>
          <strong className="text-suite-ink">
            {analysis.recordCount.toLocaleString()} analysed{" "}
            {analysis.recordCount === 1 ? "record" : "records"}
          </strong>
          {analysis.sourceRecordCount !== null
            ? ` · ${analysis.sourceRecordCount.toLocaleString()} records in source snapshot`
            : " · source coverage unavailable"}
          . Filters apply to this analysis.
        </p>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            aria-label="Analysis details"
            aria-expanded={detailsOpen}
            aria-controls="analysis-details"
            className="min-h-9 rounded-sm px-1 font-bold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-brand"
            onClick={() => setDetailsOpen((open) => !open)}
          >
            Details <span aria-hidden="true">{detailsOpen ? "−" : "+"}</span>
          </button>
          <button
            type="button"
            className="map-secondary min-h-9! px-2! py-1! text-xs!"
            onClick={() => void refresh()}
            disabled={refreshing || editing}
          >
            {refreshing ? "Refreshing…" : "Refresh data"}
          </button>
        </div>
      </div>
      <p id="analysis-details" hidden={!detailsOpen} className="mt-2 break-words rounded-lg border border-suite-line bg-white p-3">
        {analysis.selection === "configured"
          ? "Configured analysis"
          : "Latest completed analysis"}{" "}
        · <span title={analysis.runId}>Run {analysis.runId.slice(0, 8)}</span>
        {lastChecked ? ` · Checked ${formatDate(lastChecked, true)}` : ""}
      </p>
      {analysis.sourceMode === "synthetic" && (
        <p className="mt-2 font-bold text-warn-ink">
          Synthetic test analysis · not historical source data.
        </p>
      )}
      {!analysis.sourceAvailable && (
        <p className="mt-2 font-bold text-warn-ink">
          The original source snapshot is unavailable. Source dimensions and
          CAPA relationships may be incomplete.
        </p>
      )}
      {editing && (
        <p className="mt-2">
          Save or discard your annotation changes to refresh. Automatic checks
          are paused while you edit.
        </p>
      )}
      {refreshError && (
        <p role="alert" className="mt-2 text-[#8c2f12]">
          Refresh failed: {refreshError} The previous analysis remains
          displayed.
        </p>
      )}
    </section>
  )
}
