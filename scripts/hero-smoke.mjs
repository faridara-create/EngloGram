import { chromium } from 'file:///C:/Users/farid/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:5176/'
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
  await context.addInitScript(() => {
    window.__speech = { active: false, overlaps: 0, cancels: 0, speaks: [] }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true,
      value: class {
        constructor(text) {
          this.text = text
          this.lang = ''
          this.rate = 1
          this.voice = null
        }
      },
    })
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        cancel() {
          window.__speech.cancels += 1
          window.__speech.active = false
        },
        speak(utterance) {
          if (window.__speech.active) window.__speech.overlaps += 1
          window.__speech.active = true
          window.__speech.speaks.push({ text: utterance.text, lang: utterance.lang })
        },
        getVoices() {
          return [{ lang: 'en-GB', name: 'British test voice' }]
        },
        pause() {},
        resume() {},
      },
    })
  })

  const viewportResult = {
    viewport: `${viewport.width}x${viewport.height}`,
    heroesChecked: 0,
    initialAutoplay: false,
    verticalNewItem: false,
    verticalReturn: false,
    horizontalReturn: false,
    stableDuringSmallScroll: false,
    manualListen: false,
    noSpeechOverlap: false,
    typography: {
      termMin: Infinity,
      termMax: 0,
      translationMin: Infinity,
      translationMax: 0,
      definitionMin: Infinity,
      definitionMax: 0,
      metadataMax: 0,
    },
    longTermsWrapped: 0,
  }

  for (let topicIndex = 0; topicIndex < 8; topicIndex += 1) {
    const page = await context.newPage()
    await page.goto(baseUrl, { waitUntil: 'networkidle' })
    await page.evaluate(() => localStorage.clear())
    await page.reload({ waitUntil: 'networkidle' })
    await page.locator('.topic-card').nth(topicIndex).click()
    await page.locator('.learning-post').first().waitFor()
    await page.waitForTimeout(230)

    const layout = await page.evaluate(() => {
      const posts = [...document.querySelectorAll('.learning-post')]
      return posts.map((post) => {
        const hero = post.querySelector('.hero-slide')
        const content = hero.querySelector('.hero-content')
        const action = post.querySelector('.item-action-bar')
        const term = hero.querySelector('h2')
        const translation = hero.querySelector('.translation')
        const definition = hero.querySelector('.definition')
        const metadata = hero.querySelector('.type-row')
        const listen = hero.querySelector('.hero-listen')
        const heroRect = hero.getBoundingClientRect()
        const contentRect = content.getBoundingClientRect()
        const actionRect = action.getBoundingClientRect()
        const termRect = term.getBoundingClientRect()
        const termStyle = getComputedStyle(term)
        const innerScrollers = [...hero.querySelectorAll('*')].filter((element) => {
          const style = getComputedStyle(element)
          return /(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 1
        })
        return {
          term: term.textContent.trim(),
          termLength: term.textContent.trim().length,
          termFont: parseFloat(termStyle.fontSize),
          termLines: Math.round(termRect.height / parseFloat(termStyle.lineHeight)),
          translationFont: parseFloat(getComputedStyle(translation).fontSize),
          definitionFont: parseFloat(getComputedStyle(definition).fontSize),
          metadataFont: parseFloat(getComputedStyle(metadata).fontSize),
          fits: contentRect.top >= heroRect.top - 1 && contentRect.bottom <= actionRect.top - 1,
          actionInside: actionRect.top >= heroRect.top && actionRect.bottom <= heroRect.bottom,
          termFitsWidth: term.scrollWidth <= term.clientWidth + 1,
          noInnerScroll: innerScrollers.length === 0,
          listenHasIcon: Boolean(listen?.querySelector('svg')),
          listenLabel: listen?.textContent?.trim(),
        }
      })
    })

    for (const hero of layout) {
      viewportResult.heroesChecked += 1
      viewportResult.typography.termMin = Math.min(viewportResult.typography.termMin, hero.termFont)
      viewportResult.typography.termMax = Math.max(viewportResult.typography.termMax, hero.termFont)
      viewportResult.typography.translationMin = Math.min(viewportResult.typography.translationMin, hero.translationFont)
      viewportResult.typography.translationMax = Math.max(viewportResult.typography.translationMax, hero.translationFont)
      viewportResult.typography.definitionMin = Math.min(viewportResult.typography.definitionMin, hero.definitionFont)
      viewportResult.typography.definitionMax = Math.max(viewportResult.typography.definitionMax, hero.definitionFont)
      viewportResult.typography.metadataMax = Math.max(viewportResult.typography.metadataMax, hero.metadataFont)
      if (hero.termLength > 24 && hero.termLines > 1) viewportResult.longTermsWrapped += 1
      if (!hero.fits || !hero.actionInside || !hero.termFitsWidth || !hero.noInnerScroll) {
        failures.push(`${viewportResult.viewport}: Hero layout failed for "${hero.term}"`)
      }
      if (!hero.listenHasIcon || hero.listenLabel !== 'Listen') {
        failures.push(`${viewportResult.viewport}: Listen button failed for "${hero.term}"`)
      }
    }

    if (topicIndex === 0) {
      const behaviour = await page.evaluate(async () => {
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
        const feed = document.querySelector('.vertical-feed')
        const posts = [...document.querySelectorAll('.learning-post')]
        const firstTerm = posts[0].querySelector('.hero-content h2').textContent.trim()
        const secondTerm = posts[1].querySelector('.hero-content h2').textContent.trim()
        const count = (term) => window.__speech.speaks.filter((entry) => entry.text === term && entry.lang === 'en-GB').length

        const initial = count(firstTerm) === 1
        feed.scrollTop = feed.clientHeight
        feed.dispatchEvent(new Event('scroll'))
        await wait(350)
        const verticalNew = count(secondTerm) === 1

        feed.scrollTop = 0
        feed.dispatchEvent(new Event('scroll'))
        await wait(350)
        const verticalReturn = count(firstTerm) === 2

        const carousel = posts[0].querySelector('.horizontal-carousel')
        carousel.scrollLeft = 5 * carousel.clientWidth
        carousel.dispatchEvent(new Event('scroll'))
        await wait(300)
        carousel.scrollLeft = 0
        carousel.dispatchEvent(new Event('scroll'))
        await wait(350)
        const horizontalReturn = count(firstTerm) === 3

        const beforeSmallScroll = window.__speech.speaks.length
        for (const offset of [3, 7, 4, 0]) {
          carousel.scrollLeft = offset
          carousel.dispatchEvent(new Event('scroll'))
          await wait(35)
        }
        await wait(280)
        const stableSmallScroll = window.__speech.speaks.length === beforeSmallScroll

        const listen = posts[0].querySelector('.hero-listen')
        listen.click()
        await wait(25)
        listen.click()
        await wait(25)
        const manual = count(firstTerm) === 5

        return {
          initial,
          verticalNew,
          verticalReturn,
          horizontalReturn,
          stableSmallScroll,
          manual,
          overlaps: window.__speech.overlaps,
        }
      })

      viewportResult.initialAutoplay = behaviour.initial
      viewportResult.verticalNewItem = behaviour.verticalNew
      viewportResult.verticalReturn = behaviour.verticalReturn
      viewportResult.horizontalReturn = behaviour.horizontalReturn
      viewportResult.stableDuringSmallScroll = behaviour.stableSmallScroll
      viewportResult.manualListen = behaviour.manual
      viewportResult.noSpeechOverlap = behaviour.overlaps === 0
    }

    await page.close()
  }

  for (const [name, value] of Object.entries({
    initialAutoplay: viewportResult.initialAutoplay,
    verticalNewItem: viewportResult.verticalNewItem,
    verticalReturn: viewportResult.verticalReturn,
    horizontalReturn: viewportResult.horizontalReturn,
    stableDuringSmallScroll: viewportResult.stableDuringSmallScroll,
    manualListen: viewportResult.manualListen,
    noSpeechOverlap: viewportResult.noSpeechOverlap,
  })) {
    if (!value) failures.push(`${viewportResult.viewport}: ${name} failed`)
  }
  if (viewportResult.heroesChecked !== 80) failures.push(`${viewportResult.viewport}: expected 80 heroes`)
  if (viewportResult.typography.translationMin <= viewportResult.typography.metadataMax * 2) failures.push(`${viewportResult.viewport}: translation hierarchy too weak`)
  if (viewportResult.typography.definitionMin <= viewportResult.typography.metadataMax * 1.8) failures.push(`${viewportResult.viewport}: definition hierarchy too weak`)

  results.push(viewportResult)
  await context.close()
}

await browser.close()
console.log(JSON.stringify({ results, failures }, null, 2))
if (failures.length) process.exitCode = 1
