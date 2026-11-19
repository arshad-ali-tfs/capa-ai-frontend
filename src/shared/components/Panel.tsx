import { type ReactNode } from "react"
import { cx } from "@/shared/lib/classNames"

export function Panel({
  title,
  help,
  children,
  className,
}: {
  title: string
  help?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cx(
        "min-w-0 rounded-xl border border-suite-line bg-white p-4",
        className,
      )}
    >
      <h2 className="text-[15px] font-bold">{title}</h2>
      {help && <p className="mt-1 text-xs text-suite-muted">{help}</p>}
      <div className={cx(help ? "mt-3" : "mt-2")}>{children}</div>
    </section>
  )
}
