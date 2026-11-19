const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T ])/

export function criticalityTone(
  criticality: string,
): "amber" | "blue" | "neutral" {
  const value = criticality.trim().toLowerCase()
  if (value === "critical" || value === "major") return "amber"
  if (value === "minor") return "blue"
  return "neutral"
}

export function statusTone(status: string): "green" | "neutral" {
  return status.trim().toLowerCase() === "closed" ? "green" : "neutral"
}

/** "2026-09-18" or "2026-09-18T10:00:00Z" becomes "18 Sep 2026"; other text is kept. */
export function formatOpenedDate(value: string): string {
  const match = ISO_DATE.exec(value.trim())
  if (!match) return value
  const month = MONTHS[Number(match[2]) - 1]
  if (!month) return value
  return `${match[3]} ${month} ${match[1]}`
}

export function wordCount(text: string): number {
  const trimmed = text.trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}

export function matchesLabel(shown: number, total: number): string {
  const noun = (count: number) => (count === 1 ? "match" : "matches")
  return total > shown
    ? `Showing ${shown} of ${total} ${noun(total)}`
    : `${shown} ${noun(shown)} returned`
}

export function siteLine(row: {
  site: string
  openedDate: string
}): string {
  return [
    row.site,
    row.openedDate ? formatOpenedDate(row.openedDate) : "",
  ]
    .filter(Boolean)
    .join(" • ")
}
