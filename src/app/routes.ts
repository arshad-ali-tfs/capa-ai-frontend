import type { MapRoute } from "@/features/map/types"

export type Route = { type: "landing" } | MapRoute | { type: "not-found" }

export function parseRoute(pathname: string): Route {
  const parts = pathname.split("/").filter(Boolean)
  const [first, second, clusterId, section, recordId] = parts

  if (!first || first === "home") return { type: "landing" }
  if (first === "overview") return { type: "overview" }
  if (first !== "map") return { type: "not-found" }

  if (parts.length === 1) return { type: "overview" }
  if (second === "records" && clusterId && parts.length === 3)
    return { type: "record", recordId: clusterId }
  if (second !== "clusters" || !clusterId) return { type: "not-found" }
  if (parts.length === 3) return { type: "cluster", clusterId }
  if (section === "evidence" && recordId && parts.length === 5) {
    return { type: "evidence", clusterId, recordId }
  }
  return { type: "not-found" }
}
