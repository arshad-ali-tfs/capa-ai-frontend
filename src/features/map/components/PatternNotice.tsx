export function PatternNotice() {
  return (
    <div className="flex gap-3 rounded-xl border border-[#efd99d] bg-[#fff9e9] p-3.5">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-warn-wash text-sm font-bold text-warn-ink">
        i
      </span>
      <div>
        <p className="text-xs font-bold text-[#70470d]">
          Pattern grouping only
        </p>
        <p className="mt-1 text-xs leading-relaxed text-[#79511a]">
          Membership reflects shared language or context. It does not establish
          root cause, causality, severity, or product impact.
        </p>
      </div>
    </div>
  )
}
