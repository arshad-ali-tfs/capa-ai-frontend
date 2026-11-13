import { AppLink } from "./AppLink"

export interface BreadcrumbItem {
  label: string
  href?: string
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex flex-wrap items-center gap-1.5 text-xs"
    >
      {items.map((item, index) => (
        <span
          key={`${item.label}-${index}`}
          className="flex items-center gap-1.5"
        >
          {index > 0 && <span className="text-[#9aa4b2]">/</span>}
          {item.href ? (
            <AppLink
              href={item.href}
              className="font-bold text-brand hover:underline"
            >
              {item.label}
            </AppLink>
          ) : (
            <span className="text-suite-muted">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
