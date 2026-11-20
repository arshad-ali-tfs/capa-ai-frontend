import { useEffect, useMemo, useState } from "react"
import { NotFoundScreen } from "@/shared/components"
import { setNavigationGuard } from "@/shared/lib/navigation"
import { MapDataProvider, useMapData } from "./MapDataProvider"
import { ClusterDetailScreen } from "./screens/ClusterDetailScreen"
import { EvidenceReviewScreen } from "./screens/EvidenceReviewScreen"
import { OverviewScreen } from "./screens/OverviewScreen"
import type { MapFilterKey, MapRoute } from "./types"
import { emptyMapFilters, readMapFilters } from "./utils"
import { useReviewDrafts } from "./useReviewDrafts"
export function MapRoutes({ route }: { route: MapRoute }) {
  return (
    <MapDataProvider>
      <MapContentBoundary route={route} />
    </MapDataProvider>
  )
}
function MapContentBoundary({ route }: { route: MapRoute }) {
  const { analysis } = useMapData()
  return <MapRouteContent key={analysis.runId} route={route} />
}
function MapRouteContent({ route }: { route: MapRoute }) {
  const { clusters, records, setEditing, selectedRun } = useMapData()
  const [filters, setFilters] = useState(readMapFilters)
  const review = useReviewDrafts()
  const busy = review.dirty || review.saving
  useEffect(() => {
    setEditing(busy)
    return () => setEditing(false)
  }, [busy, setEditing])
  useEffect(() => {
    if (!busy) return
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", beforeUnload)
    setNavigationGuard(
      (path) => {
        if (path.startsWith("/map"))
          return (new URL(path, window.location.origin).searchParams.get("run") || "") === selectedRun
        return window.confirm(
          review.saving
            ? "An annotation is still saving. Leave MAP?"
            : "Leave MAP and discard unsaved reviewer annotations?",
        )
      },
    )
    return () => {
      window.removeEventListener("beforeunload", beforeUnload)
      setNavigationGuard(null)
    }
  }, [busy, review.saving, selectedRun])
  useEffect(() => {
    setFilters(readMapFilters())
  }, [route])
  function change(key: MapFilterKey, value: string) {
    const next = { ...filters, [key]: value }
    update(next)
  }
  function update(next: typeof filters) {
    setFilters(next)
    const params = new URLSearchParams()
    const current=new URLSearchParams(window.location.search)
    for(const key of ["theme","review","sort","clusterView"]) if(current.has(key))params.set(key,current.get(key)!)
    if (selectedRun) params.set("run", selectedRun)
    for (const [key, value] of Object.entries(next))
      if (value !== "All") params.set(key, value)
    window.history.replaceState(
      {},
      "",
      window.location.pathname + (params.size ? "?" + params.toString() : ""),
    )
  }
  const clusterId =
    route.type === "cluster" || route.type === "evidence" ? route.clusterId : ""
  const cluster = useMemo(
    () => clusters.find((c) => c.id === clusterId),
    [clusters, clusterId],
  )
  const record =
    route.type === "evidence" || route.type === "record"
      ? records.find(
          (r) =>
            r.id === route.recordId &&
            (route.type === "record"
              ? true
              : r.clusterId === route.clusterId),
        )
      : undefined
  if (route.type === "overview")
    return (
      <OverviewScreen
        filters={filters}
        onFilterChange={change}
        onClear={() => update(emptyMapFilters())}
      />
    )
  if (route.type === "cluster" && cluster)
    return (
      <ClusterDetailScreen
        cluster={cluster}
        filters={filters}
        onFilterChange={change}
        onClear={() => update(emptyMapFilters())}
      />
    )
  if ((route.type === "evidence" || route.type === "record") && record)
    return (
      <EvidenceReviewScreen
        key={record.id}
        cluster={route.type==="record"?clusters.find(item=>item.id===record.clusterId):cluster}
        record={record}
        filters={filters}
        draft={review.drafts[record.id] ?? record.annotation}
        saving={review.saves[record.id]?.pending ?? false}
        saveError={review.saves[record.id]?.error ?? ""}
        onSave={() => void review.save(record)}
        onDraftChange={(value) => review.change(record.id, value)}
        onDraftReset={() => review.discard(record.id)}
      />
    )
  return (
    <NotFoundScreen message="This record or cluster is not part of the selected analysis. Return to the MAP overview to inspect the available records." />
  )
}
