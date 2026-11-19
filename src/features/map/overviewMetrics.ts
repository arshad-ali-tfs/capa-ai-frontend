import type { CapaRelationship, DeviationRecord } from "./types"
import { sumVolume, unavailable } from "./utils"

export const criticalityLevels = ["Minor", "Major", "Critical"] as const
export type CriticalityLevel = typeof criticalityLevels[number]

export function criticalityMetrics(records: DeviationRecord[]) {
  const total = sumVolume(records)
  const criticality = criticalityLevels.map(label => ({
    label,
    count: sumVolume(records.filter(record => record.criticality.trim().toLowerCase() === label.toLowerCase())),
  }))
  const unknownCriticality = total - criticality.reduce((sum, item) => sum + item.count, 0)
  return { total, criticality, unknownCriticality }
}

export function overviewMetrics(records: DeviationRecord[], capas: CapaRelationship[] | undefined, sourceAvailable: boolean) {
  const { total, criticality, unknownCriticality } = criticalityMetrics(records)
  const types = new Map<string, { label: string; count: number }>()
  let unknownDrType = 0
  for (const record of records) {
    const label = record.drType.trim()
    if (unavailable(label)) { unknownDrType += record.volume; continue }
    const key = label.toLowerCase()
    const current = types.get(key)
    types.set(key, { label: current?.label ?? label, count: (current?.count ?? 0) + record.volume })
  }
  const rankedTypes = [...types.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
  const topDrTypes = rankedTypes.filter(type => type.count === rankedTypes[0]?.count)
  const completed = new Set((capas ?? []).filter(capa => /^closed\s*-\s*done$/i.test(capa.status.trim())).flatMap(capa => capa.recordIds))
  // Count deviations once, even when several completed CAPAs link to the same ID.
  const implemented = sourceAvailable && capas !== undefined && total > 0
    ? sumVolume(records.filter(record => completed.has(record.id)))
    : null
  return { total, criticality, unknownCriticality, topDrTypes, unknownDrType, implemented }
}

export const formatShare = (count: number, total: number) => total > 0 ? `${(count / total * 100).toFixed(1)}%` : "—"
