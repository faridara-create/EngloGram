# Product & UX Specification

## Product principles
1. Instagram-like, not textbook-like.
2. One-thumb mobile use.
3. Visual, fast, rewarding.
4. No infinite-scroll dark pattern: lessons have a meaningful end.
5. English exposure before explanation where pedagogically useful.
6. C1-oriented natural language, especially useful for real life and professional communication.
7. Vocabulary means both single lexical items and multi-word collocations.
8. Avoid stale EFL textbook examples.
9. Examples must sound like language an educated native or fluent professional could plausibly use.
10. German is the support language.

## Interaction model
### Vertical
Swipe up/down between posts:
- Learning Post 1
- ...
- Learning Post 10
- Story Post
- Quiz Post

### Horizontal
Swipe left/right within a post.

### Instagram-like controls on Hero slide
- Like
- Comment/Note
- Share
- Save

Share behaviour:
- Prefer Web Share API on supported mobile browsers.
- Fallback: WhatsApp deep link with a compact share payload:
  English Feed
  [term]
  [German translation]
  [one English example]
  Optional: app URL / lesson URL

Comments are not public social comments in MVP.
Treat them as private user notes / associations.

## Readability
- Mobile first, target width ~360–430 px
- Recap story body text around 20–22 px on mobile
- generous line height
- high contrast
- no tiny UI controls
- avoid dense layouts

## Photos
Use photography rather than illustration by default.
Image strategy:
- literal photo for concrete nouns
- situation photo for abstract business/social concepts
- emotional/contextual cue photo for abstract psychological language
The image should function as a memory hook, not decoration.

Do not permanently depend on arbitrary hotlinked stock URLs in production.
Use a proper image provider or locally cached/licensed assets with attribution/license metadata if required.

## Audio
MVP:
- browser SpeechSynthesis for pronunciation and sentences
- default English accent: en-GB
- user can replay
Later:
- higher quality generated voice assets
- accent options
- speech recording and comparison

## YouGlish
Use the official YouGlish Widget / JS API.
Do not scrape YouGlish.
The UI must preserve required attribution and comply with YouGlish/YouTube policies.
Load the widget lazily when the user reaches the YouGlish slide.

## Completion
A lesson is complete after the Quiz Post.
Store completion and item-level performance separately.
