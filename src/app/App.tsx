import { useEffect, useState } from "react"
import { LandingScreen } from "@/features/landing/LandingScreen"
import { MapRoutes } from "@/features/map/MapRoutes"
import { AppShell, NotFoundScreen } from "@/shared/components"
import { parseRoute, type Route } from "./routes"

function renderRoute(route: Route) {
  switch (route.type) {
    case "landing":
      return <LandingScreen />
    case "overview":
    case "cluster":
    case "evidence":
      return <MapRoutes route={route} />
    default:
      return <NotFoundScreen message="The page you requested does not exist." />
  }
}

export default function App() {
  const [route, setRoute] = useState<Route>(() =>
    parseRoute(window.location.pathname),
  )

  useEffect(() => {
    const onPopState = () => {
      setRoute(parseRoute(window.location.pathname))
      window.scrollTo({ top: 0, behavior: "auto" })
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  return <AppShell>{renderRoute(route)}</AppShell>
}
