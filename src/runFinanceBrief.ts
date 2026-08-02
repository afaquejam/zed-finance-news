import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FinanceBrief } from "./types.js";
import { renderFinanceBriefHtml } from "./render.js";
import {
  OUTPUT_DIR,
  TEMPLATE_PATH,
  findLatestWeeklyHref,
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
  const jsonPath = path.join(OUTPUT_DIR, `finance-brief-${brief.date}.json`);
  await writeFile(jsonPath, JSON.stringify(brief, null, 2), "utf-8");
  console.log(`[finance-brief] wrote ${jsonPath}`);

  // Merge today's brief with the archive loaded earlier (today's copy wins on
  // date collision — today's JSON is the only file added since that load), then
  // re-render every page so the whole archive shares the current design and an
  // up-to-date 7-day nav.
  const byDate = new Map<string, FinanceBrief>();
  for (const b of archived) byDate.set(b.date, b);
  byDate.set(brief.date, brief);

  const allBriefs = [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date));
  const availableDates = allBriefs.map((b) => b.date);

  // Link every daily page to the latest weekly wrap, if one exists.
  const weeklyHref = await findLatestWeeklyHref(OUTPUT_DIR);

  for (const b of allBriefs) {
    const html = await renderFinanceBriefHtml(b, TEMPLATE_PATH, availableDates, { weeklyHref });
    await writeFile(path.join(OUTPUT_DIR, `finance-brief-${b.date}.html`), html, "utf-8");
  }
  console.log(`[finance-brief] re-rendered ${allBriefs.length} page(s)`);

  // latest.html + index.html mirror the newest brief (today's).
  const latestHtml = await renderFinanceBriefHtml(brief, TEMPLATE_PATH, availableDates, { weeklyHref });
  await writeFile(path.join(OUTPUT_DIR, "latest.html"), latestHtml, "utf-8");
  await writeFile(path.join(OUTPUT_DIR, "index.html"), latestHtml, "utf-8");
  console.log(`[finance-brief] wrote latest.html + index.html`);

  publishToGit(`Finance brief ${brief.date}`);
}

main().catch((err) => {
  console.error("[finance-brief] FAILED:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
