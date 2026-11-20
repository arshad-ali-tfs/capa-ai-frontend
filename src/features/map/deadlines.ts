import type { DeviationRecord } from "./types"

export const dueStatusLabels = {
  closed_on_time: "Closed on time",
  closed_late: "Closed late",
  open_overdue: "Open overdue",
  open_within_due: "Open within due date",
  cancelled: "Cancelled",
  unavailable: "Not available",
} as const
export type DueStatus = keyof typeof dueStatusLabels

export function onTimeClosureMetrics(records: DeviationRecord[]) {
  const levels = ["Minor", "Major", "Critical"] as const
  const eligible = records.filter(row => row.dueStatus === "closed_on_time" || row.dueStatus === "closed_late")
  return {
    total: records.length,
    eligible: eligible.length,
    onTime: eligible.filter(row => row.dueStatus === "closed_on_time").length,
    levels: levels.map(label => {
      const rows = eligible.filter(row => row.criticality.trim().toLowerCase() === label.toLowerCase())
      return { label, eligible: rows.length, onTime: rows.filter(row => row.dueStatus === "closed_on_time").length }
    }),
    unknownCriticality: eligible.filter(row => !levels.some(level => level.toLowerCase() === row.criticality.trim().toLowerCase())).length,
  }
}

export function validCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(value + "T00:00:00Z")
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10) === value
}
