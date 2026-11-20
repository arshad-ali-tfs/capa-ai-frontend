import { mapApi } from "@/shared/api/clients"
import { validCalendarDate } from "./deadlines"

export interface InsightRank { label: string; count: number; percent: number }
export interface InsightRanking {
  rows: InsightRank[]; knownCount: number; missingCount: number; distinctCount: number
  topCount: number; topShare: number; cutoffTied: boolean; fields: string[]
  recordedCount: number; mappedCount: number; basis: string; unavailableReason: string
}
export interface SourceDeviationInsights {
  runId: string; scope: "source_snapshot"; available: boolean; snapshotId: string | null
  asOf: string; dateFrom: string; dateTo: string; sourceRecordCount: number | null
  deviationCount: number | null; windowDeviationCount: number | null
  undatedCount: number; futureDatedCount: number; latestOpened: string | null
  clients: InsightRanking; stages: InsightRanking; products: InsightRanking
}
const object = (v: unknown): v is Record<string, any> => !!v && typeof v === "object" && !Array.isArray(v)
const integer = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0
const share = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100
const nullableCount = (v: unknown) => v === null || integer(v)
const invalid = () => new Error("Deviation insights returned inconsistent source counts. Refresh to try again.")
export function validateSourceInsights(value: unknown): SourceDeviationInsights {
  if (!object(value) || !/^[a-f0-9]{32}$/.test(value.runId) || value.scope !== "source_snapshot" || typeof value.available !== "boolean" ||
    !(value.snapshotId === null || typeof value.snapshotId === "string" && /^[a-f0-9]{64}$/.test(value.snapshotId)) ||
    ![value.asOf,value.dateFrom,value.dateTo].every(validCalendarDate) || value.dateFrom > value.dateTo || value.asOf !== value.dateTo ||
    ![value.sourceRecordCount,value.deviationCount,value.windowDeviationCount].every(nullableCount) ||
    ![value.undatedCount,value.futureDatedCount].every(integer) || !(value.latestOpened === null || validCalendarDate(value.latestOpened))) throw invalid()
  const total = value.windowDeviationCount
  if (value.available ? ![total,value.deviationCount,value.sourceRecordCount].every(integer) || total > value.deviationCount || value.deviationCount > value.sourceRecordCount : total !== null || value.deviationCount !== null || value.sourceRecordCount !== null) throw invalid()
  for (const key of ["clients","stages","products"]) {
    const ranking=value[key]
    if (!object(ranking) || !Array.isArray(ranking.rows) || ranking.rows.length > 3 ||
      ![ranking.knownCount,ranking.missingCount,ranking.distinctCount,ranking.topCount,ranking.recordedCount,ranking.mappedCount].every(integer) ||
      !share(ranking.topShare) || typeof ranking.cutoffTied !== "boolean" || !Array.isArray(ranking.fields) || !ranking.fields.every((f: unknown)=>typeof f === "string") ||
      typeof ranking.basis !== "string" || typeof ranking.unavailableReason !== "string") throw invalid()
    const names = new Set<string>();let previous=Infinity
    for (const row of ranking.rows) {
      if (!object(row) || typeof row.label !== "string" || !row.label.trim() || names.has(row.label.toLocaleLowerCase()) ||
        !integer(row.count) || !row.count || row.count > previous || !share(row.percent) || total === null || row.count > total ||
        Math.abs(row.percent-(total?Math.round(row.count/total*1000)/10:0)) > .11) throw invalid()
      previous=row.count;names.add(row.label.toLocaleLowerCase())
    }
    if (ranking.rows.reduce((sum: number,row: InsightRank)=>sum+row.count,0) !== ranking.topCount || ranking.topCount > ranking.knownCount ||
      ranking.recordedCount+ranking.mappedCount !== ranking.knownCount || ranking.distinctCount < ranking.rows.length ||
      total !== null && (ranking.knownCount+ranking.missingCount !== total || Math.abs(ranking.topShare-(total?Math.round(ranking.topCount/total*1000)/10:0)) > .11)) throw invalid()
  }
  return value as unknown as SourceDeviationInsights
}
export function localCalendarDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`
}
export async function loadSourceInsights(run: string, asOf: string, snapshot: string | null, signal?: AbortSignal) {
  if (!/^[a-f0-9]{32}$/.test(run) || !validCalendarDate(asOf)) throw invalid()
  const value=validateSourceInsights(await mapApi.requestJson<unknown>(`/api/v1/map/runs/${run}/insights?as_of=${asOf}`,{signal}))
  if (value.runId !== run || value.asOf !== asOf || value.available && snapshot && value.snapshotId !== snapshot) throw invalid()
  return value
}
