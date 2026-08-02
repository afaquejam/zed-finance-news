import { spawnSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  FinanceBriefSchema,
  type ClaudeCliJsonEnvelope,
  type FinanceBrief,
} from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Project root (one level up from the compiled `dist/` dir). */
export const ROOT = path.resolve(__dirname, "..");
// GitHub Pages serves the site from the `docs/` folder on the default branch.
export const OUTPUT_DIR = path.join(ROOT, "docs");
export const TEMPLATE_PATH = path.join(ROOT, "templates", "finance-brief.html");

/** Today as YYYY-MM-DD (UTC). */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Parse a YYYY-MM-DD string into a UTC Date (avoids TZ off-by-one). */
function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * The Monday (inclusive) that starts the week containing `iso`. Daily briefs
 * are dated by their run day (Tue–Sat), each reporting the prior session, so a
 * Mon–Sat window captures the five dailies covering Mon–Fri sessions.
 */
export function weekStartMonday(iso: string): string {
  const d = parseIsoDate(iso);
  const daysSinceMonday = (d.getUTCDay() + 6) % 7; // Sun=0 -> 6, Mon=1 -> 0, Sat=6 -> 5
  d.setUTCDate(d.getUTCDate() - daysSinceMonday);
  return d.toISOString().slice(0, 10);
}

/**
 * Load every persisted DAILY brief JSON from a dir, most-recent first. The
 * regex intentionally does NOT match `finance-brief-weekly-*.json`, so weekly
 * briefs never pollute the daily archive, day-nav, or dedup context. Invalid
 * files are skipped with a warning so one bad archive can't break a rebuild.
 */
export async function loadArchivedBriefs(dir: string): Promise<FinanceBrief[]> {
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

/**
 * Load every persisted WEEKLY brief JSON (`finance-brief-weekly-*.json`),
 * most-recent first; skip malformed files. Used to re-render weekly pages from
 * source when the template changes.
 */
export async function loadWeeklyBriefs(dir: string): Promise<FinanceBrief[]> {
  const files = await readdir(dir).catch(() => [] as string[]);
  const jsonFiles = files.filter((f) =>
    /^finance-brief-weekly-\d{4}-\d{2}-\d{2}\.json$/.test(f),
  );

  const briefs: FinanceBrief[] = [];
  for (const file of jsonFiles) {
    try {
      const raw = await readFile(path.join(dir, file), "utf-8");
      briefs.push(FinanceBriefSchema.parse(JSON.parse(raw)));
    } catch (err) {
      console.warn(
        `[finance-brief] skipping malformed weekly archive ${file}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
  return briefs.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * List every weekly wrap's end-date (`finance-brief-weekly-YYYY-MM-DD.json`),
 * most-recent first. Read from the JSON (the source of truth) so the list is
 * available even before a page is rendered. Used to build the week-nav that
 * lets any page jump to any weekly wrap.
 */
export async function listWeeklyDates(dir: string): Promise<string[]> {
  const files = await readdir(dir).catch(() => [] as string[]);
  return files
    .map((f) => f.match(/^finance-brief-weekly-(\d{4}-\d{2}-\d{2})\.json$/)?.[1])
    .filter((d): d is string => Boolean(d))
    .sort()
    .reverse();
}

/** Strips ```json fences if the model wraps its output despite instructions. */
export function stripCodeFence(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1] : trimmed;
}

/**
 * Condense a brief into a compact, model-readable summary (detail/why lines
 * only, not the full JSON) so a skill can see what was already published. Used
 * by the daily pipeline for dedup and by the weekly pipeline to feed the week.
 */
export function formatBriefForPrompt(brief: FinanceBrief): string {
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
 * Invoke the Claude Code CLI with a prompt and return the parsed JSON envelope.
 * Both pipelines allow only WebSearch and expect a single strict-JSON result.
 */
export function runClaudeCode(prompt: string): ClaudeCliJsonEnvelope {
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

/**
 * Parse + validate a Claude CLI result string into a FinanceBrief, tolerating
 * an accidental ```json fence around the object.
 */
export function parseBrief(rawResult: string): FinanceBrief {
  const jsonText = stripCodeFence(rawResult);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    throw new Error(
      `Skill output was not valid JSON after fence-stripping. Raw result:\n${jsonText}`,
    );
  }
  return FinanceBriefSchema.parse(parsed);
}

/**
 * Commit the regenerated site and push it to GitHub Pages. Enabled only when
 * FINANCE_BRIEF_PUBLISH=1 (the scheduled launchd job sets it) so manual/dev
 * runs don't push. Failures are logged and mark the run as failed via
 * process.exitCode, but never throw — the HTML is already written by this point.
 */
export function publishToGit(commitMessage: string): void {
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
    const commit = git(["commit", "-m", commitMessage]);
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
