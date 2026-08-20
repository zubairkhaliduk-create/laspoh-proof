/**
 * THE DEMO TARGET — a small form the agent is asked to complete.
 *
 * Served by this same service, deliberately, for three reasons: a judge can reproduce the demo
 * without credentials to anyone else's site; a live demo cannot be broken by a third party
 * changing their markup that morning; and automating someone else's product for a competition
 * entry is not something to do casually.
 *
 * It is built to be honestly difficult in the way real forms are:
 *   - a required field that is easy to miss (the consent checkbox), which makes submitting early
 *     fail exactly as it would in the wild;
 *   - a server that REJECTS an incomplete submission rather than silently accepting it;
 *   - a confirmation page whose reference number appears ONLY on genuine success — so a receipt
 *     claiming success without that reference is provably wrong, and the verifier can catch it.
 */
import type express from "express";

const submissions = new Map<string, { name: string; email: string; role: string; at: string }>();

const page = (body: string) => `<!doctype html><html><head><meta charset="utf-8"><title>Grant Application</title>
<style>body{font-family:system-ui,sans-serif;max-width:640px;margin:40px auto;padding:0 20px;line-height:1.6}
label{display:block;margin:14px 0 4px;font-weight:600}input,select{width:100%;padding:9px;font-size:15px}
.row{margin:18px 0}.cb{display:flex;gap:10px;align-items:flex-start;font-weight:400}
button{margin-top:20px;padding:11px 22px;font-size:15px;cursor:pointer}
.err{background:#fdecea;border-left:4px solid #d33;padding:12px;margin:16px 0}
.ok{background:#e8f5e9;border-left:4px solid #2e7d32;padding:16px;margin:16px 0}
code{background:#eee;padding:2px 6px}</style></head><body>${body}</body></html>`;

export function mountDemoTarget(app: express.Express): void {
  app.get("/demo", (_req, res) => {
    res.type("html").send(page(`<h1>Research Grant Application</h1>
      <p>All fields are required. Applications missing consent are rejected.</p>
      <form method="POST" action="/demo/submit">
        <div class="row"><label for="name">Full name</label><input id="name" name="name" required></div>
        <div class="row"><label for="email">Email address</label><input id="email" name="email" type="email" required></div>
        <div class="row"><label for="role">Applying as</label>
          <select id="role" name="role" required>
            <option value="">Please choose…</option>
            <option>Independent researcher</option>
            <option>University affiliated</option>
            <option>Industry lab</option>
          </select></div>
        <div class="row"><label class="cb" for="consent">
          <input id="consent" name="consent" type="checkbox" required>
          <span>I confirm the information given is accurate and may be verified.</span></label></div>
        <button type="submit">Submit application</button>
      </form>`));
  });

  app.post("/demo/submit", (req, res) => {
    const { name, email, role, consent } = req.body ?? {};
    const missing: string[] = [];
    if (!String(name ?? "").trim()) missing.push("Full name");
    if (!String(email ?? "").trim()) missing.push("Email address");
    if (!String(role ?? "").trim()) missing.push("Applying as");
    // The trap, and the point: an agent that submits before ticking this gets a rejection, not a
    // silent success. A system that only reports what it attempted would call this "submitted".
    if (!consent) missing.push("Consent confirmation");

    if (missing.length) {
      return res.status(400).type("html").send(page(`<h1>Application not submitted</h1>
        <div class="err"><strong>Rejected.</strong> These required items are missing: ${missing.join(", ")}.</div>
        <p><a href="/demo">Return to the form</a></p>`));
    }

    const ref = `GR-${String(Date.now()).slice(-6)}`;
    submissions.set(ref, { name: String(name), email: String(email), role: String(role), at: new Date().toISOString() });
    res.type("html").send(page(`<h1>Application received</h1>
      <div class="ok"><p><strong>Your application has been submitted successfully.</strong></p>
      <p>Confirmation reference: <code>${ref}</code></p>
      <p>Keep this reference — it is the only proof of submission.</p></div>`));
  });

  /** Independent ground truth. Used in tests to confirm a receipt matches reality — the check on
   *  the checker, so a passing verifier cannot itself go unexamined. */
  app.get("/demo/submissions", (_req, res) => res.json({ count: submissions.size, refs: [...submissions.keys()] }));
}
