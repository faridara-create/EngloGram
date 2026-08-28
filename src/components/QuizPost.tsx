import { useEffect, useMemo, useState } from 'react'
import type { Lesson } from '../content/schema'
import { createQuizQuestions } from '../content/quiz'
import { useCarousel } from '../hooks/useCarousel'
import type { LessonProgress, QuizAnswer } from '../state/progress'

type Props = {
  lesson: Lesson
  progress: LessonProgress
  onAnswer: (itemId: string, answer: QuizAnswer) => void
  onComplete: () => void
  onReviewItem: (itemId: string) => void
}

export function QuizPost({ lesson, progress, onAnswer, onComplete, onReviewItem }: Props) {
  const { ref, index, onScroll, goTo } = useCarousel()
  const questions = useMemo(() => createQuizQuestions(lesson), [lesson])
  const [reviewMode, setReviewMode] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const answeredCount = Object.keys(progress.quiz).length
  const correctCount = Object.values(progress.quiz).filter((answer) => answer.correct).length
  const incorrectItems = lesson.items.filter((item) => progress.quiz[item.id] && !progress.quiz[item.id].correct)
  const savedItems = lesson.items.filter((item) => progress.items[item.id]?.saved)
  const isComplete = answeredCount === questions.length

  useEffect(() => {
    if (isComplete) onComplete()
  }, [isComplete, onComplete])

  const reviewMistakes = () => {
    if (!incorrectItems.length) return
    const firstIndex = questions.findIndex((question) => question.itemId === incorrectItems[0].id)
    setReviewMode(true)
    window.setTimeout(() => goTo(firstIndex), 0)
  }

  if (isComplete && !reviewMode) {
    return (
      <article className="completion-screen">
        <span className="completion-kicker">LESSON COMPLETED</span>
        <div className="completion-score"><b>{correctCount}</b><span>/ {questions.length}</span></div>
        <h2>You finished<br /><em>{lesson.title}</em></h2>
        <p>{incorrectItems.length ? `${incorrectItems.length} item${incorrectItems.length === 1 ? '' : 's'} to strengthen next.` : 'A perfect result — every item landed.'}</p>
        {incorrectItems.length > 0 && <div className="mistake-list">{incorrectItems.map((item) => <span key={item.id}>{item.term}<small>{item.translation}</small></span>)}</div>}
        {showSaved && <div className="saved-review">{savedItems.length ? savedItems.map((item) => <button onClick={() => onReviewItem(item.id)} key={item.id}>{item.term}<small>{item.translation}</small></button>) : <span>No saved words yet.</span>}</div>}
        <div className="completion-actions">
          <button onClick={reviewMistakes} disabled={!incorrectItems.length}>Review mistakes</button>
          <button onClick={() => setShowSaved((current) => !current)}>Review saved words</button>
          <button disabled>Next lesson <small>Coming soon</small></button>
        </div>
        <small className="completion-saved">Progress saved on this device</small>
      </article>
    )
  }

  return (
    <article className="quiz-post">
      <header className="quiz-header">
        <div><span>{reviewMode ? 'REVIEW MISTAKES' : 'FINAL CHECK'}</span><b>{index + 1} / {questions.length}</b></div>
        <h2>What stuck?</h2>
        {reviewMode && <button className="back-completion" onClick={() => setReviewMode(false)}>See result</button>}
      </header>
      <div className="quiz-carousel" ref={ref} onScroll={onScroll}>
        {questions.map((question) => {
          const answer = progress.quiz[question.itemId]
          const target = lesson.items.find((item) => item.id === question.itemId)
          return (
            <section className="quiz-page" key={question.itemId}>
              <small>CHOOSE THE BEST MATCH</small>
              <p className="quiz-definition">“{question.definition}”</p>
              <div className="quiz-options">
                {question.options.map((option, optionIndex) => {
                  const isCorrect = option.id === question.itemId
                  const selected = answer?.selectedId === option.id
                  const className = answer ? isCorrect ? 'correct' : selected ? 'incorrect' : 'muted' : ''
                  return (
                    <button className={className} disabled={Boolean(answer)} onClick={() => onAnswer(question.itemId, { selectedId: option.id, correct: isCorrect })} key={option.id}>
                      <span>{String.fromCharCode(65 + optionIndex)}</span><b>{option.term}</b>
                      {answer && isCorrect && <i>✓</i>}{answer && selected && !isCorrect && <i>×</i>}
                    </button>
                  )
                })}
              </div>
              {answer && target && (
                <div className={`answer-feedback ${answer.correct ? 'positive' : 'negative'}`}>
                  <strong>{answer.correct ? 'Exactly right.' : 'Not quite — reinforce it now.'}</strong>
                  <b>{target.term}</b><span>{target.translation}</span>
                  <p>{target.examples[0].source}</p>
                </div>
              )}
            </section>
          )
        })}
      </div>
      <footer className="quiz-footer"><span>{answeredCount} answered</span><div><i style={{ width: `${answeredCount * 10}%` }} /></div><b>{correctCount} correct</b></footer>
    </article>
  )
}
