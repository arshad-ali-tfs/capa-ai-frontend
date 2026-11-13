import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { mapService } from "./services/mapService"
import type { MapDataset } from "./types"

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready"
      dataset: MapDataset
    }

const MapDataContext = createContext<MapDataset | null>(null)

export function MapDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LoadState>({ status: "loading" })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    setState({ status: "loading" })
    mapService
      .loadDataset()
      .then((dataset) => {
        if (active) setState({ status: "ready", dataset })
      })
      .catch((error: unknown) => {
        if (!active) return
        setState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unable to load cluster data.",
        })
      })
    return () => {
      active = false
    }
  }, [attempt])

  if (state.status === "loading") {
    return (
      <section
        className="rounded-xl border border-suite-line bg-white p-5"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="h-4 w-48 animate-pulse rounded bg-suite-line-soft" />
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-24 animate-pulse rounded-lg bg-suite-surface"
            />
          ))}
        </div>
      </section>
    )
  }

  if (state.status === "error") {
    return (
      <section
        className="rounded-xl border border-[#efc4b5] bg-[#fff7f3] p-5"
        role="alert"
      >
        <p className="text-sm font-bold text-[#8c2f12]">
          Cluster data unavailable
        </p>
        <p className="mt-1 text-xs leading-relaxed text-[#70402f]">
          {state.message}
        </p>
        <button
          type="button"
          onClick={() => setAttempt((value) => value + 1)}
          className="mt-3 rounded-lg border border-brand bg-white px-3 py-2 text-xs font-bold text-brand outline-none hover:bg-brand-wash focus-visible:ring-2 focus-visible:ring-brand"
        >
          Try again
        </button>
      </section>
    )
  }

  return (
    <MapDataContext.Provider value={state.dataset}>
      {children}
    </MapDataContext.Provider>
  )
}

export function useMapData(): MapDataset {
  const dataset = useContext(MapDataContext)
  if (!dataset) {
    throw new Error("useMapData must be used inside <MapDataProvider>")
  }
  return dataset
}
