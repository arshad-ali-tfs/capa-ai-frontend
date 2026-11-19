import { useId, useRef, useState, type RefObject } from "react"
import { EmptyState, HelpTooltip } from "@/shared/components"
import { cx } from "@/shared/lib/classNames"
import type { DeviationRecord } from "../types"
import { mapHelp } from "../helpText"

export function SourceReader({
  record,
  containerRef,
  onReview,
}: {
  record: DeviationRecord
  containerRef: RefObject<HTMLDivElement>
  onReview: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const readerRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const fields = useRef(new Map<string, HTMLElement>())
  const headings = useRef(new Map<string, HTMLHeadingElement>())
  const prefix = useId()
  // Older APIs remain readable as one intact source; never infer boundaries
  // from words such as "INVESTIGATION:" appearing inside an original field.
  const sections = record.sourceSections?.length ? record.sourceSections : (record.sourceNarrative
    ? [{ key: "original", label: "Source text", text: record.sourceNarrative }]
    : [])

  function jump(key: string) {
    const field = fields.current.get(key)
    if (!field) return
    if (expanded) field.scrollIntoView({ block: "start" })
    else readerRef.current?.scrollTo({ top: field.offsetTop, behavior: "instant" })
    headings.current.get(key)?.focus({ preventScroll: true })
  }

  function changeReadingMode(next: boolean) {
    const reader = readerRef.current
    const offset = reader
      ? expanded ? Math.max(0, 16 - reader.getBoundingClientRect().top) : reader.scrollTop
      : 0
    setExpanded(next)
    requestAnimationFrame(() => {
      const current = readerRef.current
      if (!current) return
      if (next) {
        if (offset > 0) window.scrollBy({ top: offset, behavior: "instant" })
      } else {
        current.scrollTop = offset
        containerRef.current?.scrollIntoView({ block: "start" })
        toggleRef.current?.focus({ preventScroll: true })
      }
    })
  }

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className="min-w-0 scroll-mt-4 rounded-xl border border-suite-line bg-white p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1">
            <h2 id={`${prefix}-title`} className="text-[15px] font-bold">Source narrative</h2>
            <HelpTooltip label="Source narrative">{mapHelp.source}</HelpTooltip>
          </div>
          <p className="mt-1 text-xs text-suite-muted">Original text, organised by source field.</p>
        </div>
        {sections.length > 0 && (
          <button
            ref={toggleRef}
            type="button"
            aria-expanded={expanded}
            aria-controls={`${prefix}-reader`}
            onClick={() => changeReadingMode(!expanded)}
            className="map-secondary min-h-9! px-2! py-1! text-xs! print:hidden"
          >
            {expanded ? "Use scroll view" : "Expand full text"}
          </button>
        )}
      </div>
      {sections.length > 1 && (
        <nav aria-label="Source fields" className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-suite-line-soft pt-2 print:hidden">
          <span className="text-xs text-suite-muted">Jump to</span>
          {sections.map((field, index) => (
            <button
              key={field.key}
              type="button"
              aria-controls={`${prefix}-field-${index}`}
              onClick={() => jump(field.key)}
              className="min-h-9 rounded-sm text-xs font-bold text-suite-blue underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              {field.label}
            </button>
          ))}
        </nav>
      )}
      {sections.length ? (
        <div
          ref={readerRef}
          id={`${prefix}-reader`}
          role="region"
          aria-label="Original source narrative"
          tabIndex={0}
          className={cx(
            "map-source-scroll relative mt-3 rounded-lg border border-suite-line-soft px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:px-4",
            expanded ? "overflow-visible" : "max-h-[65dvh] overflow-y-auto",
          )}
        >
          {sections.map((field, index) => (
            <section
              key={field.key}
              ref={(element) => { if (element) fields.current.set(field.key, element); else fields.current.delete(field.key) }}
              aria-labelledby={`${prefix}-field-${index}`}
              className="mx-auto max-w-[78ch] scroll-mt-4 border-suite-line-soft not-first:border-t"
            >
              <h3
                ref={(element) => { if (element) headings.current.set(field.key, element); else headings.current.delete(field.key) }}
                id={`${prefix}-field-${index}`}
                tabIndex={-1}
                className={cx(
                  "sticky z-10 border-b border-suite-line-soft bg-white py-3 text-sm font-bold text-suite-ink focus-visible:outline-2 focus-visible:outline-brand",
                  expanded ? "top-4" : "top-0",
                )}
              >
                {field.label}
              </h3>
              <blockquote className="py-4 whitespace-pre-wrap break-words text-[15px] leading-relaxed">{field.text}</blockquote>
            </section>
          ))}
        </div>
      ) : <div className="mt-3"><EmptyState message="No narrative was retained for this record." /></div>}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 print:hidden">
        {expanded && sections.length > 0 && (
          <button type="button" className="map-secondary text-xs!" onClick={() => changeReadingMode(false)}>Return to scroll view</button>
        )}
        <button type="button" className="map-secondary ml-auto lg:hidden" onClick={onReview}>Review this record ↓</button>
      </div>
    </div>
  )
}
