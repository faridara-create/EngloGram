import { useEffect, useId, useRef, useState } from 'react'

type YouGlishInstance = {
  fetch: (query: string, language: string, accent?: string) => void
  play?: () => void
  pause?: () => void
  replay?: () => void
  previous?: () => void
  next?: () => void
}

type YouGlishConstructor = new (elementId: string, options: Record<string, unknown>) => YouGlishInstance

declare global {
  interface Window {
    YG?: { Widget: YouGlishConstructor }
    onYouglishAPIReady?: () => void
  }
}

let apiPromise: Promise<void> | null = null

function loadApi(): Promise<void> {
  if (window.YG) return Promise.resolve()
  if (apiPromise) return apiPromise
  apiPromise = new Promise((resolve, reject) => {
    window.onYouglishAPIReady = resolve
    const existing = document.querySelector<HTMLScriptElement>('script[data-youglish-api]')
    if (existing) return
    const script = document.createElement('script')
    script.src = 'https://youglish.com/public/emb/widget.js'
    script.async = true
    script.dataset.youglishApi = 'true'
    script.onerror = () => reject(new Error('YouGlish API could not be loaded.'))
    document.head.appendChild(script)
  })
  return apiPromise
}

function findNumber(values: unknown[], keys: string[]) {
  for (const value of values) {
    if (typeof value === 'number') return value
    if (value && typeof value === 'object') {
      for (const key of keys) {
        const candidate = (value as Record<string, unknown>)[key]
        if (typeof candidate === 'number') return candidate
      }
    }
  }
  return null
}

type Props = { query: string; language: string; accent?: string }

export function YouGlishWidget({ query, language, accent }: Props) {
  const reactId = useId()
  const id = `youglish-${reactId.replace(/:/g, '')}`
  const widgetRef = useRef<YouGlishInstance | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [total, setTotal] = useState<number | null>(null)
  const [current, setCurrent] = useState(1)
  const [needsPlay, setNeedsPlay] = useState(true)

  useEffect(() => {
    let cancelled = false
    loadApi()
      .then(() => {
        if (cancelled || !window.YG) return
        const widget = new window.YG.Widget(id, {
          components: 9,
          autoStart: 1,
          restrictedMode: 1,
          events: {
            onFetchDone: (...args: unknown[]) => {
              if (cancelled) return
              setTotal(findNumber(args, ['totalResult', 'total', 'resultCount']))
              setStatus('ready')
              window.setTimeout(() => widget.play?.(), 0)
            },
            onVideoChange: (...args: unknown[]) => {
              if (cancelled) return
              const track = findNumber(args, ['trackNumber', 'track', 'current'])
              if (track !== null) setCurrent(Math.max(1, track))
            },
          },
        })
        widgetRef.current = widget
        widget.fetch(query, language, accent)
      })
      .catch(() => !cancelled && setStatus('error'))
    return () => {
      cancelled = true
      widgetRef.current?.pause?.()
      widgetRef.current = null
    }
  }, [accent, id, language, query])

  const play = () => {
    widgetRef.current?.play?.()
    setNeedsPlay(false)
  }

  if (status === 'error') {
    return (
      <div className="external-fallback">
        <span>External clip unavailable</span>
        <p>YouGlish could not load here. Open the official search in a new tab.</p>
        <a href={`https://youglish.com/pronounce/${encodeURIComponent(query)}/english`} target="_blank" rel="noreferrer">Open YouGlish ↗</a>
      </div>
    )
  }

  return (
    <div className="youglish-frame">
      {status === 'loading' && <div className="widget-loading">Loading real-world speech…</div>}
      <div id={id} className="youglish-target" />
      {status === 'ready' && (
        <div className="youglish-panel">
          <div className="youglish-count">Example {current}{total ? ` of ${total}` : ''}</div>
          {needsPlay && <button className="youglish-play" onClick={play}>▶ Play real example</button>}
          <div className="youglish-controls" aria-label="YouGlish clip controls">
            <button onClick={() => widgetRef.current?.previous?.()}>← Previous</button>
            <button onClick={() => widgetRef.current?.replay?.()}>Replay</button>
            <button onClick={() => widgetRef.current?.next?.()}>Next →</button>
          </div>
        </div>
      )}
      <a className="youglish-credit" href="https://youglish.com" target="_blank" rel="noreferrer">Powered by YouGlish.com</a>
    </div>
  )
}
