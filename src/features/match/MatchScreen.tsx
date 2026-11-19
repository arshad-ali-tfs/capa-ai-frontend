import { useState } from "react"
import { PageHeading } from "@/shared/components"
import { CandidateDetail } from "./components/CandidateDetail"
import { ResultsList } from "./components/ResultsList"
import { SearchFeedback } from "./components/SearchFeedback"
import { SearchPanel } from "./components/SearchPanel"
import { useMatchSearch } from "./hooks/useMatchSearch"
import { useMatchFilters } from "./hooks/useMatchFilters"
import { dateError, emptyFilters, inputKey } from "./searchModel"
import type { MatchFilters, SearchInput, SearchMode } from "./types"

export function MatchScreen() {
  const [query, setQuery] = useState("")
  const [site, setSite] = useState("")
  const [topK, setTopK] = useState(10)
  const [filters, setFilters] = useState<MatchFilters>(emptyFilters)
  const [mode, setMode] = useState<SearchMode>("auto")
  const match = useMatchSearch()
  const facets = useMatchFilters(site, filters, match.indexInfo?.snapshotId, match.indexState !== "loading")
  const input: SearchInput = { query, site, topK, filters, mode, offset: 0 }
  const dirty = !!match.submitted && inputKey(input) !== inputKey(match.submitted)
  const runSearch = () => { if (!dateError(filters)) void match.search(input) }

  const indexStatus = match.indexState === "loading"
    ? "Checking search index…"
    : match.indexInfo
      ? `${match.indexInfo.records.toLocaleString()} searchable deviations · ${match.indexInfo.sites.length} allowed sites${match.indexInfo.divisions?.length ? ` · ${match.indexInfo.divisions.join(" / ")}` : ""}`
      : "Index details unavailable"

  return (
    <>
      <PageHeading
        title="MATCH · Find related history"
        subtitle="Find specific records, investigate recurring equipment issues and compare related historical deviations."
        status={indexStatus}
      />
      <SearchPanel
        query={query}
        onQueryChange={setQuery}
        onSearch={runSearch}
        loading={match.searchState === "loading"}
        site={site}
        onSiteChange={setSite}
        sites={match.indexInfo?.sites ?? []}
        topK={topK}
        onTopKChange={setTopK}
        filters={filters}
        onFiltersChange={setFilters}
        mode={mode}
        onModeChange={setMode}
        options={facets.info}
        optionsLoading={facets.loading}
        optionsError={facets.error}
        onRetryOptions={facets.retry}
        onCancel={match.cancel}
        semanticState={match.indexInfo?.semanticState}
      />
      {(match.indexInfo?.mockEmbeddings || match.result?.mockEmbeddings) && (
        <p role="status" className="rounded-lg border border-[#efd99d] bg-warn-wash p-3 text-sm text-warn-ink">
          Mock embeddings are enabled. These results are for demonstration and are unsuitable for real search.
        </p>
      )}
      <SearchFeedback
        state={match.searchState}
        errorMessage={match.searchError}
        onRetry={runSearch}
        result={match.result}
      />
      {dirty && match.result && <p role="status" className="rounded-lg border border-suite-line bg-suite-info-wash p-3 text-xs text-suite-blue">Filters or search text changed. Apply the search to update the results below; they still reflect the submitted criteria.</p>}
      {match.searchState === "success" && match.result && (
        <section className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,.65fr)]">
          <ResultsList
            rows={match.result.rows}
            totalCount={match.result.totalCount}
            query={match.result.query}
            scope={match.result.scope}
            selectedId={match.selectedId}
            onSelect={(row) => void match.select(row)}
            result={match.result}
            pagingDisabled={dirty}
            onPage={offset => { if (match.submitted) void match.search({ ...match.submitted, offset }) }}
          />
          <CandidateDetail
            selected={match.selected}
            detailState={match.detailState}
            detailError={match.detailError}
            recordDetail={match.recordDetail}
            onRetry={match.retryDetail}
          />
        </section>
      )}
    </>
  )
}
