import { navigateTo } from "@/shared/lib/navigation"
import {
  ActionCard,
  BarList,
  DisclosurePanel,
  FilterPanel,
  MetricCard,
  PageHeading,
  Panel,
} from "@/shared/components"
import type { Cluster, Filters, MapFilterKey } from "../types"
import {
  filterRecords,
  formatDate,
  getFilterOptions,
  isMajorCritical,
  medianDaysOpen,
  monthTotals,
  recordPath,
  recordsForCluster,
  sumVolume,
} from "../utils"
import { detailFields, overviewFields } from "../constants"
import { GuidedWorkspace } from "../components/GuidedWorkspace"
import { AnalysisStatus } from "../components/AnalysisStatus"
import { CapaContext } from "../components/CapaContext"
import { RecordList } from "../components/RecordList"
import { ClusterContext } from "../components/ClusterContext"
import { useMapData } from "../MapDataProvider"
export function ClusterDetailScreen({
  cluster,
  filters,
  onFilterChange,
  onClear,
}: {
  cluster: Cluster
  filters: Filters<MapFilterKey>
  onFilterChange: (key: MapFilterKey, value: string) => void
  onClear: () => void
}) {
  const { records, months, refreshedAt } = useMapData()
  const all = recordsForCluster(records, cluster.id),
    visible = filterRecords(all, filters),
    first = visible[0]
  const fields = [
    ...detailFields,
    ...overviewFields.filter(
      (field) =>
        !detailFields.some((d) => d.key === field.key) &&
        filters[field.key] !== "All",
    ),
  ]
  const warnings = visible.filter((r) => r.warnings.length)
  return (
    <>
      <PageHeading
        title={`Cluster detail · ${cluster.id}`}
        subtitle={cluster.subtitle}
        status={`Analysis completed ${formatDate(refreshedAt, true)}`}
        breadcrumbs={[
          { label: "Cluster overview", href: "/map" },
          { label: cluster.id },
        ]}
      />
      <AnalysisStatus />
      <GuidedWorkspace step={2} clusterId={cluster.id}>
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Deviations in cluster"
            value={sumVolume(visible)}
            help="Within the current filters"
          />
          <MetricCard
            label="Major / Critical"
            value={sumVolume(visible.filter(isMajorCritical))}
            help="Source criticality classification"
          />
          <MetricCard
            label="Median days open"
            value={medianDaysOpen(visible)}
            help="From source opened/closed dates"
          />
          <ActionCard
            title="Review records"
            help={
              first
                ? "Open the first visible deviation"
                : "No record matches these filters"
            }
            disabled={!first}
            onClick={() => first && navigateTo(recordPath(first))}
          />
        </section>
        <FilterPanel
          filters={filters}
          fields={fields.map((field) => ({
            ...field,
            options: getFilterOptions(all, field.key),
          }))}
          onChange={onFilterChange}
          onClear={onClear}
          primaryCount={4}
          resultLabel={`${visible.length} ${visible.length === 1 ? "record" : "records"}`}
        />
        {warnings.length > 0 && (
          <p
            className="rounded-lg border border-[#efd99d] bg-warn-wash p-3 text-sm text-warn-ink"
            role="status"
          >
            {warnings.length}{" "}
            {warnings.length === 1 ? "record needs" : "records need"} review.
            Warning details are available on each evidence page.
          </p>
        )}
        <section className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <Panel
            title="Included deviations"
            help="Select a row to view source evidence."
          >
            <RecordList records={visible} />
          </Panel>
          <DisclosurePanel
            title="Related CAPA context"
            help="Relationships retained in the same source snapshot."
          >
            <CapaContext cluster={cluster} records={visible} />
          </DisclosurePanel>
        </section>
        <section className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,.78fr)_minmax(0,1fr)]">
          <ClusterContext cluster={cluster} />
          <DisclosurePanel
            title="Deviation occurrences"
            help="Record counts by opened month, within the current filters."
          >
            <BarList items={monthTotals(visible, months)} />
          </DisclosurePanel>
        </section>
      </GuidedWorkspace>
    </>
  )
}
