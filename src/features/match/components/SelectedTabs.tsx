export function SelectedTabs({value,onChange}:{value:"details"|"watchlist";onChange:(value:"details"|"watchlist")=>void}) {
  return <div role="tablist" aria-label="Selected deviation views" className="mt-4 flex min-w-0 gap-1 rounded-lg bg-suite-surface p-1" onKeyDown={event=>{
    if(!["ArrowLeft","ArrowRight","Home","End"].includes(event.key))return
    event.preventDefault()
    const next=event.key==="Home"?"details":event.key==="End"?"watchlist":value==="details"?"watchlist":"details"
    onChange(next);document.getElementById(`match-${next}-tab`)?.focus()
  }}>
    {(["details","watchlist"] as const).map(tab=><button key={tab} id={`match-${tab}-tab`} type="button" role="tab" aria-controls={`match-${tab}-panel`} aria-selected={value===tab} tabIndex={value===tab?0:-1} onClick={()=>onChange(tab)} className={`min-h-10 min-w-0 flex-1 rounded-md px-3 py-2 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-brand ${value===tab?"bg-white text-suite-blue shadow-sm":"text-suite-muted hover:text-suite-ink"}`}>{tab==="details"?"Details":"Watchlist"}</button>)}
  </div>
}
