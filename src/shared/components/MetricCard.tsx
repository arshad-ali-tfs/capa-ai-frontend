export function MetricCard({
  label,
  value,
  help,
}: {
  label: string
  value: string | number
  help: string
}) {
  return (
    <div className="flex min-h-[112px] min-w-0 flex-col items-start gap-1 rounded-xl border border-suite-line bg-white px-4 pt-[13px] pb-3">
      <p className="text-xs font-bold text-suite-muted">{label}</p>
      <p className="break-words text-[24px] leading-tight font-bold">{value}</p>
      <p className="mt-0.5 text-xs text-suite-muted">{help}</p>
    </div>
  )
}
