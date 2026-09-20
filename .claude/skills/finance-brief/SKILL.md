---
name: finance-brief
description: Research the last 24 hours of news affecting US equities (S&P 500/Nasdaq), emerging markets and small caps, crypto (BTC/ETH/SOL), and gold, and return it as a single strict JSON object. Use when running the daily automated finance brief pipeline.
---

# Daily Finance Brief

You are generating the daily finance brief for an automated pipeline. Your
final message must contain **ONLY the JSON object described below** — no
prose before or after it, no markdown code fences, no commentary. The output
is parsed programmatically, so any extra text will break the pipeline.

## What to research

Use the web search tool to find important news, events, and info published
in roughly the last 24 hours that materially affects the brief's four
sections. Each section has a **fixed shape** — the number of items and what
each item is about are part of the contract, not your choice:

1. **USA** (`usa`) — **at most 3 items** covering the S&P 500 *and* the
   Nasdaq: index moves, Fed/macro data, major earnings, the megacap/AI complex.
   Both indices belong in this one section; when they diverge (e.g. a tech-led
   Nasdaq drop against a flat S&P), that divergence is itself a strong item.
2. **Emerging Markets and Small Caps** (`emsmallcaps`) — **exactly 3 items, one
   each, in this order**:
   - **Emerging Markets** — the broad EM complex (MSCI EM, China/Taiwan/Korea/
     Brazil, EM flows, the dollar's effect on EM assets).
   - **India** — NIFTY 50/Sensex moves, RBI/macro data, FII/DII flows.
   - **Small Caps** — small caps **globally**, not just the US. The universe is
     the Russell 2000, European (STOXX Europe Small 200), Japanese (TOPIX
     Small), EM small caps, India's small/midcap indices, and the global
     gauges (MSCI World / ACWI Small Cap). Lead with whichever market's small
     caps actually moved or matter most today, and **always name the index and
     the market** so the reader knows which one it is; reach for a global gauge
     or a cross-market comparison when the move is broad rather than local.
3. **Crypto** (`crypto`) — **exactly 3 items, one each, in this order**:
   **BTC**, then **ETH**, then **Solana**. Put the coin's own price action
   first in the item, then fold in what drove it (ETF flows, regulation,
   protocol/exchange news) via the `why`.
4. **Commodities** (`commodities`) — **exactly 1 item, about gold**: the spot
   price, the day's move, and what drove it (real yields, the dollar, central
   bank buying, safe-haven flows). No other commodity gets an item here; oil or
   copper belong in another section's `why` if they are driving equities.

Run separate, specific searches for each area — do not rely on a single
combined query, and search EM, India and small caps separately rather than
treating them as one story. Prioritize the most recent, highest-quality
sources (Reuters, Bloomberg, CNBC, official exchange/regulator releases) over
aggregators or forums.

For every market move, do a second search to find **why** it happened. A
number without a cause is not useful — a reader wants to know *what drove*
the move (earnings, a data release, oil/rates, geopolitics, flows, a
regulatory headline), not just that it moved. Explicitly look for the
catalyst behind each index/price action.

## Novelty — lead with what changed, don't repeat yesterday

The pipeline appends **yesterday's brief** to your prompt (under a
`PREVIOUS BRIEF` heading). Treat it as already-published: your job is to tell
the reader what is *new or different* since then, not to re-run the same story.

- **Lead each section with the newest development** — the most recent close,
  the latest print, an overnight move — not the same session yesterday already
  covered.
- **Do not re-report a fact from the previous brief** (same index level, same
  earnings, same headline) unless it is still the single dominant driver. If it
  is, frame it explicitly as a continuation ("now a fifth straight session…",
  "extending Thursday's selloff…") rather than presenting it as fresh news, and
  add what has changed about it (magnitude, follow-through, new catalyst).
- **Weekends and holidays:** if no new equity session has closed since the last
  brief (e.g. a Saturday/Sunday run for US, EM or Indian equities), do not pad
  the section with the same stale close. Instead keep the item's slot but fill
  it with genuinely new material: weekend crypto action (BTC/ETH/SOL and gold
  trade around the clock), futures/pre-market moves, and **forward-looking**
  notes — the upcoming week's earnings, data releases, and events that matter
  for the next session.
- If a section genuinely has little new to say, it is better to have fewer,
  truly-new items than to refill it with yesterday's numbers — dropping the
  weakest item is always allowed, adding a fourth one is not.

## Quality bar — explain, don't just report

The single most important quality of this brief is **causation**. Every item
that describes a market move must answer "why did this happen?" Compare:

- ✗ Weak (bare fact): "The S&P 500 lost 1.21% to close at 7,408.30."
- ✓ Strong (fact + driver): `detail` is one self-contained statement with the
  move, direction and exact level; `why` explains it — "Oil spiked above
  $100/bbl on escalating Middle East conflict while Alphabet (-7%) and Tesla
  (-14%) earnings reignited AI-spending fears, triggering the worst megacap
  selloff since April 2025."

Guidance:

- Each item is a single primary statement (`detail`) plus its `why` — there is
  no separate headline/title, so make `detail` rich and self-contained.
- With only a handful of slots per section, **every item must be a snapshot
  plus its driver**: the move, direction, exact level, and the one thing that
  caused it. There is no room for an item that is only context.
- The USA section leads with the index snapshot (S&P 500 and Nasdaq levels and
  moves) before anything else.
- Prefer connecting drivers **across** markets — if oil, the dollar, gold or a
  Fed signal is moving several sections, say so in each and again in
  `crossCuttingTheme`.
- Fold any **forward-looking** note (upcoming earnings, data, events that
  matter for the next session) into an existing item rather than spending a
  slot on it — except on a weekend/holiday run, where it is the right way to
  fill a section that has no new session to report.

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
          "emoji": "A single emoji that fits this item (e.g. 📉 selloff, 📈 rally, 🥇 gold, 🏦 Fed/RBI, 🤖 AI, 📊 earnings, ₿ bitcoin, ⚖️ regulation).",
          "detail": "1-2 precise, self-contained sentences with the key fact(s) and exact numbers. This is the single primary statement of the item — do NOT also write a separate headline that repeats it. Use markdown **bold** to highlight the most important words/figures; you decide what matters most.",
          "why": "The driver/catalyst that caused this — the causal 'why', 1 sentence. Include for every market move; omit only for pure context items. Plain text only — do NOT use bold or any markdown here.",
          "sourceName": "Publication name",
          "sourceUrl": "https://..."
        }
      ]
    },
    { "key": "emsmallcaps", "label": "Emerging Markets and Small Caps", "items": [ ... ] },
    { "key": "crypto", "label": "Crypto", "items": [ ... ] },
    { "key": "commodities", "label": "Commodities", "items": [ ... ] }
  ],
  "crossCuttingTheme": "One sentence on any theme connecting multiple sections, or omit/empty if none"
}
```

Rules:

- **Exactly these four sections, with these keys and labels, in this order:**
  `usa` / "USA", `emsmallcaps` / "Emerging Markets and Small Caps", `crypto` /
  "Crypto", `commodities` / "Commodities". Use the lowercase key verbatim — do
  not put the label in the `key` field.
- **Item budget, never exceeded:** `usa` at most 3; `emsmallcaps` 3 (Emerging
  Markets, India, Small Caps — in that order); `crypto` 3 (BTC, ETH, Solana —
  in that order); `commodities` 1 (gold). The page is meant to be digestible in
  a minute, so a fourth item in any section is a failure, not a bonus. Fewer is
  acceptable when there is genuinely nothing new; more is not.
- Each item must be independently useful — no filler.
- `detail` must be precise and concise (this feeds a bullet-point brief).
- `why` is required for every item describing a market move — it must name
  the actual cause, not restate the move. Omit it only for pure-context or
  forward-looking items where there is no move to explain.
- `emoji` should be exactly one emoji that fits the item's content; pick
  something relevant rather than decorative, and avoid repeating the same
  emoji for every item in a section.
- Use markdown **bold** sparingly and purposefully to highlight the key
  number or fact the reader should not miss; you choose what to bold. Do not
  bold entire sentences — emphasis loses meaning if overused. Only `**bold**`
  is supported (italics/underscores are treated as bold too); other markdown
  is rendered literally.
- Only include a `sourceUrl` if you have a real one from search results —
  never fabricate a link. Omit the field entirely rather than guess. The same
  discipline applies to `why`: base it on what sources actually say, don't
  invent a cause.
- Numbers (index levels, % moves, prices) should be exact where the source
  gives them.
- `crossCuttingTheme` must be a genuine causal thread — name the shared
  macro driver moving multiple markets and the mechanism (e.g. "oil above
  $100 on Middle East conflict is feeding an inflation-driven risk-off move
  across equities and crypto simultaneously"), not a vague mood summary.
- Do not include any text outside the JSON object in your final response.
