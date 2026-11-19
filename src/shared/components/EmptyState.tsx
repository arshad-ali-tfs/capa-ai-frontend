export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-28 items-center justify-center rounded-lg border border-dashed border-suite-line-field bg-suite-hover px-4 text-center text-xs text-suite-muted">
      {message}
    </div>
  )
}
