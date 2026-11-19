import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { matchService } from "../services/matchService"
import type { DetailState, IndexInfo, IndexState, MatchRow, RecordDetail, SearchResult, SearchState } from "../types"

const messageOf = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback

export function useMatchSearch() {
  const [searchState, setSearchState] = useState<SearchState>("idle")
  const [searchError, setSearchError] = useState("")
  const [result, setResult] = useState<SearchResult | null>(null)
  const [selectedId, setSelectedId] = useState("")
  const [detailState, setDetailState] = useState<DetailState>("idle")
  const [detailError, setDetailError] = useState("")
  const [recordDetail, setRecordDetail] = useState<RecordDetail | null>(null)
  const [indexState, setIndexState] = useState<IndexState>("loading")
  const [indexInfo, setIndexInfo] = useState<IndexInfo | null>(null)
  const searchRequest = useRef<AbortController | null>(null)
  const detailRequest = useRef<AbortController | null>(null)
  const selected = useMemo(() => result?.rows.find(row => row.deviationId === selectedId), [result, selectedId])

  useEffect(() => {
    const controller = new AbortController()
    matchService.getIndexInfo(controller.signal).then(info => {
      if (!controller.signal.aborted) { setIndexInfo(info); setIndexState("success") }
    }).catch(() => { if (!controller.signal.aborted) setIndexState("error") })
    return () => controller.abort()
  }, [])
  useEffect(() => () => { searchRequest.current?.abort(); detailRequest.current?.abort() }, [])

  const loadRecord = useCallback(async (row: MatchRow) => {
    detailRequest.current?.abort()
    const controller = new AbortController()
    detailRequest.current = controller
    setRecordDetail(null)
    setDetailError("")
    setDetailState("loading")
    try {
      const detail = await matchService.getRecord(row, controller.signal)
      if (controller.signal.aborted) return
      setRecordDetail(detail)
      setDetailState("success")
    } catch (error) {
      if (controller.signal.aborted) return
      setDetailError(messageOf(error, "The record details could not be loaded."))
      setDetailState("error")
    }
  }, [])

  const search = useCallback(async (query: string, site: string, topK: number) => {
    const text = query.trim()
    if (text.length < 8 || text.length > 30000) return
    searchRequest.current?.abort()
    detailRequest.current?.abort()
    const controller = new AbortController()
    searchRequest.current = controller
    setSearchState("loading")
    setSearchError("")
    setResult(null)
    setSelectedId("")
    setDetailState("idle")
    setDetailError("")
    setRecordDetail(null)
    try {
      const result = await matchService.search(text, site, topK, controller.signal)
      if (controller.signal.aborted) return
      setResult(result)
      setSearchState(result.rows.length ? "success" : "empty")
    } catch (error) {
      if (controller.signal.aborted) return
      setSearchError(messageOf(error, "The search request could not be completed."))
      setSearchState("error")
    }
  }, [])
  const select = useCallback((row: MatchRow) => { setSelectedId(row.deviationId); return loadRecord(row) }, [loadRecord])
  const retryDetail = useCallback(() => { if (selected) void loadRecord(selected) }, [selected, loadRecord])
  return { searchState, searchError, result, selected, selectedId, detailState, detailError, recordDetail, indexState, indexInfo, search, select, retryDetail }
}
