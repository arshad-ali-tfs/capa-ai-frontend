import { useId, type KeyboardEvent } from "react"
import { Panel } from "@/shared/components"
import { wordCount } from "../utils"

export function SearchPanel({
  query,
  onQueryChange,
  onSearch,
  loading,
  site,
  onSiteChange,
  sites,
  topK,
  onTopKChange,
}: {
  query: string
  onQueryChange: (value: string) => void
  onSearch: () => void
  loading: boolean
  site: string
  onSiteChange: (value: string) => void
  sites: { site: string; count: number }[]
  topK: number
  onTopKChange: (value: number) => void
}) {
  const fieldId = useId()
  const canSearch = query.trim().length >= 8 && query.trim().length <= 30000 && !loading

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key === "Enter" &&
      (event.ctrlKey || event.metaKey) &&
      canSearch
    ) {
      event.preventDefault()
      onSearch()
    }
  }

  return (
    <Panel
      title="Deviation description"
      help="Compare narrative text with the saved historical index. Choose one site or all sites allowed by the service."
    >
      <label htmlFor={fieldId} className="sr-only">
        Deviation description
      </label>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <textarea
          id={fieldId}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={onKeyDown}
          rows={4}
          maxLength={30000}
          aria-describedby={`${fieldId}-help`}
          placeholder="Describe the deviation event to find related history…"
          className="min-h-28 w-full flex-1 resize-y rounded-lg border border-suite-line-field bg-white px-3 py-3 text-[15px] leading-relaxed outline-none placeholder:text-suite-muted/70 focus:border-brand focus:ring-1 focus:ring-brand"
        />
        <button
          type="button"
          onClick={onSearch}
          disabled={!canSearch}
          className="map-primary sm:w-40"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-bold sm:max-w-sm">
          Search scope
          <select aria-label="Search scope" value={site} onChange={event => onSiteChange(event.target.value)} className="min-h-10 w-full rounded-md border border-suite-line bg-white px-2 text-sm font-normal outline-none focus:border-brand focus:ring-1 focus:ring-brand">
            <option value="">All allowed sites</option>
            {sites.map(item => <option key={item.site} value={item.site}>{item.site} · {item.count.toLocaleString()} deviations</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold">
          Maximum results
          <select aria-label="Maximum results" value={topK} onChange={event => onTopKChange(Number(event.target.value))} className="min-h-10 rounded-md border border-suite-line bg-white px-2 text-sm font-normal outline-none focus:border-brand focus:ring-1 focus:ring-brand">
            {[10, 25, 50].map(count => <option key={count} value={count}>{count}</option>)}
          </select>
        </label>
      </div>
      <p id={`${fieldId}-help`} className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-suite-line-soft pt-3 text-[11px] text-suite-muted">
        <span>
          {query.length} characters • {wordCount(query)} words
        </span>
        <span>Press Ctrl+Enter to search</span>
        <span>Enter 8–30,000 characters. Results use the existing index.</span>
      </p>
    </Panel>
  )
}
