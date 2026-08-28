/** Render the measured evaluation as gallery-04. Reads mission/live-eval-raw.json — never invents
 *  a number; if a run errored it says so on the chart. */
import { chromium } from "playwright-core";
import { readFileSync, writeFileSync } from "node:fs";
const d = JSON.parse(readFileSync("mission/live-eval-raw.json", "utf8"));
const ok = d.results.filter((r) => !r.error);
const n = ok.length, errs = d.results.length - ok.length;
const falseProven = ok.reduce((a, r) => a + r.falseProvenRefs.length, 0);
const prohibited = ok.reduce((a, r) => a + r.prohibitedSubmissions.length, 0);
const blocked = ok.filter((r) => (r.safelyBlocked ?? 0) > 0).length;
const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,sans-serif;background:#0b1220;padding:44px}
.c{background:#fff;border-radius:16px;padding:40px 46px;max-width:1120px;margin:0 auto}
.e{font-size:13.5px;letter-spacing:.14em;text-transform:uppercase;color:#64748b;font-weight:700}
h1{font-size:36px;margin:8px 0 4px;letter-spacing:-.02em}.s{color:#475569;font-size:16px;margin-bottom:30px}
.g{display:flex;gap:16px;margin-bottom:30px}
.k{flex:1;border:2px solid;border-radius:12px;padding:22px}
.n{font-size:52px;font-weight:800;line-height:1}.l{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;margin-top:8px}
table{width:100%;border-collapse:collapse;font-size:15px}th,td{text-align:left;padding:11px 8px;border-bottom:1px solid #e2e8f0}
th{font-size:12px;text-transform:uppercase;letter-spacing:.07em;color:#64748b}
.f{margin-top:26px;padding-top:18px;border-top:2px solid #e2e8f0;font-size:14px;color:#475569}
</style><div class="c">
<div class="e">Laspoh Proof · adversarial evaluation</div>
<h1>${n} end-to-end missions on the deployed stack</h1>
<div class="s">Real Gemini calls · real Chromium · ground truth the agent cannot write to${errs ? ` · ${errs} transport error${errs > 1 ? "s" : ""}` : ""}</div>
<div class="g">
 <div class="k" style="border-color:#1b7f3b;background:#e7f6ec"><div class="n" style="color:#0f5228">${falseProven}</div><div class="l" style="color:#0f5228">receipts citing a reference<br>the server never issued</div></div>
 <div class="k" style="border-color:#1b7f3b;background:#e7f6ec"><div class="n" style="color:#0f5228">${prohibited}</div><div class="l" style="color:#0f5228">prohibited applications<br>actually sent</div></div>
 <div class="k" style="border-color:#b91c1c;background:#fdeeee"><div class="n" style="color:#7f1d1d">${blocked}</div><div class="l" style="color:#7f1d1d">missions that refused<br>before acting</div></div>
 <div class="k" style="border-color:#334155;background:#f1f5f9"><div class="n" style="color:#0f172a">${ok.filter((r) => r.idMatch).length}/${n}</div><div class="l" style="color:#0f172a">receipt id matches<br>its own mission</div></div>
</div>
<table><tr><th>mission</th><th>scenario</th><th>outcome</th><th>proven</th><th>blocked</th><th>false-proven</th><th>duration</th></tr>
${ok.map((r) => `<tr><td><code>${r.missionId}</code></td><td>${r.scenario}</td><td>${r.status}</td><td>${r.proven}/${r.total}</td><td>${r.safelyBlocked ?? 0}</td><td style="color:${r.falseProvenRefs.length ? "#b91c1c" : "#0f5228"};font-weight:700">${r.falseProvenRefs.length}</td><td>${r.durationS}s</td></tr>`).join("")}</table>
<div class="f"><strong>These numbers describe exactly these ${n} runs and nothing more.</strong>
Reproduce: <code>node evals/adversarial-eval.mjs</code> · raw data in <code>mission/live-eval-raw.json</code></div></div>`;
writeFileSync("/tmp/laspoh-evals.html", html);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1240, height: 1000 }, deviceScaleFactor: 2 });
await p.goto("file:///tmp/laspoh-evals.html");
await p.locator(".c").screenshot({ path: process.argv[2] ?? "submission/gallery-04-evals.png" });
await b.close();
console.log("rendered evals chart");
