import { chromium } from 'file:///C:/Users/farid/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:5174/'
const screenshotDir = process.argv[3]
const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const viewports = [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 430, height: 932 },
]

const browser = await chromium.launch({ headless: true, executablePath: edgePath })
const results = []
const failures = []

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })

  const home = await page.evaluate(({ width, height }) => {
    const cards = [...document.querySelectorAll('.topic-card')]
    const columns = new Set(cards.slice(0, 3).map((card) => Math.round(card.getBoundingClientRect().left))).size
    const visibleCards = cards.filter((card) => card.getBoundingClientRect().bottom <= height).length
    return {
      width,
      cardCount: cards.length,
      columns,
      visibleCards,
      pageOverflows: document.documentElement.scrollWidth > width,
      subtitle: document.querySelector('.brand-lockup small')?.textContent,
      continueBlock: Boolean(document.querySelector('.continue-section')),
      imagesLoaded: cards.every((card) => {
        const image = card.querySelector('img')
        return image?.complete && image.naturalWidth > 0 && image.src.startsWith(location.origin)
      }),
    }
  }, viewport)

  if (home.cardCount !== 18) failures.push(`${viewport.width}x${viewport.height}: expected 18 topic cards`)
  if (home.columns !== 3) failures.push(`${viewport.width}x${viewport.height}: expected 3 mobile columns`)
  if (home.visibleCards < 9) failures.push(`${viewport.width}x${viewport.height}: fewer than 9 topic cards visible initially`)
  if (home.pageOverflows) failures.push(`${viewport.width}x${viewport.height}: horizontal page overflow`)
  if (home.subtitle !== 'Swipe. Listen. Remember.') failures.push(`${viewport.width}x${viewport.height}: subtitle mismatch`)
  if (home.continueBlock) failures.push(`${viewport.width}x${viewport.height}: continue block is present`)
  if (!home.imagesLoaded) failures.push(`${viewport.width}x${viewport.height}: a topic image did not load locally`)

  await page.locator('.global-search input').fill('Psychology')
  const topicResult = page.locator('.search-results button').first()
  if (await topicResult.locator('b').textContent() !== 'TOPIC') failures.push(`${viewport.width}x${viewport.height}: topic search type missing`)
  await topicResult.click()
  await page.locator('.topic-detail').waitFor()
  if (await page.locator('.detail-hero h1').textContent() !== 'Psychology') failures.push(`${viewport.width}x${viewport.height}: topic result did not open topic`)
  if (await page.locator('.lesson-row').count() !== 2) failures.push(`${viewport.width}x${viewport.height}: Psychology lesson list mismatch`)
  if ((await page.locator('.lesson-row-copy small').allTextContents()).some((status) => status !== 'Not started')) failures.push(`${viewport.width}x${viewport.height}: initial lesson status mismatch`)

  await page.locator('.detail-back').click()
  await page.locator('.global-search input').fill('Negotiation & Alignment')
  const lessonResult = page.locator('.search-results button').first()
  if (await lessonResult.locator('b').textContent() !== 'LESSON') failures.push(`${viewport.width}x${viewport.height}: lesson search type missing`)
  await lessonResult.click()
  await page.locator('.learning-post').first().waitFor()

  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.locator('.global-search input').fill('anticipate')
  const vocabularyResult = page.locator('.search-results button').first()
  if (await vocabularyResult.locator('b').textContent() !== 'VOCABULARY') failures.push(`${viewport.width}x${viewport.height}: vocabulary search type missing`)
  await vocabularyResult.click()
  await page.locator('.learning-post').first().waitFor()
  const activeTerm = await page.locator('.feed-page').first().locator('.hero-content h2').textContent()
  if (activeTerm !== 'anticipate') failures.push(`${viewport.width}x${viewport.height}: vocabulary result did not open its item`)

  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  if (screenshotDir) await page.screenshot({ path: `${screenshotDir}/englogram-home-${viewport.width}x${viewport.height}.png`, fullPage: true })
  results.push({ viewport: `${viewport.width}x${viewport.height}`, ...home })
  await context.close()
}

await browser.close()
console.log(JSON.stringify({ results, failures }, null, 2))
if (failures.length) process.exitCode = 1
