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
    const label = record.drType.trim().replace(/\s+/g," ")
    if (unavailable(label)) { unknownDrType += record.volume; continue }
    const key = label.toLowerCase()
    const current = types.get(key)
    types.set(key, { label: current?.label ?? label, count: (current?.count ?? 0) + record.volume })
  }
  const rankedTypes = [...types.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
  const topDrTypes = rankedTypes.slice(0,3)
  const topDrCumulativeCount=topDrTypes.reduce((sum,type)=>sum+type.count,0)
  const drTypeCutoffTied=rankedTypes.length>3 && rankedTypes[2].count===rankedTypes[3].count
  const recordIds=new Set(records.map(record=>record.id))
  const linked=new Map((capas??[]).filter(capa=>capa.recordIds.some(id=>recordIds.has(id))).map(capa=>[capa.id,capa]))
  // Both sides use unique CAPA records. A CAPA shared by multiple deviations
  // counts once; several CAPAs for one deviation are separate raised actions.
  const implemented = sourceAvailable && capas !== undefined && total > 0
    ? [...linked.values()].filter(capa=>/^closed\s*-\s*done$/i.test(capa.status.trim())).length
    : null
  const raised=implemented===null?null:linked.size
  return { total, criticality, unknownCriticality, topDrTypes, topDrCumulativeCount, drTypeCutoffTied, unknownDrType, implemented, raised }
}

export const formatShare = (count: number, total: number) => total > 0 ? `${(count / total * 100).toFixed(1)}%` : "—"
