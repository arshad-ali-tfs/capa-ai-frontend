import type { MatchFilters, MatchKind, SearchInput } from "./types"

export const emptyFilters = (): MatchFilters => ({ years: [], criticalities: [], dr_types: [], departments: [], date_from: null, date_to: null, capa: "any" })
export const canonicalFilters = (filters: MatchFilters): MatchFilters => ({
  ...filters,
  years: [...new Set(filters.years)].sort((a, b) => a - b),
  criticalities: [...new Set(filters.criticalities.map(value => value.trim()))].sort(),
  dr_types: [...new Set(filters.dr_types.map(value => value.trim()))].sort(),
  departments: [...new Set(filters.departments.map(value => value.trim()))].sort(),
})
export const filterKey = (filters: MatchFilters) => JSON.stringify(canonicalFilters(filters))
export const inputKey = (input: SearchInput) => JSON.stringify({ query: input.query.trim(), site: input.site, topK: input.topK, mode: input.mode, filters: canonicalFilters(input.filters), offset: 0 })
export const hasFilters = (filters: MatchFilters) => filterKey(filters) !== filterKey(emptyFilters())
export const validQuery = (query: string) => !query.trim() || query.trim().length <= 30000 && (/\d/.test(query) || (query.match(/[a-z]/gi)?.length ?? 0) >= 2)
export const dateError = (filters: MatchFilters) => filters.date_from && filters.date_to && filters.date_from > filters.date_to ? "Opened from must be on or before opened to." : ""
export const modeLabel: Record<MatchKind, string> = {
  browse: "Filtered records", record_id: "Exact deviation ID", identifier: "Exact identifier",
  exact: "Exact phrase", keyword: "All keywords found", hybrid: "Meaning + keywords", semantic: "Related meaning",
}
export const capaLabels = { any: "Any CAPA link status", linked: "Has a linked CAPA", completed: "Has a completed linked CAPA", none: "No CAPA link in index" }
export function filterChips(filters: MatchFilters): { key: keyof MatchFilters; value: string | number; label: string }[] {
  return [
    ...filters.years.map(value => ({ key: "years" as const, value, label: `Year: ${value}` })),
    ...filters.criticalities.map(value => ({ key: "criticalities" as const, value, label: `Criticality: ${value}` })),
    ...filters.dr_types.map(value => ({ key: "dr_types" as const, value, label: `DR type: ${value}` })),
    ...filters.departments.map(value => ({ key: "departments" as const, value, label: `Department: ${value}` })),
    ...(filters.date_from ? [{ key: "date_from" as const, value: filters.date_from, label: `Opened from: ${filters.date_from}` }] : []),
    ...(filters.date_to ? [{ key: "date_to" as const, value: filters.date_to, label: `Opened to: ${filters.date_to}` }] : []),
    ...(filters.capa !== "any" ? [{ key: "capa" as const, value: filters.capa, label: capaLabels[filters.capa] }] : []),
  ]
}
