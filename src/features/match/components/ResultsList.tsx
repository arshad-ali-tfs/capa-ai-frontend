import { Badge, HelpTooltip } from "@/shared/components"
import { cx } from "@/shared/lib/classNames"
import type { MatchRow } from "../types"
import { criticalityTone, matchesLabel, siteLine, statusTone } from "../utils"

export function ResultsList({
  rows,
  totalCount,
  query,
  scope,
  selectedId,
  onSelect,
}: {
  rows: MatchRow[]
  totalCount: number
  query: string
  scope: string
  selectedId: string
  onSelect: (row: MatchRow) => void
}) {
  return (
    <section
      id="match-results"
      tabIndex={-1}
      aria-label="Search results"
      className="min-w-0 scroll-mt-4 rounded-xl border border-suite-line bg-white p-4 focus-visible:outline-2 focus-visible:outline-brand"
    >
      <div className="flex flex-wrap items-end gap-3 border-b border-suite-line-soft pb-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold tracking-wide text-brand uppercase">
            Ranked candidate deviations
          </p>
          <h2 className="mt-1 text-lg font-bold">
            {matchesLabel(rows.length, totalCount)}
          </h2>
          <p className="mt-1 text-xs text-suite-muted">{scope}</p>
        </div>
        <p className="flex items-center gap-1 text-[11px] text-suite-muted">
          Similarity helps prioritise review; it does not prove relevance.
          <HelpTooltip label="MATCH scores">Hybrid scores combine meaning (70%), keyword relevance (20%) and word overlap (10%). They range from 0 to 1 and rank candidates within the selected scope. They are not probabilities of correctness or recurrence.</HelpTooltip>
        </p>
      </div>
      <p className="mt-3 line-clamp-2 break-words text-xs text-suite-muted">Results for: {query}</p>
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
                    <span className="mt-1 block text-[11px] text-suite-muted">
                      {siteLine(row)}
                    </span>
                    <span className="mt-2 block text-xs leading-relaxed [overflow-wrap:anywhere]">
                      {row.excerpt}
                    </span>
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
    </section>
  )
}
