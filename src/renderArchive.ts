import { renderSite } from "./site.js";

/**
 * Re-render every page (daily, weekly wrap, week-ahead outlook) from persisted
 * JSON using the current template — no Claude/API call. Use after changing the
 * template or the renderer.
 */
async function main() {
  const { counts } = await renderSite();
  if (counts.daily + counts.weekly + counts.outlook === 0) {
    console.warn(`[render] no finance-brief-*.json found. Run the pipeline first (npm run brief).`);
  }
}

main().catch((err) => {
  console.error("[render] FAILED:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
