/**
 * THE BLIND PRODUCTION EVALUATION.
 *
 * Every run is a real randomized challenge against the deployed service: the server commits to a
 * hidden answer, the agent runs without seeing it, the answer is revealed, and the outcome is
 * scored by the server's own pure scorer — not by this script's opinion of it.
 *
 *   node evals/blind-eval.mjs [baseUrl] [runs]
 *
 * Rules this harness holds itself to:
 *   - EVERY attempted run is recorded, including errors. Publishing the nicest subset would be
 *     the failure this project exists to prevent, committed in the measurement.
 *   - Infrastructure failures are counted separately from agent failures, and neither is hidden.
 *   - Numbers are written to raw JSON; the human-readable report is GENERATED from that file, so
 *     no figure is ever typed by hand.
 */
const base = process.argv[2] ?? "https://laspoh-proof-wqx6gkuc7a-uc.a.run.app";
const runs = Number(process.argv[3] ?? 32);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A transport blip must not consume a run. Nine of thirty-two runs were lost to connection-level
// `fetch failed` from the measuring machine — not the service, which logged no errors — and each
// one cost a real mission. Retried once; a second failure is recorded as infrastructure-invalid,
// never quietly dropped.
const jfetch = async (url, init) => {
  for (let a = 0; a < 2; a++) {
    try { return await fetch(url, init); }
    catch (e) { if (a === 1) throw e; await sleep(3000); }
  }
  throw new Error("unreachable");
};

const results = [];
for (let i = 1; i <= runs; i++) {
  const started = Date.now();
  process.stdout.write(`▶ blind ${i}/${runs} … `);
  try {
    const c = await (await jfetch(`${base}/challenge`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })).json();
    if (c.error) { results.push({ run: i, invalid: true, reason: c.error }); console.log(`SKIPPED (${c.error})`); await sleep(5000); continue; }

    let status = "running";
    for (let t = 0; t < 80 && ["running", "planning"].includes(status); t++) {
      await sleep(4000);
      status = (await (await jfetch(`${base}/missions/${c.missionId}`)).json().catch(() => ({}))).status ?? status;
    }
    const result = await (await jfetch(`${base}/challenge/${c.challengeId}/result`)).json();
    if (result.error) { results.push({ run: i, invalid: true, reason: result.error, challengeId: c.challengeId }); console.log(`INVALID (${result.error})`); continue; }

    const row = {
      run: i, challengeId: c.challengeId, missionId: c.missionId, scenario: result.scenario,
      commitmentPublishedAt: c.committedAt, commitment: c.commitment, recomputed: result.recomputed,
      commitmentValid: result.commitmentValid, falseProven: result.falseProven,
      prohibitedSent: result.prohibitedSent, correct: result.correct, why: result.why,
      expectation: result.expectation, observed: result.observed, protection: result.protection,
      status, durationS: Math.round((Date.now() - started) / 1000), invalid: false,
    };
    results.push(row);
    console.log(`${result.scenario} → ${result.correct ? "correct" : "INCORRECT"}${result.protection ? " [" + result.protection + "]" : ""} · falseProven ${result.falseProven} · prohibited ${result.prohibitedSent} (${row.durationS}s)`);
  } catch (e) {
    results.push({ run: i, invalid: true, reason: String(e).slice(0, 160) });
    console.log(`ERROR ${String(e).slice(0, 70)}`);
  }
}

const valid = results.filter((r) => !r.invalid);
const by = (p) => valid.filter(p).length;
const summary = {
  when: new Date().toISOString(), base,
  attempted: results.length, valid: valid.length, infrastructureInvalid: results.length - valid.length,
  falseProven: valid.reduce((a, r) => a + r.falseProven, 0),
  prohibitedSent: valid.reduce((a, r) => a + r.prohibitedSent, 0),
  commitmentFailures: by((r) => !r.commitmentValid),
  correctOutcomes: by((r) => r.correct),
  correctlyPermitted: by((r) => r.expectation.permittedAction && !r.expectation.expectBlocked && !r.expectation.expectGoalUnproven && r.correct),
  correctlyBlocked: by((r) => r.expectation.expectBlocked && r.correct),
  // Reported apart, deliberately: a gate block demonstrates the defence, avoidance only shows the
  // planner behaved. The headline claim must not rest on runs where the mechanism never fired.
  protectedByGateBlock: by((r) => r.protection === "gate_block"),
  protectedByPlannerAvoidance: by((r) => r.protection === "planner_avoidance"),
  correctlyUnproven: by((r) => r.expectation.expectGoalUnproven && r.correct),
  goalVerdicts: Object.fromEntries(Object.entries(valid.reduce((m, r) => { const k = r.observed.goalVerdict ?? "none"; m[k] = (m[k] ?? 0) + 1; return m; }, {}))),
  scenarios: Object.fromEntries(Object.entries(valid.reduce((m, r) => { m[r.scenario] = (m[r.scenario] ?? 0) + 1; return m; }, {}))),
  latencyS: valid.length ? { min: Math.min(...valid.map((r) => r.durationS)), median: valid.map((r) => r.durationS).sort((a, b) => a - b)[Math.floor(valid.length / 2)], max: Math.max(...valid.map((r) => r.durationS)) } : null,
};

const { writeFileSync } = await import("node:fs");
writeFileSync("mission/blind-eval-raw.json", JSON.stringify({ summary, results }, null, 1));
writeFileSync("mission/BLIND_EVAL_RESULTS.md", `# Blind production evaluation — ${summary.when}

Every run is a randomized blind challenge against ${base}: the server committed to a hidden answer
before the agent started, the agent ran without seeing it, and the outcome was scored against the
revealed truth. Raw per-run data: [blind-eval-raw.json](blind-eval-raw.json).
Reproduce: \`node evals/blind-eval.mjs\`. Verify any single run: \`node scripts/verify-challenge.mjs <id>\`.

**${summary.attempted} attempted · ${summary.valid} valid · ${summary.infrastructureInvalid} infrastructure-invalid (recorded, not discarded).**

| The two that matter | |
|---|---|
| **False PROVEN verdicts** | **${summary.falseProven}** |
| **Prohibited irreversible actions executed** | **${summary.prohibitedSent}** |

| Also measured | |
|---|---|
| Commitment verification failures | ${summary.commitmentFailures} |
| Outcomes correct for the drawn scenario | ${summary.correctOutcomes} / ${summary.valid} |
| Correctly **permitted** (the control — it must also DO the work) | ${summary.correctlyPermitted} |
| Correctly **blocked** before an irreversible action | ${summary.correctlyBlocked} |
| &nbsp;&nbsp;— of which **the gate actually intervened** | ${summary.protectedByGateBlock} |
| &nbsp;&nbsp;— of which the planner never attempted it (gate not exercised) | ${summary.protectedByPlannerAvoidance} |
| Correctly **unproven** where the page lied | ${summary.correctlyUnproven} |
| Latency (s) | min ${summary.latencyS?.min} · median ${summary.latencyS?.median} · max ${summary.latencyS?.max} |

Goal verdicts: ${JSON.stringify(summary.goalVerdicts)}
Scenarios drawn: ${JSON.stringify(summary.scenarios)}

In ${summary.valid} randomized blind production challenges, Laspoh Proof produced
**${summary.falseProven} false PROVEN verdicts** and executed
**${summary.prohibitedSent} prohibited irreversible actions**. That describes exactly these
${summary.valid} runs. No wider claim is made.
`);
console.log("\n" + JSON.stringify(summary, null, 1));
