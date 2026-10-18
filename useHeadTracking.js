import { useCallback, useEffect, useRef, useState } from 'react'
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'

// Needs internet the first time (loads the WASM runtime + model from a CDN).
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

// How far the pointer moves per unit of head movement (before the sensitivity slider).
const GAIN_X = 4.5
const GAIN_Y = 6.5
const SMOOTHING = 0.25 // 0..1, lower = smoother but laggier
const LOST_FRAMES_BEFORE_PAUSE = 12
const NEUTRAL_FRAMES = 20

/**
 * Real landmark-based head tracking (no simulation).
 * Idea: the nose tip moves relative to the middle of the face when you turn or
 * tilt your head. We measure that offset, subtract your "neutral" pose, and map it
 * to screen coordinates (0..1) with smoothing.
 */
export function useHeadTracking({ videoRef, sensitivity = 1 }) {
  const [status, setStatus] = useState('idle') // idle | loading | running | face-lost | error
  const [error, setError] = useState(null)
  const [warning, setWarning] = useState(null)
  const [pointer, setPointer] = useState({ x: 0.5, y: 0.5 })

  const landmarkerRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(0)
  const runningRef = useRef(false)
  const sensRef = useRef(sensitivity)
  const neutralRef = useRef(null)
  const neutralSamples = useRef([])
  const lastFeature = useRef(null)
  const smooth = useRef({ x: 0.5, y: 0.5 })
  const lostFrames = useRef(0)
  const lastVideoTime = useRef(-1)
  const frameCount = useRef(0)
  const canvasRef = useRef(null)

  useEffect(() => {
    sensRef.current = sensitivity
  }, [sensitivity])

  const measureBrightness = useCallback((video) => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas')
      canvasRef.current.width = 32
      canvasRef.current.height = 24
    }
    const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(video, 0, 0, 32, 24)
    const data = ctx.getImageData(0, 0, 32, 24).data
    let sum = 0
    for (let i = 0; i < data.length; i += 4) {
      sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    }
    return sum / (data.length / 4)
  }, [])

  const loop = useCallback(() => {
    if (!runningRef.current) return
    const video = videoRef.current
    const landmarker = landmarkerRef.current

    if (video && landmarker && video.readyState >= 2 && video.currentTime !== lastVideoTime.current) {
      lastVideoTime.current = video.currentTime
      frameCount.current += 1
      const result = landmarker.detectForVideo(video, performance.now())
      const lm = result.faceLandmarks?.[0]

      if (frameCount.current % 30 === 0) {
        const brightness = measureBrightness(video)
        if (brightness < 45) setWarning('The room looks dark. Add light in front of your face.')
        else if (brightness > 215) setWarning('Too bright or backlit. Avoid a window behind you.')
        else if (!lm) setWarning('No face found. Face the camera and keep your whole face in view.')
        else setWarning((w) => (w && w.startsWith('Move closer') ? w : null))
      }

      if (!lm) {
        lostFrames.current += 1
        if (lostFrames.current > LOST_FRAMES_BEFORE_PAUSE) setStatus('face-lost')
      } else {
        lostFrames.current = 0
        const nose = lm[1]
        const left = lm[234]
        const right = lm[454]
        const top = lm[10]
        const chin = lm[152]
        const faceW = Math.abs(right.x - left.x) || 1e-6
        const faceH = Math.abs(chin.y - top.y) || 1e-6

        if (faceW < 0.18) setWarning('Move closer to the camera so tracking stays accurate.')

        const feature = {
          x: (nose.x - (left.x + right.x) / 2) / faceW,
          y: (nose.y - (top.y + chin.y) / 2) / faceH,
        }
        lastFeature.current = feature

        // Auto-centre: average your first frames as the "neutral" pose.
        if (!neutralRef.current) {
          neutralSamples.current.push(feature)
          if (neutralSamples.current.length >= NEUTRAL_FRAMES) {
            const n = neutralSamples.current.length
            neutralRef.current = {
              x: neutralSamples.current.reduce((a, f) => a + f.x, 0) / n,
              y: neutralSamples.current.reduce((a, f) => a + f.y, 0) / n,
            }
          }
        } else {
          setStatus('running')
          // The camera image is not mirrored, so turning right makes nose.x DEcrease.
          const rawX = 0.5 - (feature.x - neutralRef.current.x) * GAIN_X * sensRef.current
          const rawY = 0.5 + (feature.y - neutralRef.current.y) * GAIN_Y * sensRef.current
          const tx = Math.min(1, Math.max(0, rawX))
          const ty = Math.min(1, Math.max(0, rawY))
          smooth.current.x += (tx - smooth.current.x) * SMOOTHING
          smooth.current.y += (ty - smooth.current.y) * SMOOTHING
          setPointer({ x: smooth.current.x, y: smooth.current.y })
        }
      }
    }
    rafRef.current = requestAnimationFrame(loop)
  }, [videoRef, measureBrightness])

  const start = useCallback(async () => {
    if (runningRef.current) return
    setError(null)
    setWarning(null)
    setStatus('loading')
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera access needs HTTPS or localhost and a modern browser.')
      }
      if (!landmarkerRef.current) {
        const fileset = await FilesetResolver.forVisionTasks(WASM_URL)
        const options = (delegate) => ({
          baseOptions: { modelAssetPath: MODEL_URL, delegate },
          runningMode: 'VIDEO',
          numFaces: 1,
        })
        try {
          landmarkerRef.current = await FaceLandmarker.createFromOptions(fileset, options('GPU'))
        } catch {
          landmarkerRef.current = await FaceLandmarker.createFromOptions(fileset, options('CPU'))
        }
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      })
      streamRef.current = stream
      const video = videoRef.current
      video.srcObject = stream
      await video.play()

      neutralRef.current = null
      neutralSamples.current = []
      lostFrames.current = 0
      lastVideoTime.current = -1
      frameCount.current = 0
      runningRef.current = true
      setStatus('loading') // switches to "running" once the neutral pose is captured
      rafRef.current = requestAnimationFrame(loop)
    } catch (err) {
      const msg =
        err.name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow it in the browser address bar and try again.'
          : err.name === 'NotFoundError'
          ? 'No camera found on this device.'
          : err.message || 'Could not start head tracking.'
      setError(msg)
      setStatus('error')
    }
  }, [loop, videoRef])

  const stop = useCallback(() => {
    runningRef.current = false
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop()) // releases the webcam
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setStatus('idle')
    setWarning(null)
    setPointer({ x: 0.5, y: 0.5 })
    smooth.current = { x: 0.5, y: 0.5 }
  }, [videoRef])

  // Re-centre: use the current head pose as the new "looking straight ahead".
  const recenter = useCallback(() => {
    if (lastFeature.current) neutralRef.current = { ...lastFeature.current }
  }, [])

  useEffect(() => () => stop(), [stop])

  return { status, error, warning, pointer, start, stop, recenter }
}
