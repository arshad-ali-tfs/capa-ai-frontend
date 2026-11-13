import { type ReactNode } from "react"

export function TableButton({
  children,
  onClick,
  ariaLabel,
}: {
  children: ReactNode
  onClick: () => void
  ariaLabel: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="w-full rounded-md text-left outline-none transition-colors hover:bg-[#fff4f4] focus-visible:ring-2 focus-visible:ring-brand"
    >
      {children}
    </button>
  )
}
