# SecureBlue Chat — presentation

`SecureBlueChat.pptx` is an 8-slide, 16:9 deck with speaker notes on every slide.

## Before presenting

1. Open the file in PowerPoint (or Google Slides) and replace the placeholders on
   slide 1: `[Neel]`, `[Course / Guide]`, `[Date]`.
2. Slides 1–8: title, problem, features, architecture, crypto, what's new,
   demo runbook, limitations + next steps.
3. The notes pane under each slide has 2–3 talking points.

## Regenerating

The deck is generated from `build-deck.mjs` so you can change wording, colours or
layout in one place:

```bash
npm install
npm run build
```

Requires Node 18+. The output overwrites `SecureBlueChat.pptx` in this folder.
