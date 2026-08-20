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

/**
 * The verdict as the rest of the system consumes it: every field present. Downstream code reads
 * `citedEvidence` and `reasoning` unconditionally, and a verdict with holes in it is exactly the
 * kind of thing that turns into a silent success somewhere else.
 */
export const VerdictSchema = z.object({
  verdict: z.enum(["proven", "unproven", "contradicted"]).describe(
    "proven: the criterion is visibly satisfied in the evidence. unproven: the evidence does not show it either way. contradicted: the evidence shows it did NOT happen.",
  ),
  /** Must quote the evidence. A verdict that cannot cite is not a verdict. */
  citedEvidence: z.array(z.string()).describe("Exact snippets from the evidence that justify the verdict. Empty when unproven."),
  reasoning: z.string().describe("One or two sentences. What the evidence does and does not establish."),
});
export type Verdict = z.infer<typeof VerdictSchema>;

/**
 * What the MODEL is asked for. Deliberately looser than the schema above: a model that has nothing
 * to cite tends to omit `citedEvidence` rather than send an empty array, and a hard schema failure
 * there costs a whole verdict — which, under a disbelief default, silently becomes an `unproven`
 * that reflects a parsing accident rather than the evidence. The substantive guarantee (proven must
 * cite) is enforced below in code, where the model cannot omit its way past it.
 */
const ModelVerdictSchema = VerdictSchema.extend({
  citedEvidence: VerdictSchema.shape.citedEvidence.optional(),
  reasoning: VerdictSchema.shape.reasoning.optional(),
});

/**
 * THE CITATION RULE, enforced in code.
 *
 * "Proven" means the evidence says so, and a verdict that cannot quote the evidence has not shown
 * that. Leaving this to the prompt would make the system's central guarantee depend on the model
 * choosing to honour an instruction; here it depends on nothing. A model that claims proof without
 * a quote gets downgraded to unproven, and its original reasoning is preserved so the downgrade is
 * visible rather than silent.
 *
 * Pure and exported so the guarantee can be tested without a model in the loop.
 */
export function enforceCitation(v: { verdict: Verdict["verdict"]; citedEvidence?: string[]; reasoning?: string }): Verdict {
  const citedEvidence = (v.citedEvidence ?? []).filter((c) => c.trim().length > 0);
  if (v.verdict === "proven" && citedEvidence.length === 0) {
    return { verdict: "unproven", citedEvidence: [], reasoning: `verifier claimed proven without citing evidence; downgraded. original reasoning: ${v.reasoning?.trim() || "(none given)"}` };
  }
  return { verdict: v.verdict, citedEvidence, reasoning: v.reasoning ?? "" };
}

export const verifyFlow = ai.defineFlow(
  {
    name: "verify",
    inputSchema: z.object({ criterion: z.string(), evidence: z.custom<Evidence[]>() }),
    outputSchema: VerdictSchema,
  },
  async ({ criterion, evidence }) => {
    const bundle = (evidence as Evidence[])
      .map((e, i) => `--- EVIDENCE ${i + 1} (${e.id}, at ${e.url}) ---\nidentifiers: ${e.identifiers.join(", ") || "(none)"}\nform controls now hold: ${e.formState.length ? e.formState.join(" | ") : "(no form controls seen)"}\nvisible page text:\n${e.excerpt}`)
      .join("\n\n") || "(no evidence was captured)";

    const basePrompt = `You are an independent verifier. You did NOT perform this work and you have no stake in it having succeeded.

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
- If the evidence is silent on the criterion, answer "unproven". This is a correct and expected answer \u2014 never stretch to "proven" to be helpful.
- Every "proven" verdict must quote the exact evidence text that establishes it.
- Always answer with all three fields: verdict, citedEvidence, reasoning.`;

    // The model occasionally returns an object missing `verdict` outright. That is a formatting
    // miss, not a judgement — and letting it fall through to the disbelief default would mean a
    // step is marked unproven for a reason that has nothing to do with the evidence. So: one
    // bounded retry that names the omission. If it misses twice, disbelief stands, because a
    // verifier that cannot state a verdict has not produced one.
    let output: z.infer<typeof ModelVerdictSchema> | null = null;
    let lastError = "";
    for (let attempt = 0; attempt < 2 && !output; attempt++) {
      const correction = attempt === 0
        ? ""
        : `\n\nYour previous response was rejected: ${lastError}. Reply again with ALL of these fields present: "verdict" (exactly one of proven, unproven, contradicted), "citedEvidence", "reasoning".`;
      try {
        ({ output } = await ai.generate({
          prompt: `${basePrompt}${correction}`,
          output: { schema: ModelVerdictSchema },
        }));
      } catch (e) {
        lastError = JSON.stringify((e as { detail?: { errors?: unknown } })?.detail?.errors ?? (e as Error)?.message ?? String(e)).slice(0, 200);
      }
    }
    if (!output) {
      // A verifier that CRASHES must never be read as a verifier that approved. The only safe
      // reading of "we could not obtain a verdict" is that nothing was proven.
      return { verdict: "unproven" as const, citedEvidence: [], reasoning: `the verifier could not produce a valid verdict (${lastError}); nothing may be treated as proven on that basis` };
    }
    // A "proven" verdict that cites nothing is not proven. Enforced in code so the guarantee does
    // not depend on the model choosing to honour it.
    return enforceCitation(output);
  },
);
