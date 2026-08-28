import { describe, expect, it } from 'vitest'
import { assessRecognition } from '../src/hooks/useSpeechRecognition'

describe('sentence recognition assessment', () => {
  it('scores an exact sentence match at 100 percent', () => {
    const result = assessRecognition(
      'Both teams wanted a reliable launch.',
      'Both teams wanted a reliable launch.',
    )
    expect(result.score).toBe(100)
  })

  it('ignores punctuation and letter case', () => {
    const result = assessRecognition('Find common ground!', 'find common ground')
    expect(result.score).toBe(100)
  })

  it('reduces the score for missing or changed words', () => {
    const result = assessRecognition(
      'The team decided to safeguard privacy before launch.',
      'The team decided before lunch.',
    )
    expect(result.score).toBeLessThan(80)
    expect(result.transcript).toBe('The team decided before lunch.')
  })
})
