import { useCallback, useEffect, useRef, useState } from 'react'

const SR = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null

/**
 * Wraps the Web Speech API. Chrome/Edge send audio to an online service, so this
 * does NOT work offline. Firefox does not support it.
 */
export function useSpeech({ onFinal }) {
  const supported = Boolean(SR)
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState(null)

  const recRef = useRef(null)
  const wantRef = useRef(false)
  const onFinalRef = useRef(onFinal)
  useEffect(() => {
    onFinalRef.current = onFinal
  }, [onFinal])

  const start = useCallback(() => {
    if (!SR || wantRef.current) return
    setError(null)
    const rec = new SR()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'

    rec.onstart = () => setListening(true)
    rec.onresult = (event) => {
      let live = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i]
        if (r.isFinal) {
          onFinalRef.current?.(r[0].transcript.trim(), r[0].confidence)
          live = ''
        } else {
          live += r[0].transcript
        }
      }
      setInterim(live)
    }
    rec.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setError('Microphone permission was denied. Allow it in the browser address bar.')
        wantRef.current = false
      } else if (e.error === 'network') {
        setError('Speech recognition needs an internet connection in this browser.')
      } else if (e.error === 'audio-capture') {
        setError('No microphone found.')
        wantRef.current = false
      } else {
        setError(`Speech error: ${e.error}`)
      }
    }
    rec.onend = () => {
      setListening(false)
      setInterim('')
      // Browsers stop recognition after silence; restart while the user wants it on.
      if (wantRef.current) setTimeout(() => wantRef.current && rec.start(), 250)
    }

    recRef.current = rec
    wantRef.current = true
    try {
      rec.start()
    } catch {
      /* already started */
    }
  }, [])

  const stop = useCallback(() => {
    wantRef.current = false
    recRef.current?.stop()
    setListening(false)
    setInterim('')
  }, [])

  useEffect(() => () => {
    wantRef.current = false
    recRef.current?.abort()
  }, [])

  return { supported, listening, interim, error, start, stop }
}
