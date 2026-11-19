import type { CapaRow, IndexInfo, MatchRow, RecordDetail, SearchResult } from "../types"

const UNEXPECTED = "MATCH returned an unexpected response."
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
const text = (value: unknown): string => typeof value === "string" ? value : ""
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
  COMBINED_TEXT: "Combined indexed text",
}[value] ?? value.replaceAll("_", " "))

function parseRow(value: unknown, snapshotId: string): MatchRow {
  if (!isRecord(value)) throw new Error(UNEXPECTED)
  const score = value.match_score
  if (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 1) throw new Error(UNEXPECTED)
  return {
    deviationId: requiredText(value.pr_id),
    site: requiredText(value.site),
    openedDate: text(value.date_opened),
    status: text(value.status),
    criticality: text(value.criticality),
    scoreLabel: "Hybrid score",
    score: score.toFixed(3),
    excerpt: text(value.matched_excerpt),
    matchedField: fieldLabel(text(value.matched_field)),
    snapshotId,
  }
}

export function parseSearchResponse(value: unknown): SearchResult {
  if (!isRecord(value) || !Array.isArray(value.results)) throw new Error(UNEXPECTED)
  const snapshotId = requiredText(value.source_snapshot_id)
  const rows = value.results.map(row => parseRow(row, snapshotId))
  if (count(value.result_count) !== rows.length || new Set(rows.map(row => row.deviationId)).size !== rows.length) throw new Error(UNEXPECTED)
  if (typeof value.all_sites !== "boolean") throw new Error(UNEXPECTED)
  if (!value.all_sites && rows.some(row => row.site !== value.site)) throw new Error(UNEXPECTED)
  return {
    rows,
    totalCount: rows.length,
    query: requiredText(value.query),
    scope: value.all_sites ? "All allowed sites" : requiredText(value.site),
    mockEmbeddings: mockFlag(value.mock_embeddings),
  }
}

export function parseRecordDetail(value: unknown, expected: MatchRow): RecordDetail {
  if (!isRecord(value) || !Array.isArray(value.related_capas)) throw new Error(UNEXPECTED)
  if (value.pr_id !== expected.deviationId || value.site !== expected.site || value.source_snapshot_id !== expected.snapshotId)
    throw new Error("MATCH returned a different record, site or source version. Search again before inspecting this candidate.")
  const fields = value.indexed_field_texts
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
    }
  })
  return { deviationId: expected.deviationId, site: expected.site, snapshotId: expected.snapshotId, sections, capas }
}

export function parseIndexInfo(value: unknown): IndexInfo {
  if (!isRecord(value) || value.ready !== true || !Array.isArray(value.allowed_sites)) throw new Error(UNEXPECTED)
  const sites = value.allowed_sites.map(row => {
    if (!isRecord(row)) throw new Error(UNEXPECTED)
    return { site: requiredText(row.site), count: count(row.deviation_count) }
  })
  if (new Set(sites.map(row => row.site)).size !== sites.length) throw new Error(UNEXPECTED)
  return {
    records: count(value.searchable_records),
    sites,
    modelName: requiredText(value.model_name),
    snapshotId: requiredText(value.source_snapshot_id),
    mockEmbeddings: mockFlag(value.mock_embeddings),
  }
}
