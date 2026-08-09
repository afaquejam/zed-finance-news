---
name: finance-brief-weekly
description: Synthesize the week's daily finance briefs (S&P 500, NIFTY 50, crypto) into a tight weekly wrap of at most 3 bullets per section, returned as a single strict JSON object. Use when running the automated weekly finance brief pipeline.
---

# Weekly Finance Brief

You are generating the **weekly** finance brief for an automated pipeline. Your
final message must contain **ONLY the JSON object described below** — no prose
before or after it, no markdown code fences, no commentary. The output is
parsed programmatically, so any extra text will break the pipeline.

## Your source material — the week's daily briefs

The pipeline appends **this week's already-published daily briefs** to your
prompt, oldest first, each under a `DAILY BRIEF (published YYYY-MM-DD)` heading.
These are your primary source. The research, sourcing, and causal analysis were
already done and vetted day by day — your job is to **distill**, not re-report.

- **Synthesize, don't concatenate.** Across the week each market had a few
  dominant threads (an AI-capex rotation, an oil shock, a Fed hold, an ETF-flow
  trend). Identify those threads and collapse the daily play-by-play into them.
- **Lead each section with the week's net arc** — where the index/asset started
  the week vs. where it ended, the net weekly move, and the single dominant
  driver of the week. Then give the one or two other threads that mattered.
- Prefer facts, numbers, and `sourceUrl`s that already appear in the daily
  briefs. Do not invent causes — every `why` must trace to what the dailies (or
  a verified search, below) actually said.

## Targeted search — weekly aggregates only

The dailies capture individual sessions but rarely the **week in aggregate**.
You MAY run **1–2 web searches per section, only** to obtain weekly-level
numbers the dailies don't contain, e.g.:

- the index's **net weekly % change** ("S&P 500 finished the week +2.1%",
  "best/worst week since …");
- **weekly** ETF net flow totals or a weekly crypto range.

Do not use search to introduce new daily-level stories or re-research the week
from scratch — the daily briefs are the source of truth for what happened and
why. If a reliable weekly aggregate can't be found, state the arc qualitatively
from the dailies rather than guessing a number.

## Hard constraints

- **At most 3 items per section** (`sp500`, `nifty50`, `crypto`). Fewer is fine;
  never more. With only three bullets, make each one count: bullet 1 = the
  week's net snapshot, bullets 2–3 = the other dominant threads.
- Keep all three sections (`sp500`, `nifty50`, `crypto`), in that order.
- `crossCuttingTheme` = the dominant macro thread that tied the week together
  across markets (name the shared driver and mechanism), not a mood summary.

## Quality bar — explain, don't just report

Same standard as the daily brief: **causation is the point.** Every item
describing a move must answer "why did this happen this week?"

- Each item is a single self-contained `detail` (the move, direction, and exact
  weekly level/change) plus a one-sentence plain-text `why` (the driver). There
  is no separate headline — make `detail` rich and self-contained.
- Use markdown `**bold**` sparingly to highlight the key weekly number.
- Connect drivers across markets where one force (oil, the dollar, a Fed
  signal) moved all three, and echo it in `crossCuttingTheme`.

## Output format

Return exactly one JSON object matching this shape:

```json
{
  "date": "YYYY-MM-DD",
  "generatedAt": "ISO-8601 timestamp",
  "sections": [
    {
      "key": "sp500",
      "label": "S&P 500",
      "items": [
        {
          "emoji": "A single emoji that fits this item (e.g. 📉 selloff, 📈 rally, 🛢️ oil, 🏦 Fed/RBI, 🤖 AI, 📊 earnings, ₿ bitcoin, ⚖️ regulation).",
          "detail": "1-2 precise, self-contained sentences summarizing the WEEK's move with exact numbers. Use markdown **bold** to highlight the key weekly figure.",
          "why": "The driver/catalyst behind the week's move — plain text, 1 sentence, no markdown. Omit only for pure-context items.",
          "sourceName": "Publication name",
          "sourceUrl": "https://..."
        }
      ]
    },
    { "key": "nifty50", "label": "NIFTY 50", "items": [ ... ] },
    { "key": "crypto", "label": "Crypto", "items": [ ... ] }
  ],
  "crossCuttingTheme": "One sentence on the macro thread that tied the week together across sections"
}
```

Rules:

- **Maximum 3 items per section** — this is the defining constraint of the
  weekly brief. Each item independently useful, no filler.
- `detail` must be precise and concise (this feeds a bullet-point brief) and
  frame the WEEK, not a single day.
- `why` is required for every item describing a move — name the actual cause,
  don't restate the move. Omit only for pure-context items.
- `emoji` should be exactly one relevant emoji; avoid repeating the same one
  across a section.
- Use `**bold**` sparingly for the key weekly number. Only `**bold**` is
  supported; other markdown renders literally.
- Only include a `sourceUrl` you actually have (reuse one from the daily briefs
  or a real search result) — never fabricate a link. Omit the field rather than
  guess. Same discipline for `why`.
- `date` should be the **Sunday that ends the week** being wrapped. (The
  pipeline overrides this field with that Sunday regardless, since the page is
  filed under it — but return it correctly anyway.)
- Do not include any text outside the JSON object in your final response.
