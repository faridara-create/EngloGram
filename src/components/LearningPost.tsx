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
  completedItems: number
  totalItems: number
  onUpdate: (patch: Partial<ItemProgress>) => void
  onHome: () => void
}

function SlideDots({ active, count }: { active: number; count: number }) {
  return (
    <div className="slide-dots" aria-label={`Slide ${active + 1} of ${count}`}>
      {Array.from({ length: count }, (_, index) => <i className={index === active ? 'active' : ''} key={index} />)}
    </div>
  )
}

function normaliseWord(word: string) {
  return word.toLocaleLowerCase('en-GB').replace(/[^a-z0-9']/g, '')
}

function FeedbackWords({ expected, transcript }: { expected: string; transcript: string }) {
  const expectedWords = expected.split(/\s+/)
  const heardWords = transcript.split(/\s+/)
  return (
    <div className="feedback-words" aria-label="Word comparison">
      {expectedWords.map((word, wordIndex) => {
        const heard = heardWords[wordIndex]
        const state = !heard ? 'missing' : normaliseWord(word) === normaliseWord(heard) ? 'matched' : 'changed'
        return <span className={state} key={`${word}-${wordIndex}`}>{state === 'changed' ? `${word} → ${heard}` : word}</span>
      })}
      {heardWords.slice(expectedWords.length).map((word, wordIndex) => <span className="changed" key={`extra-${wordIndex}`}>+ {word}</span>)}
    </div>
  )
}

export function LearningPost({ item, position, isActive, progress, completedItems, totalItems, onUpdate, onHome }: Props) {
  const { ref, index, settledIndex, onScroll, reset } = useCarousel()
  const { speak, stop, speaking, supported } = useSpeech()
  const practice = useSpeechRecognition()
  const [noteOpen, setNoteOpen] = useState(false)
  const [youglishLoaded, setYouglishLoaded] = useState(false)
  const [practiceTarget, setPracticeTarget] = useState('')
  const lastAutoRef = useRef('')
  const heroCycleRef = useRef('')
  const heroTimerRef = useRef<number | null>(null)
  const state = { liked: false, saved: false, note: '', completed: false, completedAt: null, ...progress }
  const paletteStyle = {
    '--tone-a': item.image.palette[0],
    '--tone-b': item.image.palette[1],
  } as CSSProperties

  useEffect(() => {
    if (isActive && index === 1) setYouglishLoaded(true)
  }, [index, isActive])

  useEffect(() => {
    if (!isActive) reset()
  }, [isActive, reset])

  useEffect(() => {
    if (isActive && settledIndex === 5 && !state.completed) {
      onUpdate({ completed: true, completedAt: new Date().toISOString() })
    }
  }, [isActive, onUpdate, settledIndex, state.completed])

  useEffect(() => {
    const settledHeroIsActive = isActive && settledIndex === 0
    if (!settledHeroIsActive) {
      heroCycleRef.current = ''
      return
    }

    const heroCycle = `${item.id}-hero`
    if (heroCycleRef.current === heroCycle) return

    heroCycleRef.current = heroCycle
    stop()
    heroTimerRef.current = window.setTimeout(() => {
      if (heroCycleRef.current === heroCycle) speak(item.audio.text, 'en-GB')
      heroTimerRef.current = null
    }, 80)

    return () => {
      if (heroTimerRef.current) window.clearTimeout(heroTimerRef.current)
      heroTimerRef.current = null
      heroCycleRef.current = ''
      stop()
    }
  }, [isActive, item.audio.text, item.id, settledIndex, speak, stop])

  useEffect(() => {
    if (!isActive) {
      lastAutoRef.current = ''
      stop()
      practice.stopListening()
      return
    }

    const autoKey = `${item.id}-${settledIndex}`
    const autoText = settledIndex >= 2 && settledIndex <= 4
      ? item.examples[settledIndex - 2]?.source
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
  }, [isActive, item.examples, item.id, practice.stopListening, settledIndex, speak, stop])

  const listenToTerm = () => {
    if (heroTimerRef.current) window.clearTimeout(heroTimerRef.current)
    heroTimerRef.current = null
    heroCycleRef.current = `${item.id}-hero`
    stop()
    speak(item.audio.text, 'en-GB')
  }

  const listenToExample = (sentence: string) => {
    practice.stopListening()
    setPracticeTarget('')
    speak(sentence, 'en-GB')
  }

  const practiseExample = (sentence: string) => {
    stop()
    setPracticeTarget(sentence)
    practice.startListening(sentence)
  }

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

  const actionBar = (
    <div className="social-actions item-action-bar" aria-label="Learning item actions">
      <button onClick={onHome} aria-label="Back to EngloGram home"><SocialIcon name="home" /><span>Home</span></button>
      <button className={state.liked ? 'selected like-active' : ''} onClick={() => onUpdate({ liked: !state.liked })} aria-label={state.liked ? 'Unlike' : 'Like'} aria-pressed={state.liked}><SocialIcon name="heart" filled={state.liked} /><span>Like</span></button>
      <button className={state.note ? 'selected' : ''} onClick={() => setNoteOpen(true)} aria-label="Add private note"><SocialIcon name="comment" filled={Boolean(state.note)} /><span>Note</span></button>
      <button onClick={share} aria-label="Share"><SocialIcon name="share" /><span>Share</span></button>
      <button className={state.saved ? 'selected save-active' : ''} onClick={() => onUpdate({ saved: !state.saved })} aria-label={state.saved ? 'Remove from saved words' : 'Save word'} aria-pressed={state.saved}><SocialIcon name="bookmark" filled={state.saved} /><span>Save</span></button>
    </div>
  )

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
            <div className="type-row"><span>{item.type}</span><span>{item.ipa}</span></div>
            <h2 className={item.term.length > 24 ? 'term-long' : item.term.length > 14 ? 'term-medium' : undefined}>{item.term}</h2>
            <p className="translation">{item.translation}</p>
            <p className="definition">{item.definition}</p>
            <button className="hero-listen" onClick={listenToTerm} disabled={!supported}><SocialIcon name="speaker" /><span>Listen</span></button>
          </div>
        </section>

        <section className="post-slide youglish-slide">
          <p className="slide-label">02 · IN THE WILD</p>
          <div className="external-heading"><span>Real people.</span><h2>Real context.</h2><p>Hear “{item.term}” in authentic English clips.</p></div>
          <div className="widget-shell">
            {youglishLoaded
              ? <YouGlishWidget query={item.youglish.query} language={item.youglish.language} accent={item.youglish.accent} active={isActive && index === 1} />
              : <div className="widget-loading">Swipe here to load YouGlish.</div>}
          </div>
          <small className="privacy-copy">
            External media loads only when this slide is active. <a href="https://www.youtube.com/t/terms" target="_blank" rel="noreferrer">YouTube Terms</a> · <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Google Privacy</a>
          </small>
        </section>

        {item.examples.map((example, exampleIndex) => (
          <section className="post-slide example-slide" key={example.source}>
            <p className="slide-label">{String(exampleIndex + 3).padStart(2, '0')} · EXAMPLE {exampleIndex + 1}</p>
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
              <button onClick={() => listenToExample(example.source)} disabled={!supported}><SocialIcon name="speaker" /><span>Listen</span></button>
              <button onClick={() => practice.listening && practiceTarget === example.source ? practice.stopListening() : practiseExample(example.source)} disabled={!practice.supported}>
                <SocialIcon name="microphone" /><span>{practice.listening && practiceTarget === example.source ? 'Stop' : 'Read aloud'}</span>
              </button>
            </div>
            {practice.assessment?.expected === example.source && (
              <div className="practice-feedback" role="status">
                <span>Recognised:</span>
                <q>{practice.assessment.transcript}</q>
                <FeedbackWords expected={example.source} transcript={practice.assessment.transcript} />
                <div><b>Match: {practice.assessment.score}%</b><button onClick={() => practiseExample(example.source)}>Try again</button></div>
              </div>
            )}
            {practice.error && practiceTarget === example.source && (
              <div className="practice-feedback practice-error" role="status">
                <span>{practice.error}</span>
                {practice.supported && <button onClick={() => practiseExample(example.source)}>Try again</button>}
              </div>
            )}
            {!practice.supported && <p className="practice-capability">Speaking practice is not supported in this browser.</p>}
          </section>
        ))}

        <section className="post-slide reward-slide">
          <span className="reward-check" aria-hidden="true">✓</span>
          <p className="slide-label">06 · COMPLETE</p>
          <div className="reward-copy">
            <small>YOU’VE GOT IT</small>
            <h2>{item.term}</h2>
            <p>3 examples heard<br />3 contexts explored</p>
            <strong>{completedItems + (state.completed ? 0 : 1)} / {totalItems} words completed</strong>
            <span>Swipe up for the next word ↑</span>
          </div>
        </section>
      </div>
      {actionBar}
      <SlideDots active={index} count={6} />
      <span className="horizontal-hint" aria-hidden="true">SWIPE ↔</span>
      {noteOpen && (
        <div className="note-sheet" role="dialog" aria-label="Private note">
          <div><small>PRIVATE NOTE</small><button onClick={() => setNoteOpen(false)} aria-label="Close note">×</button></div>
          <h3>Your connection to “{item.term}”</h3>
          <textarea value={state.note} onChange={(event) => onUpdate({ note: event.target.value })} placeholder="Add a memory, association or example…" autoFocus />
          <button className="done-button" onClick={() => setNoteOpen(false)}>Save note</button>
        </div>
      )}
    </article>
  )
}
