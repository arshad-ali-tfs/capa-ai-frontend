import { MetricCard } from "@/shared/components"
import { mapHelp } from "../helpText"
import { formatShare, type overviewMetrics } from "../overviewMetrics"

type Metrics = Pick<ReturnType<typeof overviewMetrics>, "total" | "topDrTypes" | "unknownDrType">

export function TopDrTypeMetric({ metrics }: { metrics: Metrics }) {
  const { total, topDrTypes, unknownDrType } = metrics
  const top = topDrTypes[0]
  return <MetricCard
    label="Top DR type"
    value={topDrTypes.length > 1 ? `${topDrTypes.length} types tied` : top?.label ?? "Not available"}
    valueSize="text"
    help={top ? `${top.count.toLocaleString()} of ${total.toLocaleString()} ${total === 1 ? "deviation" : "deviations"}${topDrTypes.length > 1 ? " each" : ""} (${formatShare(top.count, total)})${unknownDrType ? ` · ${unknownDrType.toLocaleString()} unknown` : ""}` : "No usable DR type in this view"}
    tooltip={mapHelp.topDrType + (topDrTypes.length > 1 ? ` Tied types: ${topDrTypes.map(type => type.label).join(", ")}.` : "")}
  >
    {top && <div aria-hidden="true" className="mt-3 h-1.5 overflow-hidden rounded-full bg-suite-info-wash">
      <div className="h-full rounded-full bg-suite-blue" style={{ width: `${top.count / total * 100}%` }} />
    </div>}
  </MetricCard>
}
