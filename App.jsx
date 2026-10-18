import { useState } from 'react'
import Landing from './components/Landing.jsx'
import Dashboard from './components/Dashboard.jsx'

export default function App() {
  const [view, setView] = useState('landing')
  return view === 'landing'
    ? <Landing onStart={() => setView('dashboard')} />
    : <Dashboard onExit={() => setView('landing')} />
}
