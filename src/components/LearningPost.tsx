import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { LearningItem } from '../content/schema'
import { splitWithTargets } from '../content/lexical'
import { resolvePublicAsset } from '../content/loadContent'
import { useCarousel } from '../hooks/useCarousel'
import { useSpeech } from '../hooks/useSpeech'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import type { ItemProgress } from '../state/progress'
import { SocialIcon } from './SocialIcon'
import { YouGlishWidget } from './YouGlishWidget'

type Props = {
  item: LearningItem
  position: number
  isActive: boolean
  progress?: ItemProgress
  onUpdate: (patch: Partial<ItemProgress>) => void
}

function SlideDots({ active, count }: { active: number; count: number }) {
  return (
    <div className="slide-dots" aria-label={`Slide ${active + 1} of ${count}`}>
      {Array.from({ length: count }, (_, index) => <i className={index === active ? 'active' : ''} key={index} />)}
    </div>
  )
}

export function LearningPost({ item, position, isActive, progress, onUpdate }: Props) {
  const { ref, index, settledIndex, onScroll } = useCarousel()
  const { speak, stop, speaking, supported } = useSpeech()
  const practice = useSpeechRecognition()
  const [noteOpen, setNoteOpen] = useState(false)
  const lastAutoRef = useRef('')
  const state = { liked: false, saved: false, note: '', ...progress }
  const paletteStyle = {
    '--tone-a': item.image.palette[0],
    '--tone-b': item.image.palette[1],
  } as CSSProperties

  useEffect(() => {
    if (!isActive) {
      lastAutoRef.current = ''
      stop()
      practice.stopListening()
      return
    }

    const autoKey = `${item.id}-${settledIndex}`
    const autoText = settledIndex === 1
      ? item.audio.text
      : settledIndex >= 3 && settledIndex <= 5
        ? item.examples[settledIndex - 3]?.source
        : undefined

    if (autoText && lastAutoRef.current !== autoKey) {
      lastAutoRef.current = autoKey
      stop()
      speak(autoText, 'en-GB')
    }

    return () => {
      stop()
      practice.stopListening()
    }
  }, [isActive, item.audio.text, item.examples, item.id, practice.stopListening, settledIndex, speak, stop])

  const share = async () => {
    const text = `EngloGram\n${item.term}\n${item.translation}\n\n${item.examples[0].source}`
    if (navigator.share) {
      try {
        await navigator.share({ title: `EngloGram · ${item.term}`, text })
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <article className="learning-post" style={paletteStyle}>
      <div className="horizontal-carousel" ref={ref} onScroll={onScroll}>
        <section className="post-slide hero-slide">
          <div className="photo-field">
            {item.image.url && <img src={resolvePublicAsset(item.image.url)} alt={item.image.alt} loading={position <= 2 ? 'eager' : 'lazy'} />}
            <span className="photo-index">{String(position).padStart(2, '0')}</span>
            {item.image.source && <a className="photo-credit" href={item.image.source} target="_blank" rel="noreferrer">{item.image.attribution ?? item.image.provider}</a>}
          </div>
          <div className="hero-content">
            <div className="type-row">
              <span>{item.type}</span><span>{item.ipa}</span>
            </div>
            <h2>{item.term}</h2>
            <p className="translation">{item.translation}</p>
            <p className="definition">{item.definition}</p>
            <div className="social-actions">
              <button className={state.liked ? 'selected like-active' : ''} onClick={() => onUpdate({ liked: !state.liked })} aria-label={state.liked ? 'Unlike' : 'Like'} aria-pressed={state.liked}>
                <SocialIcon name="heart" filled={state.liked} /><span>Like</span>
              </button>
              <button className={state.note ? 'selected' : ''} onClick={() => setNoteOpen(true)} aria-label="Add private note">
                <SocialIcon name="comment" filled={Boolean(state.note)} /><span>Note</span>
              </button>
              <button onClick={share} aria-label="Share">
                <SocialIcon name="share" /><span>Share</span>
              </button>
              <button className={state.saved ? 'selected save-active' : ''} onClick={() => onUpdate({ saved: !state.saved })} aria-label={state.saved ? 'Remove from saved words' : 'Save word'} aria-pressed={state.saved}>
                <SocialIcon name="bookmark" filled={state.saved} /><span>Save</span>
              </button>
            </div>
          </div>
          {noteOpen && (
            <div className="note-sheet" role="dialog" aria-label="Private note">
              <div><small>PRIVATE NOTE</small><button onClick={() => setNoteOpen(false)} aria-label="Close note">×</button></div>
              <h3>Your connection to “{item.term}”</h3>
              <textarea value={state.note} onChange={(event) => onUpdate({ note: event.target.value })} placeholder="Add a memory, association or example…" autoFocus />
              <button className="done-button" onClick={() => setNoteOpen(false)}>Save note</button>
            </div>
          )}
        </section>

        <section className="post-slide pronunciation-slide">
          <p className="slide-label">02 · LISTEN & REPEAT</p>
          <div className={`sound-orbit ${speaking ? 'is-speaking' : ''}`} aria-hidden="true"><span /><span /><b>EN</b></div>
          <div className="pronunciation-copy">
            <h2>{item.term}</h2>
            <p className="ipa-large">{item.ipa}</p>
            <p>{item.translation}</p>
          </div>
          <button className="audio-pill" onClick={() => speaking ? stop() : speak(item.audio.text, 'en-GB')} disabled={!supported}>
            {speaking ? '■ Stop' : '▶ Replay pronunciation'}
          </button>
          {!supported && <small className="support-note">Speech synthesis is not supported by this browser.</small>}
        </section>

        <section className="post-slide youglish-slide">
          <p className="slide-label">03 · IN THE WILD</p>
          <div className="external-heading"><span>Real people.</span><h2>Real context.</h2><p>Hear “{item.term}” in authentic English clips.</p></div>
          <div className="widget-shell">
            {isActive && index === 2
              ? <YouGlishWidget query={item.youglish.query} language={item.youglish.language} accent={item.youglish.accent} />
              : <div className="widget-loading">Swipe here to load YouGlish.</div>}
          </div>
          <small className="privacy-copy">
            External media loads only when this slide is active. <a href="https://www.youtube.com/t/terms" target="_blank" rel="noreferrer">YouTube Terms</a> · <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Google Privacy</a>
          </small>
        </section>

        {item.examples.map((example, exampleIndex) => (
          <section className="post-slide example-slide" key={example.source}>
            <p className="slide-label">{String(exampleIndex + 4).padStart(2, '0')} · EXAMPLE {exampleIndex + 1}</p>
            <span className="quote-mark" aria-hidden="true">“</span>
            <div className="example-copy">
              <p className="source-sentence">
                {splitWithTargets(example.source, item).map((part, partIndex) => part.highlighted
                  ? <mark className="target-highlight" key={partIndex}>{part.text}</mark>
                  : <span key={partIndex}>{part.text}</span>)}
              </p>
              <div className="rule" />
              <p className="translated-sentence">{example.translation}</p>
            </div>
            <div className="practice-actions">
              <button onClick={() => speak(example.source, 'en-GB')} disabled={!supported}><SocialIcon name="speaker" /><span>Listen / Replay</span></button>
              <button onClick={() => practice.listening ? practice.stopListening() : practice.startListening(example.source)}><SocialIcon name="microphone" /><span>{practice.listening ? 'Stop listening' : 'Read aloud'}</span></button>
            </div>
            {practice.feedback && <p className="practice-feedback" role="status">{practice.feedback}</p>}
            {!practice.supported && <p className="practice-capability">Voice feedback is unavailable here; use Listen / Replay and read the whole sentence aloud.</p>}
          </section>
        ))}
      </div>
      <SlideDots active={index} count={6} />
      <span className="horizontal-hint" aria-hidden="true">SWIPE ↔</span>
    </article>
  )
}
