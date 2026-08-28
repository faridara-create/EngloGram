# Architecture

## Recommended initial stack
Keep the implementation simple and web-first.

Suggested:
- TypeScript
- React
- Vite or Next.js (choose one and document the reason)
- CSS modules / Tailwind / plain modern CSS: choose one consistently
- Zod or JSON Schema validation
- IndexedDB/localStorage for early prototype progress
- later: SQLite/backend only when content volume and synchronization require it

Do not introduce a backend just to render static lesson JSON.

## Separation of concerns

### UI layer
Reusable components:
- HomeScreen
- TopicCard
- LessonFeed
- LearningPost
- HeroSlide
- PronunciationSlide
- YouGlishSlide
- ExampleSlide
- StoryPost
- StoryPage
- QuizPost
- QuizQuestionSlide
- ShareButton
- SaveButton
- NoteButton

### Content layer
- topics
- lessons
- vocabulary registry
- image metadata
- generator outputs

### Learning state
Per user:
- lesson opened/completed
- item seen
- item liked/saved
- private notes
- quiz attempts
- correct/incorrect
- mastery dimensions later
- last reviewed
- next review

### Integrations
- browser speech synthesis
- YouGlish official widget
- Web Share API
- WhatsApp fallback
- image provider / image asset service

## Key rule
UI components receive typed data. They must not know the semantic content of a specific lesson.

Example:
LearningPost(item: LearningItem)

The component should work equally for:
- anticipate
- establish rapport
- orbital debris
- insulin sensitivity
without code changes.

## Content loading
Suggested layout:

data/
  topics.json
  lessons/
    business/
      business-meetings-influence-001.json
    technology/
    psychology/
  registry/
    vocabulary-registry.json

## Future content pipeline
content brief
  -> lesson planner
  -> lesson generator
  -> schema validator
  -> linguistic quality validator
  -> duplication checker
  -> image prompt/search step
  -> publishable lesson JSON
  -> registry update

## Do not
- hardcode 100 lessons in source components
- duplicate examples inside multiple data files without tracking
- generate quizzes independently from the lesson vocabulary
- allow generator output directly into production without validation
