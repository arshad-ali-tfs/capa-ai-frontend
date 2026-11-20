import { useEffect, useRef, useState } from "react"
import { AppLink, PageHeading } from "@/shared/components"
import { CandidateDetail } from "./components/CandidateDetail"
import { ResultsList } from "./components/ResultsList"
import { SearchFeedback } from "./components/SearchFeedback"
import { SearchPanel } from "./components/SearchPanel"
import { useMatchSearch } from "./hooks/useMatchSearch"
import { useMatchFilters } from "./hooks/useMatchFilters"
import { useMatchOverview } from "./hooks/useMatchOverview"
import { EvidenceOverview } from "./components/EvidenceOverview"
import { dateError, emptyFilters, filterChips, inputKey } from "./searchModel"
import type { MatchFilters, MatchRow, SavedCase, SearchInput, SearchMode, SourcePassage } from "./types"
import { readSearchLocation, unavailableSearchLocation } from "./location"
import { matchService } from "./services/matchService"
import { InvestigationWorkspace } from "./components/InvestigationWorkspace"

export function MatchScreen() {
  const initial=useRef(readSearchLocation()).current
  const [query, setQuery] = useState(initial.query)
  const [site, setSite] = useState(initial.site)
  const [topK, setTopK] = useState(initial.topK)
  const [filters, setFilters] = useState<MatchFilters>(initial.filters)
  const [mode, setMode] = useState<SearchMode>(initial.mode)
  const [saved,setSaved]=useState<SavedCase|null>(null)
  const [caseList,setCaseList]=useState<Awaited<ReturnType<typeof matchService.listCases>>>([])
  const [caseError,setCaseError]=useState(""),[caseLoading,setCaseLoading]=useState(false)
  const [comparison,setComparison]=useState<string[]>([])
  const [focusPassage,setFocusPassage]=useState<SourcePassage|null>(null)
  const locationLoaded=useRef(false)
  const match = useMatchSearch()
  const overview = useMatchOverview(match.result)
  const facets = useMatchFilters(site, filters, match.indexInfo?.snapshotId, match.indexState !== "loading")
  const input: SearchInput = { query, site, topK, filters, mode, offset: 0 }
  const dirty = !!match.submitted && inputKey(input) !== inputKey(match.submitted)
  const runSearch = () => { if (!dateError(filters)) {setSaved(null);setComparison([]);setFocusPassage(null);void match.search(input)} }
  function setInput(value:SearchInput){setQuery(value.query);setSite(value.site);setTopK(value.topK);setFilters(value.filters);setMode(value.mode)}
  async function loadSaved(id:string){
    setCaseLoading(true);setCaseError("")
    try{const value=await matchService.getCase(id);setSaved(value);setComparison(value.decisions.map(decision=>decision.pr_id));match.restore(value);if(value.result.submittedCriteria)setInput(value.result.submittedCriteria);window.history.replaceState({},"",`/match?case=${value.id}`)}
    catch(error){setCaseError(error instanceof Error?error.message:"Saved investigation unavailable.")}
    finally{setCaseLoading(false)}
  }
  useEffect(()=>{
    if(match.indexState==="loading"||locationLoaded.current)return
    locationLoaded.current=true
    const params=new URLSearchParams(window.location.search)
    if(params.get("case"))void loadSaved(params.get("case")!)
    else if(unavailableSearchLocation())setCaseError("This long search is no longer retained in this browser tab. Re-enter its criteria or open a saved investigation.")
    else if(params.has("seed")||params.get("search")==="1")void match.search(initial)
    void matchService.listCases().then(setCaseList).catch(()=>setCaseError("Saved investigations could not be listed. Current search remains available."))
  },[match.indexState])
  useEffect(()=>{
    const changed=()=>{
      if(window.location.pathname!=="/match")return
      const params=new URLSearchParams(window.location.search)
      if(params.has("case")){void loadSaved(params.get("case")!);return}
      if(unavailableSearchLocation()){setCaseError("The saved search criteria are no longer available in this browser tab.");return}
      const value=readSearchLocation();setInput(value);setSaved(null);setComparison([])
      if(params.get("search")==="1"||params.has("seed"))void match.search(value)
    }
    window.addEventListener("popstate",changed)
    return()=>window.removeEventListener("popstate",changed)
  },[])
  function select(row:MatchRow,passage?:SourcePassage){setFocusPassage(passage??row.supportingPassage??null);void match.select(row)}
  function addToComparison(row:MatchRow){setComparison(current=>current.includes(row.deviationId)||current.length>=6?current:[...current,row.deviationId]);window.setTimeout(()=>document.getElementById("investigation-workspace")?.scrollIntoView({block:"start",behavior:"smooth"}),0)}
  const fromMap=new URLSearchParams(window.location.search).get("fromMap")

  const indexStatus = match.indexState === "loading"
    ? "Checking search index…"
    : match.indexInfo
      ? `${match.indexInfo.records.toLocaleString()} searchable deviations · ${match.indexInfo.sites.length} allowed sites${match.indexInfo.divisions?.length ? ` · ${match.indexInfo.divisions.join(" / ")}` : ""}`
      : "Index details unavailable"

  return (
    <>
      <PageHeading
        title="MATCH · Search deviation history"
        subtitle="Describe the issue to find related cases, historical findings and CAPA evidence."
        status={indexStatus}
      />
      <div className="flex flex-wrap items-center gap-3 text-xs"><label className="flex min-w-0 flex-1 items-center gap-2 font-bold">Saved investigations<select aria-label="Saved investigations" value={saved?.id??""} disabled={caseLoading} onChange={event=>{if(event.target.value)void loadSaved(event.target.value)}} className="min-h-10 min-w-0 flex-1 rounded-lg border border-suite-line bg-white px-2 font-normal"><option value="">Open retained evidence and rationale</option>{caseList.map(item=><option key={item.id} value={item.id}>{item.title} · {item.reviewer}</option>)}</select></label>{fromMap?.startsWith("/map")&&<AppLink href={fromMap} className="map-secondary text-xs!">Return to MAP evidence</AppLink>}</div>
      {caseLoading&&<p role="status" className="text-xs text-suite-muted">Loading saved investigation…</p>}
      {caseError&&<p role="status" className="text-xs text-warn-ink">{caseError}</p>}
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
      {!!match.result?.notices?.length&&<section aria-label="Search scope and evidence notices" className="rounded-lg border border-[#efd99d] bg-warn-wash p-3 text-xs leading-5 text-warn-ink"><ul className="list-inside list-disc space-y-1">{match.result.notices.map(notice=><li key={notice}>{notice}</li>)}</ul></section>}
      {match.result?.aggregate&&<section aria-label="Count question" className="rounded-xl border border-suite-line bg-white p-4"><h2 className="text-sm font-bold">{match.result.aggregate.kind==="metadata"?`${match.result.aggregate.total?.toLocaleString()} deviations in the defined metadata scope`:"An event definition is needed for this count"}</h2><p className="mt-2 text-xs leading-5 text-suite-muted">{match.result.aggregate.basis}</p>{match.result.aggregate.groups.length>0&&<dl className="mt-3 flex flex-wrap gap-5">{match.result.aggregate.groups.map(group=><div key={group.year}><dt className="text-xs text-suite-muted">{group.year}</dt><dd className="text-xl font-bold tabular-nums">{group.count.toLocaleString()}</dd></div>)}</dl>}</section>}
      {dirty && match.result && <p role="status" className="rounded-lg border border-suite-line bg-suite-info-wash p-3 text-xs text-suite-blue">Filters or search text changed. Apply the search to update the results below; they still reflect the submitted criteria.</p>}
      {(match.searchState === "success" || match.searchState === "empty") && match.result && <>
        {match.result.interpretation && <div aria-label="Search interpretation" className="rounded-lg border border-suite-line bg-suite-info-wash p-3 text-xs leading-5 text-suite-blue">
          <strong>{match.result.interpretation.query ? "Searching for:" : "Browsing:"}</strong> {match.result.interpretation.query || "Historical records matching your requested criteria"}
          <p className="mt-1 text-[11px] text-suite-muted">{match.result.interpretation.query ? "Your original wording is searched too. " : "Records are shown by opened date, newest first. "}Applied scope and filters are shown with the results.{match.result.interpretation.origin === "local" ? " AI query interpretation is unavailable; local search assistance was used." : ""}</p>
          <div className="mt-2 flex flex-wrap gap-1.5"><span className="rounded-full bg-white px-2 py-1 text-[11px]">Scope: {match.result.scope}</span>{match.result.filters && filterChips(match.result.filters).map(chip=><span key={`${chip.key}:${chip.value}`} className="rounded-full bg-white px-2 py-1 text-[11px]">{chip.label}</span>)}</div>
          <p className="mt-2 text-[11px]">{match.result.asOf?`Dates resolved as of ${match.result.asOf}. `:""}{match.result.reviewState==="ai_reviewed"?"AI relevance review completed; inspect the cited evidence.":match.result.reviewState==="local_ranking"?"Local candidate ranking; AI relevance review was not applied.":"Filters and literal source matching."}</p>
          {match.result.seed&&<p className="mt-2 font-bold">Reference deviation {match.result.seed.deviationId}: {match.result.seed.title}</p>}
        </div>}
        <EvidenceOverview result={match.result} value={overview.value} state={overview.state} onRetry={overview.retry} onSelect={select} />
      </>}
      {match.searchState === "success" && match.result && (
        <section className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,.65fr)]">
          <ResultsList
            rows={match.result.rows}
            totalCount={match.result.totalCount}
            query={match.result.query}
            scope={match.result.scope}
            selectedId={match.selectedId}
            onSelect={select}
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
            focusPassage={focusPassage}
            onInclude={saved?undefined:addToComparison}
          />
        </section>
      )}
      {(match.searchState==="success"||match.searchState==="empty")&&match.result&&<InvestigationWorkspace key={match.result.searchId||match.result.summaryId||match.result.query} result={match.result} ids={comparison} onIdsChange={setComparison} onSelect={select} saved={saved} overviewLoading={overview.state==="loading"} onSaved={value=>{setSaved(value);setComparison(value.decisions.map(decision=>decision.pr_id));match.restore(value);window.history.replaceState({},"",`/match?case=${value.id}`);void matchService.listCases().then(setCaseList)}} />}
    </>
  )
}
