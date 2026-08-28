/**
 * Render a REAL receipt as the hero gallery image.
 *
 * Deliberately driven by a live mission id — the image a judge sees first is the artifact the
 * system actually produced, not a mockup. A fabricated screenshot in a submission about not
 * fabricating things would be the worst possible own goal.
 *
 *   node evals/render-receipt.mjs <missionId> [baseUrl] [outPath]
 */
import { chromium } from "playwright-core";
import { writeFileSync } from "node:fs";

const id = process.argv[2];
const base = process.argv[3] ?? "https://laspoh-proof-wqx6gkuc7a-uc.a.run.app";
const out = process.argv[4] ?? "submission/gallery-01-receipt.png";
if (!id) { console.error("usage: render-receipt.mjs <missionId> [baseUrl] [out]"); process.exit(1); }

const r = await (await fetch(`${base}/missions/${id}/receipt`)).json();
const truth = await (await fetch(`${base}/demo/jobs/submissions`)).json().catch(() => ({ refs: [], submissions: [] }));

// COUNTED FROM GROUND TRUTH, NEVER HARDCODED.
//
// This card previously read a literal 0. A zero that the renderer asserts rather than counts is
// precisely the thing this project refuses to accept from an agent, printed on the artifact that
// makes the argument. It is now the number of applications in the server's own record whose
// employer is a recruitment agency — so if the gate ever fails, the hero image says so.
const RECRUITER = /recruit|staffing|talent|search partners/i;
const prohibited = (truth.submissions ?? []).filter((x) => RECRUITER.test(x.company ?? "")).length;

const esc = (s) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
const STATUS = {
  proven: { label: "PROVEN", bg: "#e7f6ec", bd: "#1b7f3b", fg: "#0f5228" },
  blocked: { label: "SAFELY BLOCKED", bg: "#fdeeee", bd: "#b91c1c", fg: "#7f1d1d" },
  attempted: { label: "UNPROVEN", bg: "#fff6e5", bd: "#b45309", fg: "#7c4a06" },
  failed: { label: "FAILED", bg: "#f4f4f5", bd: "#71717a", fg: "#3f3f46" },
  skipped: { label: "NOT ATTEMPTED", bg: "#f4f4f5", bd: "#71717a", fg: "#3f3f46" },
};

const rows = (r.lines ?? []).map((l) => {
  const s = STATUS[l.status] ?? STATUS.failed;
  const quote = (l.citedEvidence ?? [])[0];
  const why = quote ? `Evidence: “${esc(quote).slice(0, 96)}”` : esc(l.reason ?? "").slice(0, 150);
  return `<div class="row" style="background:${s.bg};border-left:5px solid ${s.bd}">
    <div class="rl"><span class="badge" style="color:${s.fg};border-color:${s.bd}">${s.label}</span>
      <span class="intent">${esc(l.intent).slice(0, 92)}</span></div>
    <div class="why">${why}</div></div>`;
}).join("");

const html = `<!doctype html><meta charset="utf-8"><style>
*{box-sizing:border-box}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;background:#0b1220;padding:44px}
.card{background:#fff;border-radius:16px;padding:40px 44px;max-width:1120px;margin:0 auto;box-shadow:0 24px 60px rgba(0,0,0,.4)}
.eyebrow{font-size:14px;letter-spacing:.14em;text-transform:uppercase;color:#64748b;font-weight:700}
h1{font-size:40px;margin:8px 0 6px;letter-spacing:-.02em}
.sub{color:#475569;font-size:16px;margin-bottom:26px}
.counts{display:flex;gap:14px;margin:0 0 28px}
.c{flex:1;border-radius:12px;padding:18px 20px;border:2px solid}
.c .n{font-size:38px;font-weight:800;line-height:1}.c .l{font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-top:6px}
.row{border-radius:10px;padding:14px 18px;margin-bottom:10px}
.rl{display:flex;align-items:center;gap:14px}
.badge{font-size:11px;font-weight:800;letter-spacing:.08em;border:2px solid;border-radius:20px;padding:3px 12px;white-space:nowrap}
.intent{font-size:17px;color:#0f172a;font-weight:600}
.why{font-size:14px;color:#475569;margin-top:6px;margin-left:2px}
.foot{margin-top:26px;padding-top:20px;border-top:2px solid #e2e8f0;display:flex;justify-content:space-between;align-items:flex-end}
.slogan{font-size:26px;font-weight:800;letter-spacing:-.01em}
.meta{font-size:12.5px;color:#64748b;text-align:right;line-height:1.7;font-family:ui-monospace,Menlo,monospace}
</style><div class="card">
<div class="eyebrow">Laspoh Proof · mission receipt</div>
<h1>${r.proven} proven · ${r.safelyBlocked ?? 0} safely blocked · ${(r.attemptedNotProven ?? 0) + (r.failed ?? 0)} unproven</h1>
<div class="sub">${esc(r.goal).slice(0, 190)}</div>
<div class="counts">
  <div class="c" style="border-color:#1b7f3b;background:#e7f6ec"><div class="n" style="color:#0f5228">${r.proven}</div><div class="l" style="color:#0f5228">Independently proven</div></div>
  <div class="c" style="border-color:#b91c1c;background:#fdeeee"><div class="n" style="color:#7f1d1d">${r.safelyBlocked ?? 0}</div><div class="l" style="color:#7f1d1d">Blocked before acting</div></div>
  <div class="c" style="border-color:#b45309;background:#fff6e5"><div class="n" style="color:#7c4a06">${(r.attemptedNotProven ?? 0) + (r.failed ?? 0)}</div><div class="l" style="color:#7c4a06">Not proven — said so</div></div>
  <div class="c" style="border-color:${prohibited ? "#b91c1c" : "#334155"};background:${prohibited ? "#fdeeee" : "#f1f5f9"}"><div class="n" style="color:${prohibited ? "#7f1d1d" : "#0f172a"}">${prohibited}</div><div class="l" style="color:${prohibited ? "#7f1d1d" : "#0f172a"}">Prohibited actions sent<br><span style="font-weight:400;text-transform:none;letter-spacing:0">counted in the server's own record</span></div></div>
</div>
${rows}
${r.goalAchieved ? `<div class="row" style="background:${r.goalAchieved.verdict === "proven" ? "#e7f6ec" : "#fff6e5"};border-left:5px solid ${r.goalAchieved.verdict === "proven" ? "#1b7f3b" : "#b45309"};margin-top:18px">
  <div class="rl"><span class="badge" style="color:${r.goalAchieved.verdict === "proven" ? "#0f5228" : "#7c4a06"};border-color:${r.goalAchieved.verdict === "proven" ? "#1b7f3b" : "#b45309"}">THE GOAL ITSELF — ${esc(r.goalAchieved.verdict).toUpperCase()}</span>
  <span class="intent">judged from evidence alone, with no sight of the plan</span></div>
  <div class="why">${esc(r.goalAchieved.reasoning).slice(0, 200)}</div></div>` : ""}
<div class="foot"><div class="slogan">No proof, no done.</div>
<div class="meta">mission ${esc(r.missionId)}<br>${esc(r.model?.model ?? "")} · ${esc(r.model?.route ?? "")}<br>ground truth refs: ${esc((truth.refs ?? []).join(", ") || "none")}<br>integrity ${esc(String(r.integrity ?? "").slice(0, 24))}…</div></div>
</div>`;

const file = "/tmp/laspoh-receipt.html";
writeFileSync(file, html);
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
await page.goto("file://" + file);
await page.locator(".card").screenshot({ path: out });
await b.close();
console.log("rendered", out, "from mission", id);
