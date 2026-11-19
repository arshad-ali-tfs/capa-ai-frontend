import { useId } from "react"
import type { FiveWh } from "../types"

const fields: { key: keyof FiveWh; label: string }[] = [
  { key: "who", label: "Who" },
  { key: "what", label: "What" },
  { key: "when", label: "When" },
  { key: "where", label: "Where" },
  { key: "why", label: "Why" },
  { key: "how", label: "How" },
]
const unavailable = (value: string | undefined) =>
  !value?.trim() || /^(?:not[_ ]available|n\/a|na|none)$/i.test(value.trim())

export function FiveWhExtraction({ value }: { value?: FiveWh }) {
  const titleId = useId()
  const hasSavedOutput = value && fields.some(({ key }) => value[key].trim())
  return (
    <section aria-labelledby={titleId} className="min-w-0 rounded-xl border border-suite-line bg-white p-4">
      <h2 id={titleId} className="text-[15px] font-bold">5W1H extraction</h2>
      <p className="mt-1 text-xs text-suite-muted">
        Saved AI output for this analysis. Compare with the source narrative.
      </p>
      {!hasSavedOutput && (
        <p className="mt-3 text-sm text-suite-muted">No saved 5W1H output is available for this record.</p>
      )}
      <dl className="mt-3 divide-y divide-suite-line-soft">
        {fields.map(({ key, label }) => {
          const missing = unavailable(value?.[key])
          return (
            <div key={key} className="grid min-w-0 grid-cols-1 gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[64px_minmax(0,1fr)] sm:gap-4">
              <dt className="text-sm font-bold">{label}</dt>
              <dd className={`min-w-0 whitespace-pre-wrap text-sm leading-relaxed [overflow-wrap:anywhere]${missing ? " text-suite-muted" : ""}`}>
                {missing ? "Not available" : value![key]}
              </dd>
            </div>
          )
        })}
      </dl>
    </section>
  )
}
