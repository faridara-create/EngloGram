import { useCallback, useRef, useState } from 'react'

export function useCarousel() {
  const ref = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)

  const onScroll = useCallback(() => {
    const element = ref.current
    if (!element || !element.clientWidth) return
    setIndex(Math.round(element.scrollLeft / element.clientWidth))
  }, [])

  const goTo = useCallback((nextIndex: number) => {
    const element = ref.current
    if (!element) return
    element.scrollTo({ left: nextIndex * element.clientWidth, behavior: 'smooth' })
    setIndex(nextIndex)
  }, [])

  return { ref, index, onScroll, goTo }
}
