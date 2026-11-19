import { HelpTooltip, MetricCard } from "@/shared/components"
import { cx } from "@/shared/lib/classNames"
import { mapHelp } from "../helpText"
import { formatShare, type CriticalityLevel, type criticalityMetrics } from "../overviewMetrics"

type Metrics = ReturnType<typeof criticalityMetrics>
const tones = {
  Minor: { dot: "bg-suite-slate", number: "text-suite-ink" },
  Major: { dot: "bg-[#b07714]", number: "text-[#8a5209]" },
  Critical: { dot: "bg-brand-strong", number: "text-brand-strong" },
}

export function CriticalityCount({ level, count }: { level: CriticalityLevel; count: number }) {
  return <span className={cx("font-bold tabular-nums", count ? tones[level].number : "text-suite-muted")}>{count.toLocaleString()}</span>
}

export function CriticalityBreakdown({ metrics, withHelp = false }: { metrics: Metrics; withHelp?: boolean }) {
  return <>
    <dl className="grid grid-cols-3 divide-x divide-suite-line rounded-lg bg-suite-surface/70 py-2.5">
      {metrics.criticality.map(item => <div key={item.label} className="min-w-0 px-2 text-center">
        <dt className="flex flex-wrap items-center justify-center gap-x-1 text-[11px] leading-4 text-suite-slate">
          <span className="inline-flex items-center gap-1 whitespace-nowrap">
            <span aria-hidden="true" className={cx("size-1.5 shrink-0 rounded-full", tones[item.label].dot)} />
            {item.label}
          </span>
          {withHelp && <HelpTooltip label={item.label}>{mapHelp.criticalityCounts}</HelpTooltip>}
        </dt>
        <dd className="mt-1 text-[23px] leading-7">
          <CriticalityCount level={item.label} count={item.count} />
          <span className="mt-0.5 block text-[11px] leading-4 font-normal tabular-nums text-suite-muted">{formatShare(item.count, metrics.total)}</span>
        </dd>
      </div>)}
    </dl>
    {metrics.unknownCriticality > 0 && <p className="mt-2 text-xs leading-5 text-suite-muted">
      Other / unknown: <span className="font-bold tabular-nums">{metrics.unknownCriticality.toLocaleString()}</span> ({formatShare(metrics.unknownCriticality, metrics.total)})
    </p>}
  </>
}

export function CriticalityMetric({ metrics }: { metrics: Metrics }) {
  return <MetricCard label="Criticality" help={`Out of ${metrics.total.toLocaleString()} ${metrics.total === 1 ? "deviation" : "deviations"}`} tooltip={mapHelp.criticalityBreakdown}>
    <CriticalityBreakdown metrics={metrics} />
  </MetricCard>
}
