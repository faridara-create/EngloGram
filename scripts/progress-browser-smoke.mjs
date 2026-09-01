import { chromium } from 'file:///C:/Users/farid/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:5174/'
const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const lessonId = 'business-meetings-influence-001'
const lessonPath = 'content/lessons/business-meetings-influence-001.json'
const storageKey = `englogram:progress:${lessonId}`
const browser = await chromium.launch({ headless: true, executablePath: edgePath })
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })

await page.goto(baseUrl, { waitUntil: 'networkidle' })
const lesson = await page.evaluate(async (path) => (await fetch(path)).json(), lessonPath)

await page.evaluate(({ key }) => {
  localStorage.clear()
  localStorage.setItem(key, JSON.stringify({ completed: true, items: {}, quiz: {}, storyCompleted: false, quizCompleted: false }))
}, { key: storageKey })
await page.reload({ waitUntil: 'networkidle' })
await page.locator('.topic-card').first().click()
const legacyStatus = await page.locator('.lesson-row-copy small').first().textContent()
const legacyTopicProgress = await page.locator('.detail-hero p').textContent()

const items = Object.fromEntries(lesson.items.map((item) => [item.id, { liked: false, saved: false, note: '', completed: true, completedAt: '2026-09-01T00:00:00.000Z' }]))
await page.evaluate(({ key, items: completedItems }) => {
  localStorage.setItem(key, JSON.stringify({
    items: completedItems,
    quiz: {},
    storyCompleted: true,
    storyCompletedAt: '2026-09-01T00:00:00.000Z',
    quizCompleted: true,
    quizCompletedAt: '2026-09-01T00:00:00.000Z',
    completed: true,
    completedAt: '2026-09-01T00:00:00.000Z',
    currentPost: 11,
    lastVisitedAt: '2026-09-01T00:00:00.000Z',
  }))
}, { key: storageKey, items })
await page.reload({ waitUntil: 'networkidle' })
await page.locator('.topic-card').first().click()
const completedStatus = await page.locator('.lesson-row-copy small').first().textContent()
const completedTopicProgress = await page.locator('.detail-hero p').textContent()

await page.reload({ waitUntil: 'networkidle' })
await page.locator('.topic-card').first().click()
const persistedStatus = await page.locator('.lesson-row-copy small').first().textContent()

const result = { legacyStatus, legacyTopicProgress, completedStatus, completedTopicProgress, persistedStatus }
const failures = []
if (legacyStatus !== 'Not started' || legacyTopicProgress !== '0% complete') failures.push('legacy quiz-only completion was accepted')
if (completedStatus !== 'Completed' || completedTopicProgress !== '50% complete') failures.push('strict completed lesson did not produce topic progress')
if (persistedStatus !== 'Completed') failures.push('completion did not survive reload')

await browser.close()
console.log(JSON.stringify({ result, failures }, null, 2))
if (failures.length) process.exitCode = 1
