import { useId } from "react"
import { Badge, DisclosurePanel, HelpTooltip } from "@/shared/components"
import type { Cluster } from "../types"
import { HistoricalContext } from "./HistoricalContext"
import { mapHelp } from "../helpText"

export function ClusterContext({ cluster }: { cluster: Cluster }) {
  const titleId = useId()
  // Older dataset contracts supplied historical context only.
  const source = cluster.contextSource ?? "historical"
  const current = cluster.analysisContext, historical = cluster.historicalContext
  const count = current?.recordCount
  const help = cluster.membershipChanged ? "Membership has changed through reviewer decisions. This saved AI context describes the original members and has not been regenerated." : source === "current_analysis"
    ? `Based on all ${count?.toLocaleString()} ${count === 1 ? "record" : "records"} in this cluster for the selected analysis. Filters do not rewrite this summary.`
    : source === "historical"
      ? "Historical reference summary; unchanged by the analysis filters."
      : "No summary was saved for this cluster."
  return (
    <section aria-labelledby={titleId} className="min-w-0 rounded-xl border border-suite-line bg-white p-4">
      <div className="flex items-center gap-1">
        <h2 id={titleId} className="text-[15px] font-bold">Cluster context</h2>
        <HelpTooltip label="Cluster context">{mapHelp.clusterContext}</HelpTooltip>
      </div>
      <p className="mt-1 text-xs text-suite-muted">{help}</p>
      <p className="mt-2 text-xs font-bold text-suite-blue">{cluster.titleSource==="reviewed"?"Reviewer label":cluster.titleSource==="current_analysis"?"Analysis-specific title · awaiting review":"Historical reference title"}{cluster.parentTheme?` · ${cluster.parentTheme}`:""}</p>
      <div className="mt-3">
        <Badge tone={source === "current_analysis" ? "blue" : source === "historical" ? "amber" : "neutral"}>
          {source === "current_analysis" ? "AI summary for this analysis" : source === "historical" ? "Historical analytical summary" : "Summary unavailable"}
        </Badge>
        {source === "current_analysis" && current?.title && current.title !== cluster.title && (
          <p className="mt-3 break-words text-sm font-bold">{current.title}</p>
        )}
        <HistoricalContext text={cluster.context} confidenceLabel={source === "current_analysis" ? "AI confidence label" : "Historical confidence label"} />
        {source === "current_analysis" && (
          <p className="mt-3 text-xs text-suite-muted">Saved AI output. Check it against the included records; its confidence label is not measured accuracy.</p>
        )}
        {source === "historical" && cluster.contextSource !== undefined && (
          <p className="mt-3 text-xs text-suite-muted">No AI summary was saved for this analysis. Showing the historical reference.</p>
        )}
        {source === "current_analysis" && (historical?.summary.trim() ? (
          <div className="mt-4">
            <DisclosurePanel title="Historical reference" help="Retained cluster description, separate from this analysis.">
              {historical.title && <p className="break-words text-sm font-bold">{historical.title}</p>}
              <HistoricalContext text={historical.summary} />
            </DisclosurePanel>
          </div>
        ) : (
          <p className="mt-4 text-xs text-suite-muted">No historical reference summary is available for this cluster.</p>
        ))}
        <p className="mt-4 text-xs text-suite-muted">Cluster membership does not establish root cause, severity or product impact.</p>
      </div>
    </section>
  )
}
