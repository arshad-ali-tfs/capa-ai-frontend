import { useEffect, useState } from "react"
import { matchService } from "../services/matchService"
import { dateError, filterKey } from "../searchModel"
import type { FilterOptions, MatchFilters } from "../types"

export function useMatchFilters(site: string, filters: MatchFilters, snapshotId?: string, enabled = true) {
  const [info, setInfo] = useState<FilterOptions | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [revision, setRevision] = useState(0)
  const key = filterKey(filters)
  useEffect(() => {
    if (!enabled) { setLoading(true); return }
    if (dateError(filters)) { setLoading(false); setError(""); return }
    const controller = new AbortController()
    setLoading(true)
    setError("")
    const timer = window.setTimeout(() => {
      matchService.getFilterOptions(site, filters, controller.signal).then(value => {
        if (controller.signal.aborted) return
        if (snapshotId && value.snapshotId !== snapshotId) throw new Error("The source index changed. Reload MATCH to refresh its filter options.")
        setInfo(value)
      }).catch(error => {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Filter counts are unavailable.")
      }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    }, 200)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [site, key, snapshotId, revision, enabled])
  return { info, loading, error, retry: () => setRevision(value => value + 1) }
}
