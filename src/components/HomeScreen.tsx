import { useMemo, useState } from 'react'
import { resolvePublicAsset } from '../content/loadContent'
import type { Catalog, Registry } from '../content/schema'
import { topicDefinitions } from '../content/topics'
import { lessonProgressPercent, lessonStatus, readLessonProgress } from '../state/progress'

type Props = {
  catalog: Catalog
  registry: Registry
  selectedTopicId: string | null
  onSelectTopic: (topicId: string | null) => void
  onOpenLesson: (path: string, itemId?: string) => void
}

type SearchResult = {
  id: string
  title: string
  context: string
  type: 'TOPIC' | 'LESSON' | 'VOCABULARY'
  topicId: string
  lessonPath?: string
  itemId?: string
  searchable: string
}

function SearchIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>
}

function BackIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg>
}

function getTopicProgress(lessons: Catalog['topics'][number]['lessons']) {
  const available = lessons.filter((lesson) => lesson.available)
  if (!available.length) return 0
  const completed = available.filter((lesson) => readLessonProgress(lesson.id).completed).length
  return Math.round((completed / available.length) * 100)
}

export function HomeScreen({ catalog, registry, selectedTopicId, onSelectTopic, onOpenLesson }: Props) {
  const [query, setQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const catalogByTopic = useMemo(() => new Map(catalog.topics.map((topic) => [topic.id, topic])), [catalog])
  const lessonLookup = useMemo(() => new Map(catalog.topics.flatMap((topic) => topic.lessons.map((lesson) => [lesson.id, { ...lesson, topicId: topic.id, topicTitle: topic.title }] as const))), [catalog])

  const searchIndex = useMemo<SearchResult[]>(() => {
    const topics: SearchResult[] = topicDefinitions.map((topic) => ({
      id: `topic:${topic.id}`,
      title: topic.title,
      context: 'Learning topic',
      type: 'TOPIC',
      topicId: topic.id,
      searchable: topic.title.toLocaleLowerCase('en-GB'),
    }))
    const lessons: SearchResult[] = catalog.topics.flatMap((topic) => topic.lessons.filter((lesson) => lesson.available).map((lesson) => ({
      id: `lesson:${lesson.id}`,
      title: lesson.title,
      context: topic.title,
      type: 'LESSON' as const,
      topicId: topic.id,
      lessonPath: lesson.path,
      searchable: `${lesson.title} ${topic.title}`.toLocaleLowerCase('en-GB'),
    })))
    const vocabulary: SearchResult[] = registry.entries.flatMap((entry) => {
      const lesson = lessonLookup.get(entry.introducedInLesson)
      if (!lesson?.available) return []
      return [{
        id: `vocabulary:${entry.canonicalId}:${entry.introducedInLesson}`,
        title: entry.term,
        context: lesson.topicTitle,
        type: 'VOCABULARY' as const,
        topicId: lesson.topicId,
        lessonPath: lesson.path,
        itemId: entry.canonicalId,
        searchable: `${entry.term} ${entry.aliases.join(' ')} ${lesson.title} ${lesson.topicTitle}`.toLocaleLowerCase('en-GB'),
      }]
    })
    return [...topics, ...lessons, ...vocabulary]
  }, [catalog, lessonLookup, registry])

  const results = useMemo(() => {
    const normalised = query.trim().toLocaleLowerCase('en-GB')
    if (!normalised) return []
    return searchIndex
      .filter((result) => result.searchable.includes(normalised))
      .sort((a, b) => Number(b.title.toLocaleLowerCase('en-GB').startsWith(normalised)) - Number(a.title.toLocaleLowerCase('en-GB').startsWith(normalised)))
      .slice(0, 8)
  }, [query, searchIndex])

  const chooseResult = (result: SearchResult) => {
    setQuery('')
    setSearchFocused(false)
    onSelectTopic(result.topicId)
    if (result.lessonPath) onOpenLesson(result.lessonPath, result.itemId)
  }

  const selectedDefinition = topicDefinitions.find((topic) => topic.id === selectedTopicId)
  const selectedCatalogTopic = selectedTopicId ? catalogByTopic.get(selectedTopicId) : undefined

  if (selectedDefinition) {
    const lessons = selectedCatalogTopic?.lessons.filter((lesson) => lesson.available) ?? []
    const topicProgress = getTopicProgress(lessons)
    return (
      <main className="home-shell topic-detail-shell">
        <section className="topic-detail">
          <button className="detail-back" onClick={() => onSelectTopic(null)}><BackIcon /><span>All topics</span></button>
          <div className="detail-hero">
            <img src={resolvePublicAsset(selectedDefinition.image)} alt={selectedDefinition.imageAlt} />
            <div><small>TOPIC</small><h1>{selectedDefinition.title}</h1><p>{topicProgress}% complete</p></div>
          </div>
          <div className="detail-progress" aria-label={`${topicProgress}% complete`}><i style={{ width: `${topicProgress}%` }} /></div>
          <div className="lesson-list" aria-label={`${selectedDefinition.title} lessons`}>
            {lessons.map((lesson) => {
              const progress = readLessonProgress(lesson.id)
              const percent = lessonProgressPercent(progress)
              const status = lessonStatus(progress)
              return (
                <button className="lesson-row" onClick={() => onOpenLesson(lesson.path)} key={lesson.id}>
                  <span className={`status-marker status-${status.toLocaleLowerCase('en-GB').replace(' ', '-')}`} aria-hidden="true" />
                  <span className="lesson-row-copy"><strong>{lesson.title}</strong><small>{status}</small></span>
                  <span className="lesson-row-progress"><b>{percent}%</b><i><em style={{ width: `${percent}%` }} /></i></span>
                </button>
              )
            })}
            {!lessons.length && <p className="empty-topic">Lessons for this topic are being prepared.</p>}
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="home-shell">
      <div className="library-shell">
        <header className="home-header">
          <div className="brand-lockup">
            <span className="brand-symbol" aria-hidden="true"><i /><i /><i /><i /><i /></span>
            <div><strong>Englo<span>Gram</span></strong><small>Swipe. Listen. Remember.</small></div>
          </div>
          <div className="global-search">
            <SearchIcon />
            <input value={query} onChange={(event) => setQuery(event.target.value)} onFocus={() => setSearchFocused(true)} onBlur={() => window.setTimeout(() => setSearchFocused(false), 120)} placeholder="Search topics, lessons or vocabulary" aria-label="Search topics, lessons or vocabulary" />
            {query && <button onClick={() => setQuery('')} aria-label="Clear search">×</button>}
            {searchFocused && query.trim() && (
              <div className="search-results" role="listbox">
                {results.map((result) => (
                  <button onMouseDown={(event) => event.preventDefault()} onClick={() => chooseResult(result)} key={result.id}>
                    <span><strong>{result.title}</strong><small>{result.context}</small></span><b>{result.type}</b>
                  </button>
                ))}
                {!results.length && <p>No matching topics, lessons or vocabulary.</p>}
              </div>
            )}
          </div>
        </header>

        <section className="topic-section" aria-labelledby="topic-heading">
          <div className="section-heading"><h1 id="topic-heading">Topics</h1><span>18 learning worlds</span></div>
          <div className="topic-grid">
            {topicDefinitions.map((definition) => {
              const topic = catalogByTopic.get(definition.id)
              const progress = getTopicProgress(topic?.lessons ?? [])
              return (
                <button className="topic-card" onClick={() => onSelectTopic(definition.id)} key={definition.id}>
                  <img src={resolvePublicAsset(definition.image)} alt={definition.imageAlt} loading="lazy" />
                  <span className="topic-card-copy"><strong>{definition.title}</strong><small>{progress}% complete</small><i><em style={{ width: `${progress}%` }} /></i></span>
                </button>
              )
            })}
          </div>
        </section>
      </div>
    </main>
  )
}
