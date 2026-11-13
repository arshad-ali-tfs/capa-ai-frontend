import { type ReactNode } from "react"
import { cx } from "@/shared/lib/classNames"

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode
  tone?: "neutral" | "green" | "amber" | "blue"
}) {
  const tones = {
    neutral: "bg-suite-hover text-suite-slate",
    green: "bg-[#e3f5eb] text-[#14734a]",
    amber: "bg-warn-wash text-warn-ink",
    blue: "bg-suite-info-wash text-suite-blue",
  }
  return (
    <span
      className={cx(
        "inline-flex rounded-xl px-2 py-1 text-[11px] font-bold",
        tones[tone],
      )}
    >
      {children}
    </span>
  )
}
