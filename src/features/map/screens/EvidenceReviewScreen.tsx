import { useRef } from "react"
import { Badge, DisclosurePanel, PageHeading, Panel } from "@/shared/components"
import type {
  Cluster,
  DeviationRecord,
  Filters,
  MapFilterKey,
  ReviewDraft,
} from "../types"
import { filterRecords, formatDate, recordsForCluster } from "../utils"
import { GuidedWorkspace } from "../components/GuidedWorkspace"
import { AnalysisStatus } from "../components/AnalysisStatus"
import { RecordList } from "../components/RecordList"
import { SourceReader } from "../components/SourceReader"
import { ReviewerAnnotation } from "../components/ReviewerAnnotation"
import { useMapData } from "../MapDataProvider"
export function EvidenceReviewScreen({
  cluster,
  record,
  filters,
  draft,
  saving,
  saveError,
  onSave,
  onDraftChange,
  onDraftReset,
}: {
  cluster?: Cluster
  record: DeviationRecord
  filters: Filters<MapFilterKey>
  draft: ReviewDraft
  saving: boolean
  saveError: string
  onSave: () => void
  onDraftChange: (draft: ReviewDraft) => void
  onDraftReset: () => void
}) {
  const { records } = useMapData()
  const related = cluster
    ? filterRecords(recordsForCluster(records, cluster.id), filters).filter(
        (r) => r.id !== record.id,
      )
    : []
  const sourceRef = useRef<HTMLDivElement>(null)
  const reviewRef = useRef<HTMLDivElement>(null)
  function focusPanel(element: HTMLDivElement | null) {
    element?.scrollIntoView({ block: "start" })
    element?.focus({ preventScroll: true })
  }
  return (
    <>
      <PageHeading
        title={`Evidence review · ${record.id}`}
        subtitle={
          cluster
            ? "Review the source record in the context of its assigned cluster."
            : "Inspect this unassigned source record and record your assessment."
        }
        status="Source record"
        breadcrumbs={[
          { label: "Cluster overview", href: "/map" },
          ...(cluster
            ? [
                {
                  label: `Cluster ${cluster.id}`,
                  href: `/map/clusters/${cluster.id}`,
                },
              ]
            : []),
          { label: record.id },
        ]}
      />
      <AnalysisStatus />
      <GuidedWorkspace step={3} clusterId={cluster?.id} recordId={record.id}>
        <section className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-suite-line bg-white p-4">
          <div>
            <h2 className="text-xl font-bold">{record.id}</h2>
            <p className="mt-1 text-xs text-suite-muted">
              Deviation record · source fields
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{record.site}</Badge>
            <Badge tone="amber">{record.criticality}</Badge>
            <Badge>{record.status}</Badge>
            <span className="text-xs">Opened {formatDate(record.opened)}</span>
          </div>
        </section>
        {record.warnings.length > 0 && (
          <section
            aria-label="Record warnings"
            className="rounded-lg border border-[#efd99d] bg-warn-wash p-4 text-sm text-warn-ink"
          >
            <h2 className="font-bold">Needs review</h2>
            <ul className="mt-2 list-inside list-disc space-y-1">
              {record.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </section>
        )}
        <section aria-label="Evidence workspace" className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
          <SourceReader record={record} containerRef={sourceRef} onReview={() => focusPanel(reviewRef.current)} />
          <aside aria-label="Review context" className="map-review-sidebar min-w-0 space-y-4 self-start">
            <Panel
              title={
                cluster ? "Matching details" : "Assignment context"
              }
              help="Similarity signals support inspection; they do not prove correctness."
            >
              <div className="flex flex-wrap gap-2">
                <Badge tone="amber">INTERPRETATION · reviewer aid</Badge>
                <Badge tone={cluster ? "green" : "neutral"}>
                  {cluster ? `Cluster ${cluster.id}` : "Unassigned record"}
                </Badge>
              </div>
              <ul className="mt-3 space-y-3 text-sm leading-relaxed">
                {record.matchSignals.map((signal) => (
                  <li key={signal}>{signal}</li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-suite-muted">
                Cluster membership does not establish root cause, severity or
                product impact.
              </p>
            </Panel>
            <div ref={reviewRef} tabIndex={-1} className="scroll-mt-4 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
              <ReviewerAnnotation
                record={record}
                draft={draft}
                saving={saving}
                saveError={saveError}
                onSave={onSave}
                onDraftChange={onDraftChange}
                onDraftReset={onDraftReset}
                onReadSource={() => focusPanel(sourceRef.current)}
              />
            </div>
          </aside>
        </section>
        {cluster && (
          <DisclosurePanel
            title="Other records in this cluster"
            help="Other source records within the same filters."
          >
            <RecordList records={related} showCreated />
          </DisclosurePanel>
        )}
      </GuidedWorkspace>
    </>
  )
}
