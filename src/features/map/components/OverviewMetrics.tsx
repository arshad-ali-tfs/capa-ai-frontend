import { MetricCard } from "@/shared/components"
import { mapHelp } from "../helpText"
import { formatShare, overviewMetrics } from "../overviewMetrics"
import type { CapaRelationship, DeviationRecord } from "../types"
import { CriticalityMetric } from "./CriticalityMetric"
import { TopDrTypeMetric } from "./TopDrTypeMetric"

export function OverviewMetrics({ records, capas, sourceAvailable, activeClusters }: {
  records: DeviationRecord[]
  capas?: CapaRelationship[]
  sourceAvailable: boolean
  activeClusters: number
}) {
  const metrics = overviewMetrics(records, capas, sourceAvailable)
  const count = (value: number) => value.toLocaleString()
  const { total, implemented, raised } = metrics
  return (
    <section aria-label="Analysis KPIs" className="map-kpi-grid">
      <MetricCard label="Active clusters" value={count(activeClusters)} help="Within the filtered analysis" tooltip={mapHelp.activeClusters}>
        <p className="mt-1 text-xs leading-5 text-suite-muted">{count(total)} {total === 1 ? "deviation" : "deviations"} in this view</p>
      </MetricCard>
      <CriticalityMetric metrics={metrics} />
      <TopDrTypeMetric metrics={metrics} />
      <MetricCard
        label="CAPA implemented / raised"
        value={implemented === null || raised === null ? "Not available" : <>{count(implemented)}<span className="text-lg font-normal text-suite-muted"> / {count(raised)}</span></>}
        valueSize={implemented === null ? "text" : "number"}
        help={implemented === null ? total ? "CAPA source links unavailable" : "No deviations in this view" : raised ? "Distinct linked CAPAs · source status Closed - Done" : "No linked CAPAs retained in this view"}
        tooltip={mapHelp.capaImplemented}
      >
        {implemented !== null && raised!==null && <p className="mt-1 text-sm leading-5 font-bold tabular-nums text-suite-blue">{formatShare(implemented, raised)} <span className="font-normal text-suite-muted">of CAPAs raised</span></p>}
      </MetricCard>
    </section>
  )
}
