import { type ReactNode } from "react"
import { cx } from "@/shared/lib/classNames"
import { navigateTo, routeHref } from "@/shared/lib/navigation"

export function AppLink({
  href,
  children,
  className,
  ariaLabel,
  ariaCurrent,
}: {
  href: string
  children: ReactNode
  className?: string
  ariaLabel?: string
  ariaCurrent?: "page" | "step"
}) {
  return (
    <a
      href={routeHref(href)}
      aria-label={ariaLabel}
      aria-current={ariaCurrent}
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
