/**
 * THE /challenge PAGE — the answer to "you built both the agent and the test".
 *
 * Everything it shows is fetched from the same public endpoints a judge can curl. It renders no
 * state it did not receive from the server, and it animates nothing that is not happening: the
 * stages light up from the mission's real event stream, so a stalled mission looks stalled.
 */
export const CHALLENGE_PAGE = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Challenge Laspoh Proof</title>
<style>
:root{--ink:#0f172a;--dim:#64748b;--line:#e2e8f0;--ok:#1b7f3b;--okbg:#e7f6ec;--no:#b91c1c;--nobg:#fdeeee;--warn:#b45309;--warnbg:#fff6e5;--accent:#1d4ed8}
*{box-sizing:border-box}
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;color:var(--ink);background:#f8fafc;line-height:1.6}
.wrap{max-width:860px;margin:0 auto;padding:48px 20px 80px}
h1{font-size:clamp(30px,5vw,44px);letter-spacing:-.025em;margin:0 0 10px}
.lede{font-size:18px;color:#334155;margin:0 0 8px;max-width:62ch}
.lede b{color:var(--ink)}
.run{margin:26px 0 8px;padding:16px 30px;font-size:18px;font-weight:700;color:#fff;background:var(--accent);border:0;border-radius:10px;cursor:pointer}
.run:hover{background:#1743a8}.run:disabled{background:#94a3b8;cursor:default}
.fine{font-size:14px;color:var(--dim)}
.card{background:#fff;border:1px solid var(--line);border-radius:12px;padding:22px 26px;margin:20px 0}
.k{font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--dim)}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13.5px;word-break:break-all}
.stage{display:flex;gap:14px;align-items:flex-start;padding:11px 0;border-bottom:1px solid var(--line)}
.stage:last-child{border-bottom:0}
.dot{width:11px;height:11px;border-radius:50%;background:#cbd5e1;margin-top:7px;flex:0 0 auto}
.stage.on .dot{background:var(--accent)}.stage.done .dot{background:var(--ok)}.stage.block .dot{background:var(--no)}
.stage .t{font-weight:600}.stage.pending{opacity:.45}
.stage .d{font-size:14px;color:var(--dim)}
.pill{display:inline-block;font-size:11.5px;font-weight:800;letter-spacing:.06em;padding:3px 11px;border-radius:20px;border:2px solid}
.hide{display:none}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media(max-width:620px){.grid{grid-template-columns:1fr}}
.box{border:2px solid var(--line);border-radius:10px;padding:14px 16px}
.box .n{font-size:30px;font-weight:800;line-height:1.1}
.box .l{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em}
.match{font-size:20px;font-weight:800}
a{color:var(--accent)}
</style></head><body><div class="wrap">

<h1>Challenge Laspoh Proof</h1>
<p class="lede">Most agent demos ask you to trust the demo. <b>This one lets you challenge it blind.</b></p>
<p class="lede">The server picks a hidden test and publishes a cryptographic commitment to the answer
<b>before</b> the agent starts. Laspoh cannot see which test it got. Afterwards the answer is
revealed — and you can recompute the hash yourself to prove it was never changed.</p>

<button class="run" id="go">Run blind challenge</button>
<p class="fine">No signup. Runs a real browser against a real Gemini agent on Cloud Run. Takes about a minute.</p>

<div id="commit" class="card hide">
  <div class="k">Blind challenge <span id="cid"></span></div>
  <p style="margin:10px 0 4px"><span class="k">Ground truth</span> &nbsp;
    <span class="pill" style="color:var(--warn);border-color:var(--warn);background:var(--warnbg)" id="gt">HIDDEN</span></p>
  <p style="margin:6px 0"><span class="k">Commitment</span><br><span class="mono" id="chash"></span></p>
  <p style="margin:6px 0"><span class="k">Committed at</span> <span class="mono" id="ctime"></span></p>
  <p style="margin:12px 0 0" class="fine">SHA-256 over the canonical hidden payload and a random nonce.
  Published before the agent acted, so the answer cannot be changed to suit the result.</p>
  <p style="margin:10px 0 0"><span class="k">Goal given to the agent</span><br><span id="cgoal"></span></p>
</div>

<div id="live" class="card hide">
  <div class="k" style="margin-bottom:8px">Live mission <span class="mono" id="mid"></span></div>
  <div id="stages"></div>
</div>

<div id="reveal" class="card hide">
  <div class="k">Revealing hidden truth</div>
  <p style="margin:10px 0"><span class="k">Scenario</span><br><b id="rscen"></b></p>
  <p style="margin:6px 0"><span class="k">What a correct system should do</span><br><span id="rwhy"></span></p>
  <p style="margin:10px 0 4px"><span class="k">Nonce</span><br><span class="mono" id="rnonce"></span></p>
  <p style="margin:6px 0"><span class="k">Original commitment</span><br><span class="mono" id="rcommit"></span></p>
  <p style="margin:6px 0"><span class="k">Recomputed</span><br><span class="mono" id="rrecomp"></span></p>
  <p class="match" id="rmatch"></p>
  <p class="fine">That proves the hidden answer existed before the run — and only that. Whether the
  agent behaved correctly is settled below, by its receipt against the server's own record.</p>
</div>

<div id="score" class="card hide">
  <div class="k" style="margin-bottom:12px">Receipt vs the server's own record</div>
  <div class="grid" style="margin-bottom:16px">
    <div class="box" id="bfalse"><div class="n">–</div><div class="l">False proven</div></div>
    <div class="box" id="bproh"><div class="n">–</div><div class="l">Prohibited actions sent</div></div>
  </div>
  <p style="margin:8px 0"><span class="k">Laspoh said</span><br><span id="ssaid"></span></p>
  <p style="margin:8px 0"><span class="k">The server recorded</span><br><span id="struth"></span></p>
  <p style="margin:8px 0"><span class="k">Goal verdict</span> <span id="sgoal"></span></p>
  <p class="match" id="sverdict" style="margin-top:14px"></p>
  <p class="fine">Verify this yourself, without trusting this page:<br>
  <span class="mono">node scripts/verify-challenge.mjs <span id="scmd"></span></span></p>
</div>

<p class="fine" style="margin-top:32px">No proof, no done. ·
<a href="/">What this is</a> · <a href="https://github.com/zubairkhaliduk-create/laspoh-proof">Source</a></p>
</div>
<script>
const $ = (id) => document.getElementById(id);
const show = (id) => $(id).classList.remove("hide");
const STAGES = [
  ["mission.start","Mission accepted","the goal, and nothing about the hidden test"],
  ["recon.observed","Reading the board","what the page actually shows"],
  ["plan.ready","Plan committed","each step's proof criterion, written before it runs"],
  ["preaction.allowed","Pre-action gate: allowed","evidence showed the action complies"],
  ["preaction.blocked","Pre-action gate: BLOCKED","refused before anything irreversible happened"],
  ["step.observed","Acting in a real browser",""],
  ["step.verdict","Independent verification","judged from evidence by a verifier that never saw the plan"],
  ["goal.verdict","Goal verdict","was the USER's goal achieved — judged without the plan"],
  ["mission.done","Receipt issued",""],
];
function renderStages(seen, blocked) {
  $("stages").innerHTML = STAGES.filter((s) => s[0] !== (blocked ? "preaction.allowed" : "preaction.blocked"))
    .map(([k, t, d]) => {
      const on = seen.has(k);
      const cls = !on ? "stage pending" : (k === "preaction.blocked" ? "stage block" : "stage done");
      return '<div class="' + cls + '"><div class="dot"></div><div><div class="t">' + t + '</div>'
        + (d ? '<div class="d">' + d + "</div>" : "") + "</div></div>";
    }).join("");
}
$("go").onclick = async () => {
  const btn = $("go"); btn.disabled = true; btn.textContent = "Committing to a hidden answer…";
  const c = await (await fetch("/challenge", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })).json();
  if (c.error) { btn.textContent = c.error; return; }
  $("cid").textContent = c.challengeId; $("chash").textContent = c.commitment;
  $("ctime").textContent = c.committedAt; $("cgoal").textContent = c.goal;
  $("scmd").textContent = c.challengeId;
  show("commit"); show("live"); $("mid").textContent = c.missionId;
  btn.textContent = "Laspoh Proof is running…";

  const seen = new Set(); let blocked = false, done = false;
  for (let i = 0; i < 120 && !done; i++) {
    await new Promise((r) => setTimeout(r, 2500));
    const m = await (await fetch("/missions/" + c.missionId)).json().catch(() => null);
    if (!m) continue;
    (m.events ?? []).forEach((e) => { seen.add(e.type); if (e.type === "preaction.blocked") blocked = true; });
    if (m.status && !["running", "planning"].includes(m.status)) { seen.add("mission.done"); done = true; }
    renderStages(seen, blocked);
  }
  btn.textContent = "Revealing the hidden answer…";

  const r = await (await fetch("/challenge/" + c.challengeId + "/reveal")).json();
  const s = await (await fetch("/challenge/" + c.challengeId + "/result")).json();
  $("gt").textContent = "REVEALED"; $("gt").style.color = "var(--ok)";
  $("gt").style.borderColor = "var(--ok)"; $("gt").style.background = "var(--okbg)";
  $("rscen").textContent = r.payload.scenario.replace(/_/g, " ");
  $("rwhy").textContent = r.payload.expectation.why;
  $("rnonce").textContent = r.nonce; $("rcommit").textContent = r.commitment; $("rrecomp").textContent = r.recomputed;
  $("rmatch").textContent = r.commitmentValid ? "MATCH ✓  the answer was fixed before the run" : "MISMATCH ✗";
  $("rmatch").style.color = r.commitmentValid ? "var(--ok)" : "var(--no)";
  show("reveal");

  const box = (el, n, good) => { const b = $(el); b.querySelector(".n").textContent = n;
    b.style.borderColor = good ? "var(--ok)" : "var(--no)"; b.style.background = good ? "var(--okbg)" : "var(--nobg)";
    b.querySelector(".n").style.color = good ? "var(--ok)" : "var(--no)";
    b.querySelector(".l").style.color = good ? "var(--ok)" : "var(--no)"; };
  box("bfalse", s.falseProven, s.falseProven === 0);
  box("bproh", s.prohibitedSent, s.prohibitedSent === 0);
  $("ssaid").textContent = "proven " + s.observed.proven + " · safely blocked " + s.observed.safelyBlocked
    + (s.observed.citedRefs.length ? " · cited " + s.observed.citedRefs.join(", ") : "");
  $("struth").textContent = s.observed.groundTruthCount + " submission(s): "
    + (r.groundTruth.submissions.map((x) => x.ref + " (" + x.company + ")").join(", ") || "none");
  $("sgoal").textContent = s.observed.goalVerdict ?? "none";
  $("sverdict").textContent = s.correct ? "OUTCOME CORRECT ✓  " + s.why : "OUTCOME INCORRECT ✗  " + s.why;
  $("sverdict").style.color = s.correct ? "var(--ok)" : "var(--no)";
  show("score");
  btn.textContent = "Run another blind challenge"; btn.disabled = false;
};
</script></body></html>`;
