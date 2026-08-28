import { useEffect, useMemo, useRef, useState } from 'react'
import type { LearningItem, Lesson } from '../content/schema'
import { findTargetMatches, type TargetMatch } from '../content/lexical'
import { useCarousel } from '../hooks/useCarousel'
import { useSpeech } from '../hooks/useSpeech'

type Range = { start: number; end: number }

function HighlightedStory({ text, items, spokenAt, onReveal }: { text: string; items: LearningItem[]; spokenAt: Range | null; onReveal: (item: LearningItem) => void }) {
  const targets = useMemo(() => findTargetMatches(text, items), [items, text])
  const tokens = useMemo(() => {
    const result: { value: string; start: number; end: number }[] = []
    for (const match of text.matchAll(/\S+|\s+/g)) {
      const start = match.index ?? 0
      result.push({ value: match[0], start, end: start + match[0].length })
    }
    return result
  }, [text])

  const targetFor = (start: number, end: number): TargetMatch | undefined =>
    targets.find((range) => start < range.end && end > range.start)

  return (
    <p className="story-text">
      {tokens.map((token, tokenIndex) => {
        if (/^\s+$/.test(token.value)) return token.value
        const target = targetFor(token.start, token.end)
        const isSpoken = Boolean(spokenAt && token.start < spokenAt.end && token.end > spokenAt.start)
        const className = `${target ? 'target-word' : ''} ${isSpoken ? 'spoken-word' : ''}`
        return target
          ? <button type="button" className={className} onClick={() => onReveal(target.item)} key={`${token.start}-${tokenIndex}`}>{token.value}</button>
          : <span className={className} key={`${token.start}-${tokenIndex}`}>{token.value}</span>
      })}
    </p>
  )
}

export function StoryPost({ lesson, isActive }: { lesson: Lesson; isActive: boolean }) {
  const { ref, index, onScroll, goTo } = useCarousel()
  const { speak, stop, pause, resume, speaking, paused, supported } = useSpeech()
  const [audioPage, setAudioPage] = useState<number | null>(null)
  const [spokenAt, setSpokenAt] = useState<Range | null>(null)
  const [rate, setRate] = useState(.8)
  const [revealed, setRevealed] = useState<LearningItem | null>(null)
  const continueRef = useRef(false)

  useEffect(() => {
    if (audioPage === null) return
    const page = lesson.story.pages[audioPage]
    if (!page) return
    goTo(audioPage)
    setSpokenAt(null)
    speak(page.text, lesson.accent, {
      rate,
      onBoundary: (start, length) => setSpokenAt({ start, end: start + length }),
      onEnd: () => {
        setSpokenAt(null)
        const next = audioPage + 1
        if (continueRef.current && next < lesson.story.pages.length) setAudioPage(next)
        else {
          continueRef.current = false
          setAudioPage(null)
        }
      },
    })
  }, [audioPage, goTo, lesson.accent, lesson.story.pages, rate, speak])

  useEffect(() => {
    if (!isActive) {
      continueRef.current = false
      setAudioPage(null)
      setSpokenAt(null)
      setRevealed(null)
      stop()
    }
  }, [isActive, stop])

  const toggleAudio = () => {
    if (speaking && paused) {
      resume()
      return
    }
    if (speaking) {
      pause()
      return
    }
    continueRef.current = true
    setAudioPage(index)
  }

  const stopAudio = () => {
    continueRef.current = false
    setAudioPage(null)
    setSpokenAt(null)
    stop()
  }

  return (
    <article className="story-post">
      <header className="story-header">
        <div><span>RECAP STORY</span><b>{index + 1} / {lesson.story.pages.length}</b></div>
        <h2>{lesson.story.title}</h2>
        <div className="story-controls">
          <button onClick={toggleAudio} disabled={!supported}>{speaking ? paused ? '▶ Resume' : 'Ⅱ Pause' : '▶ Listen'}</button>
          {speaking && <button onClick={stopAudio}>■ Stop</button>}
          <div className="speed-control" aria-label="Playback speed">
            {[.8, 1].map((speed) => <button className={rate === speed ? 'active' : ''} onClick={() => setRate(speed)} key={speed}>{speed.toFixed(1)}x</button>)}
          </div>
        </div>
      </header>
      <div className="story-carousel" ref={ref} onScroll={onScroll}>
        {lesson.story.pages.map((page, pageIndex) => (
          <section className="story-page" key={pageIndex}>
            <HighlightedStory text={page.text} items={lesson.items} spokenAt={audioPage === pageIndex ? spokenAt : null} onReveal={setRevealed} />
            <span className="story-page-number">{String(pageIndex + 1).padStart(2, '0')}</span>
          </section>
        ))}
      </div>
      {revealed && (
        <div className="story-translation" role="status">
          <button onClick={() => setRevealed(null)} aria-label="Close translation">×</button>
          <b>{revealed.term}</b><span>{revealed.translation}</span>
        </div>
      )}
      <div className="story-progress"><i style={{ width: `${((index + 1) / lesson.story.pages.length) * 100}%` }} /></div>
      <p className="story-legend"><mark>Tap highlighted language</mark> for German.</p>
    </article>
  )
}
