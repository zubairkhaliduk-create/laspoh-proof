/**
 * THE RECONNAISSANCE NAVIGATE IS CHECKED LIKE ANY OTHER.
 *
 * Found by an adversarial security review, not by us: `startUrl` is anonymous request input, the
 * mission's allow-list is DERIVED from it, and the reconnaissance dispatch was the one path to the
 * browser that never consulted isNavigationAllowed — so the boundary authorised itself. The review
 * reproduced it: POST a mission with `file:///etc/passwd` and 9kB of it landed in Evidence.excerpt,
 * which the verifier reads, citations quote, and `GET /missions/:id` publishes. On Cloud Run the
 * same trick points at /proc/self/environ, where the Gemma key is mounted.
 */
vi.mock("../src/flows/plan.js", () => ({ planFlow: vi.fn(async () => ({ steps: [] })) }));
vi.mock("../src/flows/verify.js", () => ({ verifyFlow: vi.fn(async () => ({ verdict: "unproven", citedEvidence: [], reasoning: "mocked" })) }));
vi.mock("../src/flows/repair.js", () => ({ repairFlow: vi.fn(async () => ({ values: [] })) }));

import { describe, expect, it, vi } from "vitest";
import { runMission } from "../src/core/orchestrator.js";
import { isNavigationAllowed } from "../src/security/untrusted.js";
import type { Executor } from "../src/executors/types.js";

describe("a non-navigation scheme never reaches the browser", () => {
  it.each(["file:///etc/passwd", "file:///proc/self/environ", "javascript:fetch('/x')", "data:text/html,<h1>x"])(
    "%s is refused before any dispatch",
    async (startUrl) => {
      const execute = vi.fn();
      const executor = { name: "spy", preExisting: false, execute } as unknown as Executor;
      const { state } = await runMission({ goal: "read something", startUrl, executor, maxSteps: 3, missionId: "m_ssrf" });
      expect(execute).not.toHaveBeenCalled();   // the browser is never pointed at it
      expect(state.status).toBe("blocked");
    },
  );

  it("http(s) still proceeds — this is a scheme check, not a lockout", async () => {
    const execute = vi.fn(async () => ({ ok: true, url: "http://localhost:1/x", title: "t", pageText: "hello", excerpt: "hello", identifiers: [], formState: [], outstandingRequired: [] }));
    const executor = { name: "spy", preExisting: false, execute } as unknown as Executor;
    await runMission({ goal: "read something", startUrl: "http://localhost:1/x", executor, maxSteps: 3, missionId: "m_ok" });
    expect(execute).toHaveBeenCalled();
  });

  it("the allow-list itself always said no — it was simply never consulted", () => {
    expect(isNavigationAllowed("file:///etc/passwd", []).allowed).toBe(false);
  });
});
