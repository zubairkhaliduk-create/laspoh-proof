/**
 * THE PLANNER — turns a goal into a sequence of intents.
 *
 * It plans and nothing else. It cannot act, cannot judge success, and never sees the verifier's
 * conclusions. Keeping it this narrow is what makes its output auditable: a plan is a proposal,
 * and a proposal is not progress.
 *
 * Genkit's structured output is used rather than parsing prose, so a malformed plan fails at the
 * schema boundary instead of halfway through execution.
 */
import { z } from "zod";
import { ai } from "../genkit.js";
import { ActionSchema } from "../executors/types.js";

export const PlanSchema = z.object({
  understanding: z.string().describe("One sentence: the outcome the user actually wants."),
  steps: z.array(z.object({
    intent: z.string().describe("What this step achieves, in plain language."),
    action: ActionSchema,
    /** Written BEFORE the step runs, so success cannot be redefined afterwards to match whatever
     *  happened — the single most common way an agent grades its own homework. */
    provenBy: z.string().describe("What must be OBSERVED on the page for this step to count as proven."),
  })).min(1).max(12),
});
export type Plan = z.infer<typeof PlanSchema>;

export const planFlow = ai.defineFlow(
  { name: "plan", inputSchema: z.object({ goal: z.string(), startUrl: z.string().optional() }), outputSchema: PlanSchema },
  async ({ goal, startUrl }) => {
    const { output } = await ai.generate({
      prompt: `You plan a browser mission. Produce the SHORTEST sequence of concrete actions that achieves the goal.

GOAL: ${goal}
${startUrl ? `START URL: ${startUrl}` : ""}

Rules:
- Each step is ONE action a browser can perform: navigate, inspect, fill, select, click, read.
- Use "select" for a dropdown, never "click". A native dropdown is set by value; clicking one opens a browser-drawn list the agent cannot see or dismiss.
- Use "click" for checkboxes, buttons and links.
- "inspect" reads the current page so later steps can target real fields. Use it before filling an unfamiliar form.
- For every step, write provenBy: the specific thing that must be VISIBLE on the page afterwards for the step to count. A confirmation number, a success message, a value showing in a field. Never "the click worked" — a click firing proves nothing.
- Do not plan a submit/confirm step until the steps that fill required fields come first.
- Prefer fewer steps. Do not pad the plan.`,
      output: { schema: PlanSchema },
    });
    if (!output) throw new Error("planner returned no structured plan");
    return output;
  },
);
