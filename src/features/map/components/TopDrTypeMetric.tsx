import { MetricCard } from "@/shared/components"
import { mapHelp } from "../helpText"
import { formatShare, type overviewMetrics } from "../overviewMetrics"

type Metrics = Pick<ReturnType<typeof overviewMetrics>, "total" | "topDrTypes" | "topDrCumulativeCount" | "drTypeCutoffTied" | "unknownDrType">

export function TopDrTypeMetric({ metrics }: { metrics: Metrics }) {
  const { total, topDrTypes, topDrCumulativeCount, drTypeCutoffTied, unknownDrType } = metrics
  const top = topDrTypes[0]
  return <MetricCard
    label="Top DR types"
    value={top ? formatShare(topDrCumulativeCount,total) : "Not available"}
    valueSize={top?"number":"text"}
    help={top ? `Top ${topDrTypes.length} combined · ${topDrCumulativeCount.toLocaleString()} of ${total.toLocaleString()} ${total===1?"deviation":"deviations"}${unknownDrType ? ` · ${unknownDrType.toLocaleString()} unknown` : ""}` : "No usable DR type in this view"}
    tooltip={mapHelp.topDrType + (drTypeCutoffTied ? " A tie reaches beyond third place; the first three alphabetically are shown." : "")}
  >
    {top&&<ol aria-label="Top three DR types" className="mt-2 space-y-1.5">{topDrTypes.map((type,index)=><li key={type.label} className="flex items-start gap-2 text-xs leading-5"><span className="text-suite-muted">{index+1}</span><span className="min-w-0 flex-1 break-words text-suite-slate">{type.label}</span><span className="shrink-0 font-bold tabular-nums">{type.count.toLocaleString()} <span className="ml-1 font-normal text-suite-muted">{formatShare(type.count,total)}</span></span></li>)}</ol>}
  </MetricCard>
}
