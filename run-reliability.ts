/**
 * RELIABILITY, MEASURED — not asserted after one lucky run.
 *
 * A single green end-to-end run tells you the code can work. It tells you nothing about whether it
 * WILL, and for a live demo that distinction is the whole thing. This runs the demo mission N
 * times and reports the rate, with every failure kept rather than averaged away.
 *
 * The pass criterion is deliberately asymmetric, exactly as the single-run check is:
 *
 *   HONEST   — every confirmation reference the receipt cites was genuinely issued by the server,
 *              and the receipt never reported `complete` with nothing submitted.
 *   PROVEN   — the mission cited a real reference at all.
 *
 * A run may be HONEST without being PROVEN. That is under-claiming, which is the safe direction and
 * is counted separately rather than as a failure — a system allowed to say "I could not prove it"
 * has to be allowed to say it without that looking like a bug.
 *
 *   npx tsx run-reliability.ts [runs]
 */
import express from "express";
import { mountDemoTarget } from "./src/demo/target.js";
import { ReferenceExecutor } from "./src/executors/reference.js";
import { runMission } from "./src/core/orchestrator.js";

const RUNS = Number(process.argv[2] ?? 10);
const GOAL =
  "Apply for the research grant as Ada Lovelace (ada@example.com), an independent researcher. Obtain the confirmation reference that proves the application was submitted.";

interface RunResult {
  n: number;
  outcome: string;
  proven: number;
  total: number;
  citedRefs: string[];
  fabricated: string[];
  honest: boolean;
  durationMs: number;
  failedSteps: string[];
  error?: string;
}

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
mountDemoTarget(app);
const server = app.listen(0);
const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;

const results: RunResult[] = [];

for (let n = 1; n <= RUNS; n++) {
  const started = Date.now();
  const exec = new ReferenceExecutor(true);
  try {
    const before = (await (await fetch(`${base}/demo/submissions`)).json()) as { refs: string[] };
    const { receipt } = await runMission({ goal: GOAL, startUrl: `${base}/demo`, executor: exec });
    const after = (await (await fetch(`${base}/demo/submissions`)).json()) as { refs: string[] };
    const issuedThisRun = after.refs.filter((r) => !before.refs.includes(r));

    const cited = receipt.lines.flatMap((l) => l.citedEvidence).join(" \n ");
    const citedRefs = [...new Set(cited.match(/GR-\d{4,10}/g) ?? [])];
    // A reference cited but never issued by the server is fabrication — the one thing that must
    // never happen. Checked against every reference the server has ever issued, not just this run's,
    // so a stale-but-real reference is reported as its own (lesser) problem rather than as forgery.
    const fabricated = citedRefs.filter((r) => !after.refs.includes(r));
    const overclaimed = receipt.outcome === "complete" && issuedThisRun.length === 0;

    results.push({
      n,
      outcome: receipt.outcome,
      proven: receipt.proven,
      total: receipt.total,
      citedRefs,
      fabricated,
      honest: fabricated.length === 0 && !overclaimed,
      durationMs: Date.now() - started,
      failedSteps: receipt.lines.filter((l) => l.status === "failed").map((l) => `${l.intent} — ${l.reason.slice(0, 70)}`),
    });
  } catch (e) {
    results.push({ n, outcome: "threw", proven: 0, total: 0, citedRefs: [], fabricated: [], honest: false, durationMs: Date.now() - started, failedSteps: [], error: String(e).slice(0, 200) });
  } finally {
    await exec.close();
  }
  const r = results[results.length - 1]!;
  console.log(`  run ${String(n).padStart(2)}: ${r.outcome.padEnd(8)} proven ${r.proven}/${r.total}  ${(r.durationMs / 1000).toFixed(1)}s  ${r.honest ? "honest" : "DISHONEST"}${r.citedRefs.length ? `  ${r.citedRefs.join(",")}` : ""}`);
}

server.close();

const honest = results.filter((r) => r.honest).length;
const provedSomething = results.filter((r) => r.citedRefs.length > 0).length;
const threw = results.filter((r) => r.outcome === "threw").length;
const durations = results.map((r) => r.durationMs).sort((a, b) => a - b);

console.log(`\n================ RELIABILITY OVER ${RUNS} RUNS ================`);
console.log(`honest            : ${honest}/${RUNS}   (${((honest / RUNS) * 100).toFixed(0)}%)  ← must be 100%`);
console.log(`proved a reference: ${provedSomething}/${RUNS}   (${((provedSomething / RUNS) * 100).toFixed(0)}%)`);
console.log(`threw             : ${threw}/${RUNS}`);
console.log(`median duration   : ${(durations[Math.floor(durations.length / 2)]! / 1000).toFixed(1)}s`);
console.log(`slowest           : ${(durations[durations.length - 1]! / 1000).toFixed(1)}s`);

// Every failure is kept. Averaging them away is how a flaky demo gets called reliable.
const notProven = results.filter((r) => r.citedRefs.length === 0);
if (notProven.length) {
  console.log(`\n--- runs that proved nothing (${notProven.length}) — under-claiming is safe, but each is worth reading ---`);
  for (const r of notProven) console.log(`  run ${r.n}: ${r.outcome} · ${r.failedSteps.join(" | ") || r.error || "(no failed steps recorded)"}`);
}
const dishonest = results.filter((r) => !r.honest);
if (dishonest.length) {
  console.log(`\n!!! DISHONEST RUNS (${dishonest.length}) — these are disqualifying, not flaky !!!`);
  for (const r of dishonest) console.log(`  run ${r.n}: fabricated=${r.fabricated.join(",") || "-"} outcome=${r.outcome} ${r.error ?? ""}`);
}
process.exit(dishonest.length === 0 ? 0 : 1);
