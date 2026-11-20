import type { DueStatus } from "./deadlines"
export type Criticality = string
export type RecordStatus = string
export type OverviewFilterKey =
  | "capaLink"
  | "capaStatus"
  | "dueStatus"
  | "clusterGroup"
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
export type DetailFilterKey = "division" | "site" | "year" | "department" | "capaLink" | "capaStatus" | "dueStatus"
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
  dueDate?: string | null
  closedDate?: string | null
  dueStatus?: DueStatus
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
  originalClusterId?: string
  assignmentReview?: {clusterId:string;reviewer:string;rationale:string;updatedAt:string} | null
  sourceMentions?: {kind:string;value:string;field:string;start:number;end:number;role:string}[]
  assignmentMargin?: number | null
  secondClusterId?: string | null
}
export interface CapaRelationship {
  id: string
  description: string
  status: string
  recordIds: string[]
}
export type ClusterContextSource = "current_analysis" | "historical" | "unavailable" | "reviewed"
export interface HistoricalClusterContext {
  title: string
  summary: string
}
export interface AnalysisClusterContext extends HistoricalClusterContext {
  recordCount: number
  runId: string
}
export interface Cluster {
  id: string
  title: string
  shortTitle: string
  subtitle: string
  match: number | null
  context: string
  contextSource?: ClusterContextSource
  titleSource?: ClusterContextSource
  analysisContext?: AnalysisClusterContext | null
  historicalContext?: HistoricalClusterContext | null
  warnings?: string[]
  capas: CapaRelationship[]
  parentTheme?: string
  reviewStatus?: "needs_review" | "reviewed"
  themeSource?: "suggested" | "reviewed"
  reviewedContext?: HistoricalClusterContext | null
  membershipChanged?: boolean
}
export interface CurationChange {
  operation:"cluster"|"assignment"|"split"|"reset_cluster"|"reset_assignment"
  expected_revision:number
  cluster_id:string
  record_id?:string
  title?:string
  theme?:string
  status?:"needs_review"|"reviewed"
  reviewer:string
  rationale:string
}
export interface MapReview {
  revision:number
  themes:string[]
  taxonomyVersion:string
  clusters:Record<string,{title:string;theme:string;status:string;reviewer:string;rationale:string;updatedAt:string}>
  assignments:Record<string,{clusterId:string;reviewer:string;rationale:string;updatedAt:string}>
  history:{revision:number;operation:string;recordId:string;clusterId:string;reviewer:string;rationale:string;updatedAt:string}[]
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
  capas?: CapaRelationship[]
  months: string[]
  refreshedAt: string
  review?: MapReview
  analysis: {
    runId: string
    recordCount: number
    sourceRecordCount: number | null
    snapshotId: string | null
    resolvedSnapshotId?: string | null
    sourceResolution?: "original_snapshot" | "verified_equivalent_export" | "unavailable"
    sourceAvailable: boolean
    sourceMode: string
    deadlineAsOf?: string
    selection: "configured" | "latest_completed"
    coverage?: {openedFrom:string|null;openedTo:string|null;yearCounts:Record<string,number>;eligibleDeviationCount:number|null;sourceDeviationCount:number|null;sourceCapaCount:number|null;sourceImportedAt:string|null;selectionMethod:string;rules:string[];missingOpenedDates:number}
    provenance?: {recipe:Record<string,unknown>;recipeHash:string;outputFingerprint:string;assetFingerprintsAvailable:boolean;extractionHashes:Record<string,string>}
  }
}
export type MapRoute =
  | { type: "overview" }
  | { type: "cluster"; clusterId: string }
  | { type: "evidence"; clusterId: string; recordId: string }
  | { type: "record"; recordId: string }
