import { emptyFilters } from "../../src/features/match/searchModel"
import type { MatchFilters } from "../../src/features/match/types"
import { rows, sites, snapshotId } from "./match-dataset"

export const explorerRows = [
  { ...rows[0], record_name: "Fictional HPLC calibration event", dr_type: "Product Deviation", responsible_department: "Laboratory", status: "Closed - Done", matched_excerpt: "HPLC EQ-104 calibration drift was observed during verification.", related_capa_count: 1 },
  { ...rows[1], record_name: "Fictional plate transfer event", dr_type: "Site Deviation", responsible_department: "Manufacturing", status: "Closed - Done", related_capa_count: 0 },
  { ...rows[0], pr_id: "DEV-250001", date_opened: "2025-07-01", criticality: "Critical", record_name: "Fictional vessel seal event", dr_type: "Product Deviation", responsible_department: "Laboratory", status: "Closed - Done", matched_excerpt: "Vessel EQ104 seal leakage interrupted the batch.", related_capa_count: 1 },
]
const isSelected = (row: typeof explorerRows[number], f: MatchFilters, omit = "") =>
  (omit === "years" || !f.years.length || f.years.includes(Number(row.date_opened.slice(0,4)))) &&
  (omit === "criticalities" || !f.criticalities.length || f.criticalities.includes(row.criticality)) &&
  (omit === "dr_types" || !f.dr_types.length || f.dr_types.includes(row.dr_type)) &&
  (omit === "departments" || !f.departments.length || f.departments.includes(row.responsible_department)) &&
  (!f.date_from || row.date_opened >= f.date_from) && (!f.date_to || row.date_opened <= f.date_to) &&
  (f.capa === "any" || (f.capa === "none" ? row.related_capa_count === 0 : row.related_capa_count > 0))

export function filterResponse(body: any = {}) {
  const f: MatchFilters = { ...emptyFilters(), ...body.filters }
  const scope = explorerRows.filter(row => !body.site || row.site === body.site)
  const facets = {} as Record<string,{value:string | number; count:number}[]>
  const fields = { years: "date_opened", criticalities: "criticality", dr_types: "dr_type", departments: "responsible_department" } as const
  for (const [key, field] of Object.entries(fields)) {
    const counts = new Map<string | number, number>()
    for (const row of scope.filter(row => isSelected(row,f,key))) {
      const value = key === "years" ? Number(row.date_opened.slice(0,4)) : row[field as keyof typeof row]
      counts.set(value, (counts.get(value) ?? 0) + 1)
    }
    facets[key] = [...counts].map(([value,count]) => ({value,count}))
  }
  return { site: body.site || "All sites", all_sites: !body.site, source_snapshot_id: snapshotId, filters:f, facets,
    scope_record_count:scope.length, eligible_record_count:scope.filter(row=>isSelected(row,f)).length, missing_opened_dates:0 }
}

export function explorerResponse(body: any) {
  const f: MatchFilters = { ...emptyFilters(), ...body.filters }
  const query = String(body.query ?? "")
  const scope = explorerRows.filter(row=>!body.site || row.site === body.site)
  const eligible = scope.filter(row=>isSelected(row,f))
  let kind = !query ? "browse" : query.startsWith("DEV-") ? "record_id" : /eq[-_ ]?\d/i.test(query) ? "identifier" : query.startsWith('"') || body.mode === "exact" ? "exact" : body.mode === "semantic" ? "semantic" : "keyword"
  const term=query.replaceAll('"','').toLowerCase()
  const selected = eligible.filter(row=> !query || kind === "semantic" || kind === "record_id" && row.pr_id===query || kind === "identifier" && /eq[-_ ]?104\b/i.test(query) && /eq[-_ ]?104\b/i.test(row.matched_excerpt) ||
    ["keyword","exact"].includes(kind) && row.matched_excerpt.toLowerCase().includes(term))
  const offset = body.offset ?? 0, limit = body.top_k ?? 10
  const results=selected.slice(offset,offset+limit).map(row=> {
    const literal=kind === "identifier" ? /EQ[-_ ]?104/i.exec(row.matched_excerpt) : term ? new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"i").exec(row.matched_excerpt) : null
    return {...row, match_score:kind === "semantic" ? .83 : null, match_kind:kind,
      match_reasons:[kind === "record_id" ? "Exact deviation ID" : kind === "identifier" ? "Identifier EQ-104 found in retained source text" : kind === "browse" ? "Matches the applied filters" : kind === "semantic" ? "Related meaning in indexed text" : "All query words found in retained source text"],
      matched_spans:literal ? [{start:literal.index,end:literal.index+literal[0].length}] : []}
  })
  return {query,site:body.site || "All sites",all_sites:!body.site,source_snapshot_id:snapshotId,mock_embeddings:false,
    requested_mode:body.mode ?? "auto",search_mode:kind,filters:f,scope_record_count:scope.length,eligible_record_count:eligible.length,
    required_identifiers:kind === "identifier" ? [query] : [],offset,limit,has_more:offset+results.length<selected.length,
    total_matches:kind === "semantic" ? null : selected.length,result_count:results.length,results}
}
