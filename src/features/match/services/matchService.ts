import { matchApi } from "@/shared/api/clients"
import type { FilterOptions, IndexInfo, MatchFilters, MatchRow, RecordDetail, SearchInput, SearchResult } from "../types"
import { parseFilterOptions, parseIndexInfo, parseRecordDetail, parseSearchResponse } from "./parse"
import { canonicalFilters, filterKey, hasFilters } from "../searchModel"

const BASE = "/api/v1/match"
export const matchService = {
  async search(input: SearchInput, signal?: AbortSignal): Promise<SearchResult> {
    const { query, site, topK, mode, offset } = input
    const result = parseSearchResponse(await matchApi.requestJson<unknown>(`${BASE}/search`, {
      method: "POST",
      body: JSON.stringify({ query, ...(site ? { site } : { all_sites: true }), top_k: topK,
        ...(hasFilters(input.filters) ? { filters: canonicalFilters(input.filters) } : {}),
        mode, ...(offset ? { offset } : {}) }),
      signal,
    }))
    if (result.query !== query || result.scope !== (site || "All allowed sites") || result.rows.length > topK || result.offset !== offset ||
      result.requestedMode !== mode || (result.filters ? filterKey(result.filters) !== filterKey(input.filters) : hasFilters(input.filters)))
      throw new Error("MATCH returned results for a different query or scope. Please retry.")
    return result
  },
  async getFilterOptions(site: string, filters: MatchFilters, signal?: AbortSignal): Promise<FilterOptions> {
    const value = parseFilterOptions(await matchApi.requestJson<unknown>(`${BASE}/facets`, {
      method: "POST", body: JSON.stringify({ ...(site ? { site } : { all_sites: true }), filters: canonicalFilters(filters) }), signal,
    }))
    if (value.scope !== (site || "All allowed sites") || filterKey(value.filters) !== filterKey(filters)) throw new Error("Filter options belong to another scope. Please retry.")
    return value
  },
  async getRecord(row: MatchRow, signal?: AbortSignal): Promise<RecordDetail> {
    const query = new URLSearchParams({ site: row.site })
    return parseRecordDetail(await matchApi.requestJson<unknown>(
      `${BASE}/matched-records/${encodeURIComponent(row.deviationId)}?${query}`, { signal },
    ), row)
  },
  async getIndexInfo(signal?: AbortSignal): Promise<IndexInfo> {
    return parseIndexInfo(await matchApi.requestJson<unknown>(`${BASE}/index`, { signal }))
  },
}
