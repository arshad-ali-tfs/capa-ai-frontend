import { isMockData } from "@/shared/config/env"
import { type BreadcrumbItem, Breadcrumbs } from "./Breadcrumbs"

export function PageHeading({
  title,
  subtitle,
  status,
  breadcrumbs,
}: {
  title: string
  subtitle: string
  status: string
  breadcrumbs?: BreadcrumbItem[]
}) {
  return (
    <section className="flex min-h-[62px] flex-col justify-center gap-2">
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <h1 className="text-[24px] leading-tight font-bold sm:text-[26px]">
            {title}
          </h1>
          <p className="mt-1 text-[13px] text-suite-muted">{subtitle}</p>
        </div>
        <div className="shrink-0 text-left font-bold lg:text-right">
          {isMockData && (
            <p className="text-xs text-suite-muted">SAMPLE DATA</p>
          )}
          <p className="mt-0.5 text-xs">{status}</p>
        </div>
      </div>
    </section>
  )
}
