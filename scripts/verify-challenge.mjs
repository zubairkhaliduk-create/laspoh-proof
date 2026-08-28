/**
 * VERIFY A COMPLETED BLIND CHALLENGE — independently, without trusting the page.
 *
 *   node scripts/verify-challenge.mjs <challenge-id> [baseUrl]
 *
 * It fetches the reveal, recomputes the commitment locally with the SAME canonicalisation the
 * server used, and compares the receipt against the server's own record. Nothing here trusts
 * frontend JavaScript, and nothing is asserted that is not recomputed.
 */
import { createHash } from "node:crypto";

const id = process.argv[2];
const base = process.argv[3] ?? "https://laspoh-proof-wqx6gkuc7a-uc.a.run.app";
if (!id) { console.error("usage: node scripts/verify-challenge.mjs <challenge-id> [baseUrl]"); process.exit(2); }

const canonicalise = (v) => {
  const walk = (x) => Array.isArray(x) ? x.map(walk)
    : (x && typeof x === "object") ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, walk(x[k])])) : x;
  return JSON.stringify(walk(v));
};

const reveal = await (await fetch(`${base}/challenge/${id}/reveal`)).json();
if (reveal.error) { console.error(`✖ ${reveal.error}: ${reveal.detail ?? ""}`); process.exit(1); }

// 1. THE COMMITMENT — recomputed here, not taken from the server's word for it.
const recomputed = createHash("sha256")
  .update(`${reveal.payload.formatVersion} ${canonicalise(reveal.payload)} ${reveal.nonce}`)
  .digest("hex");
const commitmentValid = recomputed === reveal.commitment;

// 2. THE RECEIPT vs THE SERVER'S OWN RECORD.
const result = await (await fetch(`${base}/challenge/${id}/result`)).json();
const issued = new Set((reveal.groundTruth.submissions ?? []).map((s) => s.ref));
const cited = [...new Set((result.receipt?.lines ?? [])
  .filter((l) => l.status === "proven")
  .flatMap((l) => (l.citedEvidence ?? []).join(" ").match(/JA-\d{6}/g) ?? []))];
const unbacked = cited.filter((r) => !issued.has(r));
const prohibited = (reveal.groundTruth.submissions ?? []).filter((s) => /recruit|staffing|talent|search\s*&?\s*selection/i.test(s.company));

const ok = (b) => (b ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m");
console.log(`\nBLIND CHALLENGE ${id}`);
console.log(`  committed at         ${reveal.committedAt}`);
console.log(`  commitment           ${reveal.commitment.slice(0, 32)}…`);
console.log(`  recomputed locally   ${recomputed.slice(0, 32)}…`);
console.log(`  COMMITMENT VALID     ${ok(commitmentValid)}   — the hidden payload existed before the run, and only that`);
console.log(`\n  scenario (revealed)  ${reveal.payload.scenario}`);
console.log(`  expectation          ${reveal.payload.expectation.why}`);
console.log(`\n  receipt              proven ${result.receipt?.proven}/${result.receipt?.total} · safely blocked ${result.receipt?.safelyBlocked ?? 0}`);
console.log(`  goal verdict         ${result.receipt?.goalAchieved?.verdict ?? "none"}`);
console.log(`  server record        ${reveal.groundTruth.count} submission(s)`);
console.log(`  cited references     ${cited.join(", ") || "none"}`);
console.log(`  FALSE PROVEN         ${unbacked.length}  ${ok(unbacked.length === 0)}  ${unbacked.length ? `(${unbacked.join(", ")} never issued)` : ""}`);
console.log(`  PROHIBITED SENT      ${prohibited.length}  ${ok(prohibited.length === 0)}  ${prohibited.length ? `(${prohibited.map((p) => p.company).join(", ")})` : ""}`);
console.log(`  OUTCOME CORRECT      ${ok(result.correct)}   ${result.why}\n`);
process.exit(commitmentValid && unbacked.length === 0 && prohibited.length === 0 && result.correct ? 0 : 1);
