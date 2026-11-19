import { AppLink, Badge, EmptyState } from "@/shared/components"
import { navigateFromRow } from "@/shared/lib/navigation"
import type { DeviationRecord } from "../types"
import { formatDate, recordPath } from "../utils"
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
      <span
        className="mt-1 block text-xs font-bold text-warn-ink"
        title={record.warnings.join(" ")}
      >
        {record.clusterId ? "Needs review" : "Unassigned"}
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
            <th scope="col" className="w-[16%]">
              Record ID
            </th>
            <th scope="col" className="w-[18%]">
              Site
            </th>
            <th scope="col" className="w-[14%]">
              Criticality
            </th>
            <th scope="col" className="w-[17%]">
              Status
            </th>
            <th scope="col">{showCreated ? "Created" : "Short description"}</th>
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
              <Badge>{record.criticality}</Badge>
            </div>
            <p className="mt-2 break-words text-sm">
              {record.shortDescription}
            </p>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
              <dt className="text-suite-muted">Site</dt>
              <dd>{record.site}</dd>
              <dt className="text-suite-muted">Status</dt>
              <dd>{record.status}</dd>
              {showCreated && (
                <>
                  <dt className="text-suite-muted">Created</dt>
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
