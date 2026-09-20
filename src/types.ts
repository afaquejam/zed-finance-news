import { z } from "zod";

/**
 * An optional string that also tolerates an explicit JSON `null` from the
 * model (which emits `"field": null` non-deterministically instead of omitting
 * the key). `.optional()` alone rejects `null`; this coerces it to `undefined`
 * so the inferred type stays `string | undefined`.
 */
const optionalString = () =>
  z
    .string()
    .nullish()
    .transform((v) => v ?? undefined);

/** One news item within a section. */
export const FinanceBriefItemSchema = z.object({
  /**
   * Optional short label. Kept for backward-compat with older archived briefs;
   * new briefs lead with a self-contained `detail` and omit this to avoid the
   * title/text redundancy.
   */
  headline: optionalString(),
  /** A single emoji that fits the item, for visual engagement. Optional. */
  emoji: optionalString(),
  detail: z.string().min(1),
  /**
   * The causal "why" behind the item — the driver/catalyst/mechanism that
   * explains the move, not just the number. Optional (some items are context,
   * not moves), but strongly preferred for any price/index action.
   */
  why: optionalString(),
  sourceName: optionalString(),
  sourceUrl: z
    .string()
    .url()
    .nullish()
    .transform((v) => v ?? undefined),
});
export type FinanceBriefItem = z.infer<typeof FinanceBriefItemSchema>;

/** The four sections of the brief, in the order they appear on the page. */
export const SECTION_KEYS = ["usa", "emsmallcaps", "crypto", "commodities"] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

/**
 * Every spelling we accept for a section, folded onto its canonical key. Two
 * things need absorbing here:
 *
 * 1. **Legacy keys.** The US section was `sp500` and the India section
 *    `nifty50` before they were widened to USA (S&P 500 + Nasdaq) and Emerging
 *    Markets and Small Caps. Every archived brief in `docs/` still carries the
 *    old keys and is re-parsed on every render, so they must keep validating.
 *    Their stored `label` is untouched, so historical pages still read
 *    "S&P 500" / "NIFTY 50" — only the new briefs get the new headings.
 * 2. **Label echoes.** The skill asks for the lowercase key but the model
 *    sometimes returns the label instead ("Crypto", "NIFTY 50"), which failed
 *    validation *after* a full research run and lost the page — see the
 *    2026-08-31 outlook.
 *
 * Lookup happens on the lowercased, non-alphanumeric-stripped form, so
 * "S&P 500", "S & P 500" and "sp500" all arrive here as `sp500`.
 */
const SECTION_ALIASES: Record<string, SectionKey> = {
  // USA (was S&P 500)
  usa: "usa",
  us: "usa",
  unitedstates: "usa",
  sp500: "usa",
  sandp500: "usa",
  nasdaq: "usa",
  usequities: "usa",
  // Emerging Markets and Small Caps (was NIFTY 50)
  emsmallcaps: "emsmallcaps",
  em: "emsmallcaps",
  emergingmarkets: "emsmallcaps",
  emergingmarketsandsmallcaps: "emsmallcaps",
  emergingmarketssmallcaps: "emsmallcaps",
  smallcaps: "emsmallcaps",
  nifty50: "emsmallcaps",
  nifty: "emsmallcaps",
  india: "emsmallcaps",
  // Crypto
  crypto: "crypto",
  cryptocurrency: "crypto",
  // Commodities
  commodities: "commodities",
  commodity: "commodities",
  gold: "commodities",
};

const sectionKey = () =>
  z.preprocess((v) => {
    if (typeof v !== "string") return v;
    const normalized = v.toLowerCase().replace(/[^a-z0-9]/g, "");
    return SECTION_ALIASES[normalized] ?? normalized;
  }, z.enum(SECTION_KEYS));

/** One section: USA, Emerging Markets and Small Caps, Crypto, or Commodities. */
export const FinanceBriefSectionSchema = z.object({
  key: sectionKey(),
  label: z.string().min(1),
  items: z.array(FinanceBriefItemSchema).min(1),
});
export type FinanceBriefSection = z.infer<typeof FinanceBriefSectionSchema>;

/** Full brief returned by the Claude Code skill for a single day. */
export const FinanceBriefSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  generatedAt: z.string(),
  sections: z.array(FinanceBriefSectionSchema).min(1),
  crossCuttingTheme: optionalString(),
});
export type FinanceBrief = z.infer<typeof FinanceBriefSchema>;

/** Envelope returned by `claude -p --output-format json`. */
export interface ClaudeCliJsonEnvelope {
  type: string;
  subtype: string;
  result: string;
  session_id?: string;
  total_cost_usd?: number;
  duration_ms?: number;
  num_turns?: number;
  [key: string]: unknown;
}
