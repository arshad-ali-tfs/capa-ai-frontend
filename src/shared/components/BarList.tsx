import { EmptyState } from "./EmptyState"

export interface BarItem {
  id?: string
  label: string
  value: number
}

export function BarList({
  items,
  onSelect,
  emptyMessage = "No data matches the selected filters.",
}: {
  items: BarItem[]
  onSelect?: (id: string) => void
  emptyMessage?: string
}) {
  const maximum = Math.max(...items.map((item) => item.value), 0)
  if (!items.length || maximum === 0) {
    return <EmptyState message={emptyMessage} />
  }
  return (
    <div className="space-y-2.5">
      {items.map((item) => {
        const row = (
          <>
            <span className="w-[38%] min-w-0 truncate text-xs">
              {item.label}
            </span>
            <span className="h-3.5 flex-1 overflow-hidden rounded-full bg-[#f0f2f5]">
              <span
                className="block h-full rounded-full bg-brand"
                style={{
                  width: `${Math.max((item.value / maximum) * 100, 4)}%`,
                }}
              />
            </span>
            <span className="w-8 text-right text-[11px] font-bold text-suite-muted">
              {item.value}
            </span>
          </>
        )
        return item.id && onSelect ? (
          <button
            type="button"
            key={item.id}
            onClick={() => onSelect(item.id!)}
            className="flex w-full items-center gap-3 rounded-md px-1 py-0.5 text-left outline-none transition-colors hover:bg-suite-hover focus-visible:ring-2 focus-visible:ring-brand"
          >
            {row}
          </button>
        ) : (
          <div key={item.label} className="flex items-center gap-3 px-1 py-0.5">
            {row}
          </div>
        )
      })}
    </div>
  )
}
