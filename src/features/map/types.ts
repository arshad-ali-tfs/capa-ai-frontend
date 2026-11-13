export type Criticality = string

export type RecordStatus = string

export type OverviewFilterKey =
  | "year"
  | "criticality"
  | "drType"
  | "site"
  | "department"
  | "building"
  | "room"
  | "suite"
  | "productionArea"
  | "productionLine"

export type DetailFilterKey = "division" | "site" | "year" | "department"

export type Filters<K extends string> = Record<K, string>

export interface DeviationRecord {
  id: string
  clusterId: string
  site: string
  division: string
  department: string
  year: string
  criticality: Criticality
  status: RecordStatus
  opened: string
  createdLabel: string
  drType: string
  building: string
  room: string
  suite: string
  productionArea: string
  productionLine: string
  shortDescription: string
  sourceField: string
  sourceNarrative: string
  matchSignals: string[]
  volume: number
  daysOpen: number | null
  monthCounts: Record<string, number>
}

export interface Cluster {
  id: string
  title: string
  shortTitle: string
  subtitle: string
  match: number | null
  context: string
  capa?: {
    id: string
    description: string
    status: string
  }
}

export interface ReviewDraft {
  assessment: string
  note: string
}

export interface MapDataset {
  clusters: Cluster[]
  records: DeviationRecord[]
  months: string[]
  refreshedAt: string
}

export type MapRoute =
  | { type: "overview" }
  | {
      type: "cluster"
      clusterId: string
    }
  | { type: "evidence"; clusterId: string; recordId: string }
