/**
 * CHALLENGE PERSISTENCE — because "verify it yourself" has to survive a restart.
 *
 * Challenge records lived in process memory. Cloud Run scales to zero and recycles instances, so
 * a judge who ran a blind challenge, wrote down the id, and came back an hour later got
 * "no such challenge" — and the commitment they were invited to check was gone with it. A proof
 * you cannot re-examine later is not much of a proof.
 *
 * One document per challenge, mirroring the mission store. Degradation is deliberate and loud, for
 * the same reason it is there: if Firestore cannot be reached the challenge still runs from memory
 * and says so, because losing durable verification is bad and refusing to run at all is worse.
 */
import { Firestore } from "@google-cloud/firestore";
import type { ChallengeRecord } from "./server.js";

const COLLECTION = process.env.FIRESTORE_CHALLENGES ?? "challenges";
let db: Firestore | null = null;

function client(): Firestore | null {
  if (process.env.MISSION_STORE !== "firestore") return null;
  if (!db) { try { db = new Firestore(); } catch { return null; } }
  return db;
}

export async function saveChallenge(c: ChallengeRecord): Promise<void> {
  const fs = client();
  if (!fs) return;
  try {
    await fs.collection(COLLECTION).doc(c.id).set(JSON.parse(JSON.stringify(c)) as Record<string, unknown>);
  } catch (e) {
    console.log(`[challenge] persist failed for ${c.id}, continuing in memory: ${String(e).slice(0, 120)}`);
  }
}

export async function loadChallenge(id: string): Promise<ChallengeRecord | null> {
  const fs = client();
  if (!fs) return null;
  try {
    const snap = await fs.collection(COLLECTION).doc(id).get();
    return snap.exists ? (snap.data() as ChallengeRecord) : null;
  } catch {
    return null;
  }
}
