import { useEffect, useMemo, useRef, useState } from 'react'
import type { LearningItem, Lesson } from '../content/schema'
import { findTargetMatches, type TargetMatch } from '../content/lexical'
import { useCarousel } from '../hooks/useCarousel'
import { useSpeech } from '../hooks/useSpeech'

type Range = { start: number; end: number }

const STORY_PAGE_CHARACTER_LIMIT = 480

function splitLongSentence(sentence: string, characterLimit: number) {
  const words = sentence.trim().split(/\s+/)
  const parts: string[] = []
  let current = ''

  for (const word of words) {
    const candidate = current ? current + ' ' + word : word
    if (current && candidate.length > characterLimit) {
      parts.push(current)
      current = word
    } else {
      current = candidate
    }
  }

  if (current) parts.push(current)
  return parts
}

export function paginateStoryPages(pages: Lesson['story']['pages'], characterLimit = STORY_PAGE_CHARACTER_LIMIT) {
  const text = pages.map((page) => page.text.trim()).filter(Boolean).join(' ')
  const sentences = text.match(/[^.!?]+(?:[.!?]+["'’”)]*|$)/g)?.map((sentence) => sentence.trim()).filter(Boolean) ?? [text]
  const chunks: string[] = []
  let current = ''

  for (const sentence of sentences.flatMap((value) => value.length > characterLimit ? splitLongSentence(value, characterLimit) : [value])) {
    const candidate = current ? current + ' ' + sentence : sentence
    if (current && candidate.length > characterLimit) {
      chunks.push(current)
      current = sentence
    } else {
      current = candidate
    }
  }

  if (current) chunks.push(current)
  return chunks.map((chunk) => ({ text: chunk }))
}

function spokenWordRanges(text: string): Range[] {
  return [...text.matchAll(/\S+/g)].map((match) => ({
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
  }))
}

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

export function StoryPost({ lesson, isActive, onComplete }: { lesson: Lesson; isActive: boolean; onComplete: () => void }) {
  const { ref, index, onScroll, goTo } = useCarousel()
  const { speak, stop, pause, resume, speaking, paused, supported } = useSpeech()
  const storyPages = useMemo(() => paginateStoryPages(lesson.story.pages), [lesson.story.pages])
  const [audioPage, setAudioPage] = useState<number | null>(null)
  const [spokenAt, setSpokenAt] = useState<Range | null>(null)
  const [rate, setRate] = useState(.8)
  const [revealed, setRevealed] = useState<LearningItem | null>(null)
  const continueRef = useRef(false)
  const activeRef = useRef(isActive)
  const autoplayStartedRef = useRef(false)
  const activationTimerRef = useRef<number | null>(null)
  const pausedRef = useRef(paused)

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  useEffect(() => {
    if (isActive && index === storyPages.length - 1) onComplete()
  }, [index, isActive, onComplete, storyPages.length])

  useEffect(() => {
    if (audioPage === null) return
    const page = storyPages[audioPage]
    if (!page) return
    const words = spokenWordRanges(page.text)
    const fallbackDelay = Math.max(240, Math.round(280 / rate))
    let fallbackIndex = Math.min(1, words.length)
    let lastBoundaryAt = 0
    goTo(audioPage)
    setSpokenAt(words[0] ?? null)
    const fallbackTimer = window.setInterval(() => {
      if (pausedRef.current || performance.now() - lastBoundaryAt < fallbackDelay * .85) return
      const range = words[fallbackIndex]
      if (!range) return
      setSpokenAt(range)
      fallbackIndex += 1
    }, fallbackDelay)
    speak(page.text, lesson.accent, {
      rate,
      onBoundary: (start, length) => {
        lastBoundaryAt = performance.now()
        const boundaryRange = { start, end: start + length }
        const boundaryIndex = words.findIndex((word) => start < word.end && boundaryRange.end > word.start)
        if (boundaryIndex >= 0) fallbackIndex = boundaryIndex + 1
        setSpokenAt(boundaryRange)
      },
      onEnd: () => {
        setSpokenAt(null)
        const next = audioPage + 1
        if (continueRef.current && next < storyPages.length) setAudioPage(next)
        else {
          continueRef.current = false
          setAudioPage(null)
        }
      },
    })
    return () => window.clearInterval(fallbackTimer)
  }, [audioPage, goTo, lesson.accent, rate, speak, storyPages])

  useEffect(() => {
    activeRef.current = isActive
    if (!isActive) {
      if (activationTimerRef.current) window.clearTimeout(activationTimerRef.current)
      activationTimerRef.current = null
      autoplayStartedRef.current = false
      continueRef.current = false
      setAudioPage(null)
      setSpokenAt(null)
      setRevealed(null)
      stop()
      return
    }

    if (!supported || autoplayStartedRef.current) return
    activationTimerRef.current = window.setTimeout(() => {
      activationTimerRef.current = null
      if (!activeRef.current || autoplayStartedRef.current) return
      autoplayStartedRef.current = true
      continueRef.current = true
      setAudioPage(index)
    }, 180)

    return () => {
      if (activationTimerRef.current) window.clearTimeout(activationTimerRef.current)
      activationTimerRef.current = null
    }
  }, [index, isActive, stop, supported])

  const toggleAudio = () => {
    if (speaking && paused) {
      resume()
      return
    }
    if (speaking) {
      pause()
      return
    }
    autoplayStartedRef.current = true
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
        <div><span>RECAP STORY</span><b>{index + 1} / {storyPages.length}</b></div>
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
        {storyPages.map((page, pageIndex) => (
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
      <div className="story-progress"><i style={{ width: `${((index + 1) / storyPages.length) * 100}%` }} /></div>
      <p className="story-legend"><mark>Tap highlighted language</mark> for German.</p>
    </article>
  )
}
