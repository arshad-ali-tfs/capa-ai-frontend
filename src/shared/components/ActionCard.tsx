export function ActionCard({
  title,
  help,
  onClick,
  disabled,
}: {
  title: string
  help: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-[112px] w-full flex-col items-start gap-[7px] rounded-xl bg-brand p-3.5 text-left text-white outline-none transition-colors hover:bg-brand-strong focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#a6adb7]"
    >
      <span className="text-[17px] font-bold">{title}</span>
      <span className="text-xs">{help}</span>
    </button>
  )
}
