import { type ReactNode } from "react"

export function DisclosurePanel({
  title,
  help,
  children,
}: {
  title: string
  help: string
  children: ReactNode
}) {
  return (
    <details className="group rounded-xl border border-suite-line bg-white">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl p-4 outline-none hover:bg-[#fafbfc] focus-visible:ring-2 focus-visible:ring-brand">
        <div className="min-w-0 flex-1">
          <span className="block text-sm font-bold">{title}</span>
          <span className="mt-1 block text-[11px] text-suite-muted">
            {help}
          </span>
        </div>
        <span className="text-lg font-bold text-suite-muted group-open:rotate-45">
          +
        </span>
      </summary>
      <div className="border-t border-suite-line-soft p-4">{children}</div>
    </details>
  )
}
