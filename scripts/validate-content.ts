import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { catalogSchema, registrySchema } from '../src/content/schema.ts'
import { normalizeTerm, validateLesson } from '../src/content/validateLesson.ts'

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8'))
}

const workspace = process.cwd()
const catalogPath = resolve(workspace, 'public/content/catalog.json')
const registryPath = resolve(workspace, 'public/content/registry/vocabulary-registry.json')

try {
  const catalog = catalogSchema.parse(await readJson(catalogPath))
  const registry = registrySchema.parse(await readJson(registryPath))
  let errors = 0
  let warnings = 0

  const registryIds = new Set<string>()
  const registryTerms = new Set<string>()
  for (const [index, entry] of registry.entries.entries()) {
    if (registryIds.has(entry.canonicalId)) {
      console.error(`ERROR registry.entries.${index}: duplicate canonicalId “${entry.canonicalId}”`)
      errors += 1
    }
    if (registryTerms.has(entry.normalizedTerm)) {
      console.error(`ERROR registry.entries.${index}: duplicate normalizedTerm “${entry.normalizedTerm}”`)
      errors += 1
    }
    if (normalizeTerm(entry.term) !== entry.normalizedTerm) {
      console.error(`ERROR registry.entries.${index}: normalizedTerm does not match “${entry.term}”`)
      errors += 1
    }
    registryIds.add(entry.canonicalId)
    registryTerms.add(entry.normalizedTerm)
  }

  const availableLessons = catalog.topics.flatMap((topic) => topic.lessons).filter((lesson) => lesson.available)
  for (const catalogLesson of availableLessons) {
    const lessonPath = resolve(workspace, 'public', catalogLesson.path.replace(/^\//, ''))
    const result = validateLesson(await readJson(lessonPath), registry)
    for (const issue of result.issues) {
      const label = issue.severity.toUpperCase()
      console[issue.severity === 'error' ? 'error' : 'warn'](`${label} ${catalogLesson.id} · ${issue.path} · ${issue.code}: ${issue.message}`)
      if (issue.severity === 'error') errors += 1
      else warnings += 1
    }
    if (result.lesson) {
      for (const item of result.lesson.items) {
        const registered = registry.entries.some((entry) => entry.canonicalId === item.id && entry.introducedInLesson === result.lesson?.id)
        if (!registered) {
          console.error(`ERROR ${catalogLesson.id} · items · REGISTRY_MISSING: “${item.id}” is not registered.`)
          errors += 1
        }
      }
    }
    if (result.valid) console.log(`PASS  ${catalogLesson.id} · 10 items · story and quiz coverage verified`)
  }

  console.log(`\nValidated ${availableLessons.length} lesson(s), ${registry.entries.length} registry entries · ${errors} error(s), ${warnings} warning(s)`)
  if (errors > 0) process.exitCode = 1
} catch (error) {
  console.error(error)
  process.exitCode = 1
}
