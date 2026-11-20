import { AppLink, Badge, EmptyState, HelpLabel, HelpTooltip } from "@/shared/components"
import { navigateFromRow } from "@/shared/lib/navigation"
import type { DeviationRecord } from "../types"
import { formatDate, recordPath } from "../utils"
import { mapHelp } from "../helpText"
export function RecordList({
  records,
  showCreated = false,
}: {
  records: DeviationRecord[]
  showCreated?: boolean
}) {
  if (!records.length)
    return <EmptyState message="No records match the selected filters." />
  const link = (record: DeviationRecord) => (
    <AppLink
      href={recordPath(record)}
      ariaLabel={`Open evidence review for ${record.id}`}
      className="font-bold text-suite-ink underline-offset-4 hover:text-brand hover:underline"
    >
      {record.id}
    </AppLink>
  )
  const warning = (record: DeviationRecord) =>
    record.warnings.length > 0 ? (
      <span className="mt-1 flex items-center gap-0.5 text-xs font-bold text-warn-ink">
        <span>{record.clusterId ? "Needs review" : "Unassigned"}</span>
        <HelpTooltip label={`Review information for ${record.id}`}>{record.warnings.join(" ")}</HelpTooltip>
      </span>
    ) : null
  return (
    <>
      <table className="map-table hidden sm:table">
        <caption className="sr-only">
          Deviation records and their source details
        </caption>
        <thead>
          <tr>
            <th scope="col" aria-label="Record ID" className="w-[18%]">
              <HelpLabel label="Record ID">{mapHelp.recordId}</HelpLabel>
            </th>
            <th scope="col" aria-label="Site" className="w-[18%]">
              <HelpLabel label="Site">{mapHelp.site}</HelpLabel>
            </th>
            <th scope="col" aria-label="Criticality" className="w-[18%]">
              <HelpLabel label="Criticality">{mapHelp.criticality}</HelpLabel>
            </th>
            <th scope="col" aria-label="Status" className="w-[16%]">
              <HelpLabel label="Status">{mapHelp.status}</HelpLabel>
            </th>
            <th scope="col" aria-label={showCreated ? "Created" : "Short description"}>
              <HelpLabel label={showCreated ? "Created" : "Short description"}>{showCreated ? mapHelp.created : mapHelp.description}</HelpLabel>
            </th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id} className="cursor-pointer" onClick={(event) => navigateFromRow(event, recordPath(record))}>
              <th scope="row">
                {link(record)}
                {warning(record)}
              </th>
              <td>{record.site}</td>
              <td>{record.criticality}</td>
              <td>{record.status}</td>
              <td>
                {showCreated
                  ? formatDate(record.createdLabel)
                  : record.shortDescription}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="space-y-3 sm:hidden">
        {records.map((record) => (
          <li
            key={record.id}
            className="cursor-pointer rounded-lg border border-suite-line p-3 hover:bg-suite-hover focus-within:ring-1 focus-within:ring-brand"
            onClick={(event) => navigateFromRow(event, recordPath(record))}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                {link(record)}
                {warning(record)}
              </div>
              <div className="flex items-center gap-0.5">
                <Badge>{record.criticality}</Badge>
                <HelpTooltip label="Criticality">{mapHelp.criticality}</HelpTooltip>
              </div>
            </div>
            <p className="mt-2 break-words text-sm">
              {record.shortDescription}
            </p>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
              <dt className="text-suite-muted"><HelpLabel label="Site">{mapHelp.site}</HelpLabel></dt>
              <dd>{record.site}</dd>
              <dt className="text-suite-muted"><HelpLabel label="Status">{mapHelp.status}</HelpLabel></dt>
              <dd>{record.status}</dd>
              {showCreated && (
                <>
                  <dt className="text-suite-muted"><HelpLabel label="Created">{mapHelp.created}</HelpLabel></dt>
                  <dd>{formatDate(record.createdLabel)}</dd>
                </>
              )}
            </dl>
          </li>
        ))}
      </ul>
    </>
  )
}
