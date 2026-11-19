import { AppLink, EmptyState, HelpLabel, Panel } from "@/shared/components"
import { navigateFromRow } from "@/shared/lib/navigation"
import { mapHelp } from "../helpText"
import { criticalityMetrics, formatShare } from "../overviewMetrics"
import type { Cluster, DeviationRecord } from "../types"
import { formatSimilarity, meanSimilarity } from "../utils"
import { CriticalityBreakdown, CriticalityCount } from "./CriticalityMetric"

interface Group { cluster: Cluster; records: DeviationRecord[] }

function ClusterTitle({ cluster, records }: Group) {
  const warnings = records.filter(record => record.warnings.length).length
  return <>
    <AppLink href={`/map/clusters/${cluster.id}`} ariaLabel={`Open ${cluster.title} cluster detail`} className="font-bold leading-5 hover:text-brand hover:underline">
      {cluster.title}
    </AppLink>
    {warnings > 0 && <p className="mt-1 text-xs font-bold text-warn-ink">{warnings} needs review</p>}
  </>
}

export function ClusterSummary({ groups, emptyMessage }: { groups: Group[]; emptyMessage: string }) {
  const rows = groups.map(group => ({ ...group, metrics: criticalityMetrics(group.records), similarity: formatSimilarity(meanSimilarity(group.records)) }))
  return <Panel title="Cluster summary · Top patterns" help="Severity columns show count and share within the current filters. Select a cluster to inspect its records. Similarity is not measured accuracy.">
    {rows.length ? <>
      <table className="map-table map-cluster-table">
        <caption className="sr-only">Clusters in the selected analysis, with separate Minor, Major and Critical counts and percentages</caption>
        <colgroup>
          <col className="w-[40%]" /><col className="w-[14%]" />
          <col className="w-[10%]" /><col className="w-[10%]" /><col className="w-[12%]" /><col className="w-[14%]" />
        </colgroup>
        <thead><tr>
          <th scope="col" aria-label="Cluster summary"><HelpLabel label="Cluster summary">{mapHelp.clusterSummary}</HelpLabel></th>
          <th scope="col" aria-label="Deviations" className="text-right"><HelpLabel label="Deviations">{mapHelp.deviations}</HelpLabel></th>
          {rows[0].metrics.criticality.map(item => <th key={item.label} scope="col" aria-label={item.label} className="text-right">
            <HelpLabel label={item.label}>{mapHelp.criticalityCounts}</HelpLabel>
          </th>)}
          <th scope="col" aria-label="Similarity" className="text-right"><HelpLabel label="Similarity">{mapHelp.similarity}</HelpLabel></th>
        </tr></thead>
        <tbody>{rows.map(({ cluster, records, metrics, similarity }) => <tr key={cluster.id} className="cursor-pointer" onClick={event => navigateFromRow(event, `/map/clusters/${cluster.id}`)}>
          <th scope="row">
            <ClusterTitle cluster={cluster} records={records} />
            {metrics.unknownCriticality > 0 && <p className="mt-1 text-xs text-suite-muted">{metrics.unknownCriticality.toLocaleString()} other / unknown criticality</p>}
          </th>
          <td className="text-right"><span className="font-bold tabular-nums text-suite-ink">{metrics.total.toLocaleString()}</span></td>
          {metrics.criticality.map(item => <td key={item.label} className="text-right">
            <CriticalityCount level={item.label} count={item.count} />
            <span className="mt-1 block text-[11px] tabular-nums text-suite-muted">{formatShare(item.count, metrics.total)}</span>
          </td>)}
          <td className="text-right text-xs tabular-nums">{similarity}</td>
        </tr>)}</tbody>
      </table>
      <ul className="map-cluster-cards space-y-3">
        {rows.map(({ cluster, records, metrics, similarity }) => <li key={cluster.id} className="cursor-pointer rounded-xl border border-suite-line p-3.5 hover:bg-suite-hover focus-within:ring-1 focus-within:ring-brand" onClick={event => navigateFromRow(event, `/map/clusters/${cluster.id}`)}>
          <div className="text-sm"><ClusterTitle cluster={cluster} records={records} /></div>
          <dl className="mt-3 flex items-start justify-between gap-3 border-y border-suite-line-soft py-2 text-xs">
            <div><dt className="text-suite-muted"><HelpLabel label="Deviations">{mapHelp.deviations}</HelpLabel></dt><dd className="font-bold tabular-nums">{metrics.total.toLocaleString()}</dd></div>
            <div className="text-right"><dt className="text-suite-muted"><HelpLabel label="Similarity">{mapHelp.similarity}</HelpLabel></dt><dd className="tabular-nums text-suite-muted">{similarity}</dd></div>
          </dl>
          <div className="mt-3"><CriticalityBreakdown metrics={metrics} withHelp /></div>
        </li>)}
      </ul>
    </> : <EmptyState message={emptyMessage} />}
  </Panel>
}
