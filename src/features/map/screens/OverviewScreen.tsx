import { navigateFromRow, navigateTo } from "@/shared/lib/navigation"
import {
  ActionCard,
  AppLink,
  BarList,
  DisclosurePanel,
  EmptyState,
  FilterPanel,
  MetricCard,
  PageHeading,
  Panel,
} from "@/shared/components"
import type { Filters, MapFilterKey } from "../types"
import {
  filterRecords,
  formatDate,
  formatSimilarity,
  getFilterOptions,
  isMajorCritical,
  meanSimilarity,
  sumVolume,
} from "../utils"
import { overviewFields } from "../constants"
import { GuidedWorkspace } from "../components/GuidedWorkspace"
import { AnalysisStatus } from "../components/AnalysisStatus"
import { RecordList } from "../components/RecordList"
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
  const { clusters, records, refreshedAt } = useMapData()
  const filtered = filterRecords(records, filters)
  const visible = clusters
    .map((cluster) => ({
      cluster,
      records: filtered.filter((r) => r.clusterId === cluster.id),
    }))
    .filter((group) => group.records.length)
    .sort((a, b) => b.records.length - a.records.length)
  const unassigned = filtered.filter((r) => !r.clusterId)
  const total = sumVolume(filtered),
    share = total
      ? (visible
          .slice(0, 5)
          .reduce((sum, group) => sum + sumVolume(group.records), 0) /
          total) *
        100
      : null
  const first = visible[0]?.cluster
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
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Active clusters"
            value={visible.length}
            help="Within the filtered analysis"
          />
          <MetricCard
            label="Top 5 share"
            value={share === null ? "Not available" : `${share.toFixed(1)}%`}
            help="Share of analysed record volume"
          />
          <MetricCard
            label="Average cluster similarity"
            value={formatSimilarity(meanSimilarity(filtered))}
            help="Similarity score, not accuracy"
          />
          <ActionCard
            title="Open cluster"
            help={
              first
                ? "Inspect the largest visible cluster"
                : "No assigned cluster available"
            }
            disabled={!first}
            onClick={() => first && navigateTo(`/map/clusters/${first.id}`)}
          />
        </section>
        <FilterPanel
          filters={filters}
          fields={fields.map((field) => ({
            ...field,
            options: getFilterOptions(records, field.key),
          }))}
          onChange={onFilterChange}
          onClear={onClear}
          primaryCount={4}
          resultLabel={`${visible.length} clusters · ${filtered.length} ${filtered.length === 1 ? "record" : "records"}`}
        />
        <section className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.38fr)_minmax(0,1fr)]">
          <Panel
            title="Cluster summary · Top patterns"
            help="Select a row to inspect its records. Similarity is not measured accuracy."
          >
            {visible.length ? (
              <>
                <table className="map-table hidden sm:table">
                  <caption className="sr-only">
                    Clusters in the selected analysis
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Cluster summary</th>
                      <th scope="col" className="w-[13%]">
                        Deviations
                      </th>
                      <th scope="col" className="w-[16%]">
                        Major/Critical
                      </th>
                      <th scope="col" className="w-[16%]">
                        Similarity
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map(({ cluster, records: members }) => (
                      <tr key={cluster.id} className="cursor-pointer" onClick={(event) => navigateFromRow(event, `/map/clusters/${cluster.id}`)}>
                        <th scope="row">
                          <AppLink
                            href={`/map/clusters/${cluster.id}`}
                            ariaLabel={`Open ${cluster.title} cluster detail`}
                            className="font-bold hover:text-brand hover:underline"
                          >
                            {cluster.title}
                          </AppLink>
                          {members.some((r) => r.warnings.length) && (
                            <p className="mt-1 text-xs font-bold text-warn-ink">
                              {members.filter((r) => r.warnings.length).length}{" "}
                              needs review
                            </p>
                          )}
                        </th>
                        <td>{sumVolume(members)}</td>
                        <td>
                          {Math.round(
                            (sumVolume(members.filter(isMajorCritical)) /
                              sumVolume(members)) *
                              100,
                          )}
                          %
                        </td>
                        <td>{formatSimilarity(meanSimilarity(members))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <ul className="space-y-3 sm:hidden">
                  {visible.map(({ cluster, records: members }) => (
                    <li
                      key={cluster.id}
                      className="cursor-pointer rounded-lg border border-suite-line p-3 hover:bg-suite-hover focus-within:ring-1 focus-within:ring-brand"
                      onClick={(event) => navigateFromRow(event, `/map/clusters/${cluster.id}`)}
                    >
                      <AppLink
                        href={`/map/clusters/${cluster.id}`}
                        ariaLabel={`Open ${cluster.title} cluster detail`}
                        className="block text-sm font-bold hover:text-brand"
                      >
                        {cluster.title}
                      </AppLink>
                      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                        <dt>Deviations</dt>
                        <dd>{sumVolume(members)}</dd>
                        <dt>Major/Critical</dt>
                        <dd>
                          {Math.round(
                            (sumVolume(members.filter(isMajorCritical)) /
                              sumVolume(members)) *
                              100,
                          )}
                          %
                        </dd>
                        <dt>Similarity</dt>
                        <dd>{formatSimilarity(meanSimilarity(members))}</dd>
                      </dl>
                      {members.some((r) => r.warnings.length) && (
                        <p className="mt-2 text-xs font-bold text-warn-ink">
                          {members.filter((r) => r.warnings.length).length}{" "}
                          needs review
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <EmptyState
                message={
                  !records.length
                    ? "This completed analysis contains no records."
                    : unassigned.length
                      ? "These records have no cluster assignment. Open them in the unassigned list below."
                      : "No clusters match the selected filters. Clear one or more filters to see the available records."
                }
              />
            )}
          </Panel>
          <DisclosurePanel
            title="Deviation volume by cluster"
            help="Compare record counts within the current filters."
          >
            <BarList
              items={visible.map(({ cluster, records: members }) => ({
                id: cluster.id,
                label: cluster.shortTitle,
                fullLabel: cluster.title,
                value: sumVolume(members),
              }))}
              onSelect={(id) => navigateTo(`/map/clusters/${id}`)}
            />
          </DisclosurePanel>
        </section>
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
