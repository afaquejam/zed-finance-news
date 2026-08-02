import { readFile } from "node:fs/promises";
import type { FinanceBrief, FinanceBriefItem, FinanceBriefSection } from "./types.js";
import { weekStartMonday } from "./lib.js";

/** Minimal HTML-escaping since section content originates from web/LLM output. */
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Escape HTML, then render markdown bold as <strong>. The model decides what
 * to emphasize; only bold is supported (no italics, no auto-bolding). Both
 * `**x**` and a lone `*x*` map to bold so stray asterisks never leak as
 * literal text. Escaping happens first and we only add our own tags, so this
 * stays XSS-safe.
 */
function applyEmphasis(raw: string): string {
  return escapeHtml(raw)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<strong>$1</strong>");
}

/**
 * Render text with NO emphasis: strip markdown bold markers so nothing renders
 * bold and no literal asterisks leak, then escape. Used for the `why` line.
 */
function stripEmphasis(raw: string): string {
  const plain = raw
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1");
  return escapeHtml(plain);
}

/** Parse a YYYY-MM-DD string into a UTC Date (avoids TZ off-by-one). */
function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** "2026-07-24" -> "July 24, 2026" for the header. */
function formatHeaderDate(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** "2026-07-27" + "2026-08-01" -> "Jul 27 – Aug 1, 2026" for the weekly header. */
function formatWeekRange(startIso: string, endIso: string): string {
  const start = parseIsoDate(startIso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const end = parseIsoDate(endIso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${start} – ${end}`;
}

/** Filename a given daily brief date is written to. */
function briefFileName(iso: string): string {
  return `finance-brief-${iso}.html`;
}

/** Filename a given weekly wrap (keyed by its end-date) is written to. */
function weeklyFileName(iso: string): string {
  return `finance-brief-weekly-${iso}.html`;
}

/**
 * Build the horizontally-scrollable 7-day chip nav. `availableDates` are the
 * dates that actually have a generated file; the newest 7 are shown, with
 * `currentDate` rendered as the non-clickable active chip.
 */
function renderDayNav(currentDate: string, availableDates: string[]): string {
  const dates = Array.from(new Set([currentDate, ...availableDates]))
    .sort()
    .reverse()
    .slice(0, 7);

  return dates
    .map((iso) => {
      const dt = parseIsoDate(iso);
      const dow = dt.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
      const dom = dt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
      const isActive = iso === currentDate;
      const inner = `<span class="dow">${escapeHtml(dow)}</span><span class="dom">${escapeHtml(dom)}</span>`;
      return isActive
        ? `<span class="chip active" aria-current="date">${inner}</span>`
        : `<a class="chip" href="${escapeHtml(briefFileName(iso))}">${inner}</a>`;
    })
    .join("\n      ");
}

/**
 * Build the weekly-wrap chip nav — the same interaction as the day-nav but one
 * scale up. Each chip is a two-line "WEEK / date-range" pointing at a weekly
 * page. `weekDates` are the wrap end-dates (newest first); the newest 6 show.
 * `activeWeek` (set only on a weekly page) renders as the non-clickable "you
 * are here" chip. Returns the whole `<nav>` block, or "" when no wraps exist.
 */
function renderWeekNav(weekDates: string[], activeWeek?: string): string {
  const weeks = Array.from(new Set(weekDates)).sort().reverse().slice(0, 6);
  if (weeks.length === 0) return "";

  const chips = weeks
    .map((iso) => {
      const range = formatWeekRange(weekStartMonday(iso), iso);
      const inner = `<span class="dow">Week</span><span class="dom">${escapeHtml(range)}</span>`;
      return iso === activeWeek
        ? `<span class="chip active" aria-current="true">${inner}</span>`
        : `<a class="chip" href="${escapeHtml(weeklyFileName(iso))}">${inner}</a>`;
    })
    .join("\n      ");

  return `<nav class="chip-nav week-nav" aria-label="Weekly wraps">
      ${chips}
    </nav>`;
}

/** Default emoji per section, used when nothing more specific matches. */
const SECTION_EMOJI: Record<string, string> = {
  sp500: "🇺🇸",
  nifty50: "🇮🇳",
  crypto: "🪙",
};

/** Keyword → emoji fallbacks for briefs that predate the model-supplied emoji. */
const KEYWORD_EMOJI: Array<[RegExp, string]> = [
  [/\b(bitcoin|btc)\b/i, "₿"],
  [/\b(ether|ethereum|eth)\b/i, "Ξ"],
  [/\b(solana|sol)\b/i, "◎"],
  [/\b(oil|crude|brent|wti)\b/i, "🛢️"],
  [/\b(fed|fomc|rate cut|rate hike|central bank|rbi)\b/i, "🏦"],
  [/\b(ai|capex|chip|semiconductor)\b/i, "🤖"],
  [/\b(earnings|profit|revenue|results)\b/i, "📊"],
  [/\b(etf|inflow|outflow|flows?)\b/i, "💵"],
  [/\b(regulat|sec|lawsuit|ban|approval)\b/i, "⚖️"],
  [/\b(rupee|dollar|currency|forex|yield)\b/i, "💱"],
  [/\b(fell|drop|slump|sink|plunge|slide|down|selloff|loss|bear)\b/i, "📉"],
  [/\b(rose|gain|surge|jump|rally|climb|up|soar|bull|record high)\b/i, "📈"],
];

/** The emoji the model chose, or a keyword/section fallback. */
function pickEmoji(item: FinanceBriefItem, sectionKey: string): string {
  if (item.emoji) return item.emoji;
  const haystack = `${item.headline ?? ""} ${item.detail}`;
  for (const [re, emoji] of KEYWORD_EMOJI) {
    if (re.test(haystack)) return emoji;
  }
  return SECTION_EMOJI[sectionKey] ?? "•";
}

function renderItem(item: FinanceBriefItem, sectionKey: string): string {
  const emoji = pickEmoji(item, sectionKey);
  const source =
    item.sourceUrl && item.sourceName
      ? `<div class="source"><a href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(
          item.sourceName,
        )}</a></div>`
      : item.sourceName
        ? `<div class="source">${escapeHtml(item.sourceName)}</div>`
        : "";

  const why = item.why
    ? `<div class="why"><span class="why-label">Why</span> ${stripEmphasis(item.why)}</div>`
    : "";

  return `<li>
    <div class="detail"><span class="emoji">${escapeHtml(emoji)}</span>${applyEmphasis(item.detail)}</div>
    ${why}
    ${source}
  </li>`;
}

function renderSection(section: FinanceBriefSection): string {
  const items = section.items.map((item) => renderItem(item, section.key)).join("\n");
  return `<section class="brief-section" id="${escapeHtml(section.key)}">
    <h2>${escapeHtml(section.label)}</h2>
    <ul class="items">
      ${items}
    </ul>
  </section>`;
}

/** Per-render options that let one template serve both daily and weekly pages. */
export interface RenderOptions {
  /** "daily" (default) or "weekly" — drives the eyebrow. */
  variant?: "daily" | "weekly";
  /**
   * Which date to highlight in the day-nav. Defaults to the brief's own date.
   * Weekly pages pass the latest DAILY date so the nav highlights a real,
   * existing daily page rather than the (dateless) weekly.
   */
  navCurrentDate?: string;
  /** Overrides the h1 date text — weekly pages pass a "Jul 27 – Aug 1" range. */
  headerDateOverride?: string;
  /** End-dates of every weekly wrap, newest first, for the week-nav chips. */
  availableWeeks?: string[];
  /** Weekly page: its own end-date, so its week-chip renders as active. */
  activeWeek?: string;
}

export async function renderFinanceBriefHtml(
  brief: FinanceBrief,
  templatePath: string,
  availableDates: string[] = [],
  opts: RenderOptions = {},
): Promise<string> {
  const template = await readFile(templatePath, "utf-8");
  const variant = opts.variant ?? "daily";

  const sectionsHtml = brief.sections.map(renderSection).join("\n");
  const crossCuttingHtml = brief.crossCuttingTheme
    ? `<div class="cross-cutting"><span class="ct-label">Common thread</span><span>${applyEmphasis(
        brief.crossCuttingTheme,
      )}</span></div>`
    : "";

  const eyebrow = variant === "weekly" ? "Weekly Wrap" : "Daily Market Brief";
  const headerDate = opts.headerDateOverride ?? formatHeaderDate(brief.date);
  const navCurrent = opts.navCurrentDate ?? brief.date;

  return template
    .replaceAll("{{DATE}}", escapeHtml(brief.date))
    .replaceAll("{{HEADER_DATE}}", escapeHtml(headerDate))
    .replaceAll("{{EYEBROW}}", escapeHtml(eyebrow))
    .replaceAll("{{GENERATED_AT}}", escapeHtml(brief.generatedAt))
    .replace("{{DAY_NAV}}", renderDayNav(navCurrent, availableDates))
    .replace("{{WEEK_NAV}}", renderWeekNav(opts.availableWeeks ?? [], opts.activeWeek))
    .replace("{{SECTIONS}}", sectionsHtml)
    .replace("{{CROSS_CUTTING}}", crossCuttingHtml);
}

/**
 * Render a weekly brief page: reuses the daily template but flips the eyebrow
 * to "Weekly Wrap", shows the week range in the header, highlights the latest
 * daily in the day-nav, and marks its own chip active in the week-nav.
 * `dailyDates` are the archive's daily dates; `weekDates` are every weekly
 * wrap's end-date; `weekStartIso` is the Monday the week began.
 */
export async function renderWeeklyBriefHtml(
  brief: FinanceBrief,
  templatePath: string,
  dailyDates: string[],
  weekDates: string[],
  weekStartIso: string,
): Promise<string> {
  const latestDaily = dailyDates.length
    ? [...dailyDates].sort().reverse()[0]
    : undefined;
  return renderFinanceBriefHtml(brief, templatePath, dailyDates, {
    variant: "weekly",
    headerDateOverride: formatWeekRange(weekStartIso, brief.date),
    navCurrentDate: latestDaily,
    availableWeeks: weekDates,
    activeWeek: brief.date,
  });
}
