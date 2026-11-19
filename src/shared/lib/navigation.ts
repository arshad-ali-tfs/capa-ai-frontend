import type { MouseEvent } from "react"

let guard: ((path: string) => boolean) | null = null
export function setNavigationGuard(value: typeof guard) {
  guard = value
}
export const canNavigate = (path: string) => !guard || guard(path)
export function routeHref(path: string) {
  return path.startsWith("/map") &&
    !path.includes("?") &&
    window.location.pathname.startsWith("/map")
    ? path + window.location.search
    : path
}
export function navigateTo(path: string) {
  const target = routeHref(path)
  if (!canNavigate(target)) return
  if (window.location.pathname + window.location.search !== target)
    window.history.pushState({}, "", target)
  window.dispatchEvent(
    new PopStateEvent("popstate", { state: { capaGuardChecked: true } }),
  )
}

// Keep the real anchor for keyboard/new-tab use and make the rest of a row
// a convenient pointer target. Selecting source text must not navigate away.
export function navigateFromRow(event: MouseEvent<HTMLElement>, path: string) {
  if (
    event.defaultPrevented || event.button !== 0 ||
    event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
    (event.target as Element).closest("a, button, input, textarea, select, label, summary") ||
    window.getSelection()?.toString()
  ) return
  navigateTo(path)
}
