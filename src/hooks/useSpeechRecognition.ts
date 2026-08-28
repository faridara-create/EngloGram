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

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\\s]/g, '').replace(/\\s+/g, ' ').trim()
}

function similarity(expected: string, actual: string) {
  const expectedWords = new Set(normalize(expected).split(' ').filter(Boolean))
  const actualWords = new Set(normalize(actual).split(' ').filter(Boolean))
  if (!expectedWords.size) return 0
  const matched = [...expectedWords].filter((word) => actualWords.has(word)).length
  return matched / expectedWords.size
}

export function useSpeechRecognition() {
  const recognitionRef = useRef<RecognitionInstance | null>(null)
  const [listening, setListening] = useState(false)
  const [feedback, setFeedback] = useState('')
  const Recognition = typeof window !== 'undefined' ? window.SpeechRecognition ?? window.webkitSpeechRecognition : undefined
  const supported = Boolean(Recognition)

  const stopListening = useCallback(() => {
    recognitionRef.current?.abort()
    recognitionRef.current = null
    setListening(false)
  }, [])

  const startListening = useCallback((expected: string) => {
    if (!Recognition) {
      setFeedback('Speaking practice is not available in this browser. You can still replay and read the sentence aloud.')
      return
    }
    stopListening()
    const recognition = new Recognition()
    recognition.lang = 'en-GB'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onresult = (event) => {
      const transcript = Array.from({ length: event.results.length }, (_, index) => event.results[index][0].transcript).join(' ')
      const score = similarity(expected, transcript)
      setFeedback(score >= .82 ? 'Excellent match — clear and complete.' : score >= .58 ? 'Good attempt. Replay once and try the missing words.' : 'Try again slowly, keeping the full sentence together.')
    }
    recognition.onerror = () => setFeedback('I could not reliably hear that attempt. Replay the model and try again.')
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
    setFeedback('')
    setListening(true)
    recognition.start()
  }, [Recognition, stopListening])

  return { supported, listening, feedback, startListening, stopListening }
}
