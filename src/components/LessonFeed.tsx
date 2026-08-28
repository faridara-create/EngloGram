import { useCallback, useEffect, useRef, useState } from 'react'
import type { Lesson } from '../content/schema'
import { useLessonProgress } from '../state/progress'
import { LearningPost } from './LearningPost'
import { QuizPost } from './QuizPost'
import { StoryPost } from './StoryPost'

export function LessonFeed({ lesson, onBack }: { lesson: Lesson; onBack: () => void }) {
  const feedRef = useRef<HTMLDivElement>(null)
  const [activePost, setActivePost] = useState(0)
  const { progress, updateItem, answerQuestion, completeLesson, updateCurrentPost } = useLessonProgress(lesson.id)
  const totalPosts = lesson.items.length + 2

  const updateActivePost = useCallback(() => {
    const feed = feedRef.current
    if (!feed || !feed.clientHeight) return
    setActivePost(Math.round(feed.scrollTop / feed.clientHeight))
  }, [])

  useEffect(() => {
    updateCurrentPost(activePost)
  }, [activePost, updateCurrentPost])

  const goToPost = useCallback((postIndex: number) => {
    const feed = feedRef.current
    if (!feed) return
    feed.scrollTo({ top: postIndex * feed.clientHeight, behavior: 'smooth' })
    setActivePost(postIndex)
  }, [])

  return (
    <main className="lesson-shell">
      <div className="vertical-feed" ref={feedRef} onScroll={updateActivePost}>
        {lesson.items.map((item, itemIndex) => (
          <section className="feed-page" key={item.id}>
            <LearningPost item={item} position={itemIndex + 1} isActive={activePost === itemIndex} progress={progress.items[item.id]} onUpdate={(patch) => updateItem(item.id, patch)} onHome={onBack} />
          </section>
        ))}
        <section className="feed-page"><StoryPost lesson={lesson} isActive={activePost === lesson.items.length} /></section>
        <section className="feed-page">
          <QuizPost lesson={lesson} progress={progress} onAnswer={answerQuestion} onComplete={completeLesson} onReviewItem={(itemId) => goToPost(lesson.items.findIndex((item) => item.id === itemId))} />
        </section>
      </div>
      <div className="vertical-rail" aria-hidden="true"><i style={{ height: `${((activePost + 1) / totalPosts) * 100}%` }} /></div>
    </main>
  )
}
