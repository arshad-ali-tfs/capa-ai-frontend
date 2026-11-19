import { Badge, HelpTooltip } from "@/shared/components"
import { cx } from "@/shared/lib/classNames"
import type { MatchRow, SearchResult } from "../types"
import { criticalityTone, matchesLabel, siteLine, statusTone } from "../utils"
import { filterChips, modeLabel } from "../searchModel"
import { HighlightedText } from "./HighlightedText"

export function ResultsList({
  rows,
  totalCount,
  query,
  scope,
  selectedId,
  onSelect,
  result,
  onPage,
  pagingDisabled,
}: {
  rows: MatchRow[]
  totalCount: number
  query: string
  scope: string
  selectedId: string
  onSelect: (row: MatchRow) => void
  result: SearchResult
  onPage: (offset: number) => void
  pagingDisabled: boolean
}) {
  return (
    <section
      id="match-results"
      tabIndex={-1}
      aria-label="Search results"
      className="min-w-0 scroll-mt-4 rounded-xl border border-suite-line bg-white p-4 focus-visible:outline-2 focus-visible:outline-brand"
    >
      <div className="flex flex-col gap-3 border-b border-suite-line-soft pb-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold tracking-wide text-brand uppercase">
            {modeLabel[result.searchMode]}
          </p>
          <h2 className="mt-1 text-lg font-bold">
            {result.totalMatches !== null ? `Showing ${result.offset + 1}–${result.offset + rows.length} of ${result.totalMatches.toLocaleString()} ${result.totalMatches === 1 ? "deviation" : "deviations"}` : matchesLabel(rows.length, totalCount)}
          </h2>
          <p className="mt-1 text-xs text-suite-muted">{scope}</p>
          {result.eligibleCount !== null && <p className="mt-1 text-xs text-suite-muted">{result.eligibleCount.toLocaleString()} deviations within the submitted filters{result.totalMatches === null ? " · results are ranked candidates, not an exhaustive match count" : ""}</p>}
        </div>
        <p className="flex items-center gap-1 text-[11px] text-suite-muted">
          Open a record to inspect its evidence.
          <HelpTooltip label="MATCH scores">{result.rankingHelp ?? (result.searchMode === "semantic" ? "Semantic scores measure closeness in the embedding model's comparison space. They rank candidates within the filtered population and are not probabilities of correctness or recurrence." : "Hybrid scores combine meaning (70%), keyword relevance (20%) and word overlap (10%). They range from 0 to 1 and rank candidates within the selected scope. They are not probabilities of correctness or recurrence. Browse and literal searches do not receive similarity scores.")}</HelpTooltip>
        </p>
      </div>
      <p className="mt-3 line-clamp-2 break-words text-xs text-suite-muted">{query ? `Results for: ${query}` : "Browsing filtered history · newest opened records first"}</p>
      {result.filters && <div className="mt-2 flex flex-wrap gap-1.5">{filterChips(result.filters).map(chip => <span key={`${chip.key}:${chip.value}`} className="max-w-full rounded-full bg-suite-info-wash px-2 py-1 text-[11px] text-suite-blue [overflow-wrap:anywhere]">{chip.label}</span>)}</div>}
      {result.requiredIdentifiers.length > 0 && <p className="mt-2 text-xs font-bold text-suite-blue">Required identifiers: {result.requiredIdentifiers.join(", ")}</p>}
      <ol className="mt-2 space-y-1.5">
        {rows.map((row, index) => {
          const active = selectedId === row.deviationId
          return (
            <li key={`${row.deviationId}:${index}`}>
              <button
                type="button"
                aria-pressed={active}
                aria-controls="match-selected-deviation"
                onClick={() => onSelect(row)}
                className={cx(
                  "w-full rounded-lg border p-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
                  active
                    ? "border-brand bg-brand-wash"
                    : "border-transparent hover:border-suite-line hover:bg-suite-hover",
                )}
              >
                <span className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <span
                    aria-hidden="true"
                    className="flex size-7 shrink-0 items-center justify-center rounded-full bg-suite-line-soft text-[11px] font-bold text-suite-slate"
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-brand">
                        {row.deviationId}
                      </span>
                      <span className="rounded bg-suite-info-wash px-1.5 py-0.5 text-[10px] font-bold text-suite-blue">{modeLabel[row.matchKind]}</span>
                      {row.criticality && (
                        <Badge tone={criticalityTone(row.criticality)}>
                          {row.criticality}
                        </Badge>
                      )}
                      {row.status && (
                        <Badge tone={statusTone(row.status)}>
                          {row.status}
                        </Badge>
                      )}
                    </span>
                    {row.recordName && <span className="mt-1 block text-sm font-bold [overflow-wrap:anywhere]">{row.recordName}</span>}
                    <span className="mt-1 block text-[11px] text-suite-muted">
                      {siteLine(row)}
                    </span>
                    {(row.drType || row.department) && <span className="mt-1 block text-[11px] text-suite-muted [overflow-wrap:anywhere]">{[row.drType, row.department, row.capaCount ? `${row.capaCount} linked CAPA${row.capaCount === 1 ? "" : "s"}` : ""].filter(Boolean).join(" · ")}</span>}
                    <span className="mt-2 block text-xs leading-relaxed [overflow-wrap:anywhere]">
                      <HighlightedText text={row.excerpt} spans={row.spans} />
                    </span>
                    {row.reasons.length > 0 && <span className="mt-2 block text-[11px] leading-5 text-suite-blue">{row.reasons.join(" · ")}</span>}
                    {row.matchedField && <span className="mt-1 block text-[11px] text-suite-muted">Matched field: {row.matchedField}</span>}
                  </span>
                  {row.score && (
                    <span className="shrink-0 rounded-lg bg-suite-surface px-3 py-2 sm:w-[116px]">
                      <span className="block text-[9px] leading-tight text-suite-muted uppercase">
                        {row.scoreLabel}
                      </span>
                      <span className="mt-1 block text-lg leading-none font-bold">
                        {row.score}
                      </span>
                    </span>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
      {(result.hasMore || result.offset > 0) && <nav aria-label="Result pages" className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-suite-line-soft pt-3">
        <button type="button" className="map-secondary text-xs" disabled={pagingDisabled || result.offset === 0} onClick={() => onPage(Math.max(0, result.offset - result.limit))}>Previous page</button>
        <span className="text-xs text-suite-muted">Page {Math.floor(result.offset / result.limit) + 1}</span>
        <button type="button" className="map-secondary text-xs" disabled={pagingDisabled || !result.hasMore} onClick={() => onPage(result.offset + result.limit)}>Next page</button>
      </nav>}
    </section>
  )
}
