import { useEffect, useMemo, useState } from "react"
import { NotFoundScreen } from "@/shared/components"
import { MapDataProvider, useMapData } from "./MapDataProvider"
import { ClusterDetailScreen } from "./screens/ClusterDetailScreen"
import { EvidenceReviewScreen } from "./screens/EvidenceReviewScreen"
import { OverviewScreen } from "./screens/OverviewScreen"
import {
  type DetailFilterKey,
  type Filters,
  type MapRoute,
  type OverviewFilterKey,
  type ReviewDraft,
} from "./types"
import { emptyDetailFilters, emptyOverviewFilters } from "./utils"

export function MapRoutes({ route }: { route: MapRoute }) {
  return (
    <MapDataProvider>
      <MapRouteContent route={route} />
    </MapDataProvider>
  )
}

function MapRouteContent({ route }: { route: MapRoute }) {
  const { clusters, records } = useMapData()
  const [overviewFilters, setOverviewFilters] = useState(emptyOverviewFilters)
  const [detailFilters, setDetailFilters] =
    useState<Filters<DetailFilterKey>>(emptyDetailFilters)
  const [drafts, setDrafts] = useState<Record<string, ReviewDraft>>({})

  const clusterId = route.type === "overview" ? "" : route.clusterId

  useEffect(() => {
    setDetailFilters(emptyDetailFilters())
  }, [clusterId])

  const cluster = useMemo(
    () => clusters.find((item) => item.id === clusterId),
    [clusters, clusterId],
  )
  const record = useMemo(
    () =>
      route.type === "evidence"
        ? records.find(
            (item) =>
              item.id === route.recordId && item.clusterId === route.clusterId,
          )
        : undefined,
    [records, route],
  )

  if (route.type === "overview") {
    return (
      <OverviewScreen
        filters={overviewFilters}
        onFilterChange={(key: OverviewFilterKey, value: string) =>
          setOverviewFilters((current) => ({ ...current, [key]: value }))
        }
        onClear={() => setOverviewFilters(emptyOverviewFilters())}
      />
    )
  }

  if (route.type === "cluster" && cluster) {
    return (
      <ClusterDetailScreen
        cluster={cluster}
        filters={detailFilters}
        onFilterChange={(key, value) =>
          setDetailFilters((current) => ({ ...current, [key]: value }))
        }
        onClear={() => setDetailFilters(emptyDetailFilters())}
      />
    )
  }

  if (route.type === "evidence" && cluster && record) {
    const draft = drafts[record.id] ?? { assessment: "", note: "" }
    return (
      <EvidenceReviewScreen
        cluster={cluster}
        record={record}
        draft={draft}
        onDraftChange={(nextDraft) =>
          setDrafts((current) => ({ ...current, [record.id]: nextDraft }))
        }
      />
    )
  }

  return (
    <NotFoundScreen message="The requested cluster or record could not be found. It may have been removed or the link may be incorrect." />
  )
}
