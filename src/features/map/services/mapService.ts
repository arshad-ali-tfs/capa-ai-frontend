import { requestJson } from "@/shared/api/httpClient"
import type { MapDataset, RecordAnnotation, ReviewDraft } from "../types"
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
  }
  return value as MapDataset
}
export const mapService = {
  loadDataset: async (signal?: AbortSignal) =>
    validateDataset(await requestJson<unknown>("/map/dataset", { signal })),
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
