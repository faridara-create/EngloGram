import { useCallback, useRef, useState } from 'react'
import { browserRecognitionAssessmentProvider, type PronunciationAssessment, type PronunciationAssessmentProvider } from '../content/pronunciation'

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
