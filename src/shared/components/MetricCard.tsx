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
    <div className="flex h-[104px] min-w-0 flex-col items-start gap-1 rounded-xl border border-suite-line bg-white px-4 pt-[13px] pb-3">
      <p className="text-xs font-bold text-suite-muted">{label}</p>
      <p className="text-[28px] leading-none font-bold">{value}</p>
      <p className="mt-0.5 text-[11px] text-suite-muted">{help}</p>
    </div>
  )
}
