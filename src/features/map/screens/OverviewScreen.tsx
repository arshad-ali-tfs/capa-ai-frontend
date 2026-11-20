import { ClusterGroups } from "../components/ClusterGroups"
import {
  FilterPanel,
  PageHeading,
  Panel,
} from "@/shared/components"
import type { Filters, MapFilterKey } from "../types"
import {
  filterRecords,
  formatDate,
  getFilterOptions,
  sumVolume,
} from "../utils"
import { overviewFields } from "../constants"
import { filterHelp, mapHelp } from "../helpText"
import { GuidedWorkspace } from "../components/GuidedWorkspace"
import { AnalysisStatus } from "../components/AnalysisStatus"
import { RecordList } from "../components/RecordList"
import { OverviewMetrics } from "../components/OverviewMetrics"
import { ClusterSummary } from "../components/ClusterSummary"
import { useMapData } from "../MapDataProvider"
export function OverviewScreen({
  filters,
  onFilterChange,
  onClear,
}: {
  filters: Filters<MapFilterKey>
  onFilterChange: (key: MapFilterKey, value: string) => void
  onClear: () => void
}) {
  const data = useMapData()
  const { clusters, records, capas, analysis, refreshedAt } = data
  const groupScope = filterRecords(records, {...filters,clusterGroup:"All"}, data)
  const filtered = filterRecords(records, filters, data)
  const visible = clusters
    .map((cluster) => ({
      cluster,
      records: filtered.filter((r) => r.clusterId === cluster.id),
    }))
    .filter((group) => group.records.length)
    .sort((a, b) => b.records.length - a.records.length)
  const unassigned = filtered.filter((r) => !r.clusterId)
  const fields = [
    ...overviewFields,
    ...(filters.division !== "All"
      ? [{ key: "division" as const, label: "Division" }]
      : []),
  ]
  return (
    <>
      <PageHeading
        title="MAP · Cluster analysis"
        subtitle="Explore patterns within the selected analysis and inspect their source records."
        status={`Analysis completed ${formatDate(refreshedAt, true)}`}
      />
      <AnalysisStatus />
      <GuidedWorkspace step={1}>
        <OverviewMetrics records={filtered} capas={capas} sourceAvailable={analysis.sourceAvailable} />
        <FilterPanel
          tooltip={mapHelp.filters}
          filters={filters}
          fields={fields.map((field) => ({
            ...field,
            options: getFilterOptions(records, field.key, data),
            tooltip: filterHelp[field.key],
          }))}
          onChange={onFilterChange}
          onClear={onClear}
          primaryCount={7}
          resultLabel={`${visible.length} clusters · ${filtered.length} ${filtered.length === 1 ? "record" : "records"}`}
        />
        <ClusterGroups clusters={clusters} records={groupScope} selected={filters.clusterGroup} onChange={value=>onFilterChange("clusterGroup",value)} />
        <ClusterSummary
          groups={visible}
          viewTotal={sumVolume(filtered)}
          emptyMessage={
            !records.length
              ? "This completed analysis contains no records."
              : unassigned.length
                ? "These records have no cluster assignment. Open them in the unassigned list below."
                : "No clusters match the selected filters. Clear one or more filters to see the available records."
          }
        />
        {unassigned.length > 0 && (
          <Panel
            title={`Unassigned records · ${unassigned.length}`}
            help="These records are accounted for but have no assigned cluster. Open a record to inspect its source and add a review annotation."
          >
            <RecordList records={unassigned} />
          </Panel>
        )}
      </GuidedWorkspace>
    </>
  )
}
