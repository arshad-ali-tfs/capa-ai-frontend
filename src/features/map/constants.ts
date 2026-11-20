import {
  type DetailFilterKey,
  type OverviewFilterKey,
} from "@/features/map/types"

export interface OverviewField {
  key: OverviewFilterKey
  label: string
}

export interface DetailField {
  key: DetailFilterKey
  label: string
}

export const overviewFields: OverviewField[] = [
  { key: "year", label: "Years" },
  { key: "criticality", label: "Criticality" },
  { key: "drType", label: "DR types" },
  { key: "site", label: "Sites" },
  { key: "capaLink", label: "CAPA linkage" },
  { key: "capaStatus", label: "CAPA status" },
  { key: "dueStatus", label: "Due-date status" },
  { key: "department", label: "Departments" },
  { key: "building", label: "Building" },
  { key: "room", label: "Room" },
  { key: "suite", label: "Suite" },
  { key: "productionArea", label: "Production area" },
  { key: "productionLine", label: "Production line" },
  { key: "clusterGroup", label: "Cluster group" },
]

export const detailFields: DetailField[] = [
  { key: "division", label: "Division" },
  { key: "site", label: "Sites" },
  { key: "year", label: "Year" },
  { key: "department", label: "Department" },
  { key: "capaLink", label: "CAPA linkage" },
  { key: "capaStatus", label: "CAPA status" },
  { key: "dueStatus", label: "Due-date status" },
]
