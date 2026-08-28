import { useEffect, useMemo } from 'react'
import type { Lesson } from '../content/schema'
import { createQuizQuestions } from '../content/quiz'
import { useCarousel } from '../hooks/useCarousel'
import type { LessonProgress, QuizAnswer } from '../state/progress'

type Props = {
  lesson: Lesson
  progress: LessonProgress
  onAnswer: (itemId: string, answer: QuizAnswer) => void
  onComplete: () => void
}

export function QuizPost({ lesson, progress, onAnswer, onComplete }: Props) {
  const { ref, index, onScroll } = useCarousel()
  const questions = useMemo(() => createQuizQuestions(lesson), [lesson])
  const answeredCount = Object.keys(progress.quiz).length
  const correctCount = Object.values(progress.quiz).filter((answer) => answer.correct).length

  useEffect(() => {
    if (answeredCount === questions.length) onComplete()
  }, [answeredCount, onComplete, questions.length])

  return (
    <article className="quiz-post">
      <header className="quiz-header">
        <div><span>FINAL CHECK</span><b>{index + 1} / {questions.length}</b></div>
        <h2>What stuck?</h2>
      </header>
      <div className="quiz-carousel" ref={ref} onScroll={onScroll}>
        {questions.map((question, questionIndex) => {
          const answer = progress.quiz[question.itemId]
          return (
            <section className="quiz-page" key={question.itemId}>
              <small>CHOOSE THE BEST MATCH</small>
              <p className="quiz-definition">“{question.definition}”</p>
              <div className="quiz-options">
                {question.options.map((option) => {
                  const isCorrect = option.id === question.itemId
                  const selected = answer?.selectedId === option.id
                  const className = answer
                    ? isCorrect ? 'correct' : selected ? 'incorrect' : 'muted'
                    : ''
                  return (
                    <button
                      className={className}
                      disabled={Boolean(answer)}
                      onClick={() => onAnswer(question.itemId, { selectedId: option.id, correct: isCorrect })}
                      key={option.id}
                    >
                      <span>{String.fromCharCode(65 + question.options.indexOf(option))}</span>
                      <b>{option.term}</b>
                      {answer && isCorrect && <i>✓</i>}
                      {answer && selected && !isCorrect && <i>×</i>}
                    </button>
                  )
                })}
              </div>
              {answer && (
                <p className={`answer-feedback ${answer.correct ? 'positive' : 'negative'}`}>
                  {answer.correct ? 'Exactly right.' : `Not quite — the right answer is “${lesson.items.find((item) => item.id === question.itemId)?.term}”.`}
                </p>
              )}
              {questionIndex === questions.length - 1 && progress.completed && (
                <div className="completion-card"><b>Lesson complete</b><span>{correctCount} / 10 correct · progress saved on this device</span></div>
              )}
            </section>
          )
        })}
      </div>
      <footer className="quiz-footer"><span>{answeredCount} answered</span><div><i style={{ width: `${answeredCount * 10}%` }} /></div><b>{correctCount} correct</b></footer>
    </article>
  )
}
