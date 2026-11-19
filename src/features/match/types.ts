export type SearchState = "idle" | "loading" | "success" | "empty" | "error"
export type DetailState = "idle" | "loading" | "success" | "error"
export type IndexState = "loading" | "success" | "error"

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
}

export interface CapaRow {
  capaId: string
  status: string
  title: string
  capaType: string
  summary: string
}

export interface RecordDetail {
  deviationId: string
  site: string
  snapshotId: string
  sections: { label: string; text: string }[]
  capas: CapaRow[]
}

export interface SearchResult {
  rows: MatchRow[]
  totalCount: number
  query: string
  scope: string
  mockEmbeddings: boolean
}

export interface IndexInfo {
  records: number
  sites: { site: string; count: number }[]
  modelName: string
  snapshotId: string
  mockEmbeddings: boolean
}
