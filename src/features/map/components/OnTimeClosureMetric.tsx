import { MetricCard } from "@/shared/components"
import { onTimeClosureMetrics } from "../deadlines"
import { mapHelp } from "../helpText"
import { formatShare } from "../overviewMetrics"
import type { DeviationRecord } from "../types"

export function OnTimeClosureMetric({records}: {records: DeviationRecord[]}) {
  const metrics = onTimeClosureMetrics(records)
  return <MetricCard label="On-time closure" help="On or before the recorded due date" tooltip={mapHelp.onTimeClosure}>
    <div className="map-closure-card"><dl aria-label="On-time closure by criticality" className="map-closure-breakdown grid grid-cols-3 divide-x divide-suite-line rounded-lg bg-suite-surface/70 py-2.5">
      {metrics.levels.map(item => <div key={item.label} className="map-closure-level px-2 text-center">
        <dt className="text-[11px] leading-4 text-suite-slate">{item.label}</dt>
        <dd className="mt-1 font-bold tabular-nums text-suite-ink">
          <span className="map-closure-value">{formatShare(item.onTime,item.eligible)}</span>
          <span className="mt-1 block text-[11px] leading-4 font-normal text-suite-muted">{item.onTime.toLocaleString()} of {item.eligible.toLocaleString()} closed</span>
        </dd>
      </div>)}
    </dl></div>
    <p className="mt-2 text-xs leading-5 text-suite-muted">{metrics.eligible
      ? <>{metrics.onTime.toLocaleString()} of {metrics.eligible.toLocaleString()} assessable closures were on time.</>
      : "No closed deviations with valid due and closure dates."}</p>
    {metrics.total > metrics.eligible && <p className="mt-0.5 text-[11px] leading-4 text-suite-muted">{(metrics.total-metrics.eligible).toLocaleString()} excluded: open, cancelled or date/status issues.</p>}
    {metrics.unknownCriticality > 0 && <p className="mt-0.5 text-[11px] leading-4 text-suite-muted">{metrics.unknownCriticality.toLocaleString()} assessable closures have other / unknown criticality.</p>}
  </MetricCard>
}
