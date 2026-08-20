/**
 * THE EXECUTION INTERFACE — the seam that keeps this project honest.
 *
 * Everything above this line (planning, state, verification, receipts) is the agent. Everything
 * below it is *actuation*: the mechanical business of driving a page. Keeping them apart is not
 * decoration — it is the claim this project rests on, and it is testable: swap the executor and
 * the agent must be unchanged. Two are shipped precisely so that claim is demonstrated rather
 * than asserted (a reference executor written for this project, and an adapter to a pre-existing
 * browser runtime that is disclosed as such).
 *
 * The contract is deliberately narrow. An executor may NOT plan, may NOT decide what to do next,
 * and may NOT judge whether the mission succeeded. It performs one action and reports what it
 * OBSERVED — never what it concluded. Every judgement in this system is made above this line,
 * by a component that can be reasoned about and tested on its own.
 */
import { z } from "zod";

/** The verbs an executor must support. Deliberately small: a bigger vocabulary would push
 *  decision-making down into the executor, which is exactly what this seam exists to prevent. */
export const ActionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("navigate"), url: z.string().url() }),
  z.object({ kind: z.literal("inspect"), note: z.string().optional() }),
  z.object({ kind: z.literal("fill"), field: z.string().min(1), value: z.string() }),
  z.object({ kind: z.literal("click"), target: z.string().min(1) }),
  // A native <select> is set BY VALUE, never clicked: its option list is painted by the browser,
  // is absent from the DOM, and swallows input while open. Clicking one opens a popup the agent
  // can neither see nor dismiss. Giving this its own verb keeps that fact in the interface rather
  // than leaving every executor to rediscover it.
  z.object({ kind: z.literal("select"), field: z.string().min(1), value: z.string().min(1) }),
  z.object({ kind: z.literal("read"), of: z.string().min(1) }),
]);
export type Action = z.infer<typeof ActionSchema>;

/**
 * What actually happened, as OBSERVED. `ok` means the action was dispatched and its immediate
 * effect was seen — it is emphatically NOT a claim that the mission advanced. That distinction is
 * the one this whole system exists to preserve: a click that fires is not an application that was
 * submitted.
 */
export const ObservationSchema = z.object({
  ok: z.boolean(),
  /** Machine-readable failure class when ok is false. Never free prose. */
  failure: z.enum(["not_found", "not_actionable", "no_effect", "value_discarded", "navigation_failed", "transport"]).nullable().default(null),
  /** Human-readable detail — for logs and receipts, never parsed for control flow. */
  detail: z.string().default(""),
  /** The page's own visible state after the action: the raw material every later judgement uses. */
  pageText: z.string().default(""),
  url: z.string().default(""),
  /** Field labels the executor can see are still REQUIRED and still EMPTY. Ground truth about the
   *  form, reported by the surface that can actually see it — never inferred by the model. */
  outstandingRequired: z.array(z.string()).default([]),
  /** Stable identifiers the page exposed (confirmation numbers, reference ids). Evidence candidates. */
  identifiers: z.array(z.string()).default([]),
});
export type Observation = z.infer<typeof ObservationSchema>;

export interface Executor {
  /** Which executor this is — recorded on every receipt so provenance is never ambiguous. */
  readonly name: string;
  /** True when this executor is pre-existing work rather than built for this project. Surfaced in
   *  receipts and the API so disclosure is structural, not a line in a README someone may not read. */
  readonly preExisting: boolean;
  execute(action: Action): Promise<Observation>;
  close?(): Promise<void>;
}
