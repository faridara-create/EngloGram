import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { catalogSchema, lessonSchema, registrySchema } from '../src/content/schema'
import { normalizeTerm, storyContainsItem, validateLesson } from '../src/content/validateLesson'

const workspace = process.cwd()
const lessonDirectory = resolve(workspace, 'public/content/lessons')
const lessons = readdirSync(lessonDirectory)
  .filter((file) => file.endsWith('.json'))
  .map((file) => lessonSchema.parse(JSON.parse(readFileSync(resolve(lessonDirectory, file), 'utf8'))))
const catalog = catalogSchema.parse(JSON.parse(readFileSync(resolve(workspace, 'public/content/catalog.json'), 'utf8')))
const registry = registrySchema.parse(JSON.parse(readFileSync(resolve(workspace, 'public/content/registry/vocabulary-registry.json'), 'utf8')))

describe('content validation', () => {
  it('normalizes punctuation and spacing consistently', () => {
    expect(normalizeTerm('  Raise   a Concern! ')).toBe('raise a concern')
  })

  it('recognises declared grammatical story variants', () => {
    expect(storyContainsItem('The adviser raised a concern calmly.', 'raise a concern', ['raised a concern'])).toBe(true)
  })

  it('provides sixteen available lessons and 148 unique registered targets', () => {
    expect(catalog.topics).toHaveLength(8)
    expect(catalog.topics.every((topic) => topic.lessons.length === 2 && topic.lessons.every((lesson) => lesson.available))).toBe(true)
    expect(lessons).toHaveLength(16)
    expect(registry.entries).toHaveLength(148)
    expect(new Set(registry.entries.map((entry) => entry.normalizedTerm)).size).toBe(148)
    expect(new Set(registry.entries.map((entry) => entry.canonicalId)).size).toBe(148)
  })

  it.each(lessons.map((lesson) => [lesson.id, lesson] as const))('accepts complete lesson %s', (_id, lesson) => {
    const result = validateLesson(lesson, registry)
    expect(result.issues).toEqual([])
    expect(result.valid).toBe(true)
    expect(lesson.items.filter((item) => item.type === 'vocabulary').length).toBeGreaterThanOrEqual(4)
    expect(lesson.items.filter((item) => item.type === 'vocabulary').length).toBeLessThanOrEqual(6)
    expect(lesson.items.filter((item) => item.type === 'collocation').length).toBeGreaterThanOrEqual(4)
    expect(lesson.items.filter((item) => item.type === 'collocation').length).toBeLessThanOrEqual(6)
    expect(lesson.quiz).toHaveLength(10)
    const storyWords = lesson.story.pages.flatMap((page) => page.text.trim().split(/\s+/))
    expect(storyWords.length).toBeGreaterThanOrEqual(200)
    expect(storyWords.length).toBeLessThanOrEqual(450)
  })

  it('requires traceable local Pexels photos for every learning item', () => {
    for (const lesson of lessons) {
      for (const item of lesson.items) {
        expect(item.image.url).toMatch(/^images\/.+\.(?:webp|jpe?g)$/)
        expect(item.image.provider).toBe('Pexels')
        expect(item.image.source).toMatch(/^https:\/\/www\.pexels\.com\/photo\/\d+\/$/)
        expect(item.image.photographer.length).toBeGreaterThan(1)
        expect(item.image.attribution).toContain('Photo by')
        expect(item.image.license).toContain('Pexels License')
        const imagePath = resolve(workspace, 'public', item.image.url ?? '')
        expect(existsSync(imagePath)).toBe(true)
        expect(statSync(imagePath).size).toBeLessThanOrEqual(350_000)
      }
    }
  })

  it('rejects duplicate terms', () => {
    const invalid = structuredClone(lessons[0])
    invalid.items[1].term = invalid.items[0].term
    const result = validateLesson(invalid)
    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'DUPLICATE_TERM')).toBe(true)
  })
})
