import { useCallback, useRef, useState } from 'react'

type RecognitionEvent = Event & {
  results: { length: number; [index: number]: { 0: { transcript: string }; isFinal: boolean } }
}

type RecognitionInstance = EventTarget & {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  abort: () => void
  onresult: ((event: RecognitionEvent) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
}

type RecognitionConstructor = new () => RecognitionInstance

declare global {
  interface Window {
    SpeechRecognition?: RecognitionConstructor
    webkitSpeechRecognition?: RecognitionConstructor
  }
}

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

export function useSpeechRecognition(provider: PronunciationAssessmentProvider = browserRecognitionAssessmentProvider) {
  const recognitionRef = useRef<RecognitionInstance | null>(null)
  const [listening, setListening] = useState(false)
  const [assessment, setAssessment] = useState<PronunciationAssessment | null>(null)
  const [error, setError] = useState('')
  const Recognition = typeof window !== 'undefined' ? window.SpeechRecognition ?? window.webkitSpeechRecognition : undefined
  const supported = Boolean(Recognition)

  const stopListening = useCallback(() => {
    const recognition = recognitionRef.current
    if (recognition) {
      recognition.onresult = null
      recognition.onerror = null
      recognition.onend = null
      recognition.abort()
    }
    recognitionRef.current = null
    setListening(false)
  }, [])

  const clearFeedback = useCallback(() => {
    setAssessment(null)
    setError('')
  }, [])

  const startListening = useCallback((expected: string) => {
    if (!Recognition) {
      setAssessment(null)
      setError('Speaking practice is not supported in this browser.')
      return
    }

    stopListening()
    const recognition = new Recognition()
    recognition.lang = 'en-GB'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onresult = (event) => {
      const transcript = Array.from(
        { length: event.results.length },
        (_, index) => event.results[index][0].transcript,
      ).join(' ')
      setAssessment(provider.assess(expected, transcript))
      setError('')
    }
    recognition.onerror = () => {
      setAssessment(null)
      setError('I could not reliably hear that attempt. Listen once more and try again.')
    }
    recognition.onend = () => {
      recognitionRef.current = null
      setListening(false)
    }
    recognitionRef.current = recognition
    setAssessment(null)
    setError('')
    setListening(true)
    recognition.start()
  }, [Recognition, provider, stopListening])

  return {
    supported,
    listening,
    assessment,
    error,
    startListening,
    stopListening,
    clearFeedback,
  }
}
