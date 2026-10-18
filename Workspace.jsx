import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { ArrowLeft, Home, ChevronUp, ChevronDown, Volume2, VolumeX, Search, ShieldAlert } from 'lucide-react'

const ARTICLES = [
  { id: 'a1', title: 'How head tracking works', text: 'A camera finds 478 points on your face. Moving your head changes where the nose sits relative to the rest of the face, and that small shift moves the pointer.' },
  { id: 'a2', title: 'Why dwell-click matters', text: 'Hovering on a target for a moment lets you click without any hand movement. A countdown ring shows what is about to happen so accidents can be cancelled.' },
  { id: 'a3', title: 'Voice typing tips', text: 'Say "type" followed by your words to fill the focused field. Say "search for" followed by a topic to use the search bar.' },
  { id: 'a4', title: 'Setting up good lighting', text: 'Face a lamp or window rather than having it behind you. Even, front-facing light gives the most stable tracking.' },
]

const Workspace = forwardRef(function Workspace({ pointer, active, onEvent }, ref) {
  const rootRef = useRef(null)
  const scrollRef = useRef(null)
  const searchRef = useRef(null)
  const hoverEl = useRef(null)
  const lastInput = useRef(null)
  const [page, setPage] = useState('home')
  const [history, setHistory] = useState([])
  const [query, setQuery] = useState('')
  const [form, setForm] = useState({ name: '', message: '' })
  const [pending, setPending] = useState(null) // { el, label }
  const [reading, setReading] = useState(false)
  const [notice, setNotice] = useState(null)

  const flash = useCallback((msg) => {
    setNotice(msg)
    setTimeout(() => setNotice(null), 3500)
  }, [])

  const go = useCallback((next) => {
    setHistory((h) => [...h, page])
    setPage(next)
    scrollRef.current?.scrollTo({ top: 0 })
  }, [page])

  const goBack = useCallback(() => {
    if (!history.length) return false
    setPage(history[history.length - 1])
    setHistory((h) => h.slice(0, -1))
    return true
  }, [history])

  const readPage = useCallback(() => {
    if (!window.speechSynthesis) return false
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(scrollRef.current?.innerText || '')
    u.onend = () => setReading(false)
    setReading(true)
    window.speechSynthesis.speak(u)
    return true
  }, [])

  const runSearch = useCallback((q) => {
    setQuery(q)
    go('results')
  }, [go])

  // Highlight the clickable element under the pointer.
  useEffect(() => {
    hoverEl.current?.classList.remove('hf-hover')
    hoverEl.current = null
    if (!active || !rootRef.current) return
    const r = rootRef.current.getBoundingClientRect()
    const el = document.elementFromPoint(r.left + pointer.x * r.width, r.top + pointer.y * r.height)
    const target = el?.closest?.('[data-click]')
    if (target && rootRef.current.contains(target)) {
      target.classList.add('hf-hover')
      hoverEl.current = target
    }
  }, [pointer, active, page])

  const activate = (el) => {
    if (el.matches('input, textarea')) {
      el.focus()
      return `Focused “${el.getAttribute('aria-label') || 'field'}”`
    }
    el.click()
    return `Clicked “${el.dataset.label || el.textContent.trim().slice(0, 30)}”`
  }

  useImperativeHandle(ref, () => ({
    scroll: (dir) => scrollRef.current?.scrollBy({ top: dir * 320, behavior: 'smooth' }),
    top: () => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }),
    back: goBack,
    home: () => { setHistory([]); setPage('home') },
    search: runSearch,
    type: (text) => {
      const el = lastInput.current && document.contains(lastInput.current) ? lastInput.current : searchRef.current
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, el.value ? `${el.value} ${text}` : text)
      el.dispatchEvent(new Event('input', { bubbles: true })) // lets React see the change
      return el.getAttribute('aria-label') || 'field'
    },
    click: () => {
      const el = hoverEl.current
      if (!el) return { ok: false, message: 'Nothing clickable under the pointer' }
      if (el.dataset.consequential) {
        setPending({ el, label: el.dataset.label })
        return { ok: true, message: `Say “confirm” to ${el.dataset.label}, or “cancel”` }
      }
      return { ok: true, message: activate(el) }
    },
    confirm: () => {
      if (!pending) return { ok: false, message: 'Nothing is waiting for confirmation' }
      const label = pending.label
      pending.el.click()
      setPending(null)
      return { ok: true, message: `Confirmed: ${label}` }
    },
    cancel: () => {
      const had = Boolean(pending)
      setPending(null)
      window.speechSynthesis?.cancel()
      setReading(false)
      return had
    },
    read: readPage,
    stopReading: () => { window.speechSynthesis?.cancel(); setReading(false) },
    clearPending: () => setPending(null),
  }))

  const cx = rootRef.current ? pointer.x * rootRef.current.clientWidth : 0
  const cy = rootRef.current ? pointer.y * rootRef.current.clientHeight : 0
  const results = ARTICLES.filter((a) =>
    `${a.title} ${a.text}`.toLowerCase().includes(query.toLowerCase().split(' ')[0] || '')
  )

  const card = 'rounded-xl border border-white/10 bg-navy-800/60 p-5 text-left'
  return (
    <div
      ref={rootRef}
      className="glass relative flex h-[34rem] flex-col overflow-hidden"
      onFocusCapture={(e) => { if (e.target.matches('input, textarea')) lastInput.current = e.target }}
    >
      {/* Browser bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-navy-900/80 p-3">
        <button className="btn-ghost !px-3 !py-2" data-click data-label="Go back" aria-label="Go back"
          onClick={goBack}>
          <ArrowLeft size={18} />
        </button>
        <button className="btn-ghost !px-3 !py-2" data-click data-label="Go home" aria-label="Go home" onClick={() => { setHistory([]); setPage('home') }}>
          <Home size={18} />
        </button>
        <form className="flex min-w-[10rem] flex-1 items-center gap-2" onSubmit={(e) => { e.preventDefault(); if (query.trim()) runSearch(query.trim()) }}>
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input ref={searchRef} data-click aria-label="Search bar" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search — or say “search for accessibility”"
              className="w-full rounded-xl border border-white/15 bg-navy-950/70 py-2.5 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-cyan-300 focus:outline-none" />
          </div>
        </form>
        <button className="btn-ghost !px-3 !py-2" data-click data-label="Scroll up" aria-label="Scroll up" onClick={() => scrollRef.current?.scrollBy({ top: -320, behavior: 'smooth' })}><ChevronUp size={18} /></button>
        <button className="btn-ghost !px-3 !py-2" data-click data-label="Scroll down" aria-label="Scroll down" onClick={() => scrollRef.current?.scrollBy({ top: 320, behavior: 'smooth' })}><ChevronDown size={18} /></button>
        <button className="btn-ghost !px-3 !py-2" data-click data-label={reading ? 'Stop reading' : 'Read aloud'} aria-label="Read aloud"
          onClick={() => { if (reading) { window.speechSynthesis.cancel(); setReading(false) } else readPage() }}>
          {reading ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>

      {pending && (
        <div role="alert" className="flex items-center gap-3 border-b border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm">
          <ShieldAlert size={18} className="shrink-0 text-amber-300" />
          <span className="flex-1">About to <strong>{pending.label}</strong>. Say “confirm” or “cancel”.</span>
          <button className="btn-primary !px-3 !py-1.5 !text-sm" onClick={() => { pending.el.click(); setPending(null) }}>Confirm</button>
          <button className="btn-ghost !px-3 !py-1.5 !text-sm" onClick={() => setPending(null)}>Cancel</button>
        </div>
      )}
      {notice && <div role="status" className="border-b border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100">{notice}</div>}

      {/* Page content */}
      <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto p-6">
        {page === 'home' && (
          <>
            <h2 className="text-2xl font-bold">Demo Browser</h2>
            <p className="max-w-prose text-slate-300">A safe practice space. Move your head to steer the cyan ring, then say “click”. Everything here is local — nothing is sent anywhere.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <button className={card} data-click data-label="Open Articles" onClick={() => go('articles')}><h3 className="font-semibold">Articles</h3><p className="mt-1 text-sm text-slate-300">Four short guides to read or listen to.</p></button>
              <button className={card} data-click data-label="Open Contact form" onClick={() => go('contact')}><h3 className="font-semibold">Contact form</h3><p className="mt-1 text-sm text-slate-300">Practice voice typing and safe submitting.</p></button>
            </div>
            <p className="text-slate-400">Scroll down for more…</p>
            <div className="h-64 rounded-xl border border-dashed border-white/15 p-4 text-sm text-slate-400">Extra space so you can practise “scroll down”, “scroll up” and “go to the top”.</div>
          </>
        )}
        {page === 'articles' && (
          <>
            <h2 className="text-2xl font-bold">Articles</h2>
            {ARTICLES.map((a) => (
              <article key={a.id} className={card}><h3 className="font-semibold">{a.title}</h3><p className="mt-1 text-sm text-slate-300">{a.text}</p></article>
            ))}
          </>
        )}
        {page === 'results' && (
          <>
            <h2 className="text-2xl font-bold">Results for “{query}”</h2>
            <p className="text-sm text-slate-400">Demo results from the local articles — not a real web search.</p>
            {results.length ? results.map((a) => (
              <button key={a.id} className={card} data-click data-label={`Open ${a.title}`} onClick={() => go('articles')}><h3 className="font-semibold">{a.title}</h3><p className="mt-1 text-sm text-slate-300">{a.text}</p></button>
            )) : <p className="text-slate-300">No local matches. Try “head”, “voice” or “lighting”.</p>}
          </>
        )}
        {page === 'contact' && (
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <h2 className="text-2xl font-bold">Contact form</h2>
            <input data-click aria-label="Name field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name"
              className="w-full rounded-xl border border-white/15 bg-navy-950/70 p-3 focus:border-cyan-300 focus:outline-none" />
            <textarea data-click aria-label="Message field" rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Your message"
              className="w-full rounded-xl border border-white/15 bg-navy-950/70 p-3 focus:border-cyan-300 focus:outline-none" />
            <button type="button" className="btn-primary" data-click data-consequential="1" data-label="send the message"
              onClick={() => { flash('Demo only: the message was NOT sent anywhere.'); setForm({ name: '', message: '' }) }}>
              Send message
            </button>
            <p className="text-sm text-slate-400">Sending always asks you to confirm first.</p>
          </form>
        )}
      </div>

      {/* Head-tracked pointer */}
      {active && (
        <div aria-hidden className="pointer-events-none absolute z-20 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-cyan-300 bg-cyan-300/20 shadow-[0_0_20px_#22d3ee]"
          style={{ left: cx, top: cy }} />
      )}
    </div>
  )
})

export default Workspace
