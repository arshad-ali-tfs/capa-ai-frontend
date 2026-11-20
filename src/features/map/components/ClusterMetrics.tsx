import { MetricCard } from "@/shared/components"
import { mapHelp } from "../helpText"
import { overviewMetrics } from "../overviewMetrics"
import type { DeviationRecord } from "../types"
import { medianDaysOpen } from "../utils"
import { CriticalityMetric } from "./CriticalityMetric"
import { TopDrTypeMetric } from "./TopDrTypeMetric"

export function ClusterMetrics({ records, clusterTotal }: { records: DeviationRecord[]; clusterTotal: number }) {
  const metrics = overviewMetrics(records, undefined, false)
  const duration = medianDaysOpen(records)
  const datedRecords = records.filter(record => record.daysOpen !== null).length
  return <section aria-label="Cluster KPIs" className="map-kpi-grid">
    <MetricCard label="Deviations in cluster" value={metrics.total.toLocaleString()} help="Within the current filters" tooltip={mapHelp.deviations}>
      <p className="mt-1 text-xs leading-5 text-suite-muted">Of {clusterTotal.toLocaleString()} in the saved cluster</p>
    </MetricCard>
    <CriticalityMetric metrics={metrics} />
    <MetricCard
      label="Median days open"
      value={typeof duration === "number" ? <>{duration}<span className="text-lg font-normal text-suite-muted"> {duration === 1 ? "day" : "days"}</span></> : duration}
      valueSize={typeof duration === "number" ? "number" : "text"}
      help="Historical opened-to-closed duration"
      tooltip={mapHelp.medianDays}
    >
      <p className="mt-1 text-xs leading-5 text-suite-muted">{datedRecords ? `Based on ${datedRecords.toLocaleString()} of ${records.length.toLocaleString()} records` : "No valid opened/closed dates"}</p>
    </MetricCard>
    <TopDrTypeMetric metrics={metrics} />
  </section>
}
