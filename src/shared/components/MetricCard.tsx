import { HelpTooltip } from "./HelpTooltip"
import type { ReactNode } from "react"
import { cx } from "@/shared/lib/classNames"

export function MetricCard({
  label,
  value,
  help,
  tooltip,
  children,
  valueSize = "number",
}: {
  label: string
  value?: ReactNode
  help: string
  tooltip?: string
  children?: ReactNode
  valueSize?: "number" | "text"
}) {
  return (
    <div className="map-kpi-card flex min-h-[184px] min-w-0 flex-col rounded-xl border border-suite-line bg-white p-4 shadow-[0_1px_2px_0_rgb(26_31_38/0.03)]">
      <p className="flex min-h-6 items-center justify-between gap-2 text-[13px] font-bold text-suite-slate">
        {label}
        {tooltip && <HelpTooltip label={label}>{tooltip}</HelpTooltip>}
      </p>
      <div className="mt-3 mb-3 min-w-0">
        {value !== undefined && <p className={cx("break-words font-bold text-suite-ink [overflow-wrap:anywhere]", valueSize === "number" ? "text-[32px] leading-9 tabular-nums" : "text-[22px] leading-7")}>{value}</p>}
        {children}
      </div>
      <p className="mt-auto border-t border-suite-line-soft pt-3 text-xs leading-5 text-suite-muted">{help}</p>
    </div>
  )
}
