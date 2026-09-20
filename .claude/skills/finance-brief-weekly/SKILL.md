---
name: finance-brief-weekly
description: Synthesize the week's daily finance briefs (USA, emerging markets and small caps, crypto, gold) into a tight weekly wrap of at most 3 bullets per section, returned as a single strict JSON object. Use when running the automated weekly finance brief pipeline.
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
- **Older dailies may use the previous three-section shape** ("S&P 500",
  "NIFTY 50", "Crypto"). Re-file that material into the four sections below —
  S&P 500 material is USA, NIFTY material is the India bullet of Emerging
  Markets and Small Caps — rather than mirroring the old headings.

## Targeted search — weekly aggregates only

The dailies capture individual sessions but rarely the **week in aggregate**.
You MAY run **1–2 web searches per section, only** to obtain weekly-level
numbers the dailies don't contain, e.g.:

- an index's **net weekly % change** ("S&P 500 finished the week +2.1%",
  "the Nasdaq's best/worst week since …", "MSCI EM on the week");
- **weekly** ETF net flow totals, a weekly crypto range, or gold's weekly move.

Do not use search to introduce new daily-level stories or re-research the week
from scratch — the daily briefs are the source of truth for what happened and
why. If a reliable weekly aggregate can't be found, state the arc qualitatively
from the dailies rather than guessing a number.

## Hard constraints

Four sections, in this order, each with a fixed shape:

1. **USA** (`usa`) — **at most 3 items**, covering the S&P 500 *and* the
   Nasdaq. Bullet 1 = the week's net snapshot for both indices (where they
   started, where they ended, the net % move) and the week's dominant driver;
   bullets 2–3 = the other threads that mattered.
2. **Emerging Markets and Small Caps** (`emsmallcaps`) — **exactly 3 items, one
   each, in this order**:
   - **Emerging Markets** — the broad EM complex and its weekly arc.
   - **India** — NIFTY 50/Sensex on the week, RBI/macro, FII/DII flows.
   - **Small Caps** — small caps **globally**, not just the US: the Russell
     2000, European/Japanese small caps, EM small caps, Indian small/midcaps,
     or a global gauge (MSCI World / ACWI Small Cap). Take whichever had the
     week's defining small-cap move, and always name the index and the market.
3. **Crypto** (`crypto`) — **exactly 3 items, one each, in this order**:
   **BTC**, **ETH**, **Solana**. Each gives the coin's weekly range/net move and
   the driver behind it.
4. **Commodities** (`commodities`) — **exactly 1 item, about gold**: the week's
   net move in spot gold and what drove it. No other commodity gets a bullet.

Fewer items than the budget is acceptable when a week genuinely had nothing to
say; more is never acceptable. `crossCuttingTheme` = the dominant macro thread
that tied the week together across markets (name the shared driver and
mechanism), not a mood summary.

## Quality bar — explain, don't just report

Same standard as the daily brief: **causation is the point.** Every item
describing a move must answer "why did this happen this week?"

- Each item is a single self-contained `detail` (the move, direction, and exact
  weekly level/change) plus a one-sentence plain-text `why` (the driver). There
  is no separate headline — make `detail` rich and self-contained.
- Use markdown `**bold**` sparingly to highlight the key weekly number.
- Connect drivers across markets where one force (oil, the dollar, gold, a Fed
  signal) moved several sections, and echo it in `crossCuttingTheme`.

## Output format

Return exactly one JSON object matching this shape:

```json
{
  "date": "YYYY-MM-DD",
  "generatedAt": "ISO-8601 timestamp",
  "sections": [
    {
      "key": "usa",
      "label": "USA",
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
    { "key": "emsmallcaps", "label": "Emerging Markets and Small Caps", "items": [ ... ] },
    { "key": "crypto", "label": "Crypto", "items": [ ... ] },
    { "key": "commodities", "label": "Commodities", "items": [ ... ] }
  ],
  "crossCuttingTheme": "One sentence on the macro thread that tied the week together across sections"
}
```

Rules:

- **Exactly these four sections, with these keys and labels, in this order:**
  `usa` / "USA", `emsmallcaps` / "Emerging Markets and Small Caps", `crypto` /
  "Crypto", `commodities` / "Commodities". Use the lowercase key verbatim — do
  not put the label in the `key` field.
- **Item budget, never exceeded:** `usa` at most 3, `emsmallcaps` 3, `crypto` 3,
  `commodities` 1 — see Hard constraints for what each bullet covers. This is
  the defining constraint of the weekly brief. Each item independently useful,
  no filler.
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
