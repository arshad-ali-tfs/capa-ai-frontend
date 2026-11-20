import { useEffect, useState } from "react"
import { matchService } from "../services/matchService"
import type { EvidenceOverview, SearchResult } from "../types"

export function useMatchOverview(result: SearchResult | null) {
  const [value, setValue] = useState<EvidenceOverview | null>(null)
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [error, setError] = useState("")
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    setValue(null); setError("")
    if (!result?.summaryId || !result.rows.length) { setState("idle"); return }
    const controller = new AbortController()
    setState("loading")
    matchService.getOverview(result, controller.signal).then(value => {
      if (!controller.signal.aborted) {setValue(value); setState("success")}
    }).catch(error => {
      if (!controller.signal.aborted) {setError(error instanceof Error ? error.message : "The evidence overview is unavailable."); setState("error")}
    })
    return () => controller.abort()
  }, [result, revision])
  return {value: value?.searchId === result?.summaryId ? value : null, state, error, retry: () => setRevision(value => value + 1)}
}
