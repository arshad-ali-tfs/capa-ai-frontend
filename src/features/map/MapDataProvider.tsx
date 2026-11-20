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
import { navigateTo } from "@/shared/lib/navigation"
import type { MapDataset, MapRun, RecordAnnotation, ReviewDraft } from "./types"
const runFromLocation = () => new URLSearchParams(window.location.search).get("run") || ""
interface DataContext extends MapDataset {
  runs: MapRun[]
  runsError: string
  selectedRun: string
  selectRun: (run: string) => Promise<void>
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
  const [runs, setRuns] = useState<MapRun[]>([])
  const [runsError, setRunsError] = useState("")
  const [selectedRun, setSelectedRun] = useState(runFromLocation)
  const selectedRef = useRef(selectedRun)
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
  const load = useCallback(async (run: string, navigate = false, interrupt = false) => {
    if ((inFlight.current && !interrupt) || editingRef.current) return
    controller.current?.abort()
    inFlight.current = true
    setRefreshing(true)
    const abort = new AbortController()
    controller.current = abort
    const timeout = window.setTimeout(() => abort.abort(), 30000)
    try {
      // History failures must not hide an otherwise usable completed analysis.
      void mapService.listRuns(abort.signal).then((value) => {
        if (mounted.current && controller.current === abort) { setRuns(value); setRunsError("") }
      }).catch(() => {
        if (mounted.current && controller.current === abort && !abort.signal.aborted)
          setRunsError("Previous runs could not be loaded. Refresh to retry.")
      })
      const value = await mapService.loadDataset(abort.signal, run)
      if (
        mounted.current &&
        controller.current === abort &&
        !editingRef.current
      ) {
        setDataset(value)
        selectedRef.current = run
        setSelectedRun(run)
        setError("")
        setLastChecked(new Date().toISOString())
        if (navigate) navigateTo(`/map?${new URLSearchParams(run ? { run } : {}).toString()}`)
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
  const refresh = useCallback(() => load(runFromLocation()), [load])
  const selectRun = useCallback((run: string) => load(run, true), [load])
  useEffect(() => {
    mounted.current = true
    void refresh()
    const check = () => {
      if (document.visibilityState === "visible") void refresh()
    }
    const changedRun = () => {
      if (runFromLocation() !== selectedRef.current && !editingRef.current)
        void load(runFromLocation(), false, true)
    }
    const interval = window.setInterval(check, 60000)
    window.addEventListener("focus", check)
    window.addEventListener("popstate", changedRun)
    document.addEventListener("visibilitychange", check)
    return () => {
      mounted.current = false
      controller.current?.abort()
      controller.current = undefined
      inFlight.current = false
      window.clearInterval(interval)
      window.removeEventListener("focus", check)
      window.removeEventListener("popstate", changedRun)
      document.removeEventListener("visibilitychange", check)
    }
  }, [refresh, load])
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
        runs,
        runsError,
        selectedRun,
        selectRun,
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
