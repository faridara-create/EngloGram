import type { Catalog } from '../content/schema'

type Props = {
  catalog: Catalog
  onOpenLesson: (path: string) => void
}

export function HomeScreen({ catalog, onOpenLesson }: Props) {
  return (
    <main className="home-shell">
      <header className="home-header">
        <div className="brand-row">
          <span className="brand-mark" aria-hidden="true">E</span>
          <span className="brand-name">{catalog.product}</span>
          <span className="level-chip">C1 · DE</span>
        </div>
        <p className="kicker">YOUR DAILY ENGLISH EDIT</p>
        <h1>Scroll less.<br /><em>Say more.</em></h1>
        <p className="home-intro">Real language for conversations that matter. Pick a world and start with one focused lesson.</p>
      </header>

      <section className="topic-section" aria-labelledby="topic-heading">
        <div className="section-heading">
          <h2 id="topic-heading">Choose your feed</h2>
          <span>{catalog.topics.length} topics</span>
        </div>
        <div className="topic-grid">
          {catalog.topics.map((topic, index) => {
            const lesson = topic.lessons[0]
            return (
              <button
                className={`topic-card tone-${topic.color}`}
                key={topic.id}
                onClick={() => lesson?.available && onOpenLesson(lesson.path)}
                aria-disabled={!lesson?.available}
              >
                <span className="topic-number">{String(index + 1).padStart(2, '0')}</span>
                <span className="topic-orbit" aria-hidden="true"><b>{topic.symbol}</b></span>
                <span className="topic-copy">
                  <small>{topic.eyebrow}</small>
                  <strong>{topic.title}</strong>
                  <span>{topic.description}</span>
                </span>
                <span className="topic-footer">
                  <span>{lesson?.title}</span>
                  <b>{lesson?.available ? 'Start →' : 'Soon'}</b>
                </span>
              </button>
            )
          })}
        </div>
      </section>
    </main>
  )
}
