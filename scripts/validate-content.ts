import { access, readFile, stat } from 'node:fs/promises'
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
  const registryAliases = new Map<string, string>()
  const lexicalFamilies = new Map<string, string>()
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
    for (const candidate of [entry.term, ...entry.aliases]) {
      const normalizedCandidate = normalizeTerm(candidate)
      const owner = registryAliases.get(normalizedCandidate)
      if (owner && owner !== entry.canonicalId) {
        console.error(`ERROR registry.entries.${index}: lexical alias “${candidate}” conflicts with ${owner}`)
        errors += 1
      } else registryAliases.set(normalizedCandidate, entry.canonicalId)
    }
    const family = normalizeTerm(entry.lexicalFamily)
    const familyOwner = lexicalFamilies.get(family)
    if (familyOwner && familyOwner !== entry.canonicalId) {
      console.error(`ERROR registry.entries.${index}: lexical family “${entry.lexicalFamily}” conflicts with ${familyOwner}`)
      errors += 1
    } else lexicalFamilies.set(family, entry.canonicalId)
    registryIds.add(entry.canonicalId)
    registryTerms.add(entry.normalizedTerm)
  }

  const availableLessons = catalog.topics.flatMap((topic) => topic.lessons).filter((lesson) => lesson.available)
  if (availableLessons.length !== 16) { console.error(`ERROR catalog: expected 16 available lessons; found ${availableLessons.length}`); errors += 1 }
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
        const registered = registry.entries.some((entry) => entry.canonicalId === item.id)
        if (!registered) {
          console.error(`ERROR ${catalogLesson.id} · items · REGISTRY_MISSING: “${item.id}” is not registered.`)
          errors += 1
        }
      }
      const vocabularyCount = result.lesson.items.filter((item) => item.type === 'vocabulary').length
      if (vocabularyCount < 4 || vocabularyCount > 6) {
        console.error(`ERROR ${catalogLesson.id} · items · expected a balanced 4–6 vocabulary/collocation mix`)
        errors += 1
      }
      const storyWords = result.lesson.story.pages.flatMap((page) => page.text.trim().split(/\s+/)).length
      if (storyWords < 200 || storyWords > 450) {
        console.error(`ERROR ${catalogLesson.id} · story · expected 200–450 words; found ${storyWords}`)
        errors += 1
      }
      for (const item of result.lesson.items) {
        if (/^https?:\/\//.test(item.image.url ?? '')) {
          console.error(`ERROR ${catalogLesson.id} · ${item.id} · image must use a local asset path`)
          errors += 1
          continue
        }
        const imagePath = resolve(workspace, 'public', item.image.url ?? '')
        try {
          await access(imagePath)
          const imageStat = await stat(imagePath)
          if (imageStat.size > 350_000) {
            console.error(`ERROR ${catalogLesson.id} · ${item.id} · image exceeds 350 KB (${imageStat.size} bytes)`)
            errors += 1
          }
        } catch {
          console.error(`ERROR ${catalogLesson.id} · ${item.id} · local image file is missing: ${item.image.url}`)
          errors += 1
        }
      }
    }
    if (result.valid) console.log(`PASS  ${catalogLesson.id} · 10 items · story and quiz coverage verified`)
  }

  if (registry.entries.length !== 148) { console.error(`ERROR registry: expected 148 unique entries; found ${registry.entries.length}`); errors += 1 }

  console.log(`\nValidated ${availableLessons.length} lesson(s), ${registry.entries.length} registry entries · ${errors} error(s), ${warnings} warning(s)`)
  if (errors > 0) process.exitCode = 1
} catch (error) {
  console.error(error)
  process.exitCode = 1
}
