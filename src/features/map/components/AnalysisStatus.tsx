import { useId, useState } from "react"
import { HelpTooltip } from "@/shared/components"
import { useMapData } from "../MapDataProvider"
import { formatDate } from "../utils"
import { mapHelp } from "../helpText"
export function AnalysisStatus() {
  const runSelectId = useId()
  const [detailsOpen, setDetailsOpen] = useState(false)
  const { analysis, refresh, refreshing, refreshError, lastChecked, editing,
    runs, runsError, selectedRun, selectRun } =
    useMapData()
  const coverage=analysis.coverage
  const dominantYears=Object.entries(coverage?.yearCounts??{}).sort((a,b)=>b[1]-a[1]).slice(0,2)
  const concentration=analysis.recordCount?dominantYears.reduce((sum,[,count])=>sum+count,0)/analysis.recordCount*100:0
  return (
    <section
      aria-label="Analysis coverage"
      className="text-xs text-suite-muted"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 items-center gap-1">
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
          <HelpTooltip label="Analysis coverage">{mapHelp.coverage}</HelpTooltip>
        </div>
        <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-3 lg:w-auto">
          <div className="flex w-full min-w-0 items-center gap-1 sm:w-auto sm:flex-none">
            <label htmlFor={runSelectId} className="shrink-0 font-bold">Analysis run</label>
            <HelpTooltip label="Analysis run">{mapHelp.run}</HelpTooltip>
            <select
              id={runSelectId}
              aria-label="Analysis run"
              value={selectedRun}
              disabled={refreshing || editing}
              onChange={(event) => void selectRun(event.target.value)}
              className="min-h-9 w-full min-w-0 rounded-md border border-suite-line bg-white px-2 text-xs text-suite-ink outline-none focus:border-brand focus:ring-1 focus:ring-brand disabled:cursor-not-allowed disabled:opacity-60 sm:w-72"
            >
              <option value="">Latest analysis</option>
              {selectedRun && !runs.some((run) => run.id === selectedRun) && (
                <option value={selectedRun}>Run {selectedRun.slice(0, 8)}</option>
              )}
              {runs.map((run) => (
                <option key={run.id} value={run.id}>
                  {run.records === null ? "Run" : `${run.records.toLocaleString()} ${run.records === 1 ? "record" : "records"}`}
                  {` · ${formatDate(run.createdAt)} · ${run.id.slice(0, 8)}`}
                  {run.sourceMode === "synthetic" ? " · Test" : ""}
                </option>
              ))}
            </select>
          </div>
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
            {refreshing ? "Loading…" : "Refresh data"}
          </button>
        </div>
      </div>
      {coverage&&<div className="mt-3 rounded-lg border border-suite-line bg-suite-info-wash px-4 py-3 text-suite-blue" aria-label="Analysed time window">
        <p className="font-bold">Deviation opened dates: {coverage.openedFrom ? `${formatDate(coverage.openedFrom)} – ${formatDate(coverage.openedTo ?? coverage.openedFrom)}` : "Unavailable"}</p>
        <p className="mt-1 leading-5">{analysis.recordCount.toLocaleString()} analysed deviations{coverage.eligibleDeviationCount!=null?` of ${coverage.eligibleDeviationCount.toLocaleString()} eligible under this run’s rules`:""}. The analysis completion date describes processing, not the age of the deviations.</p>
        {coverage.selectionMethod==="source_order"&&coverage.eligibleDeviationCount!=null&&analysis.recordCount<coverage.eligibleDeviationCount&&<p className="mt-1 font-bold">Source-order sample · these counts do not represent the current population or its severity distribution.</p>}
        {analysis.recordCount>=100&&concentration>=80&&<p className="mt-1 font-bold">{concentration.toFixed(1)}% of analysed deviations opened in {dominantYears.map(([year])=>year).sort().join(" and ")}. This is the time distribution of this saved run.</p>}
        {coverage.selectionMethod==="stratified"&&<p className="mt-1">Stratified sample across year, site and criticality; proportions describe this sample.</p>}
      </div>}
      <p id="analysis-details" hidden={!detailsOpen} className="mt-2 break-words rounded-lg border border-suite-line bg-white p-3">
        {selectedRun ? "Selected analysis" : analysis.selection === "configured"
          ? "Configured analysis"
          : "Latest completed analysis"}{" "}
        · <span title={analysis.runId}>Run {analysis.runId.slice(0, 8)}</span>
        {lastChecked ? ` · Checked ${formatDate(lastChecked, true)}` : ""}
        {analysis.sourceResolution === "verified_equivalent_export"
          ? " · Source metadata restored from a verified equivalent export."
          : ""}
      </p>
      {detailsOpen&&coverage&&<div className="mt-2 space-y-2 rounded-lg border border-suite-line bg-white p-3 leading-5">
        <p>Source population: {coverage.sourceDeviationCount?.toLocaleString()??"Unknown"} deviations · {coverage.sourceCapaCount?.toLocaleString()??"Unknown"} CAPAs. Source rows include both record types.</p>
        <p>Source imported: {coverage.sourceImportedAt?formatDate(coverage.sourceImportedAt,true):"Not retained"}. Opened-year coverage: {Object.entries(coverage.yearCounts).map(([year,count])=>`${year}: ${count.toLocaleString()}`).join(" · ")||"Unavailable"}.</p>
        <p>Selection: {coverage.selectionMethod.replaceAll("_"," ")}. {coverage.missingOpenedDates} records lack usable opened dates.</p>
        {analysis.provenance&&<details><summary className="cursor-pointer font-bold">Analysis recipe and fingerprints</summary><p className="mt-2 break-all">Recipe: {analysis.provenance.recipeHash}<br/>Saved output: {analysis.provenance.outputFingerprint}</p><pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all text-[11px]">{JSON.stringify(analysis.provenance.recipe,null,2)}</pre>{!analysis.provenance.assetFingerprintsAvailable&&<p>Clustering asset fingerprints were not retained for this older run.</p>}</details>}
      </div>}
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
          Finish or cancel your review changes to switch runs or refresh. Automatic checks
          are paused while you edit.
        </p>
      )}
      {runsError && <p role="status" className="mt-2">{runsError}</p>}
      {refreshError && (
        <p role="alert" className="mt-2 text-[#8c2f12]">
          Data update failed: {refreshError} The previous analysis remains
          displayed.
        </p>
      )}
    </section>
  )
}
