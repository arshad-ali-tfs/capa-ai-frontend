import { useEffect, useId, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

/** Contextual help that also works with a keyboard or touch screen. */
export function HelpTooltip({ label, children }: { label: string; children: string }) {
  const id = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  const bubble = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const hovered = useRef(false)
  const bubbleHovered = useRef(false)
  const pinned = useRef(false)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  function show() {
    clearTimeout(timer.current)
    setOpen(true)
  }
  function dismiss() {
    clearTimeout(timer.current)
    pinned.current = false
    bubbleHovered.current = false
    setOpen(false)
    setPosition(null)
  }
  function leave() {
    clearTimeout(timer.current)
    // Bridge the small gap between the icon and the hoverable bubble.
    timer.current = setTimeout(() => {
      if (!hovered.current && !bubbleHovered.current && !pinned.current && document.activeElement !== trigger.current) dismiss()
    }, 150)
  }

  useEffect(() => () => clearTimeout(timer.current), [])
  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") dismiss()
    }
    function onOutside(event: PointerEvent) {
      if (!trigger.current?.contains(event.target as Node) && !bubble.current?.contains(event.target as Node)) dismiss()
    }
    document.addEventListener("keydown", onKey)
    document.addEventListener("pointerdown", onOutside)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.removeEventListener("pointerdown", onOutside)
    }
  }, [open])

  useLayoutEffect(() => {
    if (!open) return
    function place() {
      if (!trigger.current || !bubble.current) return
      const anchor = trigger.current.getBoundingClientRect()
      const tip = bubble.current.getBoundingClientRect()
      if (anchor.bottom < 0 || anchor.top > window.innerHeight) {
        dismiss()
        return
      }
      const left = Math.max(12, Math.min(anchor.left + anchor.width / 2 - tip.width / 2, window.innerWidth - tip.width - 12))
      const below = anchor.bottom + 6
      const top = below + tip.height <= window.innerHeight - 12 ? below : Math.max(12, anchor.top - tip.height - 6)
      setPosition({ top, left })
    }
    place()
    const observer = new ResizeObserver(place)
    if (bubble.current) observer.observe(bubble.current)
    window.addEventListener("resize", place)
    window.addEventListener("scroll", place, true)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", place)
      window.removeEventListener("scroll", place, true)
    }
  }, [open])

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-label={`About ${label}`}
        aria-describedby={open ? id : undefined}
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-suite-muted outline-none hover:bg-suite-info-wash hover:text-suite-blue focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 print:hidden"
        onPointerEnter={(event) => { if (event.pointerType !== "touch") { hovered.current = true; show() } }}
        onPointerLeave={(event) => { if (event.pointerType !== "touch") { hovered.current = false; leave() } }}
        onFocus={show}
        onBlur={() => { pinned.current = false; leave() }}
        onClick={(event) => {
          event.stopPropagation()
          if (pinned.current) dismiss()
          else { pinned.current = true; show() }
        }}
      >
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10 9v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="10" cy="6" r="1" fill="currentColor" />
        </svg>
      </button>
      {open && createPortal(
        <div
          ref={bubble}
          id={id}
          role="tooltip"
          style={{ ...position, visibility: position ? "visible" : "hidden" }}
          className="fixed z-[100] w-max max-w-[min(20rem,calc(100vw-24px))] rounded-lg bg-suite-ink px-3 py-2.5 text-left text-xs font-normal leading-relaxed text-white shadow-lg [overflow-wrap:anywhere] print:hidden"
          onPointerEnter={(event) => { if (event.pointerType !== "touch") { bubbleHovered.current = true; clearTimeout(timer.current) } }}
          onPointerLeave={(event) => { if (event.pointerType !== "touch") { bubbleHovered.current = false; leave() } }}
          onClick={(event) => event.stopPropagation()}
        >
          {children}
        </div>,
        document.body,
      )}
    </>
  )
}

/** Use beside a table heading or definition label without changing its text. */
export function HelpLabel({ label, children }: { label: string; children: string }) {
  return (
    <span className="inline-flex max-w-full flex-wrap items-center gap-x-0.5 align-middle">
      <span className="min-w-0">{label}</span>
      <HelpTooltip label={label}>{children}</HelpTooltip>
    </span>
  )
}
