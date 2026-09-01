import { useCallback, useEffect, useMemo, useState } from 'react'

export type ItemProgress = {
  liked: boolean
  saved: boolean
  note: string
  completed: boolean
  completedAt: string | null
}

export type QuizAnswer = {
  selectedId: string
  correct: boolean
}

export type LessonProgress = {
  items: Record<string, ItemProgress>
  quiz: Record<string, QuizAnswer>
  storyCompleted: boolean
  storyCompletedAt: string | null
  quizCompleted: boolean
  quizCompletedAt: string | null
  completed: boolean
  completedAt: string | null
  currentPost: number
  lastVisitedAt: string | null
}

const emptyProgress: LessonProgress = {
  items: {},
  quiz: {},
  storyCompleted: false,
  storyCompletedAt: null,
  quizCompleted: false,
  quizCompletedAt: null,
  completed: false,
  completedAt: null,
  currentPost: 0,
  lastVisitedAt: null,
}

function storageKey(lessonId: string) {
  return `englogram:progress:${lessonId}`
}

function completedItemCount(progress: LessonProgress) {
  return Object.values(progress.items).filter((item) => item.completed).length
}

export function completionRequirementsMet(progress: LessonProgress, requiredItemIds?: string[]) {
  const itemsComplete = requiredItemIds?.length
    ? requiredItemIds.every((itemId) => progress.items[itemId]?.completed)
    : completedItemCount(progress) >= 10
  return itemsComplete && progress.storyCompleted && progress.quizCompleted
}

function withDerivedCompletion(progress: LessonProgress, requiredItemIds?: string[]): LessonProgress {
  const completed = completionRequirementsMet(progress, requiredItemIds)
  return {
    ...progress,
    completed,
    completedAt: completed ? progress.completedAt ?? new Date().toISOString() : null,
  }
}

function normaliseProgress(stored: Partial<LessonProgress>, requiredItemIds?: string[]): LessonProgress {
  return withDerivedCompletion({
    ...emptyProgress,
    ...stored,
    items: stored.items ?? {},
    quiz: stored.quiz ?? {},
    storyCompleted: stored.storyCompleted ?? false,
    storyCompletedAt: stored.storyCompletedAt ?? null,
    quizCompleted: stored.quizCompleted ?? false,
    quizCompletedAt: stored.quizCompletedAt ?? null,
  }, requiredItemIds)
}

export function readLessonProgress(lessonId: string, requiredItemIds?: string[]): LessonProgress {
  try {
    const stored = localStorage.getItem(storageKey(lessonId))
    return stored ? normaliseProgress(JSON.parse(stored) as Partial<LessonProgress>, requiredItemIds) : { ...emptyProgress, items: {}, quiz: {} }
  } catch {
    return { ...emptyProgress, items: {}, quiz: {} }
  }
}

export function lessonProgressPercent(progress: LessonProgress) {
  if (progress.completed) return 100
  const finishedParts = Math.min(10, completedItemCount(progress)) + Number(progress.storyCompleted) + Number(progress.quizCompleted)
  return Math.round((finishedParts / 12) * 100)
}

export function lessonStatus(progress: LessonProgress): 'Not started' | 'In progress' | 'Completed' {
  if (progress.completed) return 'Completed'
  const hasActivity = Boolean(progress.lastVisitedAt || completedItemCount(progress) || progress.storyCompleted || progress.quizCompleted || Object.keys(progress.quiz).length)
  return hasActivity ? 'In progress' : 'Not started'
}

export function useLessonProgress(lessonId: string, requiredItemIds: string[]) {
  const requiredKey = requiredItemIds.join('|')
  const stableRequiredIds = useMemo(() => requiredKey.split('|').filter(Boolean), [requiredKey])
  const [progress, setProgress] = useState<LessonProgress>(() => readLessonProgress(lessonId, stableRequiredIds))

  useEffect(() => {
    setProgress(readLessonProgress(lessonId, stableRequiredIds))
  }, [lessonId, stableRequiredIds])

  useEffect(() => {
    localStorage.setItem(storageKey(lessonId), JSON.stringify(progress))
  }, [lessonId, progress])

  const updateItem = useCallback((itemId: string, patch: Partial<ItemProgress>) => {
    setProgress((current) => {
      const existing = current.items[itemId] ?? { liked: false, saved: false, note: '', completed: false, completedAt: null }
      return withDerivedCompletion({
        ...current,
        items: { ...current.items, [itemId]: { ...existing, ...patch } },
      }, stableRequiredIds)
    })
  }, [stableRequiredIds])

  const answerQuestion = useCallback((itemId: string, answer: QuizAnswer) => {
    setProgress((current) => ({
      ...current,
      quiz: { ...current.quiz, [itemId]: answer },
    }))
  }, [])

  const completeStory = useCallback(() => {
    setProgress((current) => current.storyCompleted ? current : withDerivedCompletion({
      ...current,
      storyCompleted: true,
      storyCompletedAt: new Date().toISOString(),
    }, stableRequiredIds))
  }, [stableRequiredIds])

  const completeQuiz = useCallback(() => {
    setProgress((current) => current.quizCompleted ? current : withDerivedCompletion({
      ...current,
      quizCompleted: true,
      quizCompletedAt: new Date().toISOString(),
    }, stableRequiredIds))
  }, [stableRequiredIds])

  const updateCurrentPost = useCallback((currentPost: number) => {
    setProgress((current) => ({
      ...current,
      currentPost,
      lastVisitedAt: new Date().toISOString(),
    }))
  }, [])

  return { progress, updateItem, answerQuestion, completeStory, completeQuiz, updateCurrentPost }
}
