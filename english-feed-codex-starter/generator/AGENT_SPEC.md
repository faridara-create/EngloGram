# 100-Lesson Content Agent Specification

## Goal
Generate a high-quality library of 100 English Feed lessons without duplicates, topic drift, weak examples, or schema violations.

## Do NOT use one giant generation request
Generate in controlled batches.

Recommended:
- 8 top-level topics
- roughly 10–15 lessons per major topic depending on breadth
- total exactly 100
- batch size 5 lessons
- validate after every lesson
- update registry after every approved lesson

## Pipeline

### Stage 1 — Curriculum Planner
Input:
- topic catalog
- target total: 100
- existing vocabulary registry

Output:
- curriculum-plan.json
- exactly 100 lesson briefs
Each brief:
- lesson id
- topic
- subtopic
- title
- communicative goal
- lexical focus
- target CEFR
- intended balance vocabulary/collocations
- forbidden/previously used NEW terms

Planner must maximize:
- topical variety
- lexical utility
- gradual C1 sophistication
- low duplication

### Stage 2 — Lesson Generator
For one lesson brief:
- select 10 NEW items
- generate definitions
- natural German translations
- IPA
- 3 C1 examples each
- image search prompt each
- YouGlish query each
- recap story using all 10
- 10 quiz definitions

Output:
- one lesson JSON matching schema

### Stage 3 — Deterministic Schema Validator
Check:
- valid JSON
- valid IDs
- exactly 10 items
- exactly 3 examples per item
- exactly 10 quiz entries
- required fields
- story exists
- quiz references valid item IDs

### Stage 4 — Linguistic Quality Validator
Check:
- CEFR suitability
- translations are natural German
- example sentences are natural
- collocations are genuine
- definitions are unambiguous
- IPA plausible/consistent
- no awkward AI-style repetition
- story is coherent
- all 10 items appear in story naturally

Return:
- PASS
or
- REVISE with structured issue list

### Stage 5 — Duplicate / Registry Check
Compare:
- exact normalized term
- lemma
- collocation family
- near duplicates
- previous NEW items

Reject duplicates unless explicitly marked as REVIEW.

### Stage 6 — Publish
On PASS:
- write lesson file
- add all 10 items to registry
- update curriculum status
- generate manifest

## Registry fields
For every lexical item:
- canonical id
- canonical term
- type
- normalized form
- lexical family
- level
- introducedInLesson
- topic
- date introduced
- aliases / variants
- times reused in review

## Quality budget
100 lessons = 1,000 NEW items.
Do not force the target if quality degrades.
A better design is:
- 600–800 genuinely useful new lexical targets
- systematic reuse/review of prior items
if the app later becomes mastery-oriented.

If the user specifically requires 1,000 unique new targets, enforce it explicitly.

## Batch execution
Generate 5 lessons.
Validate all 5.
Fix failures.
Update registry.
Only then continue to next batch.

Never generate lesson 51 using a stale registry snapshot from lesson 1.
