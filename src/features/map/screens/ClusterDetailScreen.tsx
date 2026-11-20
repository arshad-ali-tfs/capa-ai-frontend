import {
  BarList,
  DisclosurePanel,
  FilterPanel,
  HelpTooltip,
  PageHeading,
  Panel,
} from "@/shared/components"
import type { Cluster, Filters, MapFilterKey } from "../types"
import {
  filterRecords,
  formatDate,
  getFilterOptions,
  monthTotals,
  recordsForCluster,
  sumVolume,
} from "../utils"
import { detailFields, overviewFields } from "../constants"
import { filterHelp, mapHelp } from "../helpText"
import { GuidedWorkspace } from "../components/GuidedWorkspace"
import { AnalysisStatus } from "../components/AnalysisStatus"
import { CapaContext } from "../components/CapaContext"
import { RecordList } from "../components/RecordList"
import { ClusterContext } from "../components/ClusterContext"
import { ClusterMetrics } from "../components/ClusterMetrics"
import { useMapData } from "../MapDataProvider"
import { CurationPanel } from "../components/CurationPanel"
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
  const data = useMapData()
  const { records, months, refreshedAt } = data
  const all = recordsForCluster(records, cluster.id),
    visible = filterRecords(all, filters, data)
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
        <ClusterMetrics records={visible} clusterTotal={sumVolume(all)} />
        <CurationPanel key={cluster.id} cluster={cluster} />
        <FilterPanel
          tooltip={mapHelp.filters}
          filters={filters}
          fields={fields.map((field) => ({
            ...field,
            options: getFilterOptions(all, field.key, data),
            tooltip: filterHelp[field.key],
          }))}
          onChange={onFilterChange}
          onClear={onClear}
          primaryCount={7}
          resultLabel={`${visible.length} ${visible.length === 1 ? "record" : "records"}`}
        />
        {!!cluster.warnings?.length && (
          <section
            aria-label="Cluster warnings"
            className="rounded-lg border border-[#efd99d] bg-warn-wash p-4 text-sm text-warn-ink"
          >
            <div className="flex items-center gap-1">
              <h2 className="font-bold">Cluster information</h2>
              <HelpTooltip label="Cluster information">{mapHelp.clusterInfo}</HelpTooltip>
            </div>
            <ul className="mt-2 list-inside list-disc space-y-1">
              {cluster.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </section>
        )}
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
            <div className="mb-3 flex items-center gap-1 text-xs text-suite-muted">
              <span>Reading this chart</span>
              <HelpTooltip label="Deviation occurrences">{mapHelp.occurrences}</HelpTooltip>
            </div>
            <BarList items={monthTotals(visible, months)} />
          </DisclosurePanel>
        </section>
      </GuidedWorkspace>
    </>
  )
}
