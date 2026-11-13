import { navigateTo } from "@/shared/lib/navigation"
import {
  ActionCard,
  BarList,
  DisclosurePanel,
  EmptyState,
  FilterPanel,
  MetricCard,
  PageHeading,
  Panel,
  TableButton,
} from "@/shared/components"
import { type Filters, type OverviewFilterKey } from "@/features/map/types"
import {
  filterRecords,
  getFilterOptions,
  sumVolume,
} from "@/features/map/utils"
import { overviewFields } from "@/features/map/constants"
import { GuidedWorkspace } from "@/features/map/components/GuidedWorkspace"
import { useMapData } from "@/features/map/MapDataProvider"

export function OverviewScreen({
  filters,
  onFilterChange,
  onClear,
}: {
  filters: Filters<OverviewFilterKey>
  onFilterChange: (key: OverviewFilterKey, value: string) => void
  onClear: () => void
}) {
  const { clusters, records, refreshedAt } = useMapData()
  const filteredRecords = filterRecords(records, filters)
  const visible = clusters
    .map((cluster) => ({
      cluster,
      records: filteredRecords.filter((item) => item.clusterId === cluster.id),
    }))
    .filter((item) => item.records.length > 0)
    .sort((a, b) => b.records.length - a.records.length)
  const totalVolume = sumVolume(filteredRecords)
  const volumeShare =
    totalVolume > 0
      ? (visible
          .slice(0, 5)
          .reduce((sum, item) => sum + sumVolume(item.records), 0) /
          totalVolume) *
        100
      : 0
  const averageMatch =
    visible.length > 0
      ? Math.round(
          visible.reduce(
            (total, item) =>
              total + (item.cluster.match ?? 0) * sumVolume(item.records),
            0,
          ) / totalVolume,
        )
      : 0
  const firstCluster = visible[0]?.cluster

  return (
    <>
      <PageHeading
        title="MAP • Global cluster analysis"
        subtitle="Explore recurring deviation patterns across the selected population."
        status={`Refreshed ${refreshedAt}`}
      />
      <GuidedWorkspace step={1}>
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_300px]">
          <MetricCard
            label="Active clusters"
            value={visible.length}
            help="Visible count"
          />
          <MetricCard
            label="Top 5 share"
            value={`${volumeShare.toFixed(1)}%`}
            help="Share of total volume"
          />
          <MetricCard
            label="Average cluster match"
            value={`${averageMatch}%`}
            help="Volume-weighted match"
          />
          <ActionCard
            title="Review cluster quality"
            help={
              firstCluster
                ? "Open the first visible cluster"
                : "No cluster available"
            }
            disabled={!firstCluster}
            onClick={() =>
              firstCluster && navigateTo(`/map/clusters/${firstCluster.id}`)
            }
          />
        </section>
        <FilterPanel
          filters={filters}
          fields={overviewFields.map((field) => ({
            ...field,
            options: getFilterOptions(records, field.key),
          }))}
          onChange={onFilterChange}
          onClear={onClear}
          primaryCount={4}
          resultLabel={`${visible.length} clusters • ${filteredRecords.length} records`}
        />
        <section className="grid min-w-0 grid-cols-1 gap-3.5 xl:grid-cols-[1.38fr_1fr]">
          <Panel
            title="Cluster summary • Top patterns"
            help="Select a row to inspect its underlying records."
            className="min-h-[398px]"
          >
            {visible.length > 0 ? (
              <div className="overflow-x-auto">
                <div className="min-w-[650px]">
                  <div className="grid grid-cols-[2.4fr_.65fr_.9fr_.55fr] gap-2 rounded-md bg-suite-hover p-2 text-[11px] font-bold text-suite-muted">
                    <span>Cluster summary</span>
                    <span>Deviations</span>
                    <span>Major/Critical</span>
                    <span>Match</span>
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {visible.map(({ cluster, records: clusterRecords }) => {
                      const volume = sumVolume(clusterRecords)
                      const majorVolume = sumVolume(
                        clusterRecords.filter((item) =>
                          /\b(major|critical)\b/i.test(item.criticality),
                        ),
                      )
                      return (
                        <TableButton
                          key={cluster.id}
                          onClick={() =>
                            navigateTo(`/map/clusters/${cluster.id}`)
                          }
                          ariaLabel={`Open ${cluster.title} cluster detail`}
                        >
                          <span className="grid grid-cols-[2.4fr_.65fr_.9fr_.55fr] gap-2 px-2 py-2.5 text-xs">
                            <span className="font-bold">{cluster.title}</span>
                            <span className="text-suite-muted">{volume}</span>
                            <span className="text-suite-muted">
                              {volume
                                ? `${Math.round((majorVolume / volume) * 100)}%`
                                : "0%"}
                            </span>
                            <span className="text-suite-muted">
                              {cluster.match === null
                                ? "Not available"
                                : cluster.match + "%"}
                            </span>
                          </span>
                        </TableButton>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState message="No clusters match the selected filters. Clear one or more filters to restore the full population." />
            )}
          </Panel>
          <DisclosurePanel
            title="Deviation volume by cluster"
            help="Optional analytics • open to compare cluster volume."
          >
            <BarList
              items={visible.map(({ cluster, records: clusterRecords }) => ({
                id: cluster.id,
                label: cluster.shortTitle,
                value: sumVolume(clusterRecords),
              }))}
              onSelect={(id) => navigateTo(`/map/clusters/${id}`)}
            />
          </DisclosurePanel>
        </section>
      </GuidedWorkspace>
    </>
  )
}
