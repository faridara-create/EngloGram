# Codex Implementation Brief — English Feed

You are taking over an existing product concept. Treat the files in this starter package as the source of truth.

Read first:
1. README.md
2. docs/PRODUCT_SPEC.md
3. docs/ARCHITECTURE.md
4. docs/CONTENT_RULES.md
5. schemas/*
6. generator/*

There is already an HTML UX mockup from the product exploration phase. The new implementation should preserve the interaction concept but should be rebuilt cleanly rather than extending hardcoded prototype data.

## First objective
Build the foundation, not the full 100-lesson corpus.

### Deliverables
1. Initialize a clean mobile-first TypeScript web application.
2. Implement topic/home screen.
3. Implement reusable lesson feed rendering from JSON.
4. Implement the 6-slide Learning Post carousel.
5. Implement vertical post navigation.
6. Implement Story Post with:
   - multiple pages
   - readable typography
   - highlighted target vocabulary
   - SpeechSynthesis playback
   - word-level highlighting where the browser provides boundary events
   - automatic page advance during continuous playback
7. Implement Quiz Post with 10 definition questions and 5 options each.
8. Implement Web Share API with WhatsApp fallback.
9. Implement private note placeholder and save/like state.
10. Implement official YouGlish integration lazily.
11. Add schema validation at content-load/development time.
12. Add a vocabulary registry and duplicate-check utility.
13. Add lesson validation CLI/script.
14. Include one FULL 10-item sample lesson that satisfies all content rules.
15. Add tests for validator and core data transformations.

## Engineering requirements
- No lesson-specific UI code.
- No hardcoded terms in components.
- Strong TypeScript types derived from or aligned with JSON schemas.
- Prefer simple architecture over premature backend services.
- Make content files easy for an external lesson-generation agent to create.
- Separate generated draft content from approved/published content.
- Preserve accessibility and touch ergonomics.
- Do not copy Instagram branding or proprietary assets. Borrow only interaction conventions.

## After foundation is working
Prepare a second-stage generator system based on generator/AGENT_SPEC.md.
Do not generate 100 lessons before:
- schema validation works
- registry works
- duplicate detection works
- one full lesson renders end to end
- one generated lesson can pass validation and be loaded without code changes

## Completion criteria
I should be able to add a new valid lesson JSON file, register it in the manifest/catalog, refresh the app, and see the complete lesson without editing any React/UI component.

At the end, provide:
- architecture summary
- file tree
- commands to run
- validation command
- how to add one lesson
- how to run the future content generator
- known limitations
