import { spawnSync } from "node:child_process";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  FinanceBriefSchema,
  type ClaudeCliJsonEnvelope,
  type FinanceBrief,
} from "./types.js";
import { renderFinanceBriefHtml } from "./render.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
// GitHub Pages serves the site from the `docs/` folder on the default branch.
const OUTPUT_DIR = path.join(ROOT, "docs");
const TEMPLATE_PATH = path.join(ROOT, "templates", "finance-brief.html");

// The base prompt Claude Code runs. `/finance-brief` invokes the skill at
// .claude/skills/finance-brief/SKILL.md. Override via env var if you rename
// the skill or want to pass extra instructions. The previous brief (for
// deduplication) is appended to this at runtime — see buildPrompt().
const PROMPT = process.env.FINANCE_BRIEF_PROMPT ?? "/finance-brief";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * Load every persisted brief JSON from the output dir, most-recent first.
 * Invalid/unparseable files are skipped with a warning so one bad archive
 * file can't break the whole rebuild.
 */
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
        `[finance-brief] skipping malformed archive ${file}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
  return briefs.sort((a, b) => b.date.localeCompare(a.date));
}

/** Strips ```json fences if the model wraps its output despite instructions. */
function stripCodeFence(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1] : trimmed;
}

/**
 * Condense a prior brief into a compact, model-readable summary so the skill
 * can see what was already published and avoid re-reporting it. We pass only
 * the detail/why lines (not the full JSON) to keep the prompt small and to
 * discourage the model from copying entire items verbatim.
 */
function formatPreviousBrief(brief: FinanceBrief): string {
  const lines: string[] = [];
  for (const section of brief.sections) {
    lines.push(`## ${section.label}`);
    for (const item of section.items) {
      lines.push(`- ${item.detail}${item.why ? ` (why: ${item.why})` : ""}`);
    }
  }
  if (brief.crossCuttingTheme) {
    lines.push(`## Cross-cutting theme`);
    lines.push(brief.crossCuttingTheme);
  }
  return lines.join("\n");
}

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
    formatPreviousBrief(previous),
  ].join("\n");
}

function runClaudeCode(prompt: string): ClaudeCliJsonEnvelope {
  // NOTE: CLI flags occasionally change between Claude Code releases — run
  // `claude -p --help` to confirm these are current before relying on them
  // in production.
  const claudeArgs = [
    "-p",
    prompt,
    "--output-format",
    "json",
    "--allowedTools",
    "WebSearch",
    "--permission-mode",
    "acceptEdits",
    "--max-turns",
    "20",
  ];

  const result = spawnSync("claude", claudeArgs, {
    cwd: ROOT,
    encoding: "utf-8",
    maxBuffer: 1024 * 1024 * 32, // 32MB, search results can be verbose
    env: process.env,
  });

  if (result.error) {
    throw new Error(
      `Failed to launch "claude" CLI. Is @anthropic-ai/claude-code installed and on PATH? Original error: ${result.error.message}`,
    );
  }

  if (result.status !== 0) {
    throw new Error(
      `claude exited with status ${result.status}.\nstderr:\n${result.stderr}`,
    );
  }

  let envelope: ClaudeCliJsonEnvelope;
  try {
    envelope = JSON.parse(result.stdout);
  } catch (err) {
    throw new Error(
      `Could not parse claude CLI stdout as JSON. Raw stdout:\n${result.stdout}`,
    );
  }

  if (envelope.subtype !== "success") {
    throw new Error(
      `claude run did not succeed (subtype: ${envelope.subtype}). Full envelope:\n${JSON.stringify(envelope, null, 2)}`,
    );
  }

  return envelope;
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

  const jsonText = stripCodeFence(envelope.result);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    throw new Error(
      `Skill output was not valid JSON after fence-stripping. Raw result:\n${jsonText}`,
    );
  }

  const brief = FinanceBriefSchema.parse(parsed);

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

  for (const b of allBriefs) {
    const html = await renderFinanceBriefHtml(b, TEMPLATE_PATH, availableDates);
    await writeFile(path.join(OUTPUT_DIR, `finance-brief-${b.date}.html`), html, "utf-8");
  }
  console.log(`[finance-brief] re-rendered ${allBriefs.length} page(s)`);

  // latest.html + index.html mirror the newest brief (today's).
  const latestHtml = await renderFinanceBriefHtml(brief, TEMPLATE_PATH, availableDates);
  await writeFile(path.join(OUTPUT_DIR, "latest.html"), latestHtml, "utf-8");
  await writeFile(path.join(OUTPUT_DIR, "index.html"), latestHtml, "utf-8");
  console.log(`[finance-brief] wrote latest.html + index.html`);

  publishToGit(brief.date);
}

/**
 * Commit the regenerated site and push it to GitHub Pages. Enabled only when
 * FINANCE_BRIEF_PUBLISH=1 (the scheduled launchd job sets it) so manual/dev
 * runs don't push. Failures are logged and mark the run as failed, but never
 * throw — the HTML is already written to disk by this point.
 */
function publishToGit(date: string): void {
  if (process.env.FINANCE_BRIEF_PUBLISH !== "1") {
    console.log(
      "[finance-brief] git publish skipped (set FINANCE_BRIEF_PUBLISH=1 to enable)",
    );
    return;
  }

  const git = (args: string[]) =>
    spawnSync("git", args, { cwd: ROOT, encoding: "utf-8", env: process.env });

  const add = git(["add", "docs"]);
  if (add.status !== 0) {
    console.error(`[finance-brief] git add failed:\n${add.stderr}`);
    process.exitCode = 1;
    return;
  }

  // Commit only if something is staged (`diff --cached --quiet` exits 1 when
  // there are staged changes).
  if (git(["diff", "--cached", "--quiet"]).status !== 0) {
    const commit = git(["commit", "-m", `Finance brief ${date}`]);
    if (commit.status !== 0) {
      console.error(`[finance-brief] git commit failed:\n${commit.stderr}`);
      process.exitCode = 1;
      return;
    }
    console.log("[finance-brief] committed website changes");
  } else {
    console.log("[finance-brief] no website changes to commit");
  }

  const push = git(["push", "origin", "master"]);
  if (push.status !== 0) {
    console.error(`[finance-brief] git push failed:\n${push.stderr}`);
    process.exitCode = 1;
    return;
  }
  console.log("[finance-brief] pushed to origin/master");
}

main().catch((err) => {
  console.error("[finance-brief] FAILED:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
