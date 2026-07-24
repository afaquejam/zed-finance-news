# finance-brief

Daily S&P 500 / NIFTY 50 / crypto brief. A Claude Code **skill** does the
research (web search), a small TypeScript orchestrator runs it headlessly,
validates the JSON it returns, and renders it into a static HTML page.

## How it fits together

```
.claude/skills/finance-brief/SKILL.md   <- what Claude researches + the JSON contract
src/types.ts                            <- zod schema / TS types for that JSON
src/runFinanceBrief.ts                  <- runs `claude -p` headlessly, validates, orchestrates
src/render.ts                           <- JSON -> HTML
templates/finance-brief.html            <- HTML shell with {{PLACEHOLDER}} slots
docs/                                   <- finance-brief-YYYY-MM-DD.html + latest.html (GitHub Pages)
```

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

## Schedule it (cron)

```cron
# Every day at 07:00
0 7 * * * cd /path/to/finance-brief && /usr/bin/npm run brief >> logs/finance-brief.log 2>&1
```

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
