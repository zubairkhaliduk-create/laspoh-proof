/**
 * LASPOH ADAPTER — DISCLOSED PRE-EXISTING WORK.
 *
 * ┌────────────────────────────────────────────────────────────────────────────────────────┐
 * │ DISCLOSURE. Laspoh is a pre-existing experimental browser-automation platform whose     │
 * │ repository dates from June 2026 — before this hackathon's submission period. It is NOT  │
 * │ presented as work created during the hackathon.                                         │
 * │                                                                                         │
 * │ THIS FILE is new: it is a thin adapter that exposes that platform through the same      │
 * │ Executor interface the reference executor implements, so the agent above can drive      │
 * │ either without knowing the difference. The adapter is ~100 lines and contains no        │
 * │ automation logic of its own — the browser work happens inside the pre-existing runtime. │
 * │                                                                                         │
 * │ Every receipt produced through this executor carries preExisting: true, so the          │
 * │ provenance of a result is structural rather than a footnote someone might miss.         │
 * └────────────────────────────────────────────────────────────────────────────────────────┘
 *
 * Why it exists at all: it is the proof that the agent is not welded to one actuation layer.
 * Two executors, one interface, same agent — the separation is demonstrated rather than claimed.
 * It also preserves the property that matters in the real product: actions run in the user's own
 * already-authenticated browser, which a cloud browser cannot do.
 */
import type { Action, Executor, Observation } from "./types.js";

/** Where the pre-existing runtime is reachable. It exposes a single execute endpoint; this adapter
 *  neither knows nor cares how the work is performed on the other side. */
const DEFAULT_BRIDGE = process.env.LASPOH_BRIDGE_URL ?? "http://127.0.0.1:8848";

export class LaspohExecutor implements Executor {
  readonly name = "laspoh";
  /** Structural disclosure — carried onto every receipt. */
  readonly preExisting = true;

  constructor(private readonly bridgeUrl: string = DEFAULT_BRIDGE, private readonly timeoutMs = 30_000) {}

  async execute(action: Action): Promise<Observation> {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.bridgeUrl}/execute`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
        signal: ctl.signal,
      });
      if (!res.ok) {
        return { ok: false, failure: "transport", detail: `bridge returned HTTP ${res.status}`, pageText: "", url: "", outstandingRequired: [], formState: [], identifiers: [] };
      }
      const raw = (await res.json()) as Partial<Observation>;
      // Normalise defensively: an adapter must never let a malformed reply masquerade as success.
      return {
        ok: Boolean(raw.ok),
        failure: (raw.failure ?? null) as Observation["failure"],
        detail: String(raw.detail ?? ""),
        pageText: String(raw.pageText ?? ""),
        url: String(raw.url ?? ""),
        outstandingRequired: Array.isArray(raw.outstandingRequired) ? raw.outstandingRequired.map(String) : [],
        formState: Array.isArray(raw.formState) ? raw.formState.map(String) : [],
        identifiers: Array.isArray(raw.identifiers) ? raw.identifiers.map(String) : [],
      };
    } catch (e) {
      const aborted = (e as Error)?.name === "AbortError";
      return {
        ok: false,
        failure: "transport",
        detail: aborted ? `the Laspoh bridge did not respond within ${this.timeoutMs}ms` : `bridge unreachable at ${this.bridgeUrl}: ${String(e).slice(0, 160)}`,
        pageText: "", url: "", outstandingRequired: [], formState: [], identifiers: [],
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
