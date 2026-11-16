import { useRef, useState } from "react"
import { useMapData } from "./MapDataProvider"
import type { DeviationRecord, ReviewDraft } from "./types"

// Review state outlives individual evidence screens, including pending requests.
export function useReviewDrafts() {
  const { records, saveAnnotation } = useMapData()
  const [drafts, setDrafts] = useState<Record<string, ReviewDraft>>({})
  const [saves, setSaves] = useState<
    Record<string, { pending: boolean; error: string }>
  >({})
  const inFlight = useRef(new Set<string>())
  const dirty = records.some(
    (record) =>
      drafts[record.id] &&
      (drafts[record.id].assessment !== record.annotation.assessment ||
        drafts[record.id].note !== record.annotation.note),
  )
  const saving = Object.values(saves).some((save) => save.pending)

  function change(id: string, value: ReviewDraft) {
    setDrafts((current) => ({ ...current, [id]: value }))
  }
  function discard(id: string) {
    if (inFlight.current.has(id)) return
    setDrafts((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
    setSaves((current) => ({ ...current, [id]: { pending: false, error: "" } }))
  }
  async function save(record: DeviationRecord) {
    if (inFlight.current.has(record.id)) return
    const draft = drafts[record.id] ?? record.annotation
    const submitted = { assessment: draft.assessment, note: draft.note }
    inFlight.current.add(record.id)
    setSaves((current) => ({
      ...current,
      [record.id]: { pending: true, error: "" },
    }))
    let error = ""
    try {
      await saveAnnotation(record.id, submitted, record.annotation.revision)
      setDrafts((current) => {
        const latest = current[record.id]
        // A response may clear only the draft it actually saved.
        if (
          !latest ||
          latest.assessment !== submitted.assessment ||
          latest.note !== submitted.note
        ) return current
        const next = { ...current }
        delete next[record.id]
        return next
      })
    } catch (failure) {
      error = failure instanceof Error ? failure.message : "Unable to save this annotation."
    } finally {
      inFlight.current.delete(record.id)
      setSaves((current) => ({
        ...current,
        [record.id]: { pending: false, error },
      }))
    }
  }
  return { drafts, saves, dirty, saving, change, discard, save }
}
