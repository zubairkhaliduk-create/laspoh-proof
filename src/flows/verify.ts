/**
 * THE INDEPENDENT VERIFIER — the reason this project exists.
 *
 * The agent that does the work never grades it. This flow is given the evidence and the criterion
 * that was written BEFORE the step ran, and nothing else. Specifically it is NOT given:
 *
 *   - the planner's reasoning,
 *   - the executor's own opinion of whether it succeeded,
 *   - any prior verdict.
 *
 * That isolation is the entire point. An agent asked to check its own work will almost always
 * confirm it, because the same context that produced the action produces the justification. Here
 * the only inputs are the criterion and what the page actually showed.
 *
 * The default is DISBELIEF. "The click worked" is not proof; "no error appeared" is not proof.
 * Absence of contradiction is not evidence. If the stated criterion is not visible in what the
 * page showed, the verdict is `unproven` — and unproven is reported honestly rather than being
 * rounded up to success. A system that cannot say "I could not confirm this" is a system whose
 * successes mean nothing.
 */
import { z } from "zod";
import { ai } from "../genkit.js";
import type { Evidence } from "../core/evidence.js";

export const VerdictSchema = z.object({
  verdict: z.enum(["proven", "unproven", "contradicted"]).describe(
    "proven: the criterion is visibly satisfied in the evidence. unproven: the evidence does not show it either way. contradicted: the evidence shows it did NOT happen.",
  ),
  /** Must quote the evidence. A verdict that cannot cite is not a verdict. */
  citedEvidence: z.array(z.string()).describe("Exact snippets from the evidence that justify the verdict. Empty when unproven."),
  reasoning: z.string().describe("One or two sentences. What the evidence does and does not establish."),
});
export type Verdict = z.infer<typeof VerdictSchema>;

export const verifyFlow = ai.defineFlow(
  {
    name: "verify",
    inputSchema: z.object({ criterion: z.string(), evidence: z.custom<Evidence[]>() }),
    outputSchema: VerdictSchema,
  },
  async ({ criterion, evidence }) => {
    const bundle = (evidence as Evidence[])
      .map((e, i) => `--- EVIDENCE ${i + 1} (${e.id}, at ${e.url}) ---\nidentifiers: ${e.identifiers.join(", ") || "(none)"}\n${e.excerpt}`)
      .join("\n\n") || "(no evidence was captured)";

    const { output } = await ai.generate({
      prompt: `You are an independent verifier. You did NOT perform this work and you have no stake in it having succeeded.

You are given ONE criterion and the evidence captured from the page. Decide whether the evidence VISIBLY establishes the criterion.

CRITERION (written before the work was attempted):
${criterion}

EVIDENCE (what the page actually showed):
${bundle}

Rules you must follow:
- Default to disbelief. The burden is on the evidence.
- "The action was performed" is NOT proof the outcome occurred. A click firing proves nothing.
- The absence of an error message is NOT proof of success.
- If the criterion mentions a confirmation, reference or identifier, it must APPEAR in the evidence.
- If the evidence is silent on the criterion, answer "unproven". This is a correct and expected answer — never stretch to "proven" to be helpful.
- Every "proven" verdict must quote the exact evidence text that establishes it.`,
      output: { schema: VerdictSchema },
    });
    if (!output) return { verdict: "unproven" as const, citedEvidence: [], reasoning: "the verifier returned no structured verdict; nothing may be treated as proven on that basis" };
    // A "proven" verdict that cites nothing is not proven. Enforced in code so the guarantee does
    // not depend on the model choosing to honour it.
    if (output.verdict === "proven" && output.citedEvidence.length === 0) {
      return { verdict: "unproven" as const, citedEvidence: [], reasoning: `verifier claimed proven without citing evidence; downgraded. original reasoning: ${output.reasoning}` };
    }
    return output;
  },
);
