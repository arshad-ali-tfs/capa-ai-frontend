import { requestJson } from "@/shared/api/httpClient"
import type { MapDataset, MapRun, RecordAnnotation, ReviewDraft } from "../types"
const invalid = () =>
  new Error(
    "MAP returned an invalid dataset. Retry, or contact the service owner if the issue continues.",
  )
const object = (value: unknown): value is Record<string, any> =>
  !!value && typeof value === "object" && !Array.isArray(value)
const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value)
const nullableNumber = (value: unknown) => value === null || finite(value)
const strings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((v) => typeof v === "string")
export function validateAnnotation(value: unknown): RecordAnnotation {
  if (
    !object(value) ||
    ![
      "",
      "Supports pattern",
      "Mixed / unclear",
      "Does not support",
      "Insufficient information",
    ].includes(value.assessment) ||
    typeof value.note !== "string" ||
    !Number.isInteger(value.revision) ||
    value.revision < 0 ||
    !(value.savedAt === null || typeof value.savedAt === "string")
  )
    throw invalid()
  return value as RecordAnnotation
}
export function validateDataset(value: unknown): MapDataset {
  if (
    !object(value) ||
    !Array.isArray(value.clusters) ||
    !Array.isArray(value.records) ||
    !strings(value.months) ||
    !value.months.every((m) => /^\d{4}-\d{2}$/.test(m)) ||
    typeof value.refreshedAt !== "string" ||
    !object(value.analysis)
  )
    throw invalid()
  const analysis = value.analysis
  if (
    !/^[a-f0-9]{32}$/.test(analysis.runId) ||
    !Number.isInteger(analysis.recordCount) ||
    analysis.recordCount !== value.records.length ||
    !nullableNumber(analysis.sourceRecordCount) ||
    (analysis.sourceRecordCount !== null &&
      (!Number.isInteger(analysis.sourceRecordCount) ||
        analysis.sourceRecordCount < 0)) ||
    typeof analysis.sourceAvailable !== "boolean" ||
    typeof analysis.sourceMode !== "string" ||
    !(
      analysis.snapshotId === null || typeof analysis.snapshotId === "string"
    ) ||
    !["configured", "latest_completed"].includes(analysis.selection)
  )
    throw invalid()
  const ids = new Set<string>(),
    clusterIds = new Set<string>()
  const clusterRecordCounts = new Map<string, number>()
  for (const c of value.clusters) {
    if (
      !object(c) ||
      !["id", "title", "shortTitle", "subtitle", "context"].every(
        (k) => typeof c[k] === "string",
      ) ||
      !c.id ||
      clusterIds.has(c.id) ||
      !nullableNumber(c.match) ||
      !Array.isArray(c.capas)
    )
      throw invalid()
    clusterIds.add(c.id)
    if (["contextSource", "titleSource", "analysisContext", "historicalContext"].some(key => c[key] !== undefined)) {
      const sources = ["current_analysis", "historical", "unavailable"]
      if (!sources.includes(c.contextSource) || !sources.includes(c.titleSource)) throw invalid()
      for (const key of ["analysisContext", "historicalContext"]) {
        const context = c[key]
        if (context !== null && (!object(context) ||
          typeof context.title !== "string" || typeof context.summary !== "string" ||
          !(context.title.trim() || context.summary.trim()))) throw invalid()
      }
      const current = c.analysisContext, historical = c.historicalContext
      if (current !== null && (!Number.isInteger(current.recordCount) || current.recordCount < 1 || current.runId !== analysis.runId)) throw invalid()
      for (const [source, context] of [["current_analysis", current], ["historical", historical]] as const) {
        if (c.contextSource === source && (!context?.summary.trim() || c.context !== context.summary)) throw invalid()
        if (c.titleSource === source && (!context?.title.trim() || c.title !== context.title)) throw invalid()
      }
    }
    for (const capa of c.capas)
      if (
        !object(capa) ||
        !["id", "description", "status"].every(
          (k) => typeof capa[k] === "string",
        ) ||
        !strings(capa.recordIds)
      )
        throw invalid()
  }
  const fields = [
    "id",
    "clusterId",
    "site",
    "division",
    "department",
    "year",
    "criticality",
    "status",
    "opened",
    "createdLabel",
    "drType",
    "building",
    "room",
    "suite",
    "productionArea",
    "productionLine",
    "shortDescription",
    "sourceField",
    "sourceNarrative",
  ]
  for (const r of value.records) {
    if (
      !object(r) ||
      !fields.every((k) => typeof r[k] === "string") ||
      !r.id ||
      ids.has(r.id) ||
      (r.clusterId && !clusterIds.has(r.clusterId)) ||
      !nullableNumber(r.similarity) ||
      !strings(r.warnings) ||
      !strings(r.matchSignals) ||
      !finite(r.volume) ||
      r.volume <= 0 ||
      !nullableNumber(r.daysOpen) ||
      !object(r.monthCounts) ||
      !Object.entries(r.monthCounts).every(
        ([k, v]) => /^\d{4}-\d{2}$/.test(k) && finite(v) && v >= 0,
      )
    )
      throw invalid()
    validateAnnotation(r.annotation)
    if (r.fiveWh !== undefined && (
      !object(r.fiveWh) ||
      !["who", "what", "when", "where", "why", "how"].every(key => typeof r.fiveWh[key] === "string")
    )) throw invalid()
    if (r.sourceSections !== undefined) {
      if (!Array.isArray(r.sourceSections)) throw invalid()
      const sectionKeys = new Set<string>()
      for (const section of r.sourceSections) {
        if (
          !object(section) ||
          !["key", "label", "text"].every((key) => typeof section[key] === "string") ||
          !section.key || !section.label || sectionKeys.has(section.key)
        ) throw invalid()
        sectionKeys.add(section.key)
      }
    }
    ids.add(r.id)
    if (r.clusterId) clusterRecordCounts.set(r.clusterId, (clusterRecordCounts.get(r.clusterId) || 0) + 1)
  }
  for (const cluster of value.clusters)
    if (cluster.analysisContext && cluster.analysisContext.recordCount !== (clusterRecordCounts.get(cluster.id) || 0)) throw invalid()
  return value as MapDataset
}
export const mapService = {
  loadDataset: async (signal?: AbortSignal, run = "") => {
    if (run && !/^[a-f0-9]{32}$/.test(run)) throw new Error("Invalid analysis run in the link.")
    const value = validateDataset(await requestJson<unknown>(
      run ? `/api/v1/map/runs/${run}/dataset` : "/map/dataset", { signal },
    ))
    if (run && value.analysis.runId !== run) throw new Error("MAP returned a different analysis. Please retry.")
    return value
  },
  listRuns: async (signal?: AbortSignal): Promise<MapRun[]> => {
    const value = await requestJson<unknown>("/api/v1/map/runs?limit=100000", { signal })
    if (!object(value) || !Array.isArray(value.items)) throw invalid()
    const completed = value.items.filter((run: unknown) => object(run) && run.status === "completed")
    return completed.map((run: any) => {
      if (!/^[a-f0-9]{32}$/.test(run.run_id) || typeof run.source_mode !== "string") throw invalid()
      return { id: run.run_id, sourceMode: run.source_mode,
        records: Number.isInteger(run.records) && run.records >= 0 ? run.records : null,
        createdAt: typeof run.created_at === "string" ? run.created_at : run.updated_at || "" }
    })
  },
  saveAnnotation: async (
    run: string,
    record: string,
    draft: ReviewDraft,
    revision: number,
  ) =>
    validateAnnotation(
      await requestJson<unknown>(
        `/api/v1/map/runs/${encodeURIComponent(run)}/records/${encodeURIComponent(record)}/annotation`,
        {
          method: "PUT",
          body: JSON.stringify({ ...draft, expected_revision: revision }),
        },
      ),
    ),
}
