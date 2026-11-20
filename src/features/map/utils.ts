import { filterMapRecords, mapFilterOptions } from "./recordFilters"
import type { DeviationRecord, Filters, MapFilterKey } from "./types"
export const emptyMapFilters = (): Filters<MapFilterKey> => ({
  year: "All",
  criticality: "All",
  drType: "All",
  site: "All",
  department: "All",
  building: "All",
  room: "All",
  suite: "All",
  productionArea: "All",
  productionLine: "All",
  division: "All",
  capaLink: "All",
  capaStatus: "All",
  dueStatus: "All",
  clusterGroup: "All",
})
export const emptyOverviewFilters = emptyMapFilters
export const emptyDetailFilters = emptyMapFilters
export const filterRecords = filterMapRecords
export const unavailable = (value: string) =>
  !value.trim() ||
  ["not provided", "not available", "unavailable"].includes(value.toLowerCase())
export const getFilterOptions = mapFilterOptions
export const recordsForCluster = (source: DeviationRecord[], id: string) =>
  source.filter((item) => item.clusterId === id)
export const sumVolume = (source: DeviationRecord[]) =>
  source.reduce((total, item) => total + item.volume, 0)
export const isMajorCritical = (item: DeviationRecord) =>
  /\b(major|critical)\b/i.test(item.criticality)
export function meanSimilarity(source: DeviationRecord[]): number | null {
  const scored = source.filter(
    (item) => item.clusterId && item.similarity !== null,
  )
  const volume = sumVolume(scored)
  return volume
    ? scored.reduce(
        (total, item) => total + item.similarity! * item.volume,
        0,
      ) / volume
    : null
}
export const formatSimilarity = (value: number | null) =>
  value === null
    ? "Not available"
    : value > 0.9999 && value < 1
      ? ">99.99%"
      : `${(value * 100).toFixed(2)}%`
export function medianDaysOpen(source: DeviationRecord[]): number | string {
  const values = source
    .map((item) => item.daysOpen)
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b)
  if (!values.length) return "Not available"
  const middle = Math.floor(values.length / 2)
  return values.length % 2
    ? values[middle]
    : Math.round((values[middle - 1] + values[middle]) / 2)
}
export const monthTotals = (source: DeviationRecord[], months: string[]) =>
  months.map((month) => ({
    label: /^\d{4}-(0[1-9]|1[0-2])$/.test(month)
      ? new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" }).format(new Date(month + "-15T12:00:00"))
      : month,
    value: source.reduce(
      (total, item) => total + (item.monthCounts[month] ?? 0),
      0,
    ),
  }))
export function formatDate(value: string, withTime = false): string {
  if (!value || unavailable(value)) return "Not available"
  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? value + "T12:00:00" : value,
  )
  return Number.isNaN(date.getTime())
    ? "Not available"
    : new Intl.DateTimeFormat(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
        ...(withTime
          ? ({
              hour: "2-digit",
              minute: "2-digit",
              timeZoneName: "short",
            } as const)
          : {}),
      }).format(date)
}
export const recordPath = (record: DeviationRecord) =>
  record.clusterId
    ? `/map/clusters/${encodeURIComponent(record.clusterId)}/evidence/${encodeURIComponent(record.id)}`
    : `/map/records/${encodeURIComponent(record.id)}`
export const readMapFilters = (): Filters<MapFilterKey> => {
  const params = new URLSearchParams(window.location.search),
    filters = emptyMapFilters()
  for (const key of Object.keys(filters) as MapFilterKey[])
    filters[key] = params.get(key) || "All"
  filters.clusterGroup = params.get("clusterGroup") || params.get("theme") || "All"
  return filters
}
