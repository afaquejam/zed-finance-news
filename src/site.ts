import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FinanceBrief } from "./types.js";
import {
  renderFinanceBriefHtml,
  renderOutlookBriefHtml,
  renderWeeklyBriefHtml,
} from "./render.js";
import {
  OUTPUT_DIR,
  TEMPLATE_PATH,
  briefBaseName,
  listArchiveEntries,
  loadBriefs,
  type ArchiveEntry,
  type BriefKind,
} from "./lib.js";

/** Renderer per kind — all three share the template, differing only in chrome. */
const RENDERERS: Record<
  BriefKind,
  (brief: FinanceBrief, templatePath: string, entries: ArchiveEntry[]) => Promise<string>
> = {
  daily: renderFinanceBriefHtml,
  weekly: renderWeeklyBriefHtml,
  outlook: renderOutlookBriefHtml,
};

export interface RenderSiteResult {
  counts: Record<BriefKind, number>;
  /** The newest page, which index.html/latest.html mirror. */
  latest?: ArchiveEntry;
}

/**
 * Re-render every published page from its persisted JSON, then point
 * index.html/latest.html at the newest one. Runs after any pipeline writes new
 * JSON, and standalone via `npm run render` after a template change.
 *
 * Rendering the whole site every time is deliberate: the day-nav on each page
 * spans all three kinds, so a new Sunday wrap or Monday outlook has to appear
 * in the nav of the pages already on disk. Doing it in one place keeps the
 * three pipelines from drifting apart. No Claude/API call is involved.
 */
export async function renderSite(): Promise<RenderSiteResult> {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const entries = await listArchiveEntries(OUTPUT_DIR);
  const counts: Record<BriefKind, number> = { daily: 0, weekly: 0, outlook: 0 };
  const htmlByBaseName = new Map<string, string>();

  for (const kind of ["daily", "weekly", "outlook"] as const) {
    for (const brief of await loadBriefs(OUTPUT_DIR, kind)) {
      const html = await RENDERERS[kind](brief, TEMPLATE_PATH, entries);
      const baseName = briefBaseName(kind, brief.date);
      await writeFile(path.join(OUTPUT_DIR, `${baseName}.html`), html, "utf-8");
      htmlByBaseName.set(baseName, html);
      counts[kind] += 1;
    }
  }

  // entries is newest-first, so entries[0] is the front door.
  const latest = entries[0];
  const latestHtml = latest && htmlByBaseName.get(briefBaseName(latest.kind, latest.date));
  if (latestHtml) {
    await writeFile(path.join(OUTPUT_DIR, "latest.html"), latestHtml, "utf-8");
    await writeFile(path.join(OUTPUT_DIR, "index.html"), latestHtml, "utf-8");
  }

  console.log(
    `[render] ${counts.daily} daily + ${counts.weekly} weekly + ${counts.outlook} outlook page(s)` +
      (latest ? `; index.html → ${briefBaseName(latest.kind, latest.date)}.html` : ""),
  );

  return { counts, latest };
}
