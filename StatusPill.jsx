const TONES = {
  good: 'bg-emerald-400/15 text-emerald-200 border-emerald-300/30',
  warn: 'bg-amber-400/15 text-amber-200 border-amber-300/30',
  bad: 'bg-red-400/15 text-red-200 border-red-300/30',
  off: 'bg-white/5 text-slate-300 border-white/10',
}

// Colour is never the only signal: every pill also has an icon and a text label.
export default function StatusPill({ icon: Icon, label, value, tone = 'off' }) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${TONES[tone]}`}>
      <Icon size={18} aria-hidden />
      <div className="leading-tight">
        <div className="text-xs opacity-80">{label}</div>
        <div className="text-sm font-semibold">{value}</div>
      </div>
    </div>
  )
}
