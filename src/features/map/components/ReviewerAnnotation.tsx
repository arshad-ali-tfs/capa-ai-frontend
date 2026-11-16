import { cx } from "@/shared/lib/classNames"
import { Panel } from "@/shared/components"
import type { DeviationRecord, ReviewDraft } from "../types"
import { formatDate } from "../utils"

const options = [
  { label: "Supports pattern", tone: "bg-[#e3f5eb] text-[#14734a]" },
  { label: "Mixed / unclear", tone: "bg-warn-wash text-warn-ink" },
  { label: "Does not support", tone: "bg-suite-hover text-suite-slate" },
  { label: "Insufficient information", tone: "bg-suite-info-wash text-suite-blue" },
]
export function ReviewerAnnotation({
  record, draft, saving, saveError, onSave, onDraftChange, onDraftReset, onReadSource,
}: {
  record: DeviationRecord
  draft: ReviewDraft
  saving: boolean
  saveError: string
  onSave: () => void
  onDraftChange: (draft: ReviewDraft) => void
  onDraftReset: () => void
  onReadSource: () => void
}) {
  const dirty = draft.assessment !== record.annotation.assessment || draft.note !== record.annotation.note
  return (
    <Panel
      title="Reviewer annotation"
      help="Saved against this record and analysis. This does not approve an assignment or change the QMS."
    >
      <div className="mb-3 lg:hidden">
        <button type="button" onClick={onReadSource} className="min-h-9 rounded-sm text-xs font-bold text-suite-blue underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-brand">Back to source ↑</button>
      </div>
      <fieldset disabled={saving}>
        <legend className="sr-only">Reviewer assessment</legend>
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <label key={option.label} className="cursor-pointer">
              <input
                type="radio"
                name={`assessment-${record.id}`}
                value={option.label}
                checked={draft.assessment === option.label}
                onChange={() =>
                  onDraftChange({ ...draft, assessment: option.label })
                }
                className="peer sr-only"
              />
              <span
                className={cx(
                  "inline-flex min-h-10 items-center rounded-lg border px-3 py-2 text-xs font-bold peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-2",
                  option.tone,
                  draft.assessment === option.label
                    ? "border-current shadow-sm ring-1 ring-current"
                    : "border-transparent",
                )}
              >
                {option.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="mt-4 block">
        <span className="text-sm font-bold">Reviewer note</span>
        <textarea
          aria-label="Reviewer note"
          value={draft.note}
          onChange={(event) =>
            onDraftChange({ ...draft, note: event.target.value })
          }
          rows={4}
          maxLength={10000}
          disabled={saving}
          placeholder="Add an annotation about the pattern relationship…"
          className="mt-2 w-full resize-y rounded-lg border border-suite-line-field bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        />
      </label>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="map-primary"
          onClick={onSave}
          disabled={saving || !dirty}
        >
          {saving ? "Saving…" : "Save annotation"}
        </button>
        {dirty && (
          <button
            type="button"
            className="map-secondary"
            disabled={saving}
            onClick={onDraftReset}
          >
            Discard changes
          </button>
        )}
        <p role="status" className="text-xs text-suite-muted">
          {saving
            ? "Saving your annotation…"
            : dirty
              ? "Unsaved changes"
              : record.annotation.savedAt
                ? `Saved ${formatDate(record.annotation.savedAt, true)} · Revision ${record.annotation.revision}`
                : "No annotation saved yet"}
        </p>
      </div>
      {saveError && (
        <p role="alert" className="mt-3 text-sm text-[#8c2f12]">
          {saveError} Your unsaved changes are retained. If another reviewer
          updated this record, discard your local changes and refresh before
          trying again.
        </p>
      )}
    </Panel>
  )
}
