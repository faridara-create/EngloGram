import { useCallback, useEffect, useState } from 'react'

export type ItemProgress = {
  liked: boolean
  saved: boolean
  note: string
}

export type QuizAnswer = {
  selectedId: string
  correct: boolean
}

export type LessonProgress = {
  items: Record<string, ItemProgress>
  quiz: Record<string, QuizAnswer>
  completed: boolean
  completedAt: string | null
}

const emptyProgress: LessonProgress = {
  items: {},
  quiz: {},
  completed: false,
  completedAt: null,
}

function storageKey(lessonId: string) {
  return `englogram:progress:${lessonId}`
}

function readProgress(lessonId: string): LessonProgress {
  try {
    const stored = localStorage.getItem(storageKey(lessonId))
    return stored ? { ...emptyProgress, ...JSON.parse(stored) } : emptyProgress
  } catch {
    return emptyProgress
  }
}

export function useLessonProgress(lessonId: string) {
  const [progress, setProgress] = useState<LessonProgress>(() => readProgress(lessonId))

  useEffect(() => {
    setProgress(readProgress(lessonId))
  }, [lessonId])

  useEffect(() => {
    localStorage.setItem(storageKey(lessonId), JSON.stringify(progress))
  }, [lessonId, progress])

  const updateItem = useCallback((itemId: string, patch: Partial<ItemProgress>) => {
    setProgress((current) => {
      const existing = current.items[itemId] ?? { liked: false, saved: false, note: '' }
      return {
        ...current,
        items: {
          ...current.items,
          [itemId]: { ...existing, ...patch },
        },
      }
    })
  }, [])

  const answerQuestion = useCallback((itemId: string, answer: QuizAnswer) => {
    setProgress((current) => ({
      ...current,
      quiz: { ...current.quiz, [itemId]: answer },
    }))
  }, [])

  const completeLesson = useCallback(() => {
    setProgress((current) => current.completed ? current : {
      ...current,
      completed: true,
      completedAt: new Date().toISOString(),
    })
  }, [])

  return { progress, updateItem, answerQuestion, completeLesson }
}
