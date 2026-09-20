---
name: finance-brief-outlook
description: Research the catalysts scheduled for the coming Mon–Fri week (USA, emerging markets and small caps, crypto, gold) and return a forward-looking week-ahead outlook as a single strict JSON object. Use when running the automated Monday week-ahead pipeline.
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

Run separate, specific searches for each area. Each section has a **fixed
shape** — the number of items and what each covers is part of the contract:

1. **USA** (`usa`) — **at most 3 items** for the S&P 500 *and* the Nasdaq: the
   week's US macro calendar (CPI/PCE/jobs/FOMC and Fed speakers), the notable
   earnings reporting this week (flag the megacap/AI names that drive the
   Nasdaq specifically), Treasury auctions or fiscal events.
2. **Emerging Markets and Small Caps** (`emsmallcaps`) — **exactly 3 items, one
   each, in this order**:
   - **Emerging Markets** — the EM calendar (China/Taiwan/Korea/Brazil data,
     central bank decisions), EM flow drivers, and the dollar/rates path that
     sets the EM tone.
   - **India** — India's macro calendar (CPI/WPI/IIP, RBI MPC), the notable
     Indian earnings this week, expected FII/DII flow drivers.
   - **Small Caps** — what is scheduled that matters for small caps
     **globally**, not just the US: the Russell 2000, European/Japanese small
     caps, EM small caps, Indian small/midcaps, or a global gauge (MSCI World /
     ACWI Small Cap). Rate expectations, small-cap earnings and flows are the
     usual drivers; always name the index and the market the item is about.
3. **Crypto** (`crypto`) — **exactly 3 items, one each, in this order**: **BTC**,
   **ETH**, **Solana**. Per coin: scheduled protocol events (upgrades, unlocks),
   ETF flow trends going in, regulatory or court dates, and the macro prints
   that have been moving it.
4. **Commodities** (`commodities`) — **exactly 1 item, about gold**: the level
   it enters the week at and the single scheduled catalyst most likely to move
   it (a CPI/PCE print, an FOMC decision, a dollar/real-yield path, a central
   bank buying update). No other commodity gets an item.

Prioritize Reuters, Bloomberg, CNBC, exchange/regulator calendars, and
official IR pages over aggregators. Also search for existing week-ahead
previews — they are a good cross-check on what the market considers important,
but confirm the dates yourself.

## Last week's closing picture

When available, the pipeline appends last week's wrap (or its most recent
daily) under a `LAST WEEK'S CLOSING PICTURE` heading. Use it to state **where
each market stands going in** — the closing level, the trend it is carrying,
the level that matters. Do not re-report it as news; it is the starting line.

## Length and plain language

This brief is read in a minute over coffee. A bullet that runs four lines does
not get read, however good the research behind it is. Brevity is a hard
requirement, not a style preference.

- **`detail`: one sentence, 30 words maximum.** A second short sentence only if
  it is genuinely a separate fact. If it will not fit in 30 words, you have not
  yet decided what the item is about.
- **`why`: one sentence, 20 words maximum.** The cause, stated plainly.
- **`crossCuttingTheme`: one sentence, 40 words maximum.** It is a banner above
  the sections, not a summary of them — name the one shared driver and how it
  transmits, then stop. Do not recap what each section already said.
- **Two numbers per item, at most.** Keep the ones that anchor the claim (the
  level, the move) and cut the rest. The third number is usually the one that
  makes a bullet unreadable.
- **No roll-calls.** "ten Fed speakers, starting with Goolsbee Monday, Williams
  and Jefferson Tuesday, Barkin Wednesday…" is a list, not an insight. Say
  "ten Fed speakers this week" and move on. Same for earnings tickers and data
  releases: name the one that matters, not the whole calendar.
- **Write like a person, not a terminal.** Everyday words beat desk jargon:
  "the Fed looks set to hold rates high for longer" beats "settling into a
  higher-for-longer regime". At most one dash-clause per sentence; no nested
  parentheticals.
- **Simple is not vague.** Keep the fundamentals — the real level, the real
  move, the real cause. Simplify the language, never the substance. If losing
  a word would cost the number that grounds the claim, cut a different word.

Worked example, from a real bullet that was too long:

- ✗ **71 words:** "With no new session since Friday's close (**S&P 500
  7,650.50**, **Nasdaq 26,522.55**), the week ahead is about the rate path
  rather than data — the calendar is light on reports but carries **no fewer
  than 10 Fed speaker appearances**, starting with Goolsbee Monday, Williams
  and Jefferson Tuesday, Barkin Wednesday and Hammack and Paulson Thursday.
  Fed funds futures are pricing roughly **42% odds of two more hikes** against
  the dot plot's one."
- ✓ **25 words:** `detail` — "The **S&P 500** closed Friday at **7,650.50**,
  and next week's direction rests on ten Fed speakers rather than any data."
  `why` — "With no major print until Wednesday's PMIs, the speakers are the
  only live clue on whether more hikes are coming."

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
- Include the consensus figure where a forecast exists, and say which direction
  of surprise moves things which way — in plain words, not desk shorthand.
- Be explicit about uncertainty. This is a forecast of *what to watch*, not a
  prediction of outcomes. Never state a future move as if it has happened, and
  do not invent a price target.
- Connect drivers across markets — one Fed print, oil move, or dollar trend
  usually sets the tone for all four sections. Echo that in `crossCuttingTheme`.

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
          "emoji": "A single emoji that fits this item (e.g. 🗓️ scheduled event, 🏦 Fed/RBI, 📊 earnings, 📉 data print, 🥇 gold, 🤖 AI, ₿ bitcoin, ⚖️ regulation).",
          "detail": "ONE plain-English sentence, 30 words maximum, naming the event, the DAY it falls on, and the consensus figure where one exists. Use markdown **bold** on the event or the key number.",
          "why": "What is at stake: how this moves the market and what a surprise would mean. ONE plain sentence, 20 words maximum, no markdown.",
          "sourceName": "Publication name",
          "sourceUrl": "https://..."
        }
      ]
    },
    { "key": "emsmallcaps", "label": "Emerging Markets and Small Caps", "items": [ ... ] },
    { "key": "crypto", "label": "Crypto", "items": [ ... ] },
    { "key": "commodities", "label": "Commodities", "items": [ ... ] }
  ],
  "crossCuttingTheme": "One sentence on the macro event or thread that will most likely set the tone across all four sections this week"
}
```

Rules:

- **Exactly these four sections, with these keys and labels, in this order:**
  `usa` / "USA", `emsmallcaps` / "Emerging Markets and Small Caps", `crypto` /
  "Crypto", `commodities` / "Commodities". Use the lowercase key verbatim — do
  not put the label in the `key` field.
- **Item budget, never exceeded:** `usa` at most 3, `emsmallcaps` 3 (Emerging
  Markets, India, Small Caps), `crypto` 3 (BTC, ETH, Solana), `commodities` 1
  (gold). Fewer is fine; a fourth item in any section is a failure. In the USA
  section, bullet 1 = the week's dominant scheduled catalyst, bullets 2–3 = the
  other things worth watching (earnings, flows, the level/setup going in).
- Every dated event must be verified to fall in this week's Mon–Fri window.
- `why` is required on every item — it is the whole point of the outlook — and
  is capped at 20 words, like `detail` at 30 (see **Length and plain
  language**).
- `emoji` should be exactly one relevant emoji; avoid repeating the same one
  within a section.
- Use `**bold**` sparingly for the event name or key figure. Only `**bold**`
  is supported; other markdown renders literally.
- Only include a `sourceUrl` you actually have from a search result — never
  fabricate a link. Omit the field rather than guess. Same discipline for any
  consensus figure: if you can't source it, describe the event without it.
- `crossCuttingTheme` must name a concrete shared driver and its mechanism,
  not a vague mood statement. One sentence, 40 words maximum.
- `date` should be the Monday of the week being previewed.
- Do not include any text outside the JSON object in your final response.
