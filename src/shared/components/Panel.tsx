import { type ReactNode } from "react"
import { cx } from "@/shared/lib/classNames"
import { HelpTooltip } from "./HelpTooltip"

export function Panel({
  title,
  help,
  tooltip,
  children,
  className,
  headerActions,
}: {
  title: string
  help?: string
  tooltip?: string
  children: ReactNode
  className?: string
  headerActions?: ReactNode
}) {
  return (
    <section
      className={cx(
        "min-w-0 rounded-xl border border-suite-line bg-white p-4",
        className,
      )}
    >
      {headerActions?<div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className={cx("text-[15px] font-bold",tooltip&&"inline")}>{title}</h2>{tooltip&&<span className="ml-1 inline-flex align-middle"><HelpTooltip label={title}>{tooltip}</HelpTooltip></span>}</div>{headerActions}</div>:<><h2 className={cx("text-[15px] font-bold", tooltip && "inline")}>{title}</h2>{tooltip && <span className="ml-1 inline-flex align-middle"><HelpTooltip label={title}>{tooltip}</HelpTooltip></span>}</>}
      {help && <p className="mt-1 text-xs text-suite-muted">{help}</p>}
      <div className={cx(help ? "mt-3" : "mt-2")}>{children}</div>
    </section>
  )
}
