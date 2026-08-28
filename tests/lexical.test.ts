import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { findTargetMatches, splitWithTargets } from '../src/content/lexical'
import { lessonSchema } from '../src/content/schema'

const lesson = lessonSchema.parse(JSON.parse(readFileSync(resolve(process.cwd(), 'public/content/lessons/business-meetings-influence-001.json'), 'utf8')))

describe('target-language highlighting', () => {
  it('matches aliases with word boundaries in story text', () => {
    const matches = findTargetMatches('She raised a concern and found common ground.', lesson.items)
    expect(matches.map((match) => match.item.id)).toEqual(['raise-a-concern', 'find-common-ground'])
  })

  it('splits example copy without losing punctuation', () => {
    const item = lesson.items.find((candidate) => candidate.id === 'anticipate')!
    const sentence = item.examples[0].source
    const parts = splitWithTargets(sentence, item)
    expect(parts.map((part) => part.text).join('')).toBe(sentence)
    expect(parts.some((part) => part.highlighted && part.text.toLowerCase() === 'anticipate')).toBe(true)
  })
})
