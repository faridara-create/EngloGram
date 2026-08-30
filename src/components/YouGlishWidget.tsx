import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from 'react'

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

type FetchEvent = { totalResult?: number }
type VideoEvent = { trackNumber?: number }
type PlayerEvent = { state?: number }
type CaptionEvent = { caption?: string }
type Props = { query: string; language: string; accent?: string; active: boolean }

function estimateCaptionLines(caption = '') {
  let decoded = caption
  try {
    decoded = decodeURIComponent(caption)
  } catch {
    // Keep the original caption when a provider string is not URI encoded.
  }

  const words = decoded.replace(/\[\[\[|\]\]\]/g, '').trim().split(/\s+/).filter(Boolean)
  const lineCapacity = Math.max(38, Math.floor((Math.min(window.innerWidth, 430) - 14) / 7.5))
  let lines = 1
  let lineLength = 0

  for (const word of words) {
    const nextLength = lineLength ? lineLength + word.length + 1 : word.length
    if (lineLength && nextLength > lineCapacity) {
      lines += 1
      lineLength = word.length
    } else {
      lineLength = nextLength
    }
  }

  return Math.min(4, Math.max(1, lines))
}

export function YouGlishWidget({ query, language, accent, active }: Props) {
  const reactId = useId()
  const id = `youglish-${reactId.replace(/:/g, '')}`
  const widgetRef = useRef<YouGlishInstance | null>(null)
  const activeRef = useRef(active)
  const readyRef = useRef(false)
  const playerStateRef = useRef<number | null>(null)
  const playCheckRef = useRef<number | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [total, setTotal] = useState<number | null>(null)
  const [current, setCurrent] = useState(1)
  const [fetchCount, setFetchCount] = useState(0)
  const [needsPlayAction, setNeedsPlayAction] = useState(false)
  const [captionLines, setCaptionLines] = useState(2)

  const clearPlayCheck = useCallback(() => {
    if (playCheckRef.current !== null) window.clearTimeout(playCheckRef.current)
    playCheckRef.current = null
  }, [])

  const requestPlayback = useCallback(() => {
    if (!activeRef.current || !readyRef.current || !widgetRef.current) return

    clearPlayCheck()
    setNeedsPlayAction(false)
    playerStateRef.current = null
    widgetRef.current.play?.()
    playCheckRef.current = window.setTimeout(() => {
      if (activeRef.current && playerStateRef.current !== 1) setNeedsPlayAction(true)
      playCheckRef.current = null
    }, 1400)
  }, [clearPlayCheck])

  useEffect(() => {
    activeRef.current = active
    if (!active) {
      clearPlayCheck()
      setNeedsPlayAction(false)
      widgetRef.current?.pause?.()
      return
    }

    requestPlayback()
  }, [active, clearPlayCheck, requestPlayback])

  useEffect(() => {
    let cancelled = false
    readyRef.current = false
    playerStateRef.current = null
    setStatus('loading')
    setTotal(null)
    setCurrent(1)
    setCaptionLines(2)

    loadApi()
      .then(() => {
        if (cancelled || !window.YG) return

        const widget = new window.YG.Widget(id, {
          components: 8,
          autoStart: 0,
          restrictionMode: 1,
          videoQuality: 'default',
          events: {
            onFetchDone: (event: FetchEvent) => {
              if (cancelled) return
              setTotal(typeof event?.totalResult === 'number' ? event.totalResult : null)
              setStatus('ready')
              readyRef.current = true
              if (activeRef.current) window.setTimeout(requestPlayback, 0)
            },
            onVideoChange: (event: VideoEvent) => {
              if (cancelled || typeof event?.trackNumber !== 'number') return
              setCurrent(Math.max(1, event.trackNumber))
              setCaptionLines(2)
              if (activeRef.current) window.setTimeout(requestPlayback, 0)
            },
            onCaptionChange: (event: CaptionEvent) => {
              if (!cancelled && typeof event?.caption === 'string') {
                setCaptionLines(estimateCaptionLines(event.caption))
              }
            },
            onPlayerReady: () => {
              if (!cancelled && activeRef.current && readyRef.current) requestPlayback()
            },
            onPlayerStateChange: (event: PlayerEvent) => {
              if (cancelled || typeof event?.state !== 'number') return
              playerStateRef.current = event.state
              if (event.state === 1) {
                clearPlayCheck()
                setNeedsPlayAction(false)
              } else if (activeRef.current && event.state === 2) {
                setNeedsPlayAction(true)
              }
            },
            onError: () => {
              if (!cancelled) setStatus('error')
            },
          },
        })

        widgetRef.current = widget
        setFetchCount((count) => count + 1)
        widget.fetch(query, language, accent)
      })
      .catch(() => !cancelled && setStatus('error'))

    return () => {
      cancelled = true
      clearPlayCheck()
      readyRef.current = false
      widgetRef.current?.pause?.()
      widgetRef.current = null
    }
  }, [accent, clearPlayCheck, id, language, query, requestPlayback])

  if (status === 'error') {
    return (
      <div className="external-fallback" data-query={query} data-fetch-count={fetchCount}>
        <span>External clip unavailable</span>
        <p>YouGlish could not load here. Open the official search in a new tab.</p>
        <a href={`https://youglish.com/pronounce/${encodeURIComponent(query)}/english`} target="_blank" rel="noreferrer">Open YouGlish ↗</a>
      </div>
    )
  }

  return (
    <div className="youglish-frame" data-query={query} data-fetch-count={fetchCount} data-active={active}>
      <div className="youglish-viewport" style={{ '--youglish-caption-height': `${31 + captionLines * 27}px` } as CSSProperties}>
        {status === 'loading' && <div className="widget-loading">Loading real video examples…</div>}
        <div id={id} className="youglish-target" aria-label={`YouGlish video examples for ${query}`} />
        {needsPlayAction && (
          <button className="youglish-play" onClick={requestPlayback} type="button">▶ Play video</button>
        )}
      </div>
      <div className="youglish-panel">
        <div className="youglish-controls" aria-label="YouGlish video controls">
          <button onClick={() => widgetRef.current?.previous?.()} disabled={status !== 'ready' || current <= 1}>← Previous</button>
          <button onClick={() => widgetRef.current?.replay?.()} disabled={status !== 'ready'}>Replay</button>
          <button className="youglish-next" onClick={() => widgetRef.current?.next?.()} disabled={status !== 'ready' || Boolean(total && current >= total)}>Next →</button>
        </div>
        <div className="youglish-count" aria-live="polite">
          {status === 'ready' ? `Example ${current}${total ? ` of ${total}` : ''}` : 'Finding real examples…'}
        </div>
      </div>
      <a className="youglish-credit" href="https://youglish.com" target="_blank" rel="noreferrer">Powered by YouGlish.com</a>
    </div>
  )
}
