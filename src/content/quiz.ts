import type { LearningItem, Lesson } from './schema'

export type RuntimeQuizQuestion = {
  itemId: string
  definition: string
  options: LearningItem[]
}

function shuffle<T>(values: T[], random: () => number): T[] {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(random() * (index + 1))
    ;[result[index], result[swapWith]] = [result[swapWith], result[index]]
  }
  return result
}

export function createQuizQuestions(lesson: Lesson, random: () => number = Math.random): RuntimeQuizQuestion[] {
  return lesson.quiz.map((question) => {
    const correct = lesson.items.find((item) => item.id === question.itemId)
    if (!correct) throw new Error(`Unknown quiz item: ${question.itemId}`)
    const distractors = shuffle(lesson.items.filter((item) => item.id !== question.itemId), random).slice(0, 4)
    return { ...question, options: shuffle([correct, ...distractors], random) }
  })
}
