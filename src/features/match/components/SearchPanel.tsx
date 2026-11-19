import { useId, type KeyboardEvent } from "react"
import { HelpTooltip, Panel } from "@/shared/components"
import type { FilterOptions, MatchFilters, SearchMode } from "../types"
import { capaLabels, dateError, filterChips, validQuery } from "../searchModel"
import { MultiFilter } from "./MultiFilter"

export function SearchPanel({ query, onQueryChange, onSearch, loading, site, onSiteChange, sites, topK, onTopKChange,
  filters, onFiltersChange, mode, onModeChange, options, optionsLoading, optionsError, onRetryOptions, onCancel, semanticState }: {
  query: string; onQueryChange: (value: string) => void; onSearch: () => void; loading: boolean
  site: string; onSiteChange: (value: string) => void; sites: { site: string; count: number }[]
  topK: number; onTopKChange: (value: number) => void
  filters: MatchFilters; onFiltersChange: (value: MatchFilters) => void
  mode: SearchMode; onModeChange: (value: SearchMode) => void
  options: FilterOptions | null; optionsLoading: boolean; optionsError: string; onRetryOptions: () => void
  onCancel: () => void
  semanticState?: "warming" | "ready" | "unavailable"
}) {
  const id = useId()
  const error = dateError(filters)
  const canSearch = validQuery(query) && !loading && !error
  const update = <K extends keyof MatchFilters>(key: K, value: MatchFilters[K]) => onFiltersChange({ ...filters, [key]: value })
  const chips = filterChips(filters)
  const remove = (key: keyof MatchFilters, value: string | number) => {
    if (key === "capa") update("capa", "any")
    else if (key === "date_from" || key === "date_to") update(key, null)
    else onFiltersChange({ ...filters, [key]: filters[key].filter(item => item !== value) })
  }
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && canSearch) { event.preventDefault(); onSearch() }
  }
  return <Panel title="Find historical deviations" help="Choose your scope, then browse the records or search for a specific issue.">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-suite-info-wash px-3 py-2 text-xs text-suite-blue" aria-label="Filter scope">
      <span aria-live="polite">{error ? "Check the opened date range" : optionsLoading ? "Updating filter counts…" : optionsError ? "Filter counts unavailable" : options ? <><strong className="tabular-nums">{options.eligibleCount.toLocaleString()}</strong> {options.eligibleCount === 1 ? "deviation" : "deviations"} within filters <span className="text-suite-muted">of {options.scopeCount.toLocaleString()} in site scope</span></> : "Choose filters below"}</span>
      <span className="flex items-center gap-1">Historical closed deviations<HelpTooltip label="MATCH search coverage">Searches the deviations retained in this index and allowed site scope. The index contains historical Closed - Done records; it does not represent every record in the source system. Year and date filters use the source opened date.</HelpTooltip></span>
    </div>
    <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div className="min-w-0"><div className="mb-1 flex items-center gap-1 text-xs font-bold text-suite-slate"><label htmlFor={`${id}-site`}>Site</label><HelpTooltip label="Site filter">Choose one indexed site or all sites allowed by the service. Every filter and search respects this scope.</HelpTooltip></div>
        <select id={`${id}-site`} aria-label="Search scope" value={site} onChange={event => onSiteChange(event.target.value)} className="min-h-11 w-full min-w-0 rounded-lg border border-suite-line-field bg-white px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand">
          <option value="">All allowed sites</option>{sites.map(item => <option key={item.site} value={item.site}>{item.site} · {item.count.toLocaleString()}</option>)}
        </select>
      </div>
      <MultiFilter label="Opened years" options={options?.facets.years ?? []} selected={filters.years} onChange={values => update("years", values as number[])} help="Select one or more years of the source opened date. Choices within this field are combined with OR; different filters must all match." />
      <MultiFilter label="Criticality" options={options?.facets.criticalities ?? []} selected={filters.criticalities} onChange={values => update("criticalities", values as string[])} help="Select source classifications such as Minor, Major and Critical. Search does not infer a new severity." />
      <MultiFilter label="DR types" options={options?.facets.dr_types ?? []} selected={filters.dr_types} onChange={values => update("dr_types", values as string[])} help="Deviation record types retained in this index. Select multiple types to include any of them." />
    </div>
    <details className="mt-3 rounded-lg border border-suite-line-soft bg-suite-hover">
      <summary className="cursor-pointer px-3 py-2.5 text-xs font-bold text-suite-blue outline-none focus-visible:ring-2 focus-visible:ring-brand">More filters · department, dates and CAPA</summary>
      <div className="grid min-w-0 grid-cols-1 gap-3 border-t border-suite-line-soft p-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="min-w-0 sm:col-span-2"><MultiFilter label="Departments" options={options?.facets.departments ?? []} selected={filters.departments} onChange={values => update("departments", values as string[])} help="Source responsible departments. Find an option by typing inside the dropdown. Counts reflect other active filters." /></div>
        <label className="flex min-w-0 flex-col gap-1 text-xs font-bold text-suite-slate">Opened from<input type="date" value={filters.date_from ?? ""} max={filters.date_to ?? undefined} onChange={event => update("date_from", event.target.value || null)} className="min-h-11 w-full min-w-0 rounded-lg border border-suite-line-field bg-white px-2 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-brand" /></label>
        <label className="flex min-w-0 flex-col gap-1 text-xs font-bold text-suite-slate">Opened to<input type="date" value={filters.date_to ?? ""} min={filters.date_from ?? undefined} onChange={event => update("date_to", event.target.value || null)} className="min-h-11 w-full min-w-0 rounded-lg border border-suite-line-field bg-white px-2 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-brand" /></label>
        <div className="min-w-0 sm:col-span-2"><div className="mb-1 flex items-center gap-1 text-xs font-bold text-suite-slate"><label htmlFor={`${id}-capa`}>CAPA links</label><HelpTooltip label="CAPA link filter">Uses explicit parent/root-parent links retained in the index. Completed means at least one linked CAPA marked Closed - Done. No link found does not prove no CAPA exists or is needed. Completion does not establish effectiveness.</HelpTooltip></div><select id={`${id}-capa`} value={filters.capa} onChange={event => update("capa", event.target.value as MatchFilters["capa"])} className="min-h-11 w-full min-w-0 rounded-lg border border-suite-line-field bg-white px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand">{Object.entries(capaLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        <p className="self-end text-[11px] leading-5 text-suite-muted sm:col-span-2">Date boundaries are inclusive. Records without a usable opened date are excluded when a year or date filter is active.{options?.missingDates ? ` ${options.missingDates} records in this view have no usable opened date.` : ""}</p>
      </div>
    </details>
    {(chips.length > 0 || site) && <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Active filters">
      {site && <button type="button" aria-label={`Remove Site: ${site}`} onClick={() => onSiteChange("")} className="min-h-8 max-w-full rounded-full bg-suite-info-wash px-3 py-1 text-xs text-suite-blue [overflow-wrap:anywhere]">Site: {site} ×</button>}
      {chips.map(chip => <button key={`${chip.key}:${chip.value}`} type="button" aria-label={`Remove ${chip.label}`} onClick={() => remove(chip.key, chip.value)} className="min-h-8 max-w-full rounded-full bg-suite-info-wash px-3 py-1 text-xs text-suite-blue [overflow-wrap:anywhere]">{chip.label} ×</button>)}
      <button type="button" onClick={() => { onFiltersChange({ years: [], criticalities: [], dr_types: [], departments: [], date_from: null, date_to: null, capa: "any" }); onSiteChange("") }} className="min-h-8 px-2 text-xs font-bold text-suite-blue">Clear filters</button>
    </div>}
    {optionsError && <p className="mt-3 text-xs text-suite-muted">{optionsError} <button type="button" onClick={onRetryOptions} className="min-h-8 font-bold text-suite-blue underline">Retry filter counts</button></p>}
    {error && <p className="mt-3 text-xs font-bold text-brand" role="alert">{error}</p>}
    <div className="mt-5 border-t border-suite-line-soft pt-4">
      {semanticState === "warming" && <p className="mb-3 rounded-lg bg-suite-info-wash p-2.5 text-xs leading-5 text-suite-blue">Meaning search is warming up. You can browse or use IDs and keywords while it prepares.</p>}
      {semanticState === "unavailable" && <p className="mb-3 rounded-lg bg-warn-wash p-2.5 text-xs leading-5 text-warn-ink">The meaning-search model could not be prepared. Browsing, exact IDs and keyword searches remain available.</p>}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><label htmlFor={`${id}-query`} className="text-sm font-bold">Search history</label><span className="text-[11px] text-suite-muted">Optional · leave empty to browse your filtered records</span></div>
      <textarea id={`${id}-query`} value={query} onChange={event => onQueryChange(event.target.value)} onKeyDown={onKeyDown} rows={3} maxLength={30000} aria-describedby={`${id}-help`} placeholder="Equipment ID, deviation ID, keywords or describe the issue…" className="min-h-24 w-full min-w-0 resize-y rounded-lg border border-suite-line-field bg-white px-3 py-3 text-[15px] leading-relaxed outline-none placeholder:text-suite-muted/70 focus:border-brand focus:ring-1 focus:ring-brand" />
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex min-w-0 flex-col gap-1 text-xs font-bold sm:max-w-xs sm:flex-1">Search mode<select aria-label="Search mode" value={mode} onChange={event => onModeChange(event.target.value as SearchMode)} className="min-h-11 w-full rounded-lg border border-suite-line-field bg-white px-2 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-brand"><option value="auto">Smart · detect the search intent</option><option value="keyword">Keywords · all words required</option><option value="exact">Exact phrase</option><option value="semantic">Meaning · related descriptions</option></select></label>
        <label className="flex flex-col gap-1 text-xs font-bold">Maximum results<select aria-label="Maximum results" value={topK} onChange={event => onTopKChange(Number(event.target.value))} className="min-h-11 rounded-lg border border-suite-line-field bg-white px-2 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-brand">{[10,25,50].map(count => <option key={count} value={count}>{count}</option>)}</select></label>
        <button type="button" onClick={onSearch} disabled={!canSearch} className="map-primary min-h-11 sm:ml-auto sm:min-w-44">{loading ? "Searching…" : query.trim() ? "Search" : "Browse records"}</button>
        {loading && <button type="button" onClick={onCancel} className="map-secondary min-h-11">Cancel search</button>}
      </div>
      <p id={`${id}-help`} className="mt-3 text-xs leading-5 text-suite-muted">Search directly with an ID or short keyword such as HPLC. Literal searches also inspect investigation text where available. Put a phrase in quotation marks for a literal match, or describe an issue to find related wording. <span className="whitespace-nowrap">Ctrl+Enter to apply.</span> <HelpTooltip label="Smart search behaviour">In Smart mode, numeric-only input and PR-prefixed IDs look up exact deviation IDs. Short identifier-led queries require the detected identifiers, preserving digits and leading zeros while allowing separators such as EQ-104 and EQ104. Use Keywords to find a numeric equipment or batch reference in narrative text. Full descriptions use meaning and keywords; choose Meaning to compare broader wording without identifier constraints. All modes respect the active filters.</HelpTooltip></p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-suite-muted"><span>Try:</span>{["HPLC", "OOS", '\"line clearance\"'].map(example => <button key={example} type="button" onClick={() => onQueryChange(example)} className="min-h-8 rounded-full border border-suite-line px-3 font-bold text-suite-blue hover:bg-suite-hover">{example}</button>)}<span className="ml-auto">{query.length.toLocaleString()} / 30,000 characters</span></div>
    </div>
  </Panel>
}
