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
import { mountDemoTarget } from "./demo/target.js";
import { selectStore } from "./store/firestore.js";
import type { MissionRecord, MissionStore } from "./store/types.js";
import { missionLogger } from "./obs/log.js";

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

// Persistence lives behind one interface (see src/store). The server does not know whether a
// mission is in a Map or in Firestore, which is what lets the default clone-and-run path need no
// cloud at all while the deployed service survives a restart.
const store: MissionStore = await selectStore();

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
    store: store.kind,
  });
});

app.post("/missions", async (req, res) => {
  const goal = String(req.body?.goal ?? "").trim();
  if (!goal) return res.status(400).json({ error: "goal is required" });

  // IDEMPOTENCY. The difference between "the browser retried the request" and "the agent applied
  // for the same job twice" is one header, and only one of those is recoverable by apologising.
  const idempotencyKey = String(req.body?.idempotencyKey ?? req.get("idempotency-key") ?? "").trim();
  if (idempotencyKey) {
    const existing = await store.findByIdempotencyKey(idempotencyKey);
    if (existing) return res.status(200).json({ id: existing.id, status: existing.status, poll: `/missions/${existing.id}`, deduplicated: true });
  }

  const id = `m_${randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  const rec: MissionRecord = { id, status: "running", goal, events: [], receipt: null, error: null, createdAt: now, updatedAt: now, ...(idempotencyKey ? { idempotencyKey } : {}) };
  await store.create(rec);

  const log = missionLogger(id);
  log("INFO", "mission.accepted", { goal, executor: req.body?.executor ?? "reference" });
  const executor = pickExecutor(req.body?.executor);
  // Fire and forget: the mission outlives the request, which is the point.
  void (async () => {
    try {
      const { receipt } = await runMission({
        goal,
        startUrl: req.body?.startUrl,
        executor,
        maxSteps: Number(req.body?.maxSteps ?? 24),
        // Persisting an event must never be able to kill the mission producing it.
        onEvent: (e) => {
          void store.appendEvent(id, { at: new Date().toISOString(), ...e } as never).catch(() => {});
          // Same event, two destinations: the durable record the receipt is built from, and a
          // structured log line Cloud Logging can filter by missionId. Redaction is applied by the
          // logger, not by this call site.
          const sev = String(e.type).includes("fail") || String(e.type).includes("refused") ? "WARNING" : "INFO";
          log(sev as "INFO" | "WARNING", String(e.type), e as Record<string, unknown>);
        },
      });
      await store.update(id, { receipt, status: receipt.outcome });
      log("INFO", "mission.finished", { outcome: receipt.outcome, proven: receipt.proven, total: receipt.total, durationMs: receipt.durationMs });
    } catch (e) {
      await store.update(id, { status: "error", error: String(e).slice(0, 500) }).catch(() => {});
      log("ERROR", "mission.threw", { error: String(e).slice(0, 400) });
    } finally {
      await executor.close?.().catch(() => {});
    }
  })();

  res.status(202).json({ id, status: "running", poll: `/missions/${id}` });
});

app.get("/missions/:id", async (req, res) => {
  const rec = await store.get(String(req.params.id));
  if (!rec) return res.status(404).json({ error: "no such mission" });
  res.json(rec);
});

app.get("/missions/:id/receipt", async (req, res) => {
  const rec = await store.get(String(req.params.id));
  if (!rec) return res.status(404).json({ error: "no such mission" });
  if (!rec.receipt) return res.status(409).json({ error: "mission has not produced a receipt yet", status: rec.status });
  res.json(rec.receipt);
});

const port = Number(process.env.PORT ?? 8080);
app.listen(port, () => console.log(`[laspoh-proof] listening on ${port} · model ${JSON.stringify(modelIdentity())}`));
