/**
 * THE SERVICE — Cloud Run entrypoint.
 *
 * Missions are long-running, so POST /missions accepts the goal, returns immediately with an id,
 * and the work continues in the background. That is the asynchronous behaviour the agent is meant
 * to have: the caller does not hold a connection open while a browser is driven for two minutes.
 * GET /missions/:id returns the live state; GET /missions/:id/receipt returns the proof.
 */
import express from "express";
import { randomUUID } from "node:crypto";
import { ReferenceExecutor } from "./executors/reference.js";
import { LaspohExecutor } from "./executors/laspoh.js";
import type { Executor } from "./executors/types.js";
import { runMission } from "./core/orchestrator.js";
import { modelIdentity } from "./genkit.js";
import type { Receipt } from "./core/receipt.js";
import { mountDemoTarget } from "./demo/target.js";

// A mission runs AFTER its response has been sent, so any rejection it leaks has no request left to
// fail — under Node's default it takes the whole process down instead. The service then restarts
// with an empty mission map and answers "no such mission" for work it was really running, which is
// precisely the silent failure this project exists to argue against. Log it, keep serving.
process.on("unhandledRejection", (reason) => {
  console.error("[laspoh-proof] unhandled rejection in background work:", String(reason).slice(0, 500));
});
process.on("uncaughtException", (err) => {
  console.error("[laspoh-proof] uncaught exception:", err?.stack ?? String(err));
});

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// The demo target the agent is pointed at. Self-hosted so the demo is reproducible by a judge
// and cannot be broken by a third party changing their site.
mountDemoTarget(app);

type Record_ = { id: string; status: string; goal: string; events: unknown[]; receipt: Receipt | null; error: string | null };
const missions = new Map<string, Record_>();

function pickExecutor(name?: string): Executor {
  return name === "laspoh" ? new LaspohExecutor() : new ReferenceExecutor(process.env.HEADFUL !== "1");
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "laspoh-proof",
    model: modelIdentity(),
    executors: [
      { name: "reference", preExisting: false },
      { name: "laspoh", preExisting: true, note: "disclosed pre-existing browser runtime (June 2026), reached over a bridge" },
    ],
    missions: missions.size,
  });
});

app.post("/missions", (req, res) => {
  const goal = String(req.body?.goal ?? "").trim();
  if (!goal) return res.status(400).json({ error: "goal is required" });
  const id = `m_${randomUUID().slice(0, 8)}`;
  const rec: Record_ = { id, status: "running", goal, events: [], receipt: null, error: null };
  missions.set(id, rec);

  const executor = pickExecutor(req.body?.executor);
  // Fire and forget: the mission outlives the request, which is the point.
  void (async () => {
    try {
      const { receipt } = await runMission({
        goal,
        startUrl: req.body?.startUrl,
        executor,
        maxSteps: Number(req.body?.maxSteps ?? 24),
        onEvent: (e) => rec.events.push({ at: new Date().toISOString(), ...e }),
      });
      rec.receipt = receipt;
      rec.status = receipt.outcome;
    } catch (e) {
      rec.status = "error";
      rec.error = String(e).slice(0, 500);
      console.error(`[laspoh-proof] mission ${id} failed:`, (e as Error)?.stack ?? String(e));
    } finally {
      await executor.close?.().catch(() => {});
    }
  })();

  res.status(202).json({ id, status: "running", poll: `/missions/${id}` });
});

app.get("/missions/:id", (req, res) => {
  const rec = missions.get(String(req.params.id));
  if (!rec) return res.status(404).json({ error: "no such mission" });
  res.json(rec);
});

app.get("/missions/:id/receipt", (req, res) => {
  const rec = missions.get(String(req.params.id));
  if (!rec) return res.status(404).json({ error: "no such mission" });
  if (!rec.receipt) return res.status(409).json({ error: "mission has not produced a receipt yet", status: rec.status });
  res.json(rec.receipt);
});

const port = Number(process.env.PORT ?? 8080);
app.listen(port, () => console.log(`[laspoh-proof] listening on ${port} · model ${JSON.stringify(modelIdentity())}`));
