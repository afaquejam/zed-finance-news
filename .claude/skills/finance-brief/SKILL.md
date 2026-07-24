---
name: finance-brief
description: Research the last 24 hours of news affecting the S&P 500, NIFTY 50, and crypto (BTC/ETH/SOL) and return it as a single strict JSON object. Use when running the daily automated finance brief pipeline.
---

# Daily Finance Brief

You are generating the daily finance brief for an automated pipeline. Your
final message must contain **ONLY the JSON object described below** — no
prose before or after it, no markdown code fences, no commentary. The output
is parsed programmatically, so any extra text will break the pipeline.

## What to research

Use the web search tool to find important news, events, and info published
in roughly the last 24 hours that materially affects:

1. **S&P 500** — US equities, Fed/macro data, major earnings, index moves
2. **NIFTY 50** — Indian equities, RBI/macro data, FII/DII flows, index moves
3. **Crypto** — BTC, ETH, SOL price action, ETF flows, regulation, major
   protocol/exchange news

Run separate, specific searches for each of the three areas — do not rely on
a single combined query. Prioritize the most recent, highest-quality sources
(Reuters, Bloomberg, CNBC, official exchange/regulator releases) over
aggregators or forums.

For every market move, do a second search to find **why** it happened. A
number without a cause is not useful — a reader wants to know *what drove*
the move (earnings, a data release, oil/rates, geopolitics, flows, a
regulatory headline), not just that it moved. Explicitly look for the
catalyst behind each index/price action.

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
- Lead each section with a **snapshot item**: the index's move, direction,
  exact level, and its single most important driver.
- Prefer connecting drivers **across** markets — if oil or the dollar or a
  Fed signal is moving all three, say so in each section and again in
  `crossCuttingTheme`.
- Where useful, add a brief **forward-looking** note (upcoming earnings,
  data, events that matter for the next session) as its own item.

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
          "detail": "1-2 precise, self-contained sentences with the key fact(s) and exact numbers. This is the single primary statement of the item — do NOT also write a separate headline that repeats it. Use markdown **bold** to highlight the most important words/figures; you decide what matters most.",
          "why": "The driver/catalyst that caused this — the causal 'why', 1 sentence. Include for every market move; omit only for pure context items. Use markdown **bold** for the key driver where it helps.",
          "sourceName": "Publication name",
          "sourceUrl": "https://..."
        }
      ]
    },
    { "key": "nifty50", "label": "NIFTY 50", "items": [ ... ] },
    { "key": "crypto", "label": "Crypto", "items": [ ... ] }
  ],
  "crossCuttingTheme": "One sentence on any theme connecting multiple sections, or omit/empty if none"
}
```

Rules:

- 3-6 items per section, each independently useful — no filler.
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
