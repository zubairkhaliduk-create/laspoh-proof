# PHASE 05 — Persistent State & Checkpointing

**Status:** IN_PROGRESS → see completion report

---

## 1. Current verified state

    src/server.ts:  const missions = new Map<string, Record_>()

Mission state lives in a process-local `Map`. Consequences, all observed rather than theorised:

- A mission started before a deploy **completes on the old revision** while the new revision
  answers `404` for it. Recorded in Phase 01 evidence; it cost an hour of misdiagnosis, because a
  lost mission looks exactly like a crashed one.
- `--max-instances 1` exists *only* to make in-memory state survivable. That is a scaling ceiling
  imposed by a data-model decision.
- A container restart loses every in-flight mission with no trace.

## 2. Objective

A mission must survive the process that started it. Success means a mission can be started,
the server restarted, and the mission's state and receipt still retrievable — demonstrated by a
test that actually destroys and rebuilds the store, not one that mocks it.

## 3. Why this phase exists

**Judging (30% architecture):** "strong state management", "checkpoint resume" and "state must
survive reality" are explicit. In-memory state is the default a judge expects to find and is
unimpressed by.

**Judging (30% production readiness):** a hosted service a judge can poll after a cold start is
strictly better than one where a scale-to-zero event loses their mission.

**Requirement T3:** Firestore is a listed qualifying Google Cloud infrastructure product. Cloud Run
already satisfies T3, so Firestore is **additive and must earn its place on merit** — the merit
being that a document store with per-mission documents is the natural shape for this data, and it
removes the `max-instances 1` ceiling.

## 4. Exact scope

1. A `MissionStore` interface: the only thing the server knows about persistence.
2. `InMemoryStore` — the current behaviour, made explicit and testable.
3. `FirestoreStore` — durable, selected by environment.
4. An append-only event log per mission (receipts and judging evidence both need history).
5. Idempotency: starting the same logical mission twice must not duplicate work.

## 5. Explicit non-scope

- No change to orchestration, verification or receipts.
- No migration tooling — there is no existing persisted data.
- **Firestore is not made mandatory.** The default path must keep working with no GCP at all, or
  a judge cloning the repo cannot run anything.

## 6. Protected functionality

`/health`, `POST /missions`, `GET /missions/:id`, `GET /missions/:id/receipt` keep their shapes.
65 tests stay green. Running with no configuration must behave exactly as today.

## 7. Data contracts

    interface MissionStore {
      create(rec: MissionRecord): Promise<void>;
      get(id: string): Promise<MissionRecord | null>;
      update(id, patch: Partial<MissionRecord>): Promise<void>;
      appendEvent(id: string, event: MissionEvent): Promise<void>;
      findByIdempotencyKey(key: string): Promise<MissionRecord | null>;
    }

`appendEvent` is separate from `update` on purpose: events are **append-only**, and an interface
that allowed rewriting history would let a bug quietly erase the evidence trail the receipt is
built from.

## 8. Idempotency

`POST /missions` accepts an optional `idempotencyKey`. Re-posting with the same key returns the
**existing** mission rather than starting a second one. This is the difference between "the
browser retried" and "the agent applied for the same job twice", and the second is not recoverable
by apologising.

## 9. Security requirements

- No secrets in mission documents. Goals are user text and are stored; credentials never are.
- Firestore is reached with the service's own identity — no key material.
- The runtime service account needs `roles/datastore.user` **added**, which is a deliberate,
  recorded privilege increase, not an accident.

## 10. Failure modes

| Scenario | Required behaviour |
|---|---|
| Firestore unreachable at boot | Fall back to in-memory, log loudly, keep serving |
| Firestore unreachable mid-mission | The mission continues; persistence failures never kill work |
| Two instances serve the same mission | Both read the same document; last write wins on state, events append |
| Same idempotency key twice | Second call returns the first mission |
| Document exceeds Firestore's 1 MiB limit | Events are capped and the cap is reported, never silently dropped |

That last row matters: a long mission produces a lot of events, and a store that silently stops
recording is a store that lies about what happened.

## 11. Tests

- The store contract, run against the in-memory implementation
- Append-only: events accumulate, and no interface path rewrites them
- Idempotency: same key returns the same mission
- Restart: state written, store instance discarded and rebuilt, state still present
- Event cap: overflow is reported rather than dropped silently

## 12. Acceptance criteria

- [ ] `MissionStore` is the only persistence surface the server touches
- [ ] Default path works with no GCP configuration
- [ ] Restart test passes by genuinely discarding the store instance
- [ ] Idempotent mission creation proven
- [ ] All prior tests green

## 13. Rollback

The store is injected. Reverting to the `Map` is deleting one module and one line in the server.

## 14. Evidence required

Test output including the restart and idempotency cases; commit SHA. Firestore itself is
**unverified until deployment** (UA-004) and must be recorded as such rather than claimed.
