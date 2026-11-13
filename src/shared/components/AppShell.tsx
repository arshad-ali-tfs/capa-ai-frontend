import { type ReactNode } from "react"
import { cx } from "@/shared/lib/classNames"
import { AppLink } from "./AppLink"
import { isMockData } from "@/shared/config/env"

export function AppShell({ children }: { children: ReactNode }) {
  const currentPath = window.location.pathname
  const modules = [
    { label: "Home", href: "/", active: currentPath === "/" },
    { label: "MAP", href: "/map", active: currentPath.startsWith("/map") },
  ]

  return (
    <div className="min-h-screen bg-suite-surface text-suite-ink">
      <header className="flex h-[72px] items-center gap-3.5 bg-[#171a1f] px-4 py-3 sm:px-6">
        <AppLink
          href="/"
          className="flex items-center gap-3.5"
          ariaLabel="CAPA.AI home"
        >
          <img
            src="/assets/logo-mark.svg"
            alt=""
            className="size-[42px] shrink-0"
          />
          <span className="text-[28px] font-bold whitespace-nowrap text-brand">
            CAPA.AI
          </span>
          <span className="hidden text-xs whitespace-nowrap text-[#b8bfcc] sm:inline">
            QUALITY &amp; INSIGHTS AI SUITE
          </span>
        </AppLink>
        <div className="flex-1" />
        <div
          className="flex h-11 w-[118px] shrink-0 flex-col items-center justify-center bg-brand px-2.5 py-1.5 text-center text-xs leading-tight font-bold text-white"
          aria-label="Thermo Fisher Scientific"
        >
          <span>Thermo Fisher</span>
          <span>SCIENTIFIC</span>
        </div>
      </header>
      {isMockData && (
        <div className="flex min-h-[34px] items-center justify-center bg-[#fce5e5] px-3 py-2 text-center text-[11px] font-bold text-brand sm:text-[13px]">
          SAMPLE DATA • NOT FOR GxP USE • NO QMS WRITE-BACK
        </div>
      )}
      <nav
        aria-label="CAPA.AI modules"
        className="flex min-h-11 items-center gap-1 overflow-x-auto border-b border-suite-line bg-white px-4 sm:px-6"
      >
        {modules.map((module) => (
          <AppLink
            key={module.href}
            href={module.href}
            className={cx(
              "shrink-0 rounded-md px-3 py-2 text-xs font-bold",
              module.active
                ? "bg-brand-wash text-brand"
                : "text-suite-slate hover:bg-suite-hover",
            )}
          >
            {module.label}
          </AppLink>
        ))}
      </nav>
      <main className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 p-4 sm:p-6">
        {children}
      </main>
    </div>
  )
}
