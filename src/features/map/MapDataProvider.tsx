import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { mapService } from "./services/mapService"
import type { MapDataset, RecordAnnotation, ReviewDraft } from "./types"
interface DataContext extends MapDataset {
  refresh: () => Promise<void>
  refreshing: boolean
  refreshError: string
  lastChecked: string
  setEditing: (editing: boolean) => void
  editing: boolean
  saveAnnotation: (
    id: string,
    draft: ReviewDraft,
    revision: number,
  ) => Promise<RecordAnnotation>
}
const MapDataContext = createContext<DataContext | null>(null)
export function MapDataProvider({ children }: { children: ReactNode }) {
  const [dataset, setDataset] = useState<MapDataset | null>(null)
  const [error, setError] = useState("")
  const [refreshing, setRefreshing] = useState(false)
  const [lastChecked, setLastChecked] = useState("")
  const [editing, setEditingState] = useState(false)
  const editingRef = useRef(false),
    inFlight = useRef(false),
    mounted = useRef(false)
  const controller = useRef<AbortController>()
  const setEditing = useCallback((value: boolean) => {
    editingRef.current = value
    setEditingState(value)
  }, [])
  const refresh = useCallback(async () => {
    if (inFlight.current || editingRef.current) return
    inFlight.current = true
    setRefreshing(true)
    const abort = new AbortController()
    controller.current = abort
    const timeout = window.setTimeout(() => abort.abort(), 30000)
    try {
      const value = await mapService.loadDataset(abort.signal)
      if (
        mounted.current &&
        controller.current === abort &&
        !editingRef.current
      ) {
        setDataset(value)
        setError("")
        setLastChecked(new Date().toISOString())
      }
    } catch (failure) {
      if (mounted.current && controller.current === abort)
        setError(
          failure instanceof DOMException && failure.name === "AbortError"
            ? "MAP took too long to respond. Please retry."
            : failure instanceof Error
              ? failure.message
              : "Unable to load MAP data.",
        )
    } finally {
      window.clearTimeout(timeout)
      if (controller.current === abort) {
        inFlight.current = false
        if (mounted.current) setRefreshing(false)
      }
    }
  }, [])
  useEffect(() => {
    mounted.current = true
    void refresh()
    const check = () => {
      if (document.visibilityState === "visible") void refresh()
    }
    const interval = window.setInterval(check, 60000)
    window.addEventListener("focus", check)
    document.addEventListener("visibilitychange", check)
    return () => {
      mounted.current = false
      controller.current?.abort()
      controller.current = undefined
      inFlight.current = false
      window.clearInterval(interval)
      window.removeEventListener("focus", check)
      document.removeEventListener("visibilitychange", check)
    }
  }, [refresh])
  async function saveAnnotation(
    id: string,
    draft: ReviewDraft,
    revision: number,
  ) {
    if (!dataset) throw new Error("No analysis is loaded.")
    const run = dataset.analysis.runId
    const annotation = await mapService.saveAnnotation(run, id, draft, revision)
    setDataset((current) =>
      current?.analysis.runId === run
        ? {
            ...current,
            records: current.records.map((record) =>
              record.id === id ? { ...record, annotation } : record,
            ),
          }
        : current,
    )
    return annotation
  }
  if (!dataset)
    return error ? (
      <section
        className="rounded-xl border border-[#efc4b5] bg-[#fff7f3] p-5"
        role="alert"
      >
        <h1 className="text-lg font-bold">Cluster data unavailable</h1>
        <p className="mt-2 text-sm">{error}</p>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={refreshing}
          className="map-secondary mt-4"
        >
          {refreshing ? "Retrying…" : "Try again"}
        </button>
      </section>
    ) : (
      <section
        className="rounded-xl border border-suite-line bg-white p-5"
        role="status"
        aria-busy="true"
      >
        <p className="text-sm font-bold">Loading MAP analysis…</p>
        <div className="mt-4 h-32 animate-pulse rounded-lg bg-suite-surface" />
      </section>
    )
  return (
    <MapDataContext.Provider
      value={{
        ...dataset,
        refresh,
        refreshing,
        refreshError: error,
        lastChecked,
        editing,
        setEditing,
        saveAnnotation,
      }}
    >
      {children}
    </MapDataContext.Provider>
  )
}
export function useMapData() {
  const value = useContext(MapDataContext)
  if (!value) throw new Error("MAP data provider is required")
  return value
}
