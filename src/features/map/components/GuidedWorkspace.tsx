import { type ReactNode } from "react"
import { cx } from "@/shared/lib/classNames"
import { AppLink } from "@/shared/components"

export function GuidedWorkspace({
  step,
  clusterId,
  recordId,
  children,
}: {
  step: 1 | 2 | 3
  clusterId?: string
  recordId?: string
  children: ReactNode
}) {
  const steps = [
    {
      number: 1,
      label: "Select cluster",
      description: "Find a recurring pattern",
      href: "/map",
    },
    {
      number: 2,
      label: "Inspect records",
      description: clusterId ?? "Choose a cluster first",
      href: clusterId ? `/map/clusters/${clusterId}` : undefined,
    },
    {
      number: 3,
      label: "Review evidence",
      description: recordId ?? "Choose a record next",
      href:
        clusterId && recordId
          ? `/map/clusters/${clusterId}/evidence/${recordId}`
          : undefined,
    },
  ]

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[230px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-4 lg:self-start">
        <div className="rounded-xl border border-suite-line-strong bg-white p-3.5 shadow-sm">
          <p className="text-[11px] font-bold tracking-[0.08em] text-suite-muted uppercase">
            Guided investigation
          </p>
          <ol className="mt-3 grid grid-cols-3 gap-2 lg:grid-cols-1 lg:gap-1">
            {steps.map((item) => {
              const active = item.number === step
              const complete = item.number < step
              const content = (
                <span
                  className={cx(
                    "flex min-w-0 gap-2.5 rounded-lg p-2.5 text-left transition-colors",
                    active && "bg-brand-wash",
                    !active && item.href && "hover:bg-suite-hover",
                    !item.href && "opacity-55",
                  )}
                >
                  <span
                    className={cx(
                      "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                      active && "bg-brand text-white",
                      complete && "bg-[#e3f5eb] text-[#14734a]",
                      !active && !complete && "bg-[#edf0f4] text-suite-muted",
                    )}
                  >
                    {complete ? "✓" : item.number}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={cx(
                        "block text-xs font-bold",
                        active ? "text-suite-ink" : "text-suite-slate",
                      )}
                    >
                      {item.label}
                    </span>
                    <span className="mt-0.5 hidden truncate text-[10px] text-suite-muted lg:block">
                      {item.description}
                    </span>
                  </span>
                </span>
              )
              return (
                <li key={item.number}>
                  {item.href ? (
                    <AppLink href={item.href} className="block">
                      {content}
                    </AppLink>
                  ) : (
                    content
                  )}
                </li>
              )
            })}
          </ol>
          <div className="mt-3 hidden rounded-lg bg-warn-wash p-2.5 lg:block">
            <p className="text-[11px] font-bold text-warn-ink">
              Pattern grouping only
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-[#79511a]">
              Membership does not establish root cause, severity, or product
              impact.
            </p>
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </div>
  )
}
