/**
 * THE PERSISTENCE SEAM.
 *
 * Mission state lived in a process-local Map, and the cost of that was not theoretical. A mission
 * started before a deploy completed on the OLD revision while the new one answered 404 for it —
 * which looks exactly like a crash, and was misdiagnosed as one. `--max-instances 1` exists solely
 * to make in-memory state survivable, so a data-model decision became a scaling ceiling.
 *
 * The interface is deliberately narrow, and `appendEvent` is deliberately separate from `update`.
 * Events are the evidence trail a receipt is built from; an interface that allowed rewriting them
 * would let a bug quietly erase history, and a system whose central claim is "we only report what
 * we can prove" cannot have a mutable record of what happened.
 */
import type { Receipt } from "../core/receipt.js";

export interface MissionEvent {
  at: string;
  type: string;
  [k: string]: unknown;
}

export interface MissionRecord {
  id: string;
  status: string;
  goal: string;
  events: MissionEvent[];
  receipt: Receipt | null;
  error: string | null;
  /** Set when the caller supplied one. Two POSTs with the same key are the same mission. */
  idempotencyKey?: string;
  createdAt: string;
  updatedAt: string;
  /** How many events were dropped by the cap. Reported rather than silent — a store that quietly
   *  stops recording is a store that lies about what happened. */
  eventsDropped?: number;
}

export interface MissionStore {
  readonly kind: string;
  create(rec: MissionRecord): Promise<void>;
  get(id: string): Promise<MissionRecord | null>;
  update(id: string, patch: Partial<MissionRecord>): Promise<void>;
  appendEvent(id: string, event: MissionEvent): Promise<void>;
  findByIdempotencyKey(key: string): Promise<MissionRecord | null>;
}

/** Firestore documents are capped at 1 MiB. A long mission produces a lot of events, so the cap is
 *  enforced here rather than discovered there — and the overflow count is kept. */
export const MAX_EVENTS = 400;

export function appendBounded(rec: MissionRecord, event: MissionEvent): MissionRecord {
  const events = [...rec.events, event];
  if (events.length <= MAX_EVENTS) return { ...rec, events, updatedAt: new Date().toISOString() };
  // Keep the OLDEST events and the most recent ones: the beginning explains what the mission set
  // out to do, the end explains how it finished. The middle of a runaway mission is the least
  // informative part of it.
  const keepHead = Math.floor(MAX_EVENTS / 4);
  const keepTail = MAX_EVENTS - keepHead;
  return {
    ...rec,
    events: [...events.slice(0, keepHead), ...events.slice(-keepTail)],
    eventsDropped: (rec.eventsDropped ?? 0) + (events.length - MAX_EVENTS),
    updatedAt: new Date().toISOString(),
  };
}
