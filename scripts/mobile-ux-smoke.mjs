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

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  await page.addInitScript(() => {
    window.__yg = { fetches: 0, next: 0, previous: 0, replay: 0, play: 0, pause: 0 }
    class FakeWidget {
      constructor(id, options) {
        this.options = options
        this.track = 1
        this.total = 5
        const target = document.getElementById(id)
        if (target) {
          const video = document.createElement('div')
          video.className = 'fake-yg-video'
          video.style.cssText = 'width:100%;height:100%;min-height:200px;background:linear-gradient(135deg,#253b33,#111);display:grid;place-items:center;color:white'
          video.textContent = 'Authentic video example'
          target.append(video)
        }
      }
      fetch() {
        window.__yg.fetches += 1
        setTimeout(() => {
          this.options.events.onFetchDone?.(this.total)
          this.options.events.onVideoChange?.(this.track)
        }, 20)
      }
      play() { window.__yg.play += 1 }
      pause() { window.__yg.pause += 1 }
      replay() { window.__yg.replay += 1 }
      next() {
        window.__yg.next += 1
        this.track = Math.min(this.total, this.track + 1)
        this.options.events.onVideoChange?.(this.track)
      }
      previous() {
        window.__yg.previous += 1
        this.track = Math.max(1, this.track - 1)
        this.options.events.onVideoChange?.(this.track)
      }
    }
    window.YG = { Widget: FakeWidget }

    window.__spoken = []
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true,
      value: class {
        constructor(text) { this.text = text; this.lang = ''; this.rate = 1 }
      },
    })
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        speak(utterance) { window.__spoken.push({ text: utterance.text, lang: utterance.lang }) },
        cancel() {},
        getVoices() { return [] },
      },
    })
    class FakeRecognition {
      start() {
        setTimeout(() => {
          const carousel = document.querySelector('.horizontal-carousel')
          const index = Math.round(carousel.scrollLeft / carousel.clientWidth)
          const transcript = carousel.children[index]?.querySelector('.source-sentence')?.textContent ?? ''
          this.onresult?.({ results: [[{ transcript }]] })
          this.onend?.()
        }, 20)
      }
      stop() { this.onend?.() }
      abort() { this.onend?.() }
    }
    window.webkitSpeechRecognition = FakeRecognition
  })

  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })
  await page.locator('.topic-card').first().click()
  await page.locator('.learning-post').first().waitFor()

  const summary = await page.evaluate(async ({ width, height }) => {
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
    const feed = document.querySelector('.vertical-feed')
    const firstPost = document.querySelector('.learning-post')
    const carousel = firstPost.querySelector('.horizontal-carousel')
    const slides = [...carousel.querySelectorAll('.post-slide')]
    const setSlide = async (slideIndex) => {
      carousel.scrollLeft = slideIndex * carousel.clientWidth
      carousel.dispatchEvent(new Event('scroll'))
      await wait(310)
    }
    const visible = (element) => {
      const rect = element.getBoundingClientRect()
      return rect.top >= -1 && rect.left >= -1 && rect.bottom <= height + 1 && rect.right <= width + 1
    }

    const heroPhoto = slides[0].querySelector('.photo-field').getBoundingClientRect()
    const spokenOnHero = window.__spoken.some((entry) => entry.lang === 'en-GB')
    const slideChecks = []
    for (let index = 0; index < slides.length; index += 1) {
      await setSlide(index)
      const actionBar = firstPost.querySelector('.item-action-bar')
      const innerScrollers = [...slides[index].querySelectorAll('*')].filter((element) => {
        const style = getComputedStyle(element)
        return /(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 1
      })
      slideChecks.push({
        index,
        actionVisible: visible(actionBar),
        clipped: slides[index].scrollHeight > slides[index].clientHeight + 1,
        innerScrollers: innerScrollers.length,
      })
    }

    await setSlide(1)
    await wait(80)
    const controls = [...slides[1].querySelectorAll('.youglish-controls button')]
    const controlsVisible = controls.length === 3 && controls.every(visible)
    const fetchesBeforeNext = window.__yg.fetches
    controls[2].click()
    await wait(30)
    const fetchesAfterNext = window.__yg.fetches
    const nextCount = window.__yg.next
    const youglishCount = slides[1].querySelector('.youglish-count')?.textContent?.trim()

    await setSlide(2)
    const exampleButtons = [...slides[2].querySelectorAll('.practice-actions button')]
    const exampleActionsVisible = exampleButtons.length === 2 && exampleButtons.every(visible)
    exampleButtons[1].click()
    await wait(80)
    const feedback = slides[2].querySelector('.practice-feedback')
    const feedbackVisible = Boolean(feedback && visible(feedback) && /Match:\s*100%/.test(feedback.textContent ?? ''))

    const like = firstPost.querySelector('button[aria-label="Like"]')
    like?.click()
    await setSlide(0)
    const sharedLike = firstPost.querySelector('.item-action-bar button[aria-pressed="true"]') !== null

    await setSlide(5)
    await wait(30)
    const progressRecords = Object.keys(localStorage)
      .filter((key) => key.startsWith('englogram:progress:'))
      .map((key) => JSON.parse(localStorage.getItem(key)))
    const itemCompleted = progressRecords.some((record) => Object.values(record.items ?? {}).some((item) => item.completed))

    await setSlide(4)
    feed.scrollTop = feed.clientHeight
    feed.dispatchEvent(new Event('scroll'))
    await wait(320)
    const secondCarousel = document.querySelectorAll('.horizontal-carousel')[1]
    const nextStartsAtHero = secondCarousel?.scrollLeft === 0
    feed.scrollTop = 0
    feed.dispatchEvent(new Event('scroll'))
    await wait(320)
    const returnResetsHero = carousel.scrollLeft === 0

    feed.scrollTop = 10 * feed.clientHeight
    feed.dispatchEvent(new Event('scroll'))
    await wait(320)
    const storyPages = [...document.querySelectorAll('.story-page')]
    const storyFits = storyPages.every((page) => page.scrollHeight <= page.clientHeight + 1)

    feed.scrollTop = 11 * feed.clientHeight
    feed.dispatchEvent(new Event('scroll'))
    await wait(320)
    const quizPages = [...document.querySelectorAll('.quiz-page')]
    const quizFits = quizPages.every((page) => page.scrollHeight <= page.clientHeight + 1)

    return {
      viewport: `${width}x${height}`,
      slideCount: slides.length,
      heroPhotoCoverage: Math.round((heroPhoto.height / height) * 100),
      spokenOnHero,
      slideChecks,
      controlsVisible,
      youglishCount,
      fetchesBeforeNext,
      fetchesAfterNext,
      nextCount,
      exampleActionsVisible,
      feedbackVisible,
      sharedLike,
      itemCompleted,
      nextStartsAtHero,
      returnResetsHero,
      storyFits,
      quizFits,
    }
  }, viewport)

  results.push(summary)
  await context.close()
}

await browser.close()

const failures = []
for (const result of results) {
  if (result.slideCount !== 6) failures.push(`${result.viewport}: expected 6 slides`)
  if (result.heroPhotoCoverage < 98) failures.push(`${result.viewport}: hero photo not full height`)
  if (!result.spokenOnHero) failures.push(`${result.viewport}: hero did not speak`)
  if (result.slideChecks.some((check) => !check.actionVisible || check.clipped || check.innerScrollers)) failures.push(`${result.viewport}: slide clipping/action/inner-scroll failure`)
  if (!result.controlsVisible || result.fetchesBeforeNext !== 1 || result.fetchesAfterNext !== 1 || result.nextCount !== 1) failures.push(`${result.viewport}: YouGlish controls/fetch failure`)
  if (!result.exampleActionsVisible || !result.feedbackVisible) failures.push(`${result.viewport}: speaking practice failure`)
  if (!result.sharedLike || !result.itemCompleted) failures.push(`${result.viewport}: shared/completion state failure`)
  if (!result.nextStartsAtHero || !result.returnResetsHero) failures.push(`${result.viewport}: carousel reset failure`)
  if (!result.storyFits || !result.quizFits) failures.push(`${result.viewport}: story/quiz overflow`)
}

console.log(JSON.stringify({ results, failures }, null, 2))
if (failures.length) process.exitCode = 1
