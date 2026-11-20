import { parseAnswerMetadata } from "../summaryEvidence"
import type { CapaRow, EvidenceOverview, FilterOptions, IndexInfo, MatchFilters, MatchKind, MatchRow, RecordDetail, SearchResult, SourcePassage } from "../types"

const UNEXPECTED = "MATCH returned an unexpected response."
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
const text = (value: unknown): string => typeof value === "string" ? value : ""
function passage(value: unknown): SourcePassage {
  if (!isRecord(value) || !Number.isSafeInteger(value.start) || !Number.isSafeInteger(value.end) || (value.start as number)<0 ||
    (value.end as number)-(value.start as number)!==Array.from(requiredText(value.quote)).length) throw new Error(UNEXPECTED)
  return {field:requiredText(value.field),start:value.start as number,end:value.end as number,quote:value.quote as string,
    ...(typeof value.record_id === "string" ? {record_id:value.record_id} : {})}
}
function requiredText(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(UNEXPECTED)
  return value
}
function count(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new Error(UNEXPECTED)
  return value
}
function mockFlag(value: unknown): boolean {
  if (typeof value !== "boolean") throw new Error(UNEXPECTED)
  return value
}

export const fieldLabel = (value: string) => ({
  DETAILED_DESCRIPTION: "Description",
  CONCLUSION: "Conclusion",
  CORRECTIONS_AND_CAPA_PLAN: "Corrections and CAPA plan",
  COMBINED_TEXT: "Combined indexed text",
  RECORD_NAME: "Record title",
  INVESTIGATION: "Investigation",
}[value] ?? value.replaceAll("_", " "))

function parseRow(value: unknown, snapshotId: string): MatchRow {
  if (!isRecord(value)) throw new Error(UNEXPECTED)
  const score = value.match_score
  const kind = parseKind(value.match_kind ?? "hybrid")
  const unscored = ["browse", "record_id", "identifier", "exact", "keyword"].includes(kind)
  if (score === null ? !unscored : typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 1) throw new Error(UNEXPECTED)
  const relevance = value.relevance_score
  if (relevance !== undefined && (unscored || typeof relevance !== "number" || !Number.isFinite(relevance) || relevance < 0 || relevance > 1)) throw new Error(UNEXPECTED)
  const excerpt = text(value.matched_excerpt)
  const spans: { start: number; end: number }[] = []
  const codepoints = Array.from(excerpt)
  let previousEnd = 0
  if (value.matched_spans !== undefined) {
    if (!Array.isArray(value.matched_spans) || value.matched_spans.length > 100) throw new Error(UNEXPECTED)
    for (const span of value.matched_spans) {
      if (!isRecord(span) || typeof span.start !== "number" || typeof span.end !== "number" ||
        !Number.isInteger(span.start) || !Number.isInteger(span.end) || span.start < previousEnd || span.end <= span.start || span.end > codepoints.length) throw new Error(UNEXPECTED)
      previousEnd = span.end
      // The API indexes Unicode code points; JavaScript slices UTF-16 units.
      spans.push({ start: codepoints.slice(0, span.start).join("").length, end: codepoints.slice(0, span.end).join("").length })
    }
  }
  const reasons = value.match_reasons === undefined ? [] : stringList(value.match_reasons)
  if (value.candidate_relationship !== undefined && !["direct", "related"].includes(value.candidate_relationship as string)) throw new Error(UNEXPECTED)
  return {
    deviationId: requiredText(value.pr_id),
    temporalVerification: text(value.temporal_verification),
    supportingPassage: value.supporting_passage ? passage(value.supporting_passage) : null,
    site: requiredText(value.site),
    openedDate: text(value.date_opened),
    status: text(value.status),
    criticality: text(value.criticality),
    scoreLabel: relevance !== undefined ? "Relevance score" : kind === "semantic" ? "Semantic score" : "Hybrid score",
    score: score === null || value.rank_fusion === true ? "" : (typeof relevance === "number" ? relevance : score as number).toFixed(3),
    excerpt,
    matchedField: fieldLabel(text(value.matched_field)),
    snapshotId,
    recordName: text(value.record_name), drType: text(value.dr_type), department: text(value.responsible_department),
    capaCount: value.related_capa_count === undefined ? 0 : count(value.related_capa_count),
    matchKind: kind, reasons, spans,
    ...(value.candidate_relationship ? {relationship:value.candidate_relationship as "direct" | "related"} : {}),
  }
}

export function parseSearchResponse(value: unknown): SearchResult {
  if (!isRecord(value) || !Array.isArray(value.results)) throw new Error(UNEXPECTED)
  const snapshotId = requiredText(value.source_snapshot_id)
  const rows = value.results.map(row => parseRow(row, snapshotId))
  if (count(value.result_count) !== rows.length || new Set(rows.map(row => row.deviationId)).size !== rows.length) throw new Error(UNEXPECTED)
  if (typeof value.all_sites !== "boolean") throw new Error(UNEXPECTED)
  if (!value.all_sites && rows.some(row => row.site !== value.site)) throw new Error(UNEXPECTED)
  const result: SearchResult = {
    rows,
    snapshotId,
    indexGeneration: text(value.index_generation),
    notices: value.notices === undefined ? [] : stringList(value.notices),
    asOf: text(value.as_of),
    reviewState: text(value.review_state),
    intent: text(value.question_intent),
    searchId: value.search_id == null ? null : requiredText(value.search_id),
    seed: isRecord(value.seed) ? {deviationId:requiredText(value.seed.pr_id),title:text(value.seed.record_name),site:requiredText(value.seed.site),opened:text(value.seed.date_opened)} : null,
    totalCount: rows.length,
    query: typeof value.query === "string" ? value.query : requiredText(value.query),
    scope: value.all_sites ? "All allowed sites" : requiredText(value.site),
    mockEmbeddings: mockFlag(value.mock_embeddings),
    searchMode: parseKind(value.search_mode ?? "hybrid"),
    requestedMode: parseMode(value.requested_mode ?? "auto"),
    eligibleCount: value.eligible_record_count === undefined ? null : count(value.eligible_record_count),
    scopeCount: value.scope_record_count === undefined ? null : count(value.scope_record_count),
    totalMatches: value.total_matches == null ? null : count(value.total_matches),
    filters: value.filters === undefined ? null : parseFilters(value.filters),
    requiredIdentifiers: value.required_identifiers === undefined ? [] : stringList(value.required_identifiers),
    offset: value.offset === undefined ? 0 : count(value.offset),
    limit: value.limit === undefined ? 10 : count(value.limit),
    hasMore: value.has_more === undefined ? false : mockFlag(value.has_more),
    rankingHelp: value.ranking_explanation === undefined ? null : requiredText(value.ranking_explanation),
  }
  if (value.interpretation !== undefined) {
    const plan = value.interpretation
    if (plan !== null && (!isRecord(plan) || !["llm", "local"].includes(plan.origin as string))) throw new Error(UNEXPECTED)
    if (plan !== null && typeof plan.query !== "string") throw new Error(UNEXPECTED)
    result.interpretation = plan === null ? null : { query: plan.query as string, origin: plan.origin as "llm" | "local" }
  }
  if (value.submitted_criteria !== undefined) {
    const submitted = value.submitted_criteria
    if (!isRecord(submitted) || typeof submitted.query !== "string" || typeof submitted.all_sites !== "boolean" ||
      submitted.all_sites === (submitted.site !== null) || submitted.assist !== true) throw new Error(UNEXPECTED)
    result.submittedCriteria = { query: submitted.query, site: submitted.all_sites ? "" : requiredText(submitted.site),
      topK: count(submitted.top_k), mode: parseMode(submitted.mode), offset: count(submitted.offset), filters: parseFilters(submitted.filters) }
  }
  if (value.summary_id !== undefined) {
    if (value.summary_id !== null && (typeof value.summary_id !== "string" || !/^[a-f0-9]{32}$/.test(value.summary_id))) throw new Error(UNEXPECTED)
    result.summaryId = value.summary_id as string | null
  }
  if(isRecord(value.aggregate)){
    const aggregate=value.aggregate
    if(!["metadata","requires_event_definition"].includes(aggregate.kind as string)||!Array.isArray(aggregate.groups))throw new Error(UNEXPECTED)
    result.aggregate={kind:aggregate.kind as "metadata"|"requires_event_definition",total:aggregate.total==null?null:count(aggregate.total),basis:requiredText(aggregate.basis),groups:aggregate.groups.map(item=>{if(!isRecord(item))throw new Error(UNEXPECTED);return {year:requiredText(item.year),count:count(item.count)}})}
  }
  const interpretedBrowse = !!result.submittedCriteria && result.interpretation?.query === "" && result.searchMode === "browse"
  if (!interpretedBrowse && (!result.query) !== (result.searchMode === "browse") || result.limit < 1 || result.limit > 50 ||
    result.eligibleCount !== null && result.scopeCount !== null && result.eligibleCount > result.scopeCount ||
    result.totalMatches !== null && (rows.length > result.totalMatches || result.eligibleCount !== null && result.totalMatches > result.eligibleCount) ||
    result.hasMore && (result.totalMatches === null || result.offset + rows.length >= result.totalMatches) ||
    value.search_mode !== undefined && rows.some(row => row.matchKind !== result.searchMode)) throw new Error(UNEXPECTED)
  return result
}

export function parseEvidenceOverview(value: unknown, expected: SearchResult): EvidenceOverview {
  if (!isRecord(value) || value.search_id !== expected.summaryId || value.source_snapshot_id !== expected.rows[0]?.snapshotId ||
    !Array.isArray(value.lines) || value.lines.length < 3 || value.lines.length > 4) throw new Error("The evidence overview belongs to another search or could not be verified.")
  const reviewedIds = stringList(value.reviewed_ids)
  if (!reviewedIds.length || reviewedIds.length > 6 || new Set(reviewedIds).size !== reviewedIds.length ||
    reviewedIds.some(id => !expected.rows.some(row => row.deviationId === id)) || count(value.returned_count) !== expected.rows.length) throw new Error(UNEXPECTED)
  const lines = value.lines.map(line => {
    if (!isRecord(line)) throw new Error(UNEXPECTED)
    const content = requiredText(line.text), references = stringList(line.references)
    if (content.length > 500 || !references.length || references.some(id => !reviewedIds.includes(id))) throw new Error(UNEXPECTED)
    return { text: content, references: [...new Set(references)] }
  })
  const citations = value.citations === undefined ? undefined : Array.isArray(value.citations) ? value.citations.map(group=>{
    if(!Array.isArray(group)) throw new Error(UNEXPECTED)
    return group.map(item=>{const proof=passage(item);if(!proof.record_id||!reviewedIds.includes(proof.record_id))throw new Error(UNEXPECTED);return proof})
  }) : (()=>{throw new Error(UNEXPECTED)})()
  return {searchId: value.search_id as string, snapshotId: value.source_snapshot_id as string, lines, reviewedIds, returnedCount: expected.rows.length, citations,...parseAnswerMetadata(value,reviewedIds)}
}

const kinds: MatchKind[] = ["browse", "record_id", "identifier", "keyword", "exact", "hybrid", "semantic"]
function parseKind(value: unknown): MatchKind {
  if (!kinds.includes(value as MatchKind)) throw new Error(UNEXPECTED)
  return value as MatchKind
}
function parseMode(value: unknown): "auto" | "keyword" | "exact" | "semantic" {
  if (!["auto", "keyword", "exact", "semantic"].includes(value as string)) throw new Error(UNEXPECTED)
  return value as "auto" | "keyword" | "exact" | "semantic"
}
function stringList(value: unknown): string[] {
  if (!Array.isArray(value) || value.some(item => typeof item !== "string")) throw new Error(UNEXPECTED)
  return value
}
export function parseFilters(value: unknown): MatchFilters {
  if (!isRecord(value) || !Array.isArray(value.years) || value.years.some(year => typeof year !== "number" || !Number.isInteger(year) || year < 1900 || year > 2200) ||
    !["any", "linked", "completed", "none"].includes(value.capa as string)) throw new Error(UNEXPECTED)
  for (const key of ["date_from", "date_to"]) if (value[key] !== null && (typeof value[key] !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value[key] as string))) throw new Error(UNEXPECTED)
  return { years: value.years as number[], criticalities: stringList(value.criticalities), dr_types: stringList(value.dr_types),
    exclude_criticalities:value.exclude_criticalities===undefined?[]:stringList(value.exclude_criticalities),
    exclude_years:value.exclude_years===undefined?[]:Array.isArray(value.exclude_years)&&value.exclude_years.every(year=>Number.isInteger(year)&&Number(year)>=1900&&Number(year)<=2200)?value.exclude_years as number[]:(()=>{throw new Error(UNEXPECTED)})(),
    sites: value.sites === undefined ? [] : stringList(value.sites), exclude_sites: value.exclude_sites === undefined ? [] : stringList(value.exclude_sites),
    status: value.status === undefined ? "any" : ["any","open","closed"].includes(value.status as string) ? value.status as MatchFilters["status"] : (()=>{throw new Error(UNEXPECTED)})(),
    departments: stringList(value.departments), date_from: value.date_from as string | null, date_to: value.date_to as string | null, capa: value.capa as MatchFilters["capa"] }
}
export function parseFilterOptions(value: unknown): FilterOptions {
  if (!isRecord(value) || !isRecord(value.facets) || typeof value.all_sites !== "boolean") throw new Error(UNEXPECTED)
  const facets = {} as FilterOptions["facets"]
  for (const key of ["years", "criticalities", "dr_types", "departments"] as const) {
    const options = value.facets[key]
    if (!Array.isArray(options)) throw new Error(UNEXPECTED)
    facets[key] = options.map(option => {
      if (!isRecord(option) || (key === "years" ? typeof option.value !== "number" || !Number.isInteger(option.value) : typeof option.value !== "string" || !option.value.trim())) throw new Error(UNEXPECTED)
      return { value: option.value as string | number, count: count(option.count) }
    })
    if (new Set(facets[key].map(option => option.value)).size !== facets[key].length) throw new Error(UNEXPECTED)
  }
  const scopeCount = count(value.scope_record_count), eligibleCount = count(value.eligible_record_count)
  if (eligibleCount > scopeCount) throw new Error(UNEXPECTED)
  return { scope: value.all_sites ? "All allowed sites" : requiredText(value.site), snapshotId: requiredText(value.source_snapshot_id),
    scopeCount, eligibleCount, missingDates: count(value.missing_opened_dates), filters: parseFilters(value.filters), facets }
}

export function parseRecordDetail(value: unknown, expected: MatchRow): RecordDetail {
  if (!isRecord(value) || !Array.isArray(value.related_capas)) throw new Error(UNEXPECTED)
  if (value.pr_id !== expected.deviationId || value.site !== expected.site || value.source_snapshot_id !== expected.snapshotId)
    throw new Error("MATCH returned a different record, site or source version. Search again before inspecting this candidate.")
  const fields = value.original_field_texts ?? value.indexed_field_texts
  if (fields !== undefined && (!isRecord(fields) || Object.values(fields).some(value => typeof value !== "string"))) throw new Error(UNEXPECTED)
  const sections = isRecord(fields)
    ? Object.entries(fields).filter(([, value]) => text(value).trim()).map(([key, value]) => ({ label: fieldLabel(key), text: text(value) }))
    : []
  if (!sections.length && text(value.text).trim()) sections.push({ label: "Indexed text", text: text(value.text) })
  const capas: CapaRow[] = value.related_capas.map(row => {
    if (!isRecord(row)) throw new Error(UNEXPECTED)
    return {
      capaId: requiredText(row.pr_id),
      status: text(row.status),
      title: text(row.record_name),
      capaType: text(row.capa_type),
      summary: text(row.plan_excerpt),
      ...(text(row.date_closed)?{dateClosed:text(row.date_closed)}:{}),
    }
  })
  const literal = value.literal_field_texts
  if (literal !== undefined && (!isRecord(literal) || Object.values(literal).some(value => typeof value !== "string"))) throw new Error(UNEXPECTED)
  const literalSections = isRecord(literal) ? Object.entries(literal).filter(([key, value]) => text(value).trim() && !sections.some(section=>section.label===fieldLabel(key))).map(([key, value]) => ({ label: fieldLabel(key), text: text(value) })) : undefined
  const evidence=value.evidence_coverage
  const coverage=isRecord(evidence) ? {attachment_references:mockFlag(evidence.attachment_references),attachments_included:mockFlag(evidence.attachments_included),
    unresolved_capa_mentions:stringList(evidence.unresolved_capa_mentions),effectiveness:text(evidence.effectiveness)} : undefined
  const mentions=Array.isArray(value.source_mentions) ? value.source_mentions.map(item=>{
    if(!isRecord(item))throw new Error(UNEXPECTED)
    return {kind:requiredText(item.kind),value:requiredText(item.value),field:requiredText(item.field),start:count(item.start),end:count(item.end),role:requiredText(item.role)}
  }) : []
  return { deviationId: expected.deviationId, site: expected.site, snapshotId: expected.snapshotId, sections, capas,
    original:!!value.original_field_texts,coverage,mentions,
    ...(literalSections ? { literalSections } : {}) }
}

export function parseIndexInfo(value: unknown): IndexInfo {
  if (!isRecord(value) || value.ready !== true || !Array.isArray(value.allowed_sites)) throw new Error(UNEXPECTED)
  const sites = value.allowed_sites.map(row => {
    if (!isRecord(row)) throw new Error(UNEXPECTED)
    return { site: requiredText(row.site), count: count(row.deviation_count) }
  })
  if (new Set(sites.map(row => row.site)).size !== sites.length) throw new Error(UNEXPECTED)
  if (value.semantic_state !== undefined && !["warming", "ready", "unavailable"].includes(value.semantic_state as string)) throw new Error(UNEXPECTED)
  return {
    records: count(value.searchable_records),
    sites,
    modelName: requiredText(value.model_name),
    snapshotId: requiredText(value.source_snapshot_id),
    mockEmbeddings: mockFlag(value.mock_embeddings),
    ...(value.division_scope === undefined ? {} : { divisions: stringList(value.division_scope) }),
    ...(value.semantic_state === undefined ? {} : { semanticState: value.semantic_state as IndexInfo["semanticState"] }),
  }
}
