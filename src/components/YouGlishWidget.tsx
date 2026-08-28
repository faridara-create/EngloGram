import { useEffect, useId, useState } from 'react'

type YouGlishInstance = {
  fetch: (query: string, language: string, accent?: string) => void
  pause?: () => void
}

type YouGlishConstructor = new (
  elementId: string,
  options: Record<string, unknown>,
) => YouGlishInstance

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

type Props = {
  query: string
  language: string
  accent?: string
}

export function YouGlishWidget({ query, language, accent }: Props) {
  const reactId = useId()
  const id = `youglish-${reactId.replace(/:/g, '')}`
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    let widget: YouGlishInstance | undefined
    let cancelled = false
    loadApi()
      .then(() => {
        if (cancelled || !window.YG) return
        widget = new window.YG.Widget(id, {
          components: 9,
          autoStart: 0,
          restrictedMode: 1,
          events: { onFetchDone: () => setStatus('ready') },
        })
        widget.fetch(query, language, accent)
        setStatus('ready')
      })
      .catch(() => !cancelled && setStatus('error'))
    return () => {
      cancelled = true
      widget?.pause?.()
    }
  }, [accent, id, language, query])

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
      <a className="youglish-credit" href="https://youglish.com" target="_blank" rel="noreferrer">Powered by YouGlish.com</a>
    </div>
  )
}
