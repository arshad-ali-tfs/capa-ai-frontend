import { EmptyState } from "@/shared/components"
import type { SearchState } from "../types"

export function SearchFeedback({
  state,
  errorMessage,
  onRetry,
}: {
  state: SearchState
  errorMessage: string
  onRetry: () => void
}) {
  if (state === "idle") {
    return (
      <section className="rounded-xl border border-dashed border-suite-line-field bg-white px-5 py-12 text-center">
        <p className="text-base font-bold">
          Start with a deviation description
        </p>
        <p className="mx-auto mt-2 max-w-xl text-[13px] leading-relaxed text-suite-muted">
          Search returns a ranked list of similar historical deviations. Select
          a candidate to review its indexed source text and any available CAPA context.
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
      <EmptyState message="No historical deviations matched this search. Revise the description and try again." />
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
