import { cx } from "@/shared/lib/classNames"
import { navigateTo } from "@/shared/lib/navigation"
import {
  Badge,
  DisclosurePanel,
  EmptyState,
  PageHeading,
  Panel,
  TableButton,
} from "@/shared/components"
import {
  type Cluster,
  type DeviationRecord,
  type ReviewDraft,
} from "@/features/map/types"
import { recordsForCluster } from "@/features/map/utils"
import { GuidedWorkspace } from "@/features/map/components/GuidedWorkspace"
import { PatternNotice } from "@/features/map/components/PatternNotice"
import { useMapData } from "@/features/map/MapDataProvider"

const reviewerOptions = [
  { value: "Supports pattern", tone: "green" as const },
  { value: "Mixed / unclear", tone: "amber" as const },
  { value: "Does not support", tone: "neutral" as const },
  { value: "Insufficient information", tone: "blue" as const },
]

export function EvidenceReviewScreen({
  cluster,
  record,
  draft,
  onDraftChange,
}: {
  cluster: Cluster
  record: DeviationRecord
  draft: ReviewDraft
  onDraftChange: (draft: ReviewDraft) => void
}) {
  const { records } = useMapData()
  const related = recordsForCluster(records, cluster.id).filter(
    (item) => item.id !== record.id,
  )
  return (
    <>
      <PageHeading
        title={`Evidence review • ${record.id}`}
        subtitle="Review the source record in the context of its assigned cluster."
        status="Source record"
        breadcrumbs={[
          { label: "Global cluster overview", href: "/map" },
          {
            label: `Cluster ${cluster.id}`,
            href: `/map/clusters/${cluster.id}`,
          },
          { label: record.id },
        ]}
      />
      <GuidedWorkspace step={3} clusterId={cluster.id} recordId={record.id}>
        <PatternNotice />
        <section className="flex flex-col gap-4 rounded-xl border border-suite-line bg-white p-4 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold">{record.id}</h2>
            <p className="mt-1 text-xs text-suite-muted">
              Deviation record • source fields
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge>{record.site}</Badge>
            <Badge tone="amber">{record.criticality}</Badge>
            <Badge tone="green">{record.status}</Badge>
            <span className="text-xs font-bold">
              Opened {record.createdLabel}
            </span>
          </div>
        </section>
        <section className="grid min-w-0 grid-cols-1 gap-3.5 xl:grid-cols-[1.5fr_1fr]">
          <Panel
            title="Source narrative"
            help="Source text remains distinct from interpretation."
            className="min-h-[355px]"
          >
            <div className="mb-2">
              <Badge tone="blue">SOURCE • record text</Badge>
            </div>
            <Badge>{record.sourceField}</Badge>
            <blockquote className="mt-4 max-w-4xl text-[15px] leading-relaxed">
              {record.sourceNarrative}
            </blockquote>
            <p className="mt-14 text-[11px] text-suite-muted">
              Source: Quality reporting dataset • Field: {record.sourceField} •
              Record ID: {record.id}
            </p>
          </Panel>
          <Panel
            title="Why this record appears here"
            help="Pattern signals for reviewer inspection."
            className="min-h-[355px]"
          >
            <div className="flex flex-wrap gap-2">
              <Badge tone="amber">INTERPRETATION • reviewer aid</Badge>
              <Badge tone="green">Cluster {cluster.id}</Badge>
            </div>
            <ul className="mt-3 space-y-4 text-[13px]">
              {record.matchSignals.map((signal) => (
                <li key={signal}>{signal}</li>
              ))}
            </ul>
            <p className="mt-6 text-xs font-bold text-warn-ink">
              Cluster membership does not establish causality, severity, or
              product impact.
            </p>
          </Panel>
        </section>
        <Panel
          title="Reviewer annotation"
          help="Choose how this record relates to the cluster pattern. This is a review annotation, not a quality disposition."
        >
          <fieldset>
            <legend className="sr-only">Reviewer assessment</legend>
            <div className="flex flex-wrap gap-2.5">
              {reviewerOptions.map((option) => (
                <label key={option.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name={`assessment-${record.id}`}
                    value={option.value}
                    checked={draft.assessment === option.value}
                    onChange={() =>
                      onDraftChange({ ...draft, assessment: option.value })
                    }
                    className="peer sr-only"
                  />
                  <span
                    className={cx(
                      "inline-flex rounded-xl border-2 border-transparent px-2.5 py-1.5 text-[11px] font-bold outline-none transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-2",
                      option.tone === "green" && "bg-[#e3f5eb] text-[#14734a]",
                      option.tone === "amber" && "bg-warn-wash text-warn-ink",
                      option.tone === "neutral" &&
                        "bg-suite-hover text-suite-ink",
                      option.tone === "blue" &&
                        "bg-suite-info-wash text-suite-blue",
                      draft.assessment === option.value &&
                        "border-brand shadow-sm",
                    )}
                  >
                    {option.value}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="mt-4 block max-w-3xl">
            <span className="text-xs font-bold text-suite-muted">
              Reviewer note
            </span>
            <textarea
              aria-label="Reviewer note"
              value={draft.note}
              onChange={(event) =>
                onDraftChange({ ...draft, note: event.target.value })
              }
              rows={3}
              placeholder="Add a draft annotation about the pattern relationship…"
              className="mt-1.5 w-full resize-y rounded-lg border border-suite-line-field bg-white px-3 py-2 text-[13px] outline-none placeholder:text-[#9aa4b2] focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </label>
          <p className="mt-2 text-[11px] text-suite-muted">
            Draft annotation only • not saved, submitted, approved, or written
            to a QMS.
          </p>
        </Panel>
        <DisclosurePanel
          title="Other records in this cluster"
          help="Optional comparison • open to inspect other source records."
        >
          {related.length ? (
            <div className="overflow-x-auto">
              <div className="min-w-[720px]">
                <div className="grid grid-cols-[1.1fr_1fr_1fr_1fr_1.4fr] gap-2 rounded-md bg-suite-hover p-2 text-[11px] font-bold text-suite-muted">
                  <span>Record ID</span>
                  <span>Site</span>
                  <span>Criticality</span>
                  <span>Status</span>
                  <span>Created</span>
                </div>
                <div className="mt-1 space-y-0.5">
                  {related.map((item) => (
                    <TableButton
                      key={item.id}
                      onClick={() =>
                        navigateTo(
                          `/map/clusters/${cluster.id}/evidence/${item.id}`,
                        )
                      }
                      ariaLabel={`Open evidence review for ${item.id}`}
                    >
                      <span className="grid grid-cols-[1.1fr_1fr_1fr_1fr_1.4fr] gap-2 px-2 py-2.5 text-xs text-suite-muted">
                        <span className="font-bold text-suite-ink">
                          {item.id}
                        </span>
                        <span>{item.site}</span>
                        <span>{item.criticality}</span>
                        <span>{item.status}</span>
                        <span>{item.createdLabel}</span>
                      </span>
                    </TableButton>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <EmptyState message="No other records are assigned to this cluster." />
          )}
        </DisclosurePanel>
      </GuidedWorkspace>
    </>
  )
}
