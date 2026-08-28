import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createQuizQuestions } from '../src/content/quiz'
import { lessonSchema } from '../src/content/schema'

const lesson = lessonSchema.parse(JSON.parse(readFileSync(resolve(process.cwd(), 'public/content/lessons/business-meetings-influence-001.json'), 'utf8')))

describe('runtime quiz transformation', () => {
  it('builds ten questions with five unique lesson options and one correct answer', () => {
    let seed = 17
    const random = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280)
    const questions = createQuizQuestions(lesson, random)

    expect(questions).toHaveLength(10)
    for (const question of questions) {
      expect(question.options).toHaveLength(5)
      expect(new Set(question.options.map((option) => option.id)).size).toBe(5)
      expect(question.options.filter((option) => option.id === question.itemId)).toHaveLength(1)
    }
  })
})
