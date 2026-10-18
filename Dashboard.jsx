import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Camera, Mic, ScanFace, Server, Play, Square, OctagonX, Crosshair, ArrowLeft } from 'lucide-react'
import Workspace from './Workspace.jsx'
import StatusPill from './StatusPill.jsx'
import { useHeadTracking } from '../hooks/useHeadTracking.js'
import { useSpeech } from '../hooks/useSpeech.js'
import { parseCommand, ACTION_LABELS } from '../lib/commandRouter.js'
import { api } from '../services/api.js'

const TRACK_TEXT = {
  idle: ['Off', 'off'], loading: ['Starting… hold still', 'warn'], running: ['Tracking', 'good'],
  'face-lost': ['Face lost — paused', 'warn'], error: ['Error', 'bad'],
}

export default function Dashboard({ onExit }) {
  const videoRef = useRef(null)
  const wsRef = useRef(null)
  const [sensitivity, setSensitivity] = useState(1)
  const [spoken, setSpoken] = useState(false)
  const [heard, setHeard] = useState(null) // { text, label, ok }
  const [history, setHistory] = useState([])
  const [backend, setBackend] = useState({ state: 'checking' })

  const tracking = useHeadTracking({ videoRef, sensitivity })

  useEffect(() => {
    api.health().then(() => setBackend({ state: 'ok' }), (e) => setBackend({ state: 'down', message: e.message }))
  }, [])

  const say = useCallback((msg) => {
    if (!spoken || !window.speechSynthesis) return
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(msg))
  }, [spoken])

  const log = useCallback((text, label, ok) => {
    setHeard({ text, label, ok })
    setHistory((h) => [{ id: crypto.randomUUID(), text, label, ok, time: new Date().toLocaleTimeString() }, ...h].slice(0, 8))
  }, [])

  const handleSpeech = useCallback((text, confidence) => {
    const cmd = parseCommand(text, confidence)
    const ws = wsRef.current
    if (cmd.type === 'ignored') return
    if (cmd.type === 'unknown') return log(text, 'Not a command — ignored', false)
    if (cmd.type === 'rejected') return log(text, 'Heard unclearly — ignored', false)
    let message = ACTION_LABELS[cmd.type]
    let ok = true
    switch (cmd.type) {
      case 'start': startAll(); break
      case 'stop': stopAll(); break
      case 'scroll-down': ws.scroll(1); break
      case 'scroll-up': ws.scroll(-1); break
      case 'top': ws.top(); break
      case 'home': ws.home(); break
      case 'back': ok = ws.back(); if (!ok) message = 'Nothing to go back to'; break
      case 'read': ok = ws.read(); if (!ok) message = 'Read aloud is not supported here'; break
      case 'stop-reading': ws.stopReading(); break
      case 'cancel': ws.cancel(); break
      case 'search': ws.search(cmd.payload); message = `Search: “${cmd.payload}”`; break
      case 'type': message = `Typed into ${ws.type(cmd.payload)}: “${cmd.payload}”`; break
      case 'click': { const r = ws.click(); ok = r.ok; message = r.message; break }
      case 'confirm': { const r = ws.confirm(); ok = r.ok; message = r.message; break }
      default: break
    }
    log(text, message, ok)
    say(message)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log, say])

  const speech = useSpeech({ onFinal: handleSpeech })

  const startAll = useCallback(() => { tracking.start(); speech.start() }, [tracking, speech])
  const stopAll = useCallback(() => {
    tracking.stop(); speech.stop(); wsRef.current?.stopReading(); wsRef.current?.clearPending()
  }, [tracking, speech])
  const emergencyStop = () => { stopAll(); window.speechSynthesis?.cancel(); setHeard({ text: '', label: 'Emergency stop — everything is off', ok: false }) }

  const running = tracking.status === 'loading' || tracking.status === 'running' || tracking.status === 'face-lost'
  const [trackLabel, trackTone] = TRACK_TEXT[tracking.status]
  const camOn = running
  const micLabel = !speech.supported ? 'Unsupported browser' : speech.error ? 'Error' : speech.listening ? 'Listening' : 'Off'
  const micTone = !speech.supported || speech.error ? 'bad' : speech.listening ? 'good' : 'off'

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button className="btn-ghost !px-3" onClick={onExit} aria-label="Back to home"><ArrowLeft size={18} /></button>
          <h1 className="text-2xl font-bold">Dashboard</h1>
        </div>
        <button className="btn-danger" onClick={emergencyStop}><OctagonX size={20} /> Emergency stop</button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        <div className="space-y-4">
          <section className="glass overflow-hidden p-3">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-navy-900">
              <video ref={videoRef} muted playsInline className="h-full w-full -scale-x-100 object-cover" />
              {!camOn && (
                <div className="absolute inset-0 grid place-items-center text-center text-sm text-slate-300">
                  <div><Camera className="mx-auto mb-2" />Camera is off.<br />It only turns on when you press Start.</div>
                </div>
              )}
            </div>
            {tracking.warning && <p role="status" className="mt-3 rounded-lg bg-amber-400/15 p-3 text-sm text-amber-100">{tracking.warning}</p>}
            {tracking.error && <p role="alert" className="mt-3 rounded-lg bg-red-400/15 p-3 text-sm text-red-100">{tracking.error}</p>}
            {speech.error && <p role="alert" className="mt-3 rounded-lg bg-red-400/15 p-3 text-sm text-red-100">{speech.error}</p>}
            {!speech.supported && <p role="alert" className="mt-3 rounded-lg bg-red-400/15 p-3 text-sm text-red-100">Voice commands need Chrome or Edge. Head tracking still works.</p>}
          </section>

          <section className="grid grid-cols-1 gap-2">
            <StatusPill icon={Camera} label="Camera" value={camOn ? 'On' : 'Off'} tone={camOn ? 'good' : 'off'} />
            <StatusPill icon={ScanFace} label="Head tracking" value={trackLabel} tone={trackTone} />
            <StatusPill icon={Mic} label="Microphone / voice" value={micLabel} tone={micTone} />
            <StatusPill icon={Server} label={`Backend (${api.baseUrl})`}
              value={backend.state === 'ok' ? 'Connected' : backend.state === 'down' ? 'Unavailable' : 'Checking…'}
              tone={backend.state === 'ok' ? 'good' : backend.state === 'down' ? 'warn' : 'off'} />
          </section>
          {backend.state === 'down' && <p className="text-sm text-amber-200">{backend.message}. The app still works; only saved analytics need the backend.</p>}

          <section className="glass space-y-4 p-4">
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-primary" onClick={startAll} disabled={running}><Play size={18} /> Start</button>
              <button className="btn-ghost" onClick={stopAll} disabled={!running && !speech.listening}><Square size={18} /> Stop</button>
            </div>
            <button className="btn-ghost w-full" onClick={speech.listening ? speech.stop : speech.start} disabled={!speech.supported}>
              <Mic size={18} /> {speech.listening ? 'Turn voice off' : 'Voice only'}
            </button>
            <button className="btn-ghost w-full" onClick={tracking.recenter} disabled={tracking.status !== 'running'}>
              <Crosshair size={18} /> Re-centre (look straight, then press)
            </button>
            <label className="block text-sm">
              <span className="mb-1 flex justify-between"><span>Cursor sensitivity</span><span className="font-semibold">{sensitivity.toFixed(1)}×</span></span>
              <input type="range" min="0.3" max="3" step="0.1" value={sensitivity} onChange={(e) => setSensitivity(+e.target.value)} className="w-full accent-cyan-300" />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={spoken} onChange={(e) => setSpoken(e.target.checked)} className="h-4 w-4 accent-cyan-300" />
              Spoken confirmations (may be picked up by your mic)
            </label>
          </section>
        </div>

        <div className="space-y-4">
          <section className="glass p-4" aria-live="polite">
            <div className="text-xs text-slate-400">Current command</div>
            <AnimatePresence mode="wait">
              <motion.div key={heard ? heard.text + heard.label : 'none'} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {heard ? (
                  <p className="mt-1"><span className="text-lg font-semibold">{heard.text ? `“${heard.text}”` : ''}</span>{' '}
                    <span className={heard.ok ? 'text-emerald-300' : 'text-amber-300'}>→ {heard.label}</span></p>
                ) : <p className="mt-1 text-slate-300">Say “scroll down”, “click”, “search for lighting” or “type hello”.</p>}
              </motion.div>
            </AnimatePresence>
            {speech.interim && <p className="mt-1 text-sm italic text-slate-400">Hearing: {speech.interim}…</p>}
          </section>

          <Workspace ref={wsRef} pointer={tracking.pointer} active={tracking.status === 'running'} />

          <section className="glass p-4">
            <h2 className="mb-2 font-semibold">Recent commands</h2>
            {history.length === 0 ? <p className="text-sm text-slate-400">Nothing yet.</p> : (
              <ul className="space-y-1 text-sm">
                {history.map((h) => (
                  <li key={h.id} className="flex justify-between gap-3 border-b border-white/5 py-1">
                    <span>{h.text ? `“${h.text}”` : '—'} <span className={h.ok ? 'text-emerald-300' : 'text-amber-300'}>→ {h.label}</span></span>
                    <span className="shrink-0 text-slate-500">{h.time}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
