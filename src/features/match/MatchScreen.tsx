import { useState } from "react"
import { PageHeading } from "@/shared/components"
import { CandidateDetail } from "./components/CandidateDetail"
import { ResultsList } from "./components/ResultsList"
import { SearchFeedback } from "./components/SearchFeedback"
import { SearchPanel } from "./components/SearchPanel"
import { useMatchSearch } from "./hooks/useMatchSearch"

export function MatchScreen() {
  const [query, setQuery] = useState("")
  const [site, setSite] = useState("")
  const [topK, setTopK] = useState(10)
  const match = useMatchSearch()
  const runSearch = () => void match.search(query, site, topK)

  const indexStatus = match.indexState === "loading"
    ? "Checking search index…"
    : match.indexInfo
      ? `${match.indexInfo.records.toLocaleString()} searchable deviations · ${match.indexInfo.sites.length} allowed sites`
      : "Index details unavailable"

  return (
    <>
      <PageHeading
        title="MATCH · Find related history"
        subtitle="Compare a deviation description with historical records and inspect potentially useful precedent."
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
      />
      {match.searchState === "success" && match.result && (
        <section className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,.65fr)]">
          <ResultsList
            rows={match.result.rows}
            totalCount={match.result.totalCount}
            query={match.result.query}
            scope={match.result.scope}
            selectedId={match.selectedId}
            onSelect={(row) => void match.select(row)}
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
