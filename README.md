# EngloGram · Phase 1

A mobile-first C1 language-learning feed built with React, TypeScript and Vite. Lesson UI is generic: topics, learning items, examples, story pages and quiz questions are loaded from JSON files in `public/content`.

## Commands

```bash
npm install
npm run dev
npm run validate-content
npm test
npm run build
```

Vite prints the local browser address after `npm run dev` (normally `http://localhost:5173`).

## Deployment

Every push to `main` runs content validation, tests and the production build before deploying `dist` to GitHub Pages. The published app is available at `https://faridara-create.github.io/EngloGram/` once Pages uses **GitHub Actions** as its publishing source.

## Content architecture

- `public/content/catalog.json` registers topics and available lessons.
- `public/content/lessons/*.json` contains complete lesson data.
- `public/content/registry/vocabulary-registry.json` tracks introduced lexical items.
- `src/content/schema.ts` is the runtime Zod schema shared by app and validator.
- `src/content/validateLesson.ts` adds semantic checks: uniqueness, quiz references, story coverage and registry duplicates.

To add a lesson, create a conforming JSON file, register its new items in the vocabulary registry, then add the lesson path to the topic catalog. Run `npm run validate-content` before opening it in the app. No UI component needs changing.

## Phase 1 boundaries

Progress is device-local in LocalStorage. Speech uses the browser SpeechSynthesis API, so voice quality and word-boundary events vary by browser. The official YouGlish widget is loaded only when its slide becomes active and requires network access; production/commercial usage must comply with YouGlish and YouTube terms. Photo fields currently use polished data-driven placeholders based on each item's photo brief and palette, ready for licensed image assets later.
