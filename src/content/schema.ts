import { z } from 'zod'

const nonEmpty = z.string().trim().min(1)
const languageTag = z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/)

export const exampleSchema = z.object({
  source: nonEmpty,
  translation: nonEmpty,
})

export const learningItemSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  type: z.enum(['vocabulary', 'collocation']),
  term: nonEmpty,
  translation: nonEmpty,
  ipa: nonEmpty,
  definition: nonEmpty,
  examples: z.array(exampleSchema).length(3),
  image: z.object({
    url: nonEmpty.nullable(),
    searchPrompt: nonEmpty,
    alt: nonEmpty,
    provider: z.string().nullable(),
    source: z.string().nullable(),
    attribution: z.string().nullable(),
    license: z.string().nullable(),
    palette: z.tuple([nonEmpty, nonEmpty]),
  }),
  audio: z.object({
    text: nonEmpty,
    language: languageTag,
    voiceHint: z.string().optional(),
  }),
  youglish: z.object({
    query: nonEmpty,
    language: nonEmpty,
    accent: z.string().optional(),
  }),
  aliases: z.array(nonEmpty).default([]),
  tags: z.array(nonEmpty).default([]),
})

export const lessonSchema = z.object({
  schemaVersion: z.literal('1.0'),
  id: z.string().regex(/^[a-z0-9-]+$/),
  topicId: z.string().regex(/^[a-z0-9-]+$/),
  subtopic: nonEmpty,
  title: nonEmpty,
  level: z.enum(['B2', 'C1', 'C2']),
  sourceLanguage: languageTag,
  translationLanguage: languageTag,
  accent: languageTag,
  items: z.array(learningItemSchema).length(10),
  story: z.object({
    title: nonEmpty,
    pages: z.array(z.object({ text: z.string().trim().min(100) })).min(1),
  }),
  quiz: z.array(z.object({
    itemId: z.string().regex(/^[a-z0-9-]+$/),
    definition: nonEmpty,
  })).length(10),
  metadata: z.object({
    createdAt: nonEmpty,
    reviewStatus: z.enum(['draft', 'validated', 'approved', 'published']),
    tags: z.array(nonEmpty),
  }),
})

export const catalogSchema = z.object({
  product: nonEmpty,
  topics: z.array(z.object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    title: nonEmpty,
    eyebrow: nonEmpty,
    symbol: nonEmpty,
    color: nonEmpty,
    description: nonEmpty,
    lessons: z.array(z.object({
      id: z.string().regex(/^[a-z0-9-]+$/),
      title: nonEmpty,
      path: z.string(),
      available: z.boolean(),
    })),
  })).min(1),
})

export const registryEntrySchema = z.object({
  canonicalId: z.string().regex(/^[a-z0-9-]+$/),
  term: nonEmpty,
  normalizedTerm: nonEmpty,
  type: z.enum(['vocabulary', 'collocation']),
  language: languageTag,
  translationLanguage: languageTag,
  topic: nonEmpty,
  introducedInLesson: nonEmpty,
  lexicalFamily: nonEmpty,
  aliases: z.array(z.string()),
})

export const registrySchema = z.object({
  version: nonEmpty,
  entries: z.array(registryEntrySchema),
})

export type Lesson = z.infer<typeof lessonSchema>
export type LearningItem = z.infer<typeof learningItemSchema>
export type Catalog = z.infer<typeof catalogSchema>
export type Registry = z.infer<typeof registrySchema>
