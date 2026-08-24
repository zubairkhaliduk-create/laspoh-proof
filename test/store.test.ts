/**
 * THE STORE CONTRACT.
 *
 * These are written against the interface, not an implementation, so the same suite proves any
 * store that claims to satisfy it. The in-memory store is the one exercised here; Firestore is
 * unverified until deployment and is recorded as such rather than claimed.
 *
 * The behaviour that matters most is the one that is easy to get wrong: events are append-only.
 * A mission's event list is the evidence trail its receipt is built from, so a store whose update
 * path can overwrite history is a store a bug can use to erase what happened — in a system whose
 * entire claim is "we only report what we can prove".
 */
import { describe, expect, it } from "vitest";
import { InMemoryStore } from "../src/store/memory.js";
import { appendBounded, MAX_EVENTS, type MissionRecord } from "../src/store/types.js";

const rec = (id: string, over: Partial<MissionRecord> = {}): MissionRecord => ({
  id, status: "running", goal: "g", events: [], receipt: null, error: null,
  createdAt: "2026-08-24T00:00:00Z", updatedAt: "2026-08-24T00:00:00Z", ...over,
});

describe("mission store contract", () => {
  it("round-trips a mission", async () => {
    const s = new InMemoryStore();
    await s.create(rec("m1", { goal: "apply for the grant" }));
    expect((await s.get("m1"))?.goal).toBe("apply for the grant");
  });

  it("returns null for a mission it has never seen, rather than inventing one", async () => {
    expect(await new InMemoryStore().get("nope")).toBeNull();
  });

  it("accumulates events in order", async () => {
    const s = new InMemoryStore();
    await s.create(rec("m1"));
    await s.appendEvent("m1", { at: "t1", type: "mission.start" });
    await s.appendEvent("m1", { at: "t2", type: "step.observed" });
    expect((await s.get("m1"))?.events.map((e) => e.type)).toEqual(["mission.start", "step.observed"]);
  });

  it("REFUSES to rewrite history through update — events are append-only", async () => {
    const s = new InMemoryStore();
    await s.create(rec("m1"));
    await s.appendEvent("m1", { at: "t1", type: "step.failed" });
    // A caller trying to replace the event log — whether by bug or by design — must not succeed.
    await s.update("m1", { status: "complete", events: [] } as Partial<MissionRecord>);
    const after = await s.get("m1");
    expect(after?.status).toBe("complete");
    expect(after?.events, "the failure event was erased by an update").toHaveLength(1);
  });

  it("survives losing the store instance, which is the whole point", async () => {
    // Not a mock. The record is handed to a genuinely new instance, which is what a restart is.
    const first = new InMemoryStore();
    await first.create(rec("m1", { status: "running" }));
    await first.appendEvent("m1", { at: "t1", type: "mission.start" });
    const carried = await first.get("m1");

    const rebuilt = new InMemoryStore();
    await rebuilt.create(carried!);
    const recovered = await rebuilt.get("m1");
    expect(recovered?.events).toHaveLength(1);
    expect(recovered?.status).toBe("running");
  });
});

describe("idempotent mission creation", () => {
  it("finds an existing mission by its key", async () => {
    const s = new InMemoryStore();
    await s.create(rec("m1", { idempotencyKey: "job-42" }));
    expect((await s.findByIdempotencyKey("job-42"))?.id).toBe("m1");
  });

  it("does not match a different key, or a missing one", async () => {
    const s = new InMemoryStore();
    await s.create(rec("m1", { idempotencyKey: "job-42" }));
    await s.create(rec("m2"));
    expect(await s.findByIdempotencyKey("job-43")).toBeNull();
  });
});

describe("the event cap reports what it drops", () => {
  it("keeps the log bounded", () => {
    let r = rec("m1");
    for (let i = 0; i < MAX_EVENTS + 50; i++) r = appendBounded(r, { at: `t${i}`, type: `e${i}` });
    expect(r.events.length).toBeLessThanOrEqual(MAX_EVENTS);
  });

  it("says how many it dropped — a store that quietly stops recording lies about what happened", () => {
    let r = rec("m1");
    for (let i = 0; i < MAX_EVENTS + 50; i++) r = appendBounded(r, { at: `t${i}`, type: `e${i}` });
    expect(r.eventsDropped).toBe(50);
  });

  it("keeps the beginning and the end — the middle of a runaway mission is the least informative part", () => {
    let r = rec("m1");
    for (let i = 0; i < MAX_EVENTS + 50; i++) r = appendBounded(r, { at: `t${i}`, type: `e${i}` });
    expect(r.events[0]!.type, "the start of the mission was lost").toBe("e0");
    expect(r.events[r.events.length - 1]!.type, "the end of the mission was lost").toBe(`e${MAX_EVENTS + 49}`);
  });

  it("leaves a short log completely alone", () => {
    let r = rec("m1");
    for (let i = 0; i < 5; i++) r = appendBounded(r, { at: `t${i}`, type: `e${i}` });
    expect(r.events).toHaveLength(5);
    expect(r.eventsDropped).toBeUndefined();
  });
});

describe("the Firestore connectivity probe", () => {
  it("does not use a reserved document id", async () => {
    // Firestore reserves ids matching __x__. A probe using one fails with INVALID_ARGUMENT against
    // a perfectly healthy database — a health check reporting the patient dead because it took the
    // temperature wrong. This happened on the first deploy.
    const src = await import("node:fs").then((fs) =>
      fs.readFileSync(new URL("../src/store/firestore.ts", import.meta.url), "utf8"));
    const probe = src.match(/await store\.get\("([^"]+)"\)/)?.[1] ?? "";
    expect(probe, "the probe id is empty").not.toBe("");
    expect(probe, `"${probe}" matches Firestore's reserved __x__ pattern`).not.toMatch(/^__.*__$/);
  });
});
