export type SearchState = "idle" | "loading" | "success" | "empty" | "error"
export type DetailState = "idle" | "loading" | "success" | "error"
export type IndexState = "loading" | "success" | "error"
export type SearchMode = "auto" | "keyword" | "exact" | "semantic"
export type MatchKind = "browse" | "record_id" | "identifier" | "keyword" | "exact" | "hybrid" | "semantic"
export interface MatchFilters {
  years: number[]
  criticalities: string[]
  exclude_criticalities?: string[]
  exclude_years?: number[]
  dr_types: string[]
  departments: string[]
  sites?: string[]
  exclude_sites?: string[]
  status?: "any" | "open" | "closed"
  date_from: string | null
  date_to: string | null
  capa: "any" | "linked" | "completed" | "none"
}
export interface SearchInput {
  query: string
  site: string
  topK: number
  mode: SearchMode
  filters: MatchFilters
  offset: number
}
export interface FilterOptions {
  scope: string
  snapshotId: string
  scopeCount: number
  eligibleCount: number
  missingDates: number
  filters: MatchFilters
  facets: Record<"years" | "criticalities" | "dr_types" | "departments", { value: string | number; count: number }[]>
}

export interface MatchRow {
  deviationId: string
  site: string
  openedDate: string
  status: string
  criticality: string
  scoreLabel: string
  score: string
  excerpt: string
  matchedField: string
  snapshotId: string
  recordName: string
  drType: string
  department: string
  capaCount: number
  matchKind: MatchKind
  reasons: string[]
  spans: { start: number; end: number }[]
  relationship?: "direct" | "related"
  temporalVerification?: string
  supportingPassage?: SourcePassage | null
}
export interface SourcePassage { field: string; start: number; end: number; quote: string; record_id?: string }

export interface CapaRow {
  capaId: string
  status: string
  title: string
  capaType: string
  summary: string
  dateClosed?: string
}

export interface RecordDetail {
  deviationId: string
  site: string
  snapshotId: string
  sections: { label: string; text: string }[]
  capas: CapaRow[]
  literalSections?: { label: string; text: string }[]
  original?: boolean
  coverage?: { attachment_references: boolean; attachments_included: boolean; unresolved_capa_mentions: string[]; effectiveness: string }
  mentions?: {kind:string;value:string;field:string;start:number;end:number;role:string}[]
}

export interface SearchResult {
  rows: MatchRow[]
  totalCount: number
  query: string
  scope: string
  mockEmbeddings: boolean
  searchMode: MatchKind
  requestedMode: SearchMode
  eligibleCount: number | null
  scopeCount: number | null
  totalMatches: number | null
  filters: MatchFilters | null
  requiredIdentifiers: string[]
  offset: number
  limit: number
  hasMore: boolean
  rankingHelp: string | null
  interpretation?: { query: string; origin: "llm" | "local" } | null
  submittedCriteria?: SearchInput
  summaryId?: string | null
  searchId?: string | null
  snapshotId?: string
  indexGeneration?: string
  notices?: string[]
  asOf?: string
  reviewState?: string
  intent?: string
  seed?: {deviationId:string;title:string;site:string;opened:string} | null
  savedOverview?: EvidenceOverview | null
  savedCaseId?: string
  aggregate?: {kind:"metadata"|"requires_event_definition";total:number|null;groups:{year:string;count:number}[];basis:string}
}
export interface EvidenceDecision {pr_id:string;disposition:"include"|"exclude";rationale:string}
export interface SavedCase {
  id:string;title:string;reviewer:string;notes:string;createdAt:string
  sourceChanged:boolean;indexChanged:boolean;result:SearchResult
  sources:RecordDetail[];decisions:EvidenceDecision[];raw:Record<string,unknown>
}

export interface EvidenceOverview {
  searchId: string
  snapshotId: string
  lines: { text: string; references: string[] }[]
  reviewedIds: string[]
  returnedCount: number
  citations?: SourcePassage[][]
}

export interface IndexInfo {
  records: number
  sites: { site: string; count: number }[]
  modelName: string
  snapshotId: string
  mockEmbeddings: boolean
  divisions?: string[]
  semanticState?: "warming" | "ready" | "unavailable"
}
