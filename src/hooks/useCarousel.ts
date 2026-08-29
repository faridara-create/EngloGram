import { useCallback, useEffect, useRef, useState } from 'react'

export function useCarousel(settleDelay = 220) {
  const ref = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const [settledIndex, setSettledIndex] = useState(0)
  const timerRef = useRef<number | null>(null)

  const onScroll = useCallback(() => {
    const element = ref.current
    if (!element || !element.clientWidth) return
    const next = Math.round(element.scrollLeft / element.clientWidth)
    setIndex(next)
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setSettledIndex(next), settleDelay)
  }, [settleDelay])

  const goTo = useCallback((nextIndex: number) => {
    const element = ref.current
    if (!element) return
    element.scrollTo({ left: nextIndex * element.clientWidth, behavior: 'smooth' })
    setIndex(nextIndex)
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setSettledIndex(nextIndex), settleDelay)
  }, [settleDelay])

  const reset = useCallback(() => {
    const element = ref.current
    if (timerRef.current) window.clearTimeout(timerRef.current)
    if (element) element.scrollLeft = 0
    setIndex(0)
    setSettledIndex(0)
  }, [])

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
  }, [])

  return { ref, index, settledIndex, onScroll, goTo, reset }
}
