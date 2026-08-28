import { useMemo } from 'react'
import type { Catalog } from '../content/schema'
import { readLessonProgress } from '../state/progress'

type Props = { catalog: Catalog; onOpenLesson: (path: string) => void }

export function HomeScreen({ catalog, onOpenLesson }: Props) {
  const lessonStates = useMemo(() => new Map(catalog.topics.flatMap((topic) => topic.lessons.filter((lesson) => lesson.available).map((lesson) => [lesson.id, readLessonProgress(lesson.id)] as const))), [catalog])
  const continueLesson = catalog.topics.flatMap((topic) => topic.lessons).find((lesson) => {
    const progress = lessonStates.get(lesson.id)
    return lesson.available && progress && (progress.lastVisitedAt || progress.completed)
  })
  const continueProgress = continueLesson ? lessonStates.get(continueLesson.id) : undefined
  const answered = continueProgress ? Object.keys(continueProgress.quiz).length : 0
  const progressPercent = continueProgress?.completed ? 100 : continueProgress ? Math.min(96, Math.round((continueProgress.currentPost / 11) * 70 + (answered / 10) * 30)) : 0

  return (
    <main className="home-shell">
      <header className="home-header">
        <div className="brand-row"><span className="brand-mark" aria-hidden="true">E</span><span className="brand-name">{catalog.product}</span><span className="level-chip">C1 · DE</span></div>
        <p className="kicker">YOUR DAILY ENGLISH EDIT</p>
        <h1>Scroll less.<br /><em>Say more.</em></h1>
        <p className="home-intro">Real language for conversations that matter. Pick a world and start with one focused lesson.</p>
      </header>

      {continueLesson && continueProgress && (
        <section className="continue-section" aria-labelledby="continue-heading">
          <div><small>{continueProgress.completed ? 'COMPLETED' : 'CONTINUE LEARNING'}</small><h2 id="continue-heading">{continueLesson.title}</h2><span>{progressPercent}% · {answered}/10 quiz answers</span></div>
          <button onClick={() => onOpenLesson(continueLesson.path)}>{continueProgress.completed ? 'Review lesson →' : 'Continue →'}</button>
          <div className="continue-bar"><i style={{ width: `${progressPercent}%` }} /></div>
        </section>
      )}

      <section className="topic-section" aria-labelledby="topic-heading">
        <div className="section-heading"><h2 id="topic-heading">Choose your feed</h2><span>{catalog.topics.length} topics</span></div>
        <div className="topic-grid">
          {catalog.topics.map((topic, topicIndex) => {
            const lesson = topic.lessons[0]
            const progress = lesson ? lessonStates.get(lesson.id) : undefined
            return (
              <button className={`topic-card tone-${topic.color}`} key={topic.id} onClick={() => lesson?.available && onOpenLesson(lesson.path)} aria-disabled={!lesson?.available}>
                <span className="topic-number">{String(topicIndex + 1).padStart(2, '0')}</span>
                <span className="topic-orbit" aria-hidden="true"><b>{topic.symbol}</b></span>
                <span className="topic-copy"><small>{topic.eyebrow}</small><strong>{topic.title}</strong><span>{topic.description}</span></span>
                <span className="topic-footer"><span>{lesson?.title}</span><b>{progress?.completed ? 'Completed ✓' : lesson?.available ? progress?.lastVisitedAt ? 'Continue →' : 'Start →' : 'Soon'}</b></span>
              </button>
            )
          })}
        </div>
      </section>
    </main>
  )
}
