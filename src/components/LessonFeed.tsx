import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Lesson } from '../content/schema'
import { useLessonProgress } from '../state/progress'
import { LearningPost } from './LearningPost'
import { QuizPost } from './QuizPost'
import { StoryPost } from './StoryPost'

export function LessonFeed({ lesson, initialItemId, onBack }: { lesson: Lesson; initialItemId?: string; onBack: () => void }) {
  const feedRef = useRef<HTMLDivElement>(null)
  const initialPost = Math.max(0, lesson.items.findIndex((item) => item.id === initialItemId))
  const [activePost, setActivePost] = useState(initialPost)
  const itemIds = useMemo(() => lesson.items.map((item) => item.id), [lesson.items])
  const { progress, updateItem, answerQuestion, completeStory, completeQuiz, updateCurrentPost } = useLessonProgress(lesson.id, itemIds)
  const totalPosts = lesson.items.length + 2
  const completedItems = lesson.items.filter((item) => progress.items[item.id]?.completed).length

  const updateActivePost = useCallback(() => {
    const feed = feedRef.current
    if (!feed || !feed.clientHeight) return
    setActivePost(Math.round(feed.scrollTop / feed.clientHeight))
  }, [])

  useEffect(() => {
    updateCurrentPost(activePost)
  }, [activePost, updateCurrentPost])

  useEffect(() => {
    const feed = feedRef.current
    if (feed && initialPost) feed.scrollTo({ top: initialPost * feed.clientHeight })
  }, [initialPost])

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
            <LearningPost item={item} position={itemIndex + 1} isActive={activePost === itemIndex} progress={progress.items[item.id]} completedItems={completedItems} totalItems={lesson.items.length} onUpdate={(patch) => updateItem(item.id, patch)} onHome={onBack} />
          </section>
        ))}
        <section className="feed-page"><StoryPost lesson={lesson} isActive={activePost === lesson.items.length} onComplete={completeStory} /></section>
        <section className="feed-page">
          <QuizPost lesson={lesson} progress={progress} onAnswer={answerQuestion} onComplete={completeQuiz} onReviewItem={(itemId) => goToPost(lesson.items.findIndex((item) => item.id === itemId))} />
        </section>
      </div>
      <div className="vertical-rail" aria-hidden="true"><i style={{ height: `${((activePost + 1) / totalPosts) * 100}%` }} /></div>
    </main>
  )
}
