import { Badge, EmptyState, HelpLabel } from "@/shared/components"
import type { Cluster, DeviationRecord } from "../types"
import { useMapData } from "../MapDataProvider"
import { mapHelp } from "../helpText"
export function CapaContext({
  cluster,
  records,
}: {
  cluster: Cluster
  records: DeviationRecord[]
}) {
  const { analysis } = useMapData()
  const ids = new Set(records.map((r) => r.id)),
    capas = cluster.capas.filter((c) => c.recordIds.some((id) => ids.has(id)))
  return (
    <>
      <p className="mb-3 text-xs font-bold text-suite-muted">
        <HelpLabel label="Source-linked CAPAs">{mapHelp.capa}</HelpLabel>
      </p>
      {!analysis.sourceAvailable ? (
        <EmptyState message="CAPA relationships cannot be checked because the original source snapshot is unavailable." />
      ) : !capas.length ? (
        <EmptyState message="No CAPA linked by parent or root-parent ID was found for these records in this source snapshot." />
      ) : (
        <>
          <ul className="space-y-4">
            {capas.map((capa) => (
              <li
                key={capa.id}
                className="border-b border-suite-line-soft pb-4 last:border-0"
              >
                <Badge tone="green">{capa.id}</Badge>
                <p className="mt-2 break-words text-sm">{capa.description}</p>
                <p className="mt-2 text-xs text-suite-muted">
                  Status: {capa.status}
                </p>
                <p className="mt-1 break-words text-xs text-suite-muted">
                  Linked deviation IDs:{" "}
                  {capa.recordIds.filter((id) => ids.has(id)).join(", ")}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-suite-muted">
            Historical reference from the source snapshot. Verify the relationship
            in the QMS.
          </p>
        </>
      )}
    </>
  )
}
