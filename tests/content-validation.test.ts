import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { registrySchema } from '../src/content/schema'
import { normalizeTerm, storyContainsItem, validateLesson } from '../src/content/validateLesson'

const lesson = JSON.parse(readFileSync(resolve(process.cwd(), 'public/content/lessons/business-meetings-influence-001.json'), 'utf8'))
const registry = registrySchema.parse(JSON.parse(readFileSync(resolve(process.cwd(), 'public/content/registry/vocabulary-registry.json'), 'utf8')))

describe('content validation', () => {
  it('normalizes punctuation and spacing consistently', () => {
    expect(normalizeTerm('  Raise   a Concern! ')).toBe('raise a concern')
  })

  it('recognises declared grammatical story variants', () => {
    expect(storyContainsItem('The adviser raised a concern calmly.', 'raise a concern', ['raised a concern'])).toBe(true)
  })

  it('accepts the complete sample lesson', () => {
    const result = validateLesson(lesson, registry)
    expect(result.issues).toEqual([])
    expect(result.valid).toBe(true)
  })

  it('rejects duplicate terms', () => {
    const invalid = structuredClone(lesson)
    invalid.items[1].term = invalid.items[0].term
    const result = validateLesson(invalid)
    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'DUPLICATE_TERM')).toBe(true)
  })
})
