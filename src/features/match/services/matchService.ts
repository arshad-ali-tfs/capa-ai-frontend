import { matchApi } from "@/shared/api/clients"
import type { IndexInfo, MatchRow, RecordDetail, SearchResult } from "../types"
import { parseIndexInfo, parseRecordDetail, parseSearchResponse } from "./parse"

const BASE = "/api/v1/match"
export const matchService = {
  async search(query: string, site: string, topK: number, signal?: AbortSignal): Promise<SearchResult> {
    const result = parseSearchResponse(await matchApi.requestJson<unknown>(`${BASE}/search`, {
      method: "POST",
      body: JSON.stringify({ query, ...(site ? { site } : { all_sites: true }), top_k: topK }),
      signal,
    }))
    if (result.query !== query || result.scope !== (site || "All allowed sites") || result.rows.length > topK)
      throw new Error("MATCH returned results for a different query or scope. Please retry.")
    return result
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
