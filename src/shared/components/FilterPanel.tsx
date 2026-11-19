import { useId } from "react"
import { HelpTooltip } from "./HelpTooltip"

export interface FilterField<K extends string> {
  key: K
  label: string
  options: string[]
  tooltip?: string
}

export function FilterPanel<K extends string>({
  filters,
  fields,
  onChange,
  onClear,
  primaryCount = fields.length,
  resultLabel,
  tooltip,
}: {
  filters: Record<K, string>
  fields: FilterField<K>[]
  onChange: (key: K, value: string) => void
  onClear: () => void
  primaryCount?: number
  resultLabel?: string
  tooltip?: string
}) {
  const id = useId()
  const renderField = (field: FilterField<K>) => (
    <div key={field.key} className="flex min-w-0 flex-col gap-1 px-2 py-1">
      <div className="flex min-h-6 items-center gap-1">
        <label htmlFor={`${id}-${field.key}-select`} className="text-xs font-bold">{field.label}</label>
        {field.tooltip && <HelpTooltip label={`${field.label} filter`}>{field.tooltip}</HelpTooltip>}
      </div>
      <select
        id={`${id}-${field.key}-select`}
        aria-label={field.label}
        value={filters[field.key]}
        disabled={!field.options.some((value) => !unavailable(value))}
        aria-describedby={
          !field.options.some((value) => !unavailable(value))
            ? `${id}-${field.key}`
            : undefined
        }
        onChange={(event) => onChange(field.key, event.target.value)}
        className="min-h-10 w-full rounded-md border border-suite-line bg-white px-2 text-sm text-suite-muted outline-none focus:border-brand focus:ring-1 focus:ring-brand disabled:cursor-not-allowed disabled:bg-suite-hover"
      >
        <option value="All">
          {field.options.some((value) => !unavailable(value))
            ? "All"
            : "Not available in source"}
        </option>
        {filters[field.key] !== "All" &&
          !field.options.includes(filters[field.key]) && (
            <option>{filters[field.key]}</option>
          )}
        {field.options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
      {!field.options.some((value) => !unavailable(value)) && (
        <span id={`${id}-${field.key}`} className="sr-only">
          This field has no usable source values in this analysis.
        </span>
      )}
    </div>
  )
  const primaryFields = fields.slice(0, primaryCount)
  const advancedFields = fields.slice(primaryCount)
  const activeFields = fields.filter((field) => filters[field.key] !== "All")

  return (
    <section className="rounded-xl border border-suite-line bg-white p-3.5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xs font-bold">Narrow this view</h2>
        <div className="flex items-center gap-1">
          <p className="text-xs text-suite-muted">Filters work together</p>
          {tooltip && <HelpTooltip label="Filters">{tooltip}</HelpTooltip>}
        </div>
        <div className="flex-1" />
        {resultLabel && (
          <span className="rounded-full bg-suite-info-wash px-2.5 py-1 text-xs font-bold text-suite-blue">
            {resultLabel}
          </span>
        )}
        <button
          type="button"
          onClick={onClear}
          className="rounded-sm text-xs font-bold text-brand outline-none hover:underline focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
        >
          Clear all
        </button>
      </div>
      <div className="mt-2 grid grid-cols-1 gap-x-2 gap-y-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {primaryFields.map(renderField)}
      </div>
      {activeFields.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-suite-line-soft pt-2">
          <span className="mr-1 text-xs font-bold tracking-wide text-suite-muted uppercase">
            Active
          </span>
          {activeFields.map((field) => (
            <button
              type="button"
              key={field.key}
              onClick={() => onChange(field.key, "All")}
              aria-label={`Remove ${field.label} filter`}
              className="rounded-full bg-suite-info-wash px-2.5 py-1 text-xs font-bold text-suite-blue outline-none hover:bg-[#dfeaf6] focus-visible:ring-2 focus-visible:ring-brand"
            >
              {field.label}: {filters[field.key]}{" "}
              <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      )}
      {advancedFields.length > 0 && (
        <details className="group mt-2 border-t border-suite-line-soft pt-2">
          <summary className="cursor-pointer list-none rounded-md px-2 py-1.5 text-xs font-bold text-suite-slate outline-none hover:bg-suite-hover focus-visible:ring-2 focus-visible:ring-brand">
            <span className="group-open:hidden">
              More filters ({advancedFields.length})
            </span>
            <span className="hidden group-open:inline">
              Hide additional filters
            </span>
          </summary>
          <div className="mt-1 grid grid-cols-1 gap-x-2 gap-y-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {advancedFields.map(renderField)}
          </div>
        </details>
      )}
    </section>
  )
}
const unavailable = (value: string) =>
  !value.trim() ||
  ["not provided", "not available", "unavailable"].includes(value.toLowerCase())
