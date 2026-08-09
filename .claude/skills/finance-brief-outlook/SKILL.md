---
name: finance-brief-outlook
description: Research the catalysts scheduled for the coming Mon–Fri week (S&P 500, NIFTY 50, crypto) and return a forward-looking week-ahead outlook as a single strict JSON object. Use when running the automated Monday week-ahead pipeline.
---

# Week-Ahead Finance Outlook

You are generating the **week-ahead** finance outlook for an automated
pipeline. Your final message must contain **ONLY the JSON object described
below** — no prose before or after it, no markdown code fences, no commentary.
The output is parsed programmatically, so any extra text will break the
pipeline.

## What makes this brief different

The daily brief and the weekly wrap both look **backwards** at what already
happened. This one looks **forwards**. It runs on Monday morning and answers a
single question for each market: *what should a reader be watching this week,
and why does it matter?*

Nothing in this brief should be a report of last week's moves. Last week is
context for the setup, not the subject.

## Your window

The pipeline tells you the exact Monday–Friday window in the prompt. **Every
scheduled event you name must fall inside that window.** Do not include an
event from last week, and do not include one from the week after.

Dates are the thing most easily got wrong here, so verify each one: search for
the specific event ("FOMC meeting date", "US CPI release date", "NVDA earnings
date", "RBI MPC meeting schedule") and confirm the date lands in the window
before you include it. **If you cannot confirm a date, leave the event out.**
A confidently-stated event on the wrong day is worse than an omission.

## What to research

Run separate, specific searches for each of the three areas:

1. **S&P 500** — the week's US macro calendar (CPI/PCE/jobs/FOMC and Fed
   speakers), the notable earnings reporting this week, Treasury auctions or
   fiscal events.
2. **NIFTY 50** — India's macro calendar (CPI/WPI/IIP, RBI MPC), the notable
   Indian earnings this week, expected FII/DII flow drivers, and any US events
   that transmit to Indian markets.
3. **Crypto** — scheduled protocol events (upgrades, unlocks, halvings), ETF
   flow trends going in, regulatory or court dates, and the macro prints that
   have been moving crypto lately.

Prioritize Reuters, Bloomberg, CNBC, exchange/regulator calendars, and
official IR pages over aggregators. Also search for existing week-ahead
previews — they are a good cross-check on what the market considers important,
but confirm the dates yourself.

## Last week's closing picture

When available, the pipeline appends last week's wrap (or its most recent
daily) under a `LAST WEEK'S CLOSING PICTURE` heading. Use it to state **where
each market stands going in** — the closing level, the trend it is carrying,
the level that matters. Do not re-report it as news; it is the starting line.

## Quality bar — say why it matters, not just what's scheduled

A calendar is not an outlook. Every item must connect a scheduled event to a
**mechanism**: what the market expects, and what would change if the print or
the result comes in off that expectation.

- ✗ Weak (bare calendar): "US CPI is released on Thursday."
- ✓ Strong (event + stake): `detail` — "**Thursday's US CPI** is the week's
  main event, with consensus at **2.9% headline** after last month's 3.1%";
  `why` — "A hotter print would push back the market's ~70% odds of a
  September cut and hit the rate-sensitive megacaps that led last week's
  rally."

Guidance:

- Lead each section with **the single biggest scheduled catalyst** of the week
  for that market, naming the day.
- Include consensus/expected figures where a forecast exists, and say what the
  reaction function is — which direction of surprise moves things which way.
- Be explicit about uncertainty. This is a forecast of *what to watch*, not a
  prediction of outcomes. Never state a future move as if it has happened, and
  do not invent a price target.
- Connect drivers across markets — one Fed print, oil move, or dollar trend
  usually sets the tone for all three. Echo that in `crossCuttingTheme`.

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
          "emoji": "A single emoji that fits this item (e.g. 🗓️ scheduled event, 🏦 Fed/RBI, 📊 earnings, 📉 data print, 🛢️ oil, 🤖 AI, ₿ bitcoin, ⚖️ regulation).",
          "detail": "1-2 precise, self-contained sentences naming the event, the DAY it falls on, and the consensus/expected figure where one exists. Use markdown **bold** to highlight the event or the key number.",
          "why": "What is at stake — the mechanism by which this moves the market, and what a surprise in either direction would mean. Plain text, 1 sentence, no markdown.",
          "sourceName": "Publication name",
          "sourceUrl": "https://..."
        }
      ]
    },
    { "key": "nifty50", "label": "NIFTY 50", "items": [ ... ] },
    { "key": "crypto", "label": "Crypto", "items": [ ... ] }
  ],
  "crossCuttingTheme": "One sentence on the macro event or thread that will most likely set the tone across all three markets this week"
}
```

Rules:

- **Maximum 3 items per section.** Fewer is fine; never more. Bullet 1 = the
  week's dominant scheduled catalyst, bullets 2–3 = the other things worth
  watching (earnings, flows, the level/setup going in).
- Keep all three sections (`sp500`, `nifty50`, `crypto`), in that order.
- Every dated event must be verified to fall in this week's Mon–Fri window.
- `why` is required on every item — it is the whole point of the outlook.
- `emoji` should be exactly one relevant emoji; avoid repeating the same one
  within a section.
- Use `**bold**` sparingly for the event name or key figure. Only `**bold**`
  is supported; other markdown renders literally.
- Only include a `sourceUrl` you actually have from a search result — never
  fabricate a link. Omit the field rather than guess. Same discipline for any
  consensus figure: if you can't source it, describe the event without it.
- `crossCuttingTheme` must name a concrete shared driver and its mechanism,
  not a vague mood statement.
- `date` should be the Monday of the week being previewed.
- Do not include any text outside the JSON object in your final response.
