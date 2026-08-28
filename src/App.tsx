import { useEffect, useState } from 'react'
import { HomeScreen } from './components/HomeScreen'
import { LessonFeed } from './components/LessonFeed'
import { loadCatalog, loadLesson } from './content/loadContent'
import type { Catalog, Lesson } from './content/schema'

export default function App() {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadCatalog()
      .then(setCatalog)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Content could not be loaded.'))
      .finally(() => setLoading(false))
  }, [])

  const openLesson = async (path: string) => {
    setLoading(true)
    setError('')
    try {
      setLesson(await loadLesson(path))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Lesson could not be loaded.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="app-status"><span className="brand-mark">E</span><p>Curating your feed…</p></div>
  if (error || !catalog) return <div className="app-status error"><span>!</span><h1>Content error</h1><pre>{error}</pre><button onClick={() => window.location.reload()}>Try again</button></div>
  if (lesson) return <LessonFeed lesson={lesson} onBack={() => setLesson(null)} />
  return <HomeScreen catalog={catalog} onOpenLesson={openLesson} />
}
