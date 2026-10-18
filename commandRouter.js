// Turns recognized speech into an action. Only phrases that START with a known
// command word are accepted, so normal talking never triggers anything.
// Text after "type" / "search for" is treated as literal text, not as commands.
const MIN_CONFIDENCE = 0.5

export function parseCommand(rawText, confidence = 1) {
  const text = rawText.toLowerCase().replace(/[.,!?]/g, '').trim()
  if (!text) return { type: 'ignored' }
  // Browsers report 0 when they have no confidence value; only reject real low scores.
  if (confidence > 0 && confidence < MIN_CONFIDENCE) {
    return { type: 'rejected', reason: 'low confidence', text }
  }

  let m
  if (/^(start|begin) hands ?free$/.test(text)) return { type: 'start' }
  if (/^(stop|end) hands ?free$/.test(text)) return { type: 'stop' }
  if (/^stop reading$/.test(text)) return { type: 'stop-reading' }
  if (/^read (this |the )?page( aloud)?$/.test(text)) return { type: 'read' }
  if (/^scroll down$/.test(text)) return { type: 'scroll-down' }
  if (/^scroll up$/.test(text)) return { type: 'scroll-up' }
  if (/^go to (the )?top$/.test(text)) return { type: 'top' }
  if (/^go back$/.test(text)) return { type: 'back' }
  if (/^go home$/.test(text)) return { type: 'home' }
  if (/^cancel$/.test(text)) return { type: 'cancel' }
  if (/^(confirm|yes confirm|do it)$/.test(text)) return { type: 'confirm' }
  if (/^(click|select|press)( this| that| it)?$/.test(text)) return { type: 'click' }
  if ((m = text.match(/^search (?:for )?(.+)$/))) return { type: 'search', payload: m[1] }
  if ((m = text.match(/^type (.+)$/))) return { type: 'type', payload: m[1] }

  return { type: 'unknown', text }
}

export const ACTION_LABELS = {
  start: 'Start handsfree',
  stop: 'Stop handsfree',
  'stop-reading': 'Stop reading',
  read: 'Read this page',
  'scroll-down': 'Scroll down',
  'scroll-up': 'Scroll up',
  top: 'Go to the top',
  back: 'Go back',
  home: 'Go home',
  cancel: 'Cancel',
  confirm: 'Confirm action',
  click: 'Click under pointer',
  search: 'Search',
  type: 'Type text',
}
