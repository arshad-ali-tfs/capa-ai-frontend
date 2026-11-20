import { matchApi } from "@/shared/api/clients"
import type { EvidenceDecision, EvidenceOverview, FilterOptions, IndexInfo, MatchFilters, MatchRow, RecordDetail, SavedCase, SearchInput, SearchResult } from "../types"
import { parseEvidenceOverview, parseFilterOptions, parseIndexInfo, parseRecordDetail, parseSearchResponse } from "./parse"
import { canonicalFilters, filterKey, hasFilters, inputKey, wireFilters } from "../searchModel"

const BASE = "/api/v1/match"
function parseCase(raw:unknown):SavedCase {
  if(!raw||typeof raw!=="object"||Array.isArray(raw))throw new Error("Invalid saved investigation.")
  const value=raw as Record<string,any>
  if(!/^[a-f0-9]{32}$/.test(value.id)||typeof value.title!=="string"||typeof value.reviewer!=="string"||!Array.isArray(value.sources)||!Array.isArray(value.decisions))throw new Error("Invalid saved investigation.")
  const result=parseSearchResponse(value.result)
  result.savedCaseId=value.id
  result.savedOverview=value.overview?parseEvidenceOverview(value.overview,result):null
  const sources=value.sources.map((source:Record<string,unknown>)=>{
    const row=result.rows.find(row=>row.deviationId===source.pr_id)
    if(!row)throw new Error("Saved evidence is outside this investigation.")
    return parseRecordDetail(source,row)
  })
  const decisions:EvidenceDecision[]=value.decisions.map((decision:Record<string,unknown>)=>{
    if(typeof decision.pr_id!=="string"||!result.rows.some(row=>row.deviationId===decision.pr_id)||!["include","exclude"].includes(decision.disposition as string)||typeof decision.rationale!=="string")throw new Error("Invalid saved evidence decision.")
    return decision as unknown as EvidenceDecision
  })
  return {id:value.id,title:value.title,reviewer:value.reviewer,notes:value.notes||"",createdAt:value.created_at,sourceChanged:value.source_changed===true,indexChanged:value.index_changed===true,result,sources,decisions,raw:value}
}
export const matchService = {
  async listCases():Promise<{id:string;title:string;reviewer:string;created_at:string}[]> {
    const result=await matchApi.requestJson<{items:unknown[]}>(`${BASE}/cases`)
    if(!Array.isArray(result.items))throw new Error("Saved investigations unavailable.")
    return result.items.filter((item):item is {id:string;title:string;reviewer:string;created_at:string}=>!!item&&typeof item==="object"&&/^[a-f0-9]{32}$/.test((item as any).id)&&typeof (item as any).title==="string"&&typeof (item as any).reviewer==="string"&&typeof (item as any).created_at==="string")
  },
  async saveCase(searchId:string,title:string,reviewer:string,notes:string,decisions:EvidenceDecision[]):Promise<SavedCase>{
    return parseCase(await matchApi.requestJson(`${BASE}/cases`,{method:"POST",body:JSON.stringify({search_id:searchId,title,reviewer,notes,decisions})}))
  },
  async getCase(id:string):Promise<SavedCase>{
    if(!/^[a-f0-9]{32}$/.test(id))throw new Error("Invalid saved investigation link.")
    return parseCase(await matchApi.requestJson(`${BASE}/cases/${id}`))
  },
  async search(input: SearchInput, signal?: AbortSignal): Promise<SearchResult> {
    const { query, site, topK, mode, offset } = input
    const result = parseSearchResponse(await matchApi.requestJson<unknown>(`${BASE}/search`, {
      method: "POST",
      body: JSON.stringify({ query, ...(site ? { site } : { all_sites: true }), top_k: topK,
        ...(hasFilters(input.filters) ? { filters: wireFilters(input.filters) } : {}),
        mode, assist: true, ...(offset ? { offset } : {}) }),
      signal,
    }))
    const submitted = result.submittedCriteria
    const effective = result.filters
    const changedSelectedFilters = effective && Object.entries(canonicalFilters(input.filters)).some(([key, value]) => {
      const selected = Array.isArray(value) ? value.length > 0 : value !== null && value !== "any"
      return selected && JSON.stringify(value) !== JSON.stringify(canonicalFilters(effective)[key as keyof MatchFilters])
    })
    const wrongCriteria = submitted ? inputKey(submitted) !== inputKey(input) || submitted.offset !== offset :
      result.scope !== (site || "All allowed sites") || (result.filters ? filterKey(result.filters) !== filterKey(input.filters) : hasFilters(input.filters))
    if (result.query !== query || wrongCriteria || changedSelectedFilters || site && result.scope !== site || result.rows.length > topK || result.offset !== offset || result.requestedMode !== mode)
      throw new Error("MATCH returned results for a different query or scope. Please retry.")
    return result
  },
  async getOverview(result: SearchResult, signal?: AbortSignal): Promise<EvidenceOverview> {
    return parseEvidenceOverview(await matchApi.requestJson<unknown>(`${BASE}/overview`, {
      method: "POST", body: JSON.stringify({ search_id: result.summaryId }), signal,
    }), result)
  },
  async getFilterOptions(site: string, filters: MatchFilters, signal?: AbortSignal): Promise<FilterOptions> {
    const value = parseFilterOptions(await matchApi.requestJson<unknown>(`${BASE}/facets`, {
      method: "POST", body: JSON.stringify({ ...(site ? { site } : { all_sites: true }), filters: wireFilters(filters) }), signal,
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
