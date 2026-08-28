# Validator Requirements

Implement both deterministic and AI-assisted validation.

## Deterministic checks
- JSON parses
- schema valid
- lesson ID unique
- item IDs unique in lesson
- exactly 10 items
- target 5 vocabulary / 5 collocations; warn if outside 4–6 balance
- exactly 3 examples per item
- exactly 10 quiz definitions
- quiz itemIds are unique and match lesson itemIds
- story non-empty
- every item has image.searchPrompt
- every item has YouGlish query
- no empty translations
- no duplicate normalized terms in lesson

## Story lexical coverage
Implement phrase-aware checking.
Single words:
- permit inflected forms if lemmatizer supports them
Collocations:
- exact or natural inflected variation
If automated match fails, flag for linguistic validator rather than silently passing.

## Global duplication
Read vocabulary registry before approving a lesson.
Compare normalized targets.
Add a fuzzy/lexical-family warning mechanism.

## Linguistic validator response format
{
  "status": "PASS" | "REVISE",
  "issues": [
    {
      "severity": "error" | "warning",
      "path": "items[3].examples[1].en",
      "code": "UNNATURAL_ENGLISH",
      "message": "...",
      "suggestedFix": "..."
    }
  ]
}

## Publish gate
No lesson is publishable while any error-severity issue remains.
