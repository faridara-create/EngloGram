import { useCallback, useEffect, useRef, useState } from 'react'

type SpeakOptions = {
  onBoundary?: (charIndex: number, charLength: number) => void
  onEnd?: () => void
  rate?: number
}

export function useSpeech() {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const [speaking, setSpeaking] = useState(false)
  const [paused, setPaused] = useState(false)
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

  const stop = useCallback(() => {
    if (!supported) return
    window.speechSynthesis.cancel()
    utteranceRef.current = null
    setSpeaking(false)
    setPaused(false)
  }, [supported])

  const speak = useCallback((text: string, language = 'en-GB', options: SpeakOptions = {}) => {
    if (!supported) return false
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = language
    utterance.rate = options.rate ?? 0.92
    const voices = window.speechSynthesis.getVoices()
    utterance.voice = voices.find((voice) => voice.lang.toLowerCase() === language.toLowerCase())
      ?? voices.find((voice) => voice.lang.toLowerCase().startsWith(language.slice(0, 2).toLowerCase()))
      ?? null
    utterance.onboundary = (event) => options.onBoundary?.(event.charIndex, event.charLength || 1)
    utterance.onend = () => {
      utteranceRef.current = null
      setSpeaking(false)
      setPaused(false)
      options.onEnd?.()
    }
    utterance.onerror = () => {
      utteranceRef.current = null
      setSpeaking(false)
      setPaused(false)
    }
    utteranceRef.current = utterance
    setSpeaking(true)
    setPaused(false)
    window.speechSynthesis.speak(utterance)
    return true
  }, [supported])

  const pause = useCallback(() => {
    if (!supported || !speaking || paused) return
    window.speechSynthesis.pause()
    setPaused(true)
  }, [paused, speaking, supported])

  const resume = useCallback(() => {
    if (!supported || !speaking || !paused) return
    window.speechSynthesis.resume()
    setPaused(false)
  }, [paused, speaking, supported])

  useEffect(() => stop, [stop])

  return { speak, stop, pause, resume, speaking, paused, supported }
}
