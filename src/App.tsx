import { useEffect, useState } from 'react'
import { HomeScreen } from './components/HomeScreen'
import { LessonFeed } from './components/LessonFeed'
import { loadCatalog, loadLesson, loadRegistry } from './content/loadContent'
import type { Catalog, Lesson, Registry } from './content/schema'

export default function App() {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [registry, setRegistry] = useState<Registry | null>(null)
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null)
  const [initialItemId, setInitialItemId] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([loadCatalog(), loadRegistry()])
      .then(([nextCatalog, nextRegistry]) => {
        setCatalog(nextCatalog)
        setRegistry(nextRegistry)
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Content could not be loaded.'))
      .finally(() => setLoading(false))
  }, [])

  const openLesson = async (path: string, itemId?: string) => {
    setLoading(true)
    setError('')
    try {
      setInitialItemId(itemId)
      setLesson(await loadLesson(path))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Lesson could not be loaded.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="app-status"><span className="brand-mark">E</span><p>Curating your feed…</p></div>
  if (error || !catalog || !registry) return <div className="app-status error"><span>!</span><h1>Content error</h1><pre>{error}</pre><button onClick={() => window.location.reload()}>Try again</button></div>
  if (lesson) return <LessonFeed lesson={lesson} initialItemId={initialItemId} onBack={() => setLesson(null)} />
  return <HomeScreen catalog={catalog} registry={registry} selectedTopicId={selectedTopicId} onSelectTopic={setSelectedTopicId} onOpenLesson={openLesson} />
}
