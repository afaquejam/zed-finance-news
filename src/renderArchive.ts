import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FinanceBriefSchema, type FinanceBrief } from "./types.js";
import { renderFinanceBriefHtml } from "./render.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT, "output");
const TEMPLATE_PATH = path.join(ROOT, "templates", "finance-brief.html");

/** Load every persisted brief JSON, newest first; skip malformed files. */
async function loadArchivedBriefs(dir: string): Promise<FinanceBrief[]> {
  const files = await readdir(dir).catch(() => [] as string[]);
  const jsonFiles = files.filter((f) => /^finance-brief-\d{4}-\d{2}-\d{2}\.json$/.test(f));

  const briefs: FinanceBrief[] = [];
  for (const file of jsonFiles) {
    try {
      const raw = await readFile(path.join(dir, file), "utf-8");
      briefs.push(FinanceBriefSchema.parse(JSON.parse(raw)));
    } catch (err) {
      console.warn(
        `[render] skipping malformed archive ${file}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
  return briefs.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Re-render all pages from persisted JSON using the current template — no
 * Claude/API call. Use after changing the template or renderer.
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
  for (const b of briefs) {
    const html = await renderFinanceBriefHtml(b, TEMPLATE_PATH, availableDates);
    await writeFile(path.join(OUTPUT_DIR, `finance-brief-${b.date}.html`), html, "utf-8");
  }

  // latest.html + index.html mirror the newest brief.
  const latestHtml = await renderFinanceBriefHtml(briefs[0], TEMPLATE_PATH, availableDates);
  await writeFile(path.join(OUTPUT_DIR, "latest.html"), latestHtml, "utf-8");
  await writeFile(path.join(OUTPUT_DIR, "index.html"), latestHtml, "utf-8");

  console.log(`[render] re-rendered ${briefs.length} page(s) + latest.html + index.html`);
}

main().catch((err) => {
  console.error("[render] FAILED:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
