import { AppLink } from "./AppLink"
import { PageHeading } from "./PageHeading"
import { Panel } from "./Panel"

export function NotFoundScreen({ message }: { message: string }) {
  return (
    <>
      <PageHeading
        title="Page not found"
        subtitle="The requested cluster or record is not available."
        status="Not found"
      />
      <Panel title="Return to the cluster overview">
        <p className="text-sm text-suite-muted">{message}</p>
        <AppLink
          href="/map"
          className="mt-4 inline-flex rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-strong"
        >
          Global cluster overview
        </AppLink>
      </Panel>
    </>
  )
}
