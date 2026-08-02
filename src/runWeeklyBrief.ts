import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FinanceBrief } from "./types.js";
import { renderWeeklyBriefHtml } from "./render.js";
import {
  OUTPUT_DIR,
  TEMPLATE_PATH,
  formatBriefForPrompt,
  listWeeklyDates,
  loadArchivedBriefs,
  parseBrief,
  publishToGit,
  runClaudeCode,
  todayIso,
  weekStartMonday,
} from "./lib.js";

// `/finance-brief-weekly` invokes the skill at
// .claude/skills/finance-brief-weekly/SKILL.md. The week's daily briefs are
// appended at runtime — see buildWeeklyPrompt().
const PROMPT = process.env.FINANCE_BRIEF_WEEKLY_PROMPT ?? "/finance-brief-weekly";

/** Build the weekly prompt: skill invocation + this week's dailies, oldest first. */
function buildWeeklyPrompt(weekBriefs: FinanceBrief[]): string {
  const blocks = weekBriefs.map((b) =>
    [`DAILY BRIEF (published ${b.date}):`, "", formatBriefForPrompt(b)].join("\n"),
  );
  return [
    PROMPT,
    "",
    `THIS WEEK'S DAILY BRIEFS (${weekBriefs.length}, oldest first). Synthesize`,
    "these into the weekly wrap — at most 3 bullets per section. Do not simply",
    "concatenate them; distill the week's dominant threads:",
    "",
    blocks.join("\n\n---\n\n"),
  ].join("\n");
}

async function main() {
  const date = todayIso();
  const monday = weekStartMonday(date);

  const archived = await loadArchivedBriefs(OUTPUT_DIR);
  // Dailies dated within this week's Mon..today window (ISO strings sort
  // lexically), oldest first so the model reads the week as a chronology.
  const weekBriefs = archived
    .filter((b) => b.date >= monday && b.date <= date)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (weekBriefs.length === 0) {
    throw new Error(
      `No daily briefs found for the week of ${monday}..${date} in ${OUTPUT_DIR}. ` +
        `Run the daily pipeline first (npm run brief).`,
    );
  }
  console.log(
    `[weekly-brief] synthesizing ${weekBriefs.length} daily brief(s) from ${monday}..${date}: ` +
      weekBriefs.map((b) => b.date).join(", "),
  );

  const envelope = runClaudeCode(buildWeeklyPrompt(weekBriefs));
  console.log(
    `[weekly-brief] claude run complete (cost: $${envelope.total_cost_usd ?? "?"}, turns: ${envelope.num_turns ?? "?"})`,
  );

  const brief = parseBrief(envelope.result);

  // Enforce the ≤3-items-per-section contract defensively (the skill is told
  // this, but the JSON schema doesn't cap it) so a chatty model can't produce
  // a bloated weekly page.
  for (const section of brief.sections) {
    if (section.items.length > 3) {
      console.warn(
        `[weekly-brief] ${section.label} returned ${section.items.length} items; trimming to 3.`,
      );
      section.items = section.items.slice(0, 3);
    }
  }

  await mkdir(OUTPUT_DIR, { recursive: true });

  // Weekly filenames carry a `-weekly-` infix so they never match the daily
  // archive regex in loadArchivedBriefs() — they stay out of the daily
  // archive, day-nav, and dedup context.
  const jsonPath = path.join(OUTPUT_DIR, `finance-brief-weekly-${brief.date}.json`);
  await writeFile(jsonPath, JSON.stringify(brief, null, 2), "utf-8");
  console.log(`[weekly-brief] wrote ${jsonPath}`);

  // Render the weekly page: reuses the daily template but with the weekly
  // eyebrow, week-range header, and a back-link to the latest daily. Pass the
  // daily archive dates so the day-nav still links to the dailies.
  const dailyDates = archived.map((b) => b.date);
  // JSON was just written above, so this includes the current week's wrap.
  const weekDates = await listWeeklyDates(OUTPUT_DIR);
  const html = await renderWeeklyBriefHtml(brief, TEMPLATE_PATH, dailyDates, weekDates, monday);
  const htmlPath = path.join(OUTPUT_DIR, `finance-brief-weekly-${brief.date}.html`);
  await writeFile(htmlPath, html, "utf-8");
  console.log(`[weekly-brief] wrote ${htmlPath}`);

  publishToGit(`Weekly finance brief ${brief.date}`);
}

main().catch((err) => {
  console.error("[weekly-brief] FAILED:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
