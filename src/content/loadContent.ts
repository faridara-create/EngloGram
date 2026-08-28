import { catalogSchema, lessonSchema, type Catalog, type Lesson } from './schema'
import { validateLesson } from './validateLesson'

async function loadJson(path: string): Promise<unknown> {
  const publicPath = /^https?:\/\//.test(path)
    ? path
    : `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`
  const response = await fetch(publicPath)
  if (!response.ok) throw new Error(`Content could not be loaded (${response.status}).`)
  return response.json()
}

export function resolvePublicAsset(path: string): string {
  return /^https?:\/\//.test(path)
    ? path
    : `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`
}

export async function loadCatalog(): Promise<Catalog> {
  return catalogSchema.parse(await loadJson('content/catalog.json'))
}

export async function loadLesson(path: string): Promise<Lesson> {
  const raw = await loadJson(path)
  const result = validateLesson(raw)
  if (!result.valid || !result.lesson) {
    throw new Error(result.issues.map((issue) => `${issue.path}: ${issue.message}`).join('\n'))
  }
  return lessonSchema.parse(result.lesson)
}
