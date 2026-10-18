import { motion } from 'framer-motion'
import { ScanFace, Mic, ShieldCheck, MousePointerClick, Keyboard, Accessibility } from 'lucide-react'

const FEATURES = [
  { icon: ScanFace, title: 'Head-tracked pointer', text: 'Your webcam follows your head and moves an on-screen pointer. Processing stays in your browser.' },
  { icon: Mic, title: 'Voice commands', text: 'Scroll, go back, click and search by speaking. Ordinary talking never triggers anything.' },
  { icon: Keyboard, title: 'Voice typing', text: 'Say “type” and your words fill the focused field.' },
  { icon: MousePointerClick, title: 'Confirm before it counts', text: 'Consequential actions like sending a form always ask first. A big Emergency stop is always visible.' },
]
const STEPS = ['Press Start and allow camera and microphone.', 'Look straight ahead for a moment while the app finds your neutral pose.', 'Move your head to steer the pointer, then say “click”.', 'Say “confirm” when asked, or “cancel” to back out.']

export default function Landing({ onStart }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <nav className="mb-16 flex items-center gap-2 font-bold tracking-wide"><Accessibility className="text-cyan-300" /> HANDSFREE AI</nav>
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-3xl">
        <h1 className="text-5xl font-extrabold leading-tight sm:text-7xl">Browse Freely.<br /><span className="bg-gradient-to-r from-violet-400 to-cyan-300 bg-clip-text text-transparent">Control Naturally.</span></h1>
        <p className="mt-6 max-w-prose text-lg text-slate-300">Many people cannot comfortably use a mouse or keyboard. Handsfree AI lets you browse with just a webcam and a microphone — no special hardware.</p>
        <button className="btn-primary mt-8 !px-8 !py-4 text-lg" onClick={onStart}>Start Browsing</button>
      </motion.section>

      <section className="mt-20 grid gap-4 sm:grid-cols-2">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <div key={title} className="glass p-6"><Icon className="mb-3 text-violet-300" /><h3 className="text-lg font-semibold">{title}</h3><p className="mt-1 text-slate-300">{text}</p></div>
        ))}
      </section>

      <section className="mt-20">
        <h2 className="mb-6 text-3xl font-bold">How it works</h2>
        <ol className="space-y-3">
          {STEPS.map((s, i) => (
            <li key={s} className="glass flex items-center gap-4 p-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cyan-300 font-bold text-navy-950">{i + 1}</span>{s}</li>
          ))}
        </ol>
      </section>

      <section className="glass mt-20 p-6">
        <h2 className="mb-2 flex items-center gap-2 text-2xl font-bold"><ShieldCheck className="text-emerald-300" /> Privacy and honest limits</h2>
        <ul className="list-disc space-y-1 pl-5 text-slate-300">
          <li>Camera frames are analysed in your browser and are never uploaded. The camera turns off when you stop.</li>
          <li>Voice recognition in Chrome and Edge uses an online speech service, so it needs internet. Firefox is not supported.</li>
          <li>A web page cannot move your operating-system mouse. The pointer works inside the demo browser; a Chrome extension could extend it to other sites later.</li>
        </ul>
      </section>
    </div>
  )
}
