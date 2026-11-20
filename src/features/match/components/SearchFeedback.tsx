import { EmptyState } from "@/shared/components"
import type { SearchResult, SearchState } from "../types"
import { filterChips } from "../searchModel"

export function SearchFeedback({
  state,
  errorMessage,
  onRetry,
  result,
}: {
  state: SearchState
  errorMessage: string
  onRetry: () => void
  result: SearchResult | null
}) {
  if (state === "idle") {
    return (
      <section className="rounded-xl border border-dashed border-suite-line-field bg-white px-5 py-12 text-center">
        <p className="text-base font-bold">
          Search for precedent or browse filtered history
        </p>
        <p className="mx-auto mt-2 max-w-xl text-[13px] leading-relaxed text-suite-muted">
          Enter a deviation ID, equipment identifier, a few keywords or a description of the issue.
          You can also leave the search empty and browse using the filters above.
        </p>
      </section>
    )
  }

  if (state === "loading") {
    return (
      <section
        className="rounded-xl border border-suite-line bg-white p-5"
        role="status"
        aria-busy="true"
      >
        <p className="text-sm font-bold">Searching historical deviations…</p>
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-24 animate-pulse rounded-lg bg-suite-surface"
            />
          ))}
        </div>
      </section>
    )
  }

  if (state === "empty") {
    return (
      <section className="rounded-xl border border-suite-line bg-white p-5">
        <EmptyState message={result?.eligibleCount === 0 ? "No indexed deviations meet the submitted filters. Adjust or clear a filter and try again."
          : result?.searchMode === "identifier" || result?.searchMode === "record_id" || !!result?.requiredIdentifiers.length ? "No exact identifier match was found within the submitted filters. Check the ID and site scope, or adjust the filters."
          : "No historical deviations matched this search. Adjust the keywords or filters, or try Meaning mode for related wording."} />
        {result && <p className="mt-3 text-xs leading-5 text-suite-muted">{result.scope}{result.eligibleCount !== null ? ` · ${result.eligibleCount.toLocaleString()} deviations within submitted filters` : ""}. Search covers retained index fields. A missing result does not establish that no related event exists in the QMS.</p>}
        {!!result?.requiredIdentifiers.length && <p className="mt-2 text-xs font-bold text-suite-blue">Required identifiers: {result.requiredIdentifiers.join(", ")}</p>}
        {result?.filters && <div className="mt-2 flex flex-wrap gap-2">{filterChips(result.filters).map(chip=><span key={`${chip.key}:${chip.value}`} className="rounded-full bg-suite-info-wash px-2 py-1 text-[11px] text-suite-blue">{chip.label}</span>)}</div>}
      </section>
    )
  }

  if (state === "error") {
    return (
      <section
        className="rounded-xl border border-[#efc4b5] bg-[#fff7f3] p-5"
        role="alert"
      >
        <h2 className="text-lg font-bold">Search unavailable</h2>
        <p className="mt-2 text-sm">
          {errorMessage || "The search request could not be completed."}
        </p>
        <button type="button" onClick={onRetry} className="map-secondary mt-4">
          Try again
        </button>
      </section>
    )
  }

  return null
}
