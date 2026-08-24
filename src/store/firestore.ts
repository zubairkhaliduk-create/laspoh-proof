/**
 * FIRESTORE — one document per mission, so a mission outlives the process that started it.
 *
 * Cloud Run already satisfies the hackathon's infrastructure requirement, so this is additive and
 * has to earn its place on merit. It does: a mission is a document with an append-only event list,
 * which is exactly the shape Firestore is good at, and persisting it removes the `max-instances 1`
 * ceiling that existed only to make in-memory state survivable.
 *
 * DEGRADATION IS DELIBERATE AND LOUD. If Firestore cannot be reached, missions must still run —
 * losing the ability to resume is bad, refusing to work at all is worse. Every fallback says so in
 * the logs, because a silent downgrade to in-memory would reintroduce the exact bug this replaces
 * while appearing to have fixed it.
 */
import { Firestore } from "@google-cloud/firestore";
import { appendBounded, type MissionEvent, type MissionRecord, type MissionStore } from "./types.js";

const COLLECTION = process.env.FIRESTORE_COLLECTION ?? "missions";

export class FirestoreStore implements MissionStore {
  readonly kind = "firestore";
  private readonly db: Firestore;

  constructor(projectId?: string) {
    this.db = new Firestore(projectId ? { projectId } : {});
  }

  private doc(id: string) {
    return this.db.collection(COLLECTION).doc(id);
  }

  async create(rec: MissionRecord): Promise<void> {
    await this.doc(rec.id).set(rec);
  }

  async get(id: string): Promise<MissionRecord | null> {
    const snap = await this.doc(id).get();
    return snap.exists ? (snap.data() as MissionRecord) : null;
  }

  async update(id: string, patch: Partial<MissionRecord>): Promise<void> {
    // `events` is stripped for the same reason as in the memory store: history is append-only, and
    // an update path that could overwrite it is a path a bug can use to erase evidence.
    const { events: _ignored, ...safe } = patch;
    await this.doc(id).set({ ...safe, updatedAt: new Date().toISOString() }, { merge: true });
  }

  async appendEvent(id: string, event: MissionEvent): Promise<void> {
    // Read-modify-write inside a transaction: two instances appending concurrently must not lose
    // an event, and arrayUnion would silently deduplicate identical events, which for a mission
    // log is data loss disguised as tidiness.
    await this.db.runTransaction(async (tx) => {
      const ref = this.doc(id);
      const snap = await tx.get(ref);
      if (!snap.exists) return;
      const next = appendBounded(snap.data() as MissionRecord, event);
      tx.set(ref, next);
    });
  }

  async findByIdempotencyKey(key: string): Promise<MissionRecord | null> {
    const q = await this.db.collection(COLLECTION).where("idempotencyKey", "==", key).limit(1).get();
    return q.empty ? null : (q.docs[0]!.data() as MissionRecord);
  }
}

/**
 * Choose a store. Firestore only when explicitly asked for, so the default clone-and-run path
 * needs no cloud at all — and a failure to construct it degrades to memory rather than to nothing.
 */
export async function selectStore(): Promise<MissionStore> {
  const { InMemoryStore } = await import("./memory.js");
  if (process.env.MISSION_STORE !== "firestore") return new InMemoryStore();
  try {
    const store = new FirestoreStore(process.env.VERTEX_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || undefined);
    // Prove it before trusting it. A store that cannot answer a read is not a store, and finding
    // that out on the first mission is finding out too late.
    //
    // The id must NOT be of the form __x__: Firestore reserves those, and the probe then fails with
    // INVALID_ARGUMENT on a perfectly healthy database — a health check that reports the patient
    // dead because it took the temperature wrong. (It did exactly that on first deploy; the loud
    // fallback is the only reason it took seconds rather than a mission to find.)
    await store.get("connectivity-probe");
    console.log("[laspoh-proof] mission store: firestore");
    return store;
  } catch (e) {
    console.error("[laspoh-proof] firestore unavailable — falling back to in-memory (missions will NOT survive a restart):", String(e).slice(0, 300));
    return new InMemoryStore();
  }
}
