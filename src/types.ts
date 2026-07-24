import { z } from "zod";

/** One news item within a section. */
export const FinanceBriefItemSchema = z.object({
  /**
   * Optional short label. Kept for backward-compat with older archived briefs;
   * new briefs lead with a self-contained `detail` and omit this to avoid the
   * title/text redundancy.
   */
  headline: z.string().optional(),
  /** A single emoji that fits the item, for visual engagement. Optional. */
  emoji: z.string().optional(),
  detail: z.string().min(1),
  /**
   * The causal "why" behind the item — the driver/catalyst/mechanism that
   * explains the move, not just the number. Optional (some items are context,
   * not moves), but strongly preferred for any price/index action.
   */
  why: z.string().optional(),
  sourceName: z.string().optional(),
  sourceUrl: z.string().url().optional(),
});
export type FinanceBriefItem = z.infer<typeof FinanceBriefItemSchema>;

/** One of the three sections: S&P 500, NIFTY 50, Crypto. */
export const FinanceBriefSectionSchema = z.object({
  key: z.enum(["sp500", "nifty50", "crypto"]),
  label: z.string().min(1),
  items: z.array(FinanceBriefItemSchema).min(1),
});
export type FinanceBriefSection = z.infer<typeof FinanceBriefSectionSchema>;

/** Full brief returned by the Claude Code skill for a single day. */
export const FinanceBriefSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  generatedAt: z.string(),
  sections: z.array(FinanceBriefSectionSchema).min(1),
  crossCuttingTheme: z.string().optional(),
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
