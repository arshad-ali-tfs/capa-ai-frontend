import { type ReactNode } from "react"
import { cx } from "@/shared/lib/classNames"
import { navigateTo } from "@/shared/lib/navigation"

export function AppLink({
  href,
  children,
  className,
  ariaLabel,
}: {
  href: string
  children: ReactNode
  className?: string
  ariaLabel?: string
}) {
  return (
    <a
      href={href}
      aria-label={ariaLabel}
      onClick={(event) => {
        if (
          href.startsWith("/") &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.shiftKey &&
          !event.altKey
        ) {
          event.preventDefault()
          navigateTo(href)
        }
      }}
      className={cx(
        "rounded-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2",
        className,
      )}
    >
      {children}
    </a>
  )
}
