import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FinanceBrief } from "./types.js";
import { renderSite } from "./site.js";
import {
  OUTPUT_DIR,
  briefBaseName,
  formatBriefForPrompt,
  loadArchivedBriefs,
  parseBrief,
  publishToGit,
  runClaudeCode,
  todayIso,
} from "./lib.js";

// The base prompt Claude Code runs. `/finance-brief` invokes the skill at
// .claude/skills/finance-brief/SKILL.md. Override via env var if you rename
// the skill or want to pass extra instructions. The previous brief (for
// deduplication) is appended to this at runtime — see buildPrompt().
const PROMPT = process.env.FINANCE_BRIEF_PROMPT ?? "/finance-brief";

/**
 * Build the full prompt: the skill invocation plus, if we have one, a
 * condensed copy of the most recent prior brief so the skill can lead with
 * what changed instead of re-reporting the same session.
 */
function buildPrompt(previous: FinanceBrief | undefined): string {
  if (!previous) return PROMPT;
  return [
    PROMPT,
    "",
    `PREVIOUS BRIEF (published ${previous.date}) — do NOT re-report these facts.`,
    "Lead each section with what is NEW or has CHANGED since this brief. Only",
    "repeat a prior fact if it is still the single dominant driver, and frame it",
    "as an ongoing continuation rather than fresh news:",
    "",
    formatBriefForPrompt(previous),
  ].join("\n");
}

async function main() {
  const date = todayIso();

  // Load the archive up front so we can hand the most recent prior brief to
  // the skill for deduplication (the newest brief whose date isn't today's).
  const archived = await loadArchivedBriefs(OUTPUT_DIR);
  const previous = archived.find((b) => b.date !== date);
  if (previous) {
    console.log(`[finance-brief] passing previous brief (${previous.date}) as dedup context`);
  } else {
    console.log(`[finance-brief] no prior brief found — running without dedup context`);
  }

  console.log(`[finance-brief] running Claude Code skill for ${date}...`);
  const envelope = runClaudeCode(buildPrompt(previous));

  console.log(
    `[finance-brief] claude run complete (cost: $${envelope.total_cost_usd ?? "?"}, turns: ${envelope.num_turns ?? "?"})`,
  );

  const brief = parseBrief(envelope.result);

  await mkdir(OUTPUT_DIR, { recursive: true });

  // Persist today's brief as JSON so pages can be re-rendered later when the
  // template changes (the JSON is the source of truth, HTML is derived).
  const jsonPath = path.join(OUTPUT_DIR, `${briefBaseName("daily", brief.date)}.json`);
  await writeFile(jsonPath, JSON.stringify(brief, null, 2), "utf-8");
  console.log(`[finance-brief] wrote ${jsonPath}`);

  // Re-render the whole site from the persisted JSON (today's included) so the
  // archive shares the current design and an up-to-date day-nav, and
  // index.html points at today's brief.
  await renderSite();

  publishToGit(`Finance brief ${brief.date}`);
}

main().catch((err) => {
  console.error("[finance-brief] FAILED:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
