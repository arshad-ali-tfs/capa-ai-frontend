import { Fragment } from "react"

export function HighlightedText({ text, spans }: { text: string; spans: { start: number; end: number }[] }) {
  let cursor = 0
  const parts = spans.map(span => {
    const before = text.slice(cursor, span.start)
    const hit = text.slice(span.start, span.end)
    cursor = span.end
    return <Fragment key={`${span.start}:${span.end}`}>{before}<mark className="rounded-sm bg-[#fff0b3] px-0.5 text-inherit">{hit}</mark></Fragment>
  })
  return <>{parts}{text.slice(cursor)}</>
}
