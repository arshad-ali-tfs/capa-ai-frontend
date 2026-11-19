// Historical exports sometimes append a semicolon-delimited four-field footer.
// Format that known shape without paraphrasing the retained summary or values.
export function HistoricalContext({ text, confidenceLabel = "Historical confidence label" }: { text: string; confidenceLabel?: string }) {
  const start = text.toLowerCase().lastIndexOf("primary center")
  const footer = start >= 0 ? /^(Primary Center\s*=\s*([^;\n]+);\s*Key Signals\s*=\s*([^;\n]+);\s*Secondary\s*=\s*([^;\n]+);\s*Confidence\s*=\s*([^;\n]+))\s*$/i.exec(text.slice(start)) : null
  const summary = footer ? text.slice(0, start).trimEnd() : text
  const fields = footer ? [
    ["Primary center", footer[2]],
    ["Key signals", footer[3]],
    ["Secondary signals", footer[4]],
    [confidenceLabel, footer[5]],
  ] : []
  return (
    <div className="mt-3 space-y-4 break-words text-sm leading-relaxed">
      {summary && <p className="whitespace-pre-wrap">{summary}</p>}
      {fields.length > 0 && (
        <dl className="space-y-3 border-t border-suite-line-soft pt-3">
          {fields.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-bold text-suite-muted">{label}</dt>
              <dd className="mt-1 whitespace-pre-wrap">{value.trim()}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}
