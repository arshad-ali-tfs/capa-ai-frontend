import type { MatchFilters, MatchKind, SearchInput } from "./types"

export const emptyFilters = (): MatchFilters => ({ years: [], criticalities: [],exclude_criticalities:[],exclude_years:[], dr_types: [], departments: [], sites: [], exclude_sites: [], status: "any", date_from: null, date_to: null, capa: "any" })
export const canonicalFilters = (filters: MatchFilters): MatchFilters => ({
  years: [...new Set(filters.years)].sort((a, b) => a - b),
  criticalities: [...new Set(filters.criticalities.map(value => value.trim()))].sort(),
  exclude_criticalities:[...new Set((filters.exclude_criticalities??[]).map(value=>value.trim()))].sort(),
  exclude_years:[...new Set(filters.exclude_years??[])].sort((a,b)=>a-b),
  dr_types: [...new Set(filters.dr_types.map(value => value.trim()))].sort(),
  departments: [...new Set(filters.departments.map(value => value.trim()))].sort(),
  sites: [...new Set((filters.sites ?? []).map(value => value.trim()))].sort(),
  exclude_sites: [...new Set((filters.exclude_sites ?? []).map(value => value.trim()))].sort(),
  status: filters.status ?? "any",
  date_from: filters.date_from ?? null,
  date_to: filters.date_to ?? null,
  capa: filters.capa,
})
export const filterKey = (filters: MatchFilters) => JSON.stringify(canonicalFilters(filters))
export function wireFilters(filters:MatchFilters){
  const value=canonicalFilters(filters)
  if(!value.sites?.length)delete value.sites
  if(!value.exclude_criticalities?.length)delete value.exclude_criticalities
  if(!value.exclude_years?.length)delete value.exclude_years
  if(!value.exclude_sites?.length)delete value.exclude_sites
  if(value.status==="any")delete value.status
  return value
}
export const inputKey = (input: SearchInput) => JSON.stringify({ query: input.query.trim(), site: input.site, topK: input.topK, mode: input.mode, filters: canonicalFilters(input.filters), offset: 0 })
export const hasFilters = (filters: MatchFilters) => filterKey(filters) !== filterKey(emptyFilters())
export const validQuery = (query: string) => !query.trim() || query.trim().length <= 30000 && (/\d/.test(query) || (query.match(/[a-z]/gi)?.length ?? 0) >= 2)
export const dateError = (filters: MatchFilters) => filters.date_from && filters.date_to && filters.date_from > filters.date_to ? "Opened from must be on or before opened to." : filters.sites?.some(site=>filters.exclude_sites?.includes(site)) ? "A site cannot be both included and excluded." : ""
export const modeLabel: Record<MatchKind, string> = {
  browse: "Filtered records", record_id: "Exact deviation ID", identifier: "Exact identifier",
  exact: "Exact phrase", keyword: "All keywords found", hybrid: "Meaning + keywords", semantic: "Related meaning",
}
export const capaLabels = { any: "Any CAPA link status", linked: "Has a linked CAPA", completed: "Has a completed linked CAPA", none: "No CAPA link in index" }
export function filterChips(filters: MatchFilters): { key: keyof MatchFilters; value: string | number; label: string }[] {
  return [
    ...filters.years.map(value => ({ key: "years" as const, value, label: `Year: ${value}` })),
    ...filters.criticalities.map(value => ({ key: "criticalities" as const, value, label: `Criticality: ${value}` })),
    ...(filters.exclude_criticalities??[]).map(value=>({key:"exclude_criticalities" as const,value,label:`Exclude criticality: ${value}`})),
    ...(filters.exclude_years??[]).map(value=>({key:"exclude_years" as const,value,label:`Exclude year: ${value}`})),
    ...filters.dr_types.map(value => ({ key: "dr_types" as const, value, label: `DR type: ${value}` })),
    ...filters.departments.map(value => ({ key: "departments" as const, value, label: `Department: ${value}` })),
    ...(filters.sites ?? []).map(value => ({ key: "sites" as const, value, label: `Site: ${value}` })),
    ...(filters.exclude_sites ?? []).map(value => ({ key: "exclude_sites" as const, value, label: `Exclude site: ${value}` })),
    ...(filters.status && filters.status !== "any" ? [{key:"status" as const,value:filters.status,label:`Status: ${filters.status === "open" ? "Open deviations" : "Closed deviations"}`}] : []),
    ...(filters.date_from ? [{ key: "date_from" as const, value: filters.date_from, label: `Opened from: ${filters.date_from}` }] : []),
    ...(filters.date_to ? [{ key: "date_to" as const, value: filters.date_to, label: `Opened to: ${filters.date_to}` }] : []),
    ...(filters.capa !== "any" ? [{ key: "capa" as const, value: filters.capa, label: capaLabels[filters.capa] }] : []),
  ]
}
