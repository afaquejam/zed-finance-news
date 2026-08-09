# finance-brief

S&P 500 / NIFTY 50 / crypto brief. A Claude Code **skill** does the research
(web search), a small TypeScript orchestrator runs it headlessly, validates the
JSON it returns, and renders it into a static HTML page.

## The weekly rhythm

Three pipelines share one page design, one per slot in the week:

| Day       | Pipeline               | Page                                | Covers |
| --------- | ---------------------- | ----------------------------------- | ------ |
| Mon       | `npm run brief:outlook`| `finance-brief-outlook-<Mon>.html`   | The **week ahead** — scheduled catalysts for the coming Mon–Fri |
| Tue–Sat   | `npm run brief`        | `finance-brief-<date>.html`          | The **previous session** |
| Sun       | `npm run brief:weekly` | `finance-brief-weekly-<Sun>.html`    | A **wrap of the week just ended**, synthesized from that week's dailies |

Saturday runs the daily only. All three appear in one rolling 7-day chip nav:
the Sunday chip is the weekly wrap and the Monday chip is the week-ahead
outlook (each tagged on the chip), so there is no separate weekly nav.

The weekly and the outlook are each keyed to a **week**, not to the day they
were generated — the wrap always files under its week's Sunday and the outlook
under its week's Monday. Both are **skip-if-exists**: if you generate one by
hand, the scheduled run finds it on disk and exits without calling Claude.
Delete the JSON to force a regeneration.

## Commands

```bash
npm run brief          # today's daily brief
npm run brief:weekly   # this week's wrap, from the week's daily briefs
npm run brief:outlook  # the coming week's outlook
npm run render         # re-render all HTML from saved JSON (no API call)
```

Manual runs do **not** push. Prefix with `FINANCE_BRIEF_PUBLISH=1` to commit
`docs/` and `git push origin master` after generating:

```bash
FINANCE_BRIEF_PUBLISH=1 npm run brief
```

## How it fits together

```
.claude/skills/finance-brief*/SKILL.md  <- what Claude researches + the JSON contract (one per pipeline)
src/types.ts                            <- zod schema / TS types for that JSON
src/lib.ts                              <- dates, week keys, archive loading, the `claude -p` call, git publish
src/runFinanceBrief.ts                  <- daily orchestrator
src/runWeeklyBrief.ts                   <- Sunday wrap orchestrator
src/runOutlookBrief.ts                  <- Monday week-ahead orchestrator
src/render.ts                           <- JSON -> HTML (one template, three variants)
src/site.ts                             <- re-renders every page + index/latest from persisted JSON
templates/finance-brief.html            <- HTML shell with {{PLACEHOLDER}} slots
docs/                                   <- generated pages + latest.html/index.html (GitHub Pages)
```

Every pipeline writes its JSON and then calls `renderSite()`, which rebuilds
**all** pages. That is deliberate: each page's nav spans all three kinds, so a
new Sunday wrap or Monday outlook has to appear in the nav of pages already on
disk. `index.html`/`latest.html` mirror whichever page is newest.

Flow each run:

1. `runFinanceBrief.ts` shells out to `claude -p "/finance-brief" --output-format json ...`.
2. Claude Code loads the `finance-brief` skill, runs web searches, and returns
   **only** a JSON object (per the skill's contract) as its final answer.
3. The orchestrator parses the CLI's JSON envelope, extracts `.result`,
   parses *that* as JSON, and validates it against the zod schema in
   `src/types.ts` — if the model's output doesn't match, the run fails loudly
   instead of publishing bad data.
4. `render.ts` fills the HTML template and the orchestrator writes both a
   dated file and `docs/latest.html`.
5. When `FINANCE_BRIEF_PUBLISH=1` (set by the scheduled job), the orchestrator
   commits `docs/` and runs `git push origin master` so GitHub Pages updates.

## Setup

```bash
npm install
npm install -g @anthropic-ai/claude-code   # if not already installed
claude login                                # one-time auth, or set ANTHROPIC_API_KEY
```

See `.env.example` — set `ANTHROPIC_API_KEY` if you want this to bill at
standard API rates instead of running under your Claude Code subscription.

## Run manually

```bash
npm run brief
```

Output lands in `docs/finance-brief-<date>.html` and `docs/latest.html`
(served by GitHub Pages). A manual `npm run brief` does **not** push; set
`FINANCE_BRIEF_PUBLISH=1` to commit + push after generating.

## Schedule it (launchd)

A single macOS launchd agent fires at 08:00 every day and picks the pipeline
from the weekday. Source of truth: `launchd/com.finance-brief.daily.plist`;
the live copy lives at `~/Library/LaunchAgents/com.finance-brief.daily.plist`.

```bash
cp launchd/com.finance-brief.daily.plist ~/Library/LaunchAgents/
launchctl bootout  gui/$(id -u)/com.finance-brief.daily 2>/dev/null
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.finance-brief.daily.plist
launchctl kickstart -k gui/$(id -u)/com.finance-brief.daily   # run now
```

The Mac must be awake at 08:00, so pair it with a wake ~30s earlier, every day:

```bash
sudo pmset repeat wakeorpoweron MTWRFSU 07:59:30
```

The plist command wraps the run in `caffeinate -is` because a scheduled wake
only lingers ~80s and would otherwise re-sleep mid-run. Needs AC power. Logs go
to `logs/launchd.{out,err}.log`.

## Notes / things to verify before relying on this in production

- **CLI flags drift between Claude Code releases.** `runFinanceBrief.ts`
  passes `--allowedTools`, `--permission-mode`, and `--max-turns` — run
  `claude -p --help` to confirm these still exist and behave as expected on
  your installed version.
- **Cost control:** `--max-turns 20` bounds the run; `total_cost_usd` from
  the CLI's JSON envelope is logged to stdout each run so you can track spend
  over time.
- **Validation is intentional and strict.** If the skill's output doesn't
  match the schema (missing fields, bad URL, wrong section keys), the run
  fails instead of silently publishing malformed content. Check
  `logs/finance-brief.log` on failure.
- This is deliberately just the finance section. The tech/AI/cloud email
  digest is a separate pipeline stage that will write its own JSON and get
  rendered into the same page — not part of this component.
