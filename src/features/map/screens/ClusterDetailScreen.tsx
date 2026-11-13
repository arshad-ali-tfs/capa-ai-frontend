import { navigateTo } from "@/shared/lib/navigation"
import {
  ActionCard,
  Badge,
  BarList,
  DisclosurePanel,
  EmptyState,
  FilterPanel,
  MetricCard,
  PageHeading,
  Panel,
  TableButton,
} from "@/shared/components"
import {
  type Cluster,
  type DetailFilterKey,
  type Filters,
} from "@/features/map/types"
import {
  filterRecords,
  getFilterOptions,
  medianDaysOpen,
  monthTotals,
  recordsForCluster,
  sumVolume,
} from "@/features/map/utils"
import { detailFields } from "@/features/map/constants"
import { GuidedWorkspace } from "@/features/map/components/GuidedWorkspace"
import { PatternNotice } from "@/features/map/components/PatternNotice"
import { useMapData } from "@/features/map/MapDataProvider"

export function ClusterDetailScreen({
  cluster,
  filters,
  onFilterChange,
  onClear,
}: {
  cluster: Cluster
  filters: Filters<DetailFilterKey>
  onFilterChange: (key: DetailFilterKey, value: string) => void
  onClear: () => void
}) {
  const { records, months, refreshedAt } = useMapData()
  const allClusterRecords = recordsForCluster(records, cluster.id)
  const visibleRecords = filterRecords(allClusterRecords, filters)
  const firstRecord = visibleRecords[0]
  const majorCritical = visibleRecords.filter((item) =>
    ["Major", "Critical"].includes(item.criticality),
  ).length

  return (
    <>
      <PageHeading
        title={`Cluster detail • ${cluster.id}`}
        subtitle={cluster.subtitle}
        status={`Refreshed ${refreshedAt}`}
        breadcrumbs={[
          { label: "Global cluster overview", href: "/map" },
          { label: cluster.id },
        ]}
      />
      <GuidedWorkspace step={2} clusterId={cluster.id}>
        <PatternNotice />
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_300px]">
          <MetricCard
            label="Deviations in cluster"
            value={sumVolume(visibleRecords)}
            help="Total record volume"
          />
          <MetricCard
            label="Major / Critical"
            value={majorCritical}
            help="Requires human assessment"
          />
          <MetricCard
            label="Median days open"
            value={medianDaysOpen(visibleRecords)}
            help="Median"
          />
          <ActionCard
            title="Review records"
            help={
              firstRecord
                ? "Open the first visible deviation"
                : "No record available"
            }
            disabled={!firstRecord}
            onClick={() =>
              firstRecord &&
              navigateTo(
                `/map/clusters/${cluster.id}/evidence/${firstRecord.id}`,
              )
            }
          />
        </section>
        <FilterPanel
          filters={filters}
          fields={detailFields.map((field) => ({
            ...field,
            options: getFilterOptions(allClusterRecords, field.key),
          }))}
          onChange={onFilterChange}
          onClear={onClear}
          resultLabel={`${visibleRecords.length} records`}
        />
        <section className="order-2 grid min-w-0 grid-cols-1 gap-3.5 xl:grid-cols-[.78fr_1fr]">
          <Panel
            title="Cluster context"
            help="This grouping is a navigation aid, not a root-cause conclusion."
            className="min-h-[250px]"
          >
            <p className="max-w-2xl text-[13px] leading-relaxed">
              {cluster.context}
            </p>
            <div className="mt-6">
              <Badge tone="amber">Analytical summary</Badge>
            </div>
            <p className="mt-3 text-xs text-suite-muted">
              No causal or product-impact conclusion is implied by cluster
              membership.
            </p>
          </Panel>
          <DisclosurePanel
            title="Deviation occurrences"
            help="Optional counts by month."
          >
            <BarList items={monthTotals(visibleRecords, months)} />
          </DisclosurePanel>
        </section>
        <section className="order-1 grid min-w-0 grid-cols-1 gap-3.5 xl:grid-cols-[1.7fr_1fr]">
          <Panel
            title="Included deviations"
            help="Select a row to view source evidence."
            className="min-h-[270px]"
          >
            {visibleRecords.length ? (
              <div className="overflow-x-auto">
                <div className="min-w-[760px]">
                  <div className="grid grid-cols-[1.15fr_.9fr_.85fr_.8fr_2.1fr] gap-2 rounded-md bg-suite-hover p-2 text-[11px] font-bold text-suite-muted">
                    <span>Record ID</span>
                    <span>Site</span>
                    <span>Criticality</span>
                    <span>Status</span>
                    <span>Short description</span>
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {visibleRecords.map((record) => (
                      <TableButton
                        key={record.id}
                        onClick={() =>
                          navigateTo(
                            `/map/clusters/${cluster.id}/evidence/${record.id}`,
                          )
                        }
                        ariaLabel={`Open evidence review for ${record.id}`}
                      >
                        <span className="grid grid-cols-[1.15fr_.9fr_.85fr_.8fr_2.1fr] gap-2 px-2 py-2.5 text-xs text-suite-muted">
                          <span className="font-bold text-suite-ink">
                            {record.id}
                          </span>
                          <span>{record.site}</span>
                          <span>{record.criticality}</span>
                          <span>{record.status}</span>
                          <span>{record.shortDescription}</span>
                        </span>
                      </TableButton>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState message="No records match the selected cluster filters." />
            )}
          </Panel>
          <DisclosurePanel
            title="Related CAPA context"
            help="Optional historical relationship • verify in the QMS."
          >
            {cluster.capa ? (
              <>
                <Badge tone="green">{cluster.capa.id}</Badge>
                <p className="mt-3 text-[13px] leading-relaxed">
                  {cluster.capa.description}
                </p>
                <p className="mt-8 text-xs text-suite-muted">
                  Status: {cluster.capa.status}
                </p>
                <p className="mt-2 text-[11px] font-bold text-warn-ink">
                  Reference only • CAPA.AI does not write back to the QMS.
                </p>
              </>
            ) : (
              <EmptyState message="No CAPA relationship is available for this cluster." />
            )}
          </DisclosurePanel>
        </section>
      </GuidedWorkspace>
    </>
  )
}
