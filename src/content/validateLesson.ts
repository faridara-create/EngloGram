import { lessonSchema, type Lesson, type Registry } from './schema'

export type ValidationIssue = {
  severity: 'error' | 'warning'
  path: string
  code: string
  message: string
}

export type ValidationResult = {
  valid: boolean
  lesson?: Lesson
  issues: ValidationIssue[]
}

export function normalizeTerm(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[’']/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('en')
}

function normalizeProse(value: string): string {
  return ` ${normalizeTerm(value).replace(/-/g, ' ')} `
}

export function storyContainsItem(story: string, term: string, aliases: string[]): boolean {
  const haystack = normalizeProse(story)
  return [term, ...aliases].some((candidate) => {
    const needle = normalizeProse(candidate)
    return haystack.includes(needle)
  })
}

export function validateLesson(input: unknown, registry?: Registry): ValidationResult {
  const parsed = lessonSchema.safeParse(input)
  if (!parsed.success) {
    return {
      valid: false,
      issues: parsed.error.issues.map((issue) => ({
        severity: 'error',
        path: issue.path.join('.'),
        code: 'SCHEMA_ERROR',
        message: issue.message,
      })),
    }
  }

  const lesson = parsed.data
  const issues: ValidationIssue[] = []
  const add = (issue: ValidationIssue) => issues.push(issue)
  const itemIds = lesson.items.map((item) => item.id)
  const normalizedTerms = lesson.items.map((item) => normalizeTerm(item.term))
  const vocabularyCount = lesson.items.filter((item) => item.type === 'vocabulary').length

  if (new Set(itemIds).size !== itemIds.length) {
    add({ severity: 'error', path: 'items', code: 'DUPLICATE_ITEM_ID', message: 'Learning item IDs must be unique.' })
  }
  if (new Set(normalizedTerms).size !== normalizedTerms.length) {
    add({ severity: 'error', path: 'items', code: 'DUPLICATE_TERM', message: 'Normalized terms must be unique within a lesson.' })
  }
  if (vocabularyCount !== 5) {
    add({ severity: 'error', path: 'items', code: 'ITEM_BALANCE', message: `Expected exactly 5 vocabulary items and 5 collocations; found ${vocabularyCount} vocabulary and ${10 - vocabularyCount} collocations.` })
  }

  const quizIds = lesson.quiz.map((question) => question.itemId)
  if (new Set(quizIds).size !== quizIds.length) {
    add({ severity: 'error', path: 'quiz', code: 'DUPLICATE_QUIZ_ITEM', message: 'Every quiz itemId must be used exactly once.' })
  }
  quizIds.forEach((id, index) => {
    if (!itemIds.includes(id)) {
      add({ severity: 'error', path: `quiz.${index}.itemId`, code: 'UNKNOWN_QUIZ_ITEM', message: `Quiz itemId “${id}” does not reference this lesson.` })
    }
  })

  const storyText = lesson.story.pages.map((page) => page.text).join(' ')
  lesson.items.forEach((item, index) => {
    if (!item.image.url) {
      add({ severity: 'error', path: `items.${index}.image.url`, code: 'MISSING_IMAGE', message: `“${item.term}” needs a real photographic image.` })
    }
    if (item.image.url && (!item.image.provider || !item.image.source || !item.image.license)) {
      add({ severity: 'error', path: `items.${index}.image`, code: 'INCOMPLETE_IMAGE_CREDIT', message: `“${item.term}” needs provider, source and license metadata.` })
    }
    if (!storyContainsItem(storyText, item.term, item.aliases)) {
      add({ severity: 'error', path: `items.${index}.term`, code: 'STORY_COVERAGE', message: `“${item.term}” or one of its declared variants is missing from the story.` })
    }
  })

  if (registry) {
    lesson.items.forEach((item, index) => {
      const normalized = normalizeTerm(item.term)
      const duplicate = registry.entries.find((entry) =>
        entry.normalizedTerm === normalized && entry.introducedInLesson !== lesson.id,
      )
      if (duplicate) {
        add({
          severity: 'error',
          path: `items.${index}.term`,
          code: 'GLOBAL_DUPLICATE',
          message: `“${item.term}” was already introduced in ${duplicate.introducedInLesson}.`,
        })
      }
    })
  }

  return { valid: !issues.some((issue) => issue.severity === 'error'), lesson, issues }
}
