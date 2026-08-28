# English Feed — Codex Starter Package

## Product idea
English Feed is a mobile-first English vocabulary learning web app that deliberately borrows the interaction model of Instagram, but redirects scrolling behaviour into structured language learning.

The user chooses a topic, opens a lesson, and consumes language through:
- vertical swipe = next learning post
- horizontal swipe = carousel inside the current post
- image-led vocabulary discovery
- pronunciation audio
- YouGlish real-speech integration
- C1 example sentences with German translations
- recap story using all new language
- definition quiz
- later: spaced repetition, personal mastery, saved words, private notes

## Core lesson structure
One lesson contains:
- 10 Learning Posts
  - target split: 5 vocabulary items + 5 collocations
  - all 10 belong to one coherent subtopic
- 1 Recap Story Post
- 1 Quiz Post

Total: 12 posts.

## Learning Post carousel
Each vocabulary/collocation post contains exactly 6 slides:
1. Hero: photo + English term + German translation + IPA + English definition + Instagram-like actions
2. Pronunciation: automatic TTS pronunciation + replay button + visual/audio treatment
3. YouGlish: official embedded YouGlish widget for the term/collocation
4. Example 1: C1 English sentence + German translation + audio button
5. Example 2: C1 English sentence + German translation + audio button
6. Example 3: C1 English sentence + German translation + audio button

## Recap Story Post
- coherent, realistic text
- uses all 10 new items naturally
- may be split into multiple horizontal pages depending on length
- page counter must be visible, e.g. 1/3, 2/3
- text must be comfortably readable on a phone without reading glasses
- new vocabulary/collocations highlighted with marker effect + bold
- full text can be read aloud
- while TTS is speaking, the current word should be highlighted when browser APIs allow it
- audio playback should auto-advance to the next story page

## Quiz Post
- horizontal carousel with 10 questions
- each question shows one English definition
- exactly 5 answer options
- all options come from the 10 new items of the lesson
- one unambiguous correct answer
- immediate visual feedback

## Home / Topic screen
Topic categories should include at minimum:
- Business
- Technology
- Space
- Health
- Travel
- Family
- Art
- Psychology

The architecture must allow additional topics and subtopics without frontend changes.

## Important design rule
Never hardcode lesson content into UI components.
The frontend renders lessons from structured data.
