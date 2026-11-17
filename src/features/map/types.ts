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
export type MapFilterKey = OverviewFilterKey | "division"
export type Filters<K extends string> = Record<K, string>
export interface ReviewDraft {
  assessment: string
  note: string
}
export interface RecordAnnotation extends ReviewDraft {
  revision: number
  savedAt: string | null
}
export interface SourceSection {
  key: string
  label: string
  text: string
}
export interface FiveWh {
  who: string
  what: string
  when: string
  where: string
  why: string
  how: string
}
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
  sourceSections?: SourceSection[]
  fiveWh?: FiveWh
  matchSignals: string[]
  similarity: number | null
  warnings: string[]
  annotation: RecordAnnotation
  volume: number
  daysOpen: number | null
  monthCounts: Record<string, number>
}
export interface CapaRelationship {
  id: string
  description: string
  status: string
  recordIds: string[]
}
export interface Cluster {
  id: string
  title: string
  shortTitle: string
  subtitle: string
  match: number | null
  context: string
  capas: CapaRelationship[]
}
export interface MapRun {
  id: string
  records: number | null
  createdAt: string
  sourceMode: string
}
export interface MapDataset {
  clusters: Cluster[]
  records: DeviationRecord[]
  months: string[]
  refreshedAt: string
  analysis: {
    runId: string
    recordCount: number
    sourceRecordCount: number | null
    snapshotId: string | null
    sourceAvailable: boolean
    sourceMode: string
    selection: "configured" | "latest_completed"
  }
}
export type MapRoute =
  | { type: "overview" }
  | { type: "cluster"; clusterId: string }
  | { type: "evidence"; clusterId: string; recordId: string }
  | { type: "record"; recordId: string }
