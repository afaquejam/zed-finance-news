import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderFinanceBriefHtml, renderWeeklyBriefHtml } from "./render.js";
import {
  OUTPUT_DIR,
  TEMPLATE_PATH,
  findLatestWeeklyHref,
  loadArchivedBriefs,
  loadWeeklyBriefs,
  weekStartMonday,
} from "./lib.js";

/**
 * Re-render all pages from persisted JSON using the current template — no
 * Claude/API call. Use after changing the template or renderer. Refreshes both
 * daily pages and weekly wrap pages so a template change propagates everywhere.
 */
async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const briefs = await loadArchivedBriefs(OUTPUT_DIR);
  if (briefs.length === 0) {
    console.warn(
      `[render] no finance-brief-*.json found in ${OUTPUT_DIR}. Run the pipeline first (npm run brief).`,
    );
    return;
  }

  const availableDates = briefs.map((b) => b.date);
  const weeklyHref = await findLatestWeeklyHref(OUTPUT_DIR);

  for (const b of briefs) {
    const html = await renderFinanceBriefHtml(b, TEMPLATE_PATH, availableDates, { weeklyHref });
    await writeFile(path.join(OUTPUT_DIR, `finance-brief-${b.date}.html`), html, "utf-8");
  }

  // latest.html + index.html mirror the newest daily brief.
  const latestHtml = await renderFinanceBriefHtml(briefs[0], TEMPLATE_PATH, availableDates, {
    weeklyHref,
  });
  await writeFile(path.join(OUTPUT_DIR, "latest.html"), latestHtml, "utf-8");
  await writeFile(path.join(OUTPUT_DIR, "index.html"), latestHtml, "utf-8");

  // Re-render any weekly wrap pages from their persisted JSON too.
  const weeklies = await loadWeeklyBriefs(OUTPUT_DIR);
  for (const w of weeklies) {
    const html = await renderWeeklyBriefHtml(w, TEMPLATE_PATH, availableDates, weekStartMonday(w.date));
    await writeFile(path.join(OUTPUT_DIR, `finance-brief-weekly-${w.date}.html`), html, "utf-8");
  }

  console.log(
    `[render] re-rendered ${briefs.length} daily + ${weeklies.length} weekly page(s) + latest.html + index.html`,
  );
}

main().catch((err) => {
  console.error("[render] FAILED:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
