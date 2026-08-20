/**
 * THE REPAIR FLOW — what to do when the page says the plan was wrong.
 *
 * A plan is written before the agent has seen the page, so some of it is always guesswork: a field
 * called "Affiliation" in the plan turns out to be a dropdown called "Applying as", and a consent
 * checkbox nobody predicted turns out to be mandatory. The failure mode this flow exists to remove
 * is the one that makes agents look blind: submitting anyway, being refused, reading the refusal,
 * and only then going back for the fields the form had been advertising as required the whole time.
 *
 * The input is deliberately narrow. This flow is NOT asked "what should we do next?" — that would
 * be re-planning, and re-planning from model memory is how an agent talks itself into repeating a
 * failed action. It is asked one question: given these specific controls that the PAGE ITSELF
 * reports as required and still empty, what values belong in them?
 *
 * The list of outstanding fields is never model-generated. It is read from the DOM by the executor
 * (`Observation.outstandingRequired`), which is the only party that can actually see the form. The
 * model supplies values; the page supplies facts.
 */
import { z } from "zod";
import { ai } from "../genkit.js";
import { ActionSchema } from "../executors/types.js";

export const RepairSchema = z.object({
  steps: z.array(
    z.object({
      intent: z.string().describe("What this repair step is for, in one short line."),
      action: ActionSchema,
      provenBy: z.string().describe("What must be visible afterwards for this step to count as done."),
    }),
  ).max(8).describe("One step per outstanding required control. No submit steps — submitting is decided elsewhere."),
});
export type Repair = z.infer<typeof RepairSchema>;

export const repairFlow = ai.defineFlow(
  {
    name: "repair",
    inputSchema: z.object({
      goal: z.string(),
      outstanding: z.array(z.string()),
      pageText: z.string(),
    }),
    outputSchema: RepairSchema,
  },
  async ({ goal, outstanding, pageText }) => {
    const { output } = await ai.generate({
      prompt: `A form on the page reports that these controls are REQUIRED and still EMPTY. This list came from the page's own DOM, not from a guess — treat it as fact.

OUTSTANDING REQUIRED CONTROLS:
${outstanding.map((o) => `- ${o}`).join("\n")}

THE MISSION THIS FORM IS PART OF:
${goal}

WHAT THE PAGE CURRENTLY SHOWS:
${pageText.slice(0, 4000)}

Produce exactly one step per outstanding control, in the order listed.

- Use "fill" for a text, email or number input, with the value the mission implies.
- Use "select" for a dropdown, choosing the option whose wording best matches the mission. Never "click" a dropdown.
- Use "click" for a checkbox or radio — a consent or confirmation box is satisfied by clicking it, and it has no value.
- Refer to each control by the EXACT label text given above; do not paraphrase it and never use a CSS selector.
- Do NOT include a submit step. Submitting is not your decision.
- If the mission does not state a value for a control, choose the most reasonable, truthful one consistent with the mission and say so in the intent. Never invent an identity, credential, or financial detail that the mission did not supply.`,
      output: { schema: RepairSchema },
    });
    return output ?? { steps: [] };
  },
);
