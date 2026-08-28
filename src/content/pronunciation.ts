export type PronunciationAssessment = {
  expected: string
  transcript: string
  score: number
}

export type PronunciationAssessmentProvider = {
  assess: (expected: string, transcript: string) => PronunciationAssessment
}

function tokens(value: string) {
  return value
    .toLocaleLowerCase('en')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
}

function editDistance(expected: string[], actual: string[]) {
  const rows = Array.from({ length: expected.length + 1 }, () => Array<number>(actual.length + 1).fill(0))
  for (let row = 0; row <= expected.length; row += 1) rows[row][0] = row
  for (let column = 0; column <= actual.length; column += 1) rows[0][column] = column

  for (let row = 1; row <= expected.length; row += 1) {
    for (let column = 1; column <= actual.length; column += 1) {
      const substitution = expected[row - 1] === actual[column - 1] ? 0 : 1
      rows[row][column] = Math.min(
        rows[row - 1][column] + 1,
        rows[row][column - 1] + 1,
        rows[row - 1][column - 1] + substitution,
      )
    }
  }
  return rows[expected.length][actual.length]
}

export function assessRecognition(expected: string, transcript: string): PronunciationAssessment {
  const expectedTokens = tokens(expected)
  const actualTokens = tokens(transcript)
  const longest = Math.max(expectedTokens.length, actualTokens.length, 1)
  const score = Math.max(0, Math.round((1 - editDistance(expectedTokens, actualTokens) / longest) * 100))
  return { expected, transcript: transcript.trim(), score }
}

export const browserRecognitionAssessmentProvider: PronunciationAssessmentProvider = {
  assess: assessRecognition,
}
