import type { LearningItem } from './schema'

export type TargetMatch = {
  start: number
  end: number
  item: LearningItem
}

export function findTargetMatches(text: string, items: LearningItem[]): TargetMatch[] {
  const source = text.toLocaleLowerCase('en')
  const candidates = items
    .flatMap((item) => [item.term, ...item.aliases].map((candidate) => ({ candidate, item })))
    .sort((a, b) => b.candidate.length - a.candidate.length)
  const matches: TargetMatch[] = []

  for (const { candidate, item } of candidates) {
    const needle = candidate.toLocaleLowerCase('en')
    let from = 0
    while (from < source.length) {
      const start = source.indexOf(needle, from)
      if (start === -1) break
      const end = start + needle.length
      const leftOk = start === 0 || !/[a-z]/i.test(source[start - 1])
      const rightOk = end === source.length || !/[a-z]/i.test(source[end])
      const overlaps = matches.some((match) => start < match.end && end > match.start)
      if (leftOk && rightOk && !overlaps) matches.push({ start, end, item })
      from = start + needle.length
    }
  }

  return matches.sort((a, b) => a.start - b.start)
}

export function splitWithTargets(text: string, item: LearningItem) {
  const matches = findTargetMatches(text, [item])
  const result: { text: string; highlighted: boolean }[] = []
  let cursor = 0
  for (const match of matches) {
    if (match.start > cursor) result.push({ text: text.slice(cursor, match.start), highlighted: false })
    result.push({ text: text.slice(match.start, match.end), highlighted: true })
    cursor = match.end
  }
  if (cursor < text.length) result.push({ text: text.slice(cursor), highlighted: false })
  return result.length ? result : [{ text, highlighted: false }]
}
