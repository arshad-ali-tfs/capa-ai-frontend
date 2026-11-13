import {
  type DetailFilterKey,
  type DeviationRecord,
  type Filters,
  type OverviewFilterKey,
} from "@/features/map/types"

export const emptyOverviewFilters = (): Filters<OverviewFilterKey> => ({
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
})

export const emptyDetailFilters = (): Filters<DetailFilterKey> => ({
  division: "All",
  site: "All",
  year: "All",
  department: "All",
})

export const filterRecords = <K extends string>(
  source: DeviationRecord[],
  filters: Filters<K>,
): DeviationRecord[] =>
  source.filter((item) =>
    Object.entries(filters).every(
      ([key, selected]) =>
        selected === "All" ||
        String(item[key as keyof DeviationRecord]) === selected,
    ),
  )

export const getFilterOptions = (
  source: DeviationRecord[],
  key: OverviewFilterKey | DetailFilterKey,
): string[] =>
  Array.from(new Set(source.map((item) => String(item[key])))).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  )

export const recordsForCluster = (
  source: DeviationRecord[],
  clusterId: string,
): DeviationRecord[] => source.filter((item) => item.clusterId === clusterId)

export const sumVolume = (source: DeviationRecord[]): number =>
  source.reduce((total, item) => total + item.volume, 0)

export const medianDaysOpen = (source: DeviationRecord[]): number | string => {
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

export const monthTotals = (
  source: DeviationRecord[],
  months: string[],
): {
  label: string
  value: number
}[] =>
  months.map((month) => ({
    label: month,
    value: source.reduce(
      (total, item) => total + (item.monthCounts[month] ?? 0),
      0,
    ),
  }))
