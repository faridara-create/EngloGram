import { useEffect, useMemo, useRef, useState } from 'react'
import type { LearningItem, Lesson } from '../content/schema'
import { useCarousel } from '../hooks/useCarousel'
import { useSpeech } from '../hooks/useSpeech'

type Range = { start: number; end: number }

function targetRanges(text: string, items: LearningItem[]): Range[] {
  const source = text.toLocaleLowerCase('en')
  const candidates = items.flatMap((item) => [item.term, ...item.aliases]).sort((a, b) => b.length - a.length)
  const ranges: Range[] = []
  for (const candidate of candidates) {
    const needle = candidate.toLocaleLowerCase('en')
    let from = 0
    while (from < source.length) {
      const start = source.indexOf(needle, from)
      if (start === -1) break
      const end = start + needle.length
      const leftOk = start === 0 || !/[a-z]/i.test(source[start - 1])
      const rightOk = end === source.length || !/[a-z]/i.test(source[end])
      if (leftOk && rightOk && !ranges.some((range) => start >= range.start && end <= range.end)) ranges.push({ start, end })
      from = start + needle.length
    }
  }
  return ranges
}

function HighlightedStory({ text, items, spokenAt }: { text: string; items: LearningItem[]; spokenAt: Range | null }) {
  const targets = useMemo(() => targetRanges(text, items), [items, text])
  const tokens = useMemo(() => {
    const result: { value: string; start: number; end: number }[] = []
    for (const match of text.matchAll(/\S+|\s+/g)) {
      const start = match.index ?? 0
      result.push({ value: match[0], start, end: start + match[0].length })
    }
    return result
  }, [text])

  return (
    <p className="story-text">
      {tokens.map((token, index) => {
        if (/^\s+$/.test(token.value)) return token.value
        const isTarget = targets.some((range) => token.start < range.end && token.end > range.start)
        const isSpoken = spokenAt && token.start < spokenAt.end && token.end > spokenAt.start
        return <span className={`${isTarget ? 'target-word' : ''} ${isSpoken ? 'spoken-word' : ''}`} key={`${token.start}-${index}`}>{token.value}</span>
      })}
    </p>
  )
}

export function StoryPost({ lesson, isActive }: { lesson: Lesson; isActive: boolean }) {
  const { ref, index, onScroll, goTo } = useCarousel()
  const { speak, stop, speaking, supported } = useSpeech()
  const [audioPage, setAudioPage] = useState<number | null>(null)
  const [spokenAt, setSpokenAt] = useState<Range | null>(null)
  const continueRef = useRef(false)

  useEffect(() => {
    if (audioPage === null) return
    const page = lesson.story.pages[audioPage]
    if (!page) return
    goTo(audioPage)
    setSpokenAt(null)
    speak(page.text, lesson.accent, {
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
  }, [audioPage, goTo, lesson.accent, lesson.story.pages, speak])

  useEffect(() => {
    if (!isActive) {
      continueRef.current = false
      setAudioPage(null)
      setSpokenAt(null)
      stop()
    }
  }, [isActive, stop])

  const toggleAudio = () => {
    if (speaking || audioPage !== null) {
      continueRef.current = false
      setAudioPage(null)
      setSpokenAt(null)
      stop()
      return
    }
    continueRef.current = true
    setAudioPage(index)
  }

  return (
    <article className="story-post">
      <header className="story-header">
        <div><span>RECAP STORY</span><b>{index + 1} / {lesson.story.pages.length}</b></div>
        <h2>{lesson.story.title}</h2>
        <button onClick={toggleAudio} disabled={!supported}>{speaking ? '■ Stop' : '▶ Listen'}</button>
      </header>
      <div className="story-carousel" ref={ref} onScroll={onScroll}>
        {lesson.story.pages.map((page, pageIndex) => (
          <section className="story-page" key={pageIndex}>
            <HighlightedStory
              text={page.text}
              items={lesson.items}
              spokenAt={audioPage === pageIndex ? spokenAt : null}
            />
            <span className="story-page-number">{String(pageIndex + 1).padStart(2, '0')}</span>
          </section>
        ))}
      </div>
      <div className="story-progress"><i style={{ width: `${((index + 1) / lesson.story.pages.length) * 100}%` }} /></div>
      <p className="story-legend"><mark>Highlighted</mark> language is from this lesson.</p>
    </article>
  )
}
