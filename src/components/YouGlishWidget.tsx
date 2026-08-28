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

type FetchEvent = { totalResult?: number }
type VideoEvent = { trackNumber?: number }
type Props = { query: string; language: string; accent?: string; active: boolean }

export function YouGlishWidget({ query, language, accent, active }: Props) {
  const reactId = useId()
  const id = `youglish-${reactId.replace(/:/g, '')}`
  const widgetRef = useRef<YouGlishInstance | null>(null)
  const activeRef = useRef(active)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [total, setTotal] = useState<number | null>(null)
  const [current, setCurrent] = useState(1)
  const [fetchCount, setFetchCount] = useState(0)

  useEffect(() => {
    activeRef.current = active
    if (!active) widgetRef.current?.pause?.()
  }, [active])

  useEffect(() => {
    let cancelled = false

    loadApi()
      .then(() => {
        if (cancelled || !window.YG) return

        const widget = new window.YG.Widget(id, {
          components: 8,
          autoStart: 1,
          restrictionMode: 1,
          videoQuality: 'default',
          events: {
            onFetchDone: (event: FetchEvent) => {
              if (cancelled) return
              setTotal(typeof event?.totalResult === 'number' ? event.totalResult : null)
              setStatus('ready')
              if (activeRef.current) window.setTimeout(() => widget.play?.(), 0)
            },
            onVideoChange: (event: VideoEvent) => {
              if (cancelled || typeof event?.trackNumber !== 'number') return
              setCurrent(Math.max(1, event.trackNumber))
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
      widgetRef.current?.pause?.()
      widgetRef.current = null
    }
  }, [accent, id, language, query])

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
      {status === 'loading' && <div className="widget-loading">Loading real video examples…</div>}
      <div id={id} className="youglish-target" aria-label={`YouGlish video examples for ${query}`} />
      <div className="youglish-panel">
        <div className="youglish-count" aria-live="polite">
          {status === 'ready' ? `Example ${current}${total ? ` of ${total}` : ''}` : 'Finding real examples…'}
        </div>
        <div className="youglish-controls" aria-label="YouGlish video controls">
          <button onClick={() => widgetRef.current?.previous?.()} disabled={status !== 'ready' || current <= 1}>← Previous video</button>
          <button onClick={() => widgetRef.current?.replay?.()} disabled={status !== 'ready'}>Replay</button>
          <button className="youglish-next" onClick={() => widgetRef.current?.next?.()} disabled={status !== 'ready' || Boolean(total && current >= total)}>Next video →</button>
        </div>
      </div>
      <a className="youglish-credit" href="https://youglish.com" target="_blank" rel="noreferrer">Powered by YouGlish.com</a>
    </div>
  )
}
