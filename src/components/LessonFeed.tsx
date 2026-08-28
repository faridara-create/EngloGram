import { useCallback, useRef, useState } from 'react'
import type { Lesson } from '../content/schema'
import { useLessonProgress } from '../state/progress'
import { LearningPost } from './LearningPost'
import { QuizPost } from './QuizPost'
import { StoryPost } from './StoryPost'

export function LessonFeed({ lesson, onBack }: { lesson: Lesson; onBack: () => void }) {
  const feedRef = useRef<HTMLDivElement>(null)
  const [activePost, setActivePost] = useState(0)
  const { progress, updateItem, answerQuestion, completeLesson } = useLessonProgress(lesson.id)
  const totalPosts = lesson.items.length + 2

  const updateActivePost = useCallback(() => {
    const feed = feedRef.current
    if (!feed || !feed.clientHeight) return
    setActivePost(Math.round(feed.scrollTop / feed.clientHeight))
  }, [])

  return (
    <main className="lesson-shell">
      <header className="lesson-nav">
        <button onClick={onBack} aria-label="Back to topics">←</button>
        <div><small>{lesson.level} · {lesson.subtopic}</small><b>{lesson.title}</b></div>
        <span>{activePost + 1}<i>/</i>{totalPosts}</span>
      </header>
      <div className="vertical-feed" ref={feedRef} onScroll={updateActivePost}>
        {lesson.items.map((item, index) => (
          <section className="feed-page" key={item.id}>
            <LearningPost
              item={item}
              position={index + 1}
              isActive={activePost === index}
              progress={progress.items[item.id]}
              onUpdate={(patch) => updateItem(item.id, patch)}
            />
          </section>
        ))}
        <section className="feed-page">
          <StoryPost lesson={lesson} isActive={activePost === lesson.items.length} />
        </section>
        <section className="feed-page">
          <QuizPost lesson={lesson} progress={progress} onAnswer={answerQuestion} onComplete={completeLesson} />
        </section>
      </div>
      <div className="vertical-rail" aria-hidden="true"><i style={{ height: `${((activePost + 1) / totalPosts) * 100}%` }} /></div>
    </main>
  )
}
