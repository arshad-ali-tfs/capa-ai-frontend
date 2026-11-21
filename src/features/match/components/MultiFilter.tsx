import { useEffect, useId, useRef, useState } from "react"
import { HelpTooltip } from "@/shared/components"

export function MultiFilter({ label, options, selected, onChange, help }: {
  label: string
  options: { value: string | number; count: number }[]
  selected: (string | number)[]
  onChange: (values: (string | number)[]) => void
  help: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const id = useId()
  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); button.current?.focus() } }
    document.addEventListener("pointerdown", close)
    document.addEventListener("keydown", escape)
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape) }
  }, [open])
  const available = [...options, ...selected.filter(value => !options.some(option => option.value === value)).map(value => ({ value, count: 0 }))]
  const visible = available.filter(option => String(option.value).toLowerCase().includes(query.toLowerCase()))
  const allLabel = label === "Division" ? "All divisions" : label === "Source status" ? "All source statuses" : label === "Criticality" ? "All classifications" : label === "DR types" ? "All DR types" : `All ${label.toLowerCase()}`
  return <div ref={root} className="relative min-w-0">
    <div className="mb-1 flex items-center gap-1 text-xs font-bold text-suite-slate"><span id={`${id}-label`}>{label}</span><HelpTooltip label={`${label} filter`}>{help}</HelpTooltip></div>
    <button ref={button} type="button" aria-label={`${label} filters`} aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)} className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-suite-line-field bg-white px-3 text-left text-sm outline-none hover:border-suite-slate focus-visible:ring-2 focus-visible:ring-brand">
      <span className="truncate">{selected.length ? `${selected.length} selected` : allLabel}</span><span aria-hidden="true" className="text-suite-muted">⌄</span>
    </button>
    {open && <div id={id} className="absolute top-full left-0 z-30 mt-1 w-full rounded-lg border border-suite-line-strong bg-white p-2 shadow-lg">
      {available.length > 7 && <input type="search" aria-label={`Find ${label.toLowerCase()} options`} value={query} onChange={event => setQuery(event.target.value)} placeholder="Find an option…" className="mb-2 min-h-9 w-full min-w-0 rounded border border-suite-line px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-brand" />}
      <fieldset aria-labelledby={`${id}-label`} className="max-h-60 overflow-y-auto">
        {visible.map(option => <label key={option.value} className="flex min-h-10 cursor-pointer items-start gap-2 rounded px-1.5 py-2 text-xs leading-5 hover:bg-suite-hover">
          <input type="checkbox" aria-label={String(option.value)} checked={selected.includes(option.value)} onChange={() => onChange(selected.includes(option.value) ? selected.filter(value => value !== option.value) : [...selected, option.value])} className="mt-1 accent-brand" />
          <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{option.value}</span><span className="tabular-nums text-suite-muted">{option.count.toLocaleString()}</span>
        </label>)}
        {!visible.length && <p className="p-2 text-xs text-suite-muted">No options available.</p>}
      </fieldset>
      <div className="mt-1 flex items-center justify-between border-t border-suite-line-soft pt-2 text-xs"><button type="button" onClick={() => onChange([])} className="min-h-8 px-1 font-bold text-suite-blue">Clear</button><button type="button" onClick={() => setOpen(false)} className="min-h-8 px-2 font-bold text-suite-blue">Done</button></div>
    </div>}
  </div>
}
