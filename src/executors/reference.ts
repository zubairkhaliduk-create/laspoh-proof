/**
 * THE REFERENCE EXECUTOR — small on purpose.
 *
 * Its job is not to be a browser-automation platform. It exists to (a) run the demo mission
 * end to end and (b) prove, by existing, that the agent above it is not welded to any particular
 * actuation layer. Everything interesting in this project lives above the executor seam; making
 * this file large would be a sign the design had gone wrong.
 *
 * What it will never do: decide what to do next, judge success, or interpret meaning. It performs
 * one action and reports what it saw. Note in particular that `ok` is set from OBSERVED state —
 * a fill is ok only when the value is actually in the field afterwards, and a click is ok only
 * when something about the page demonstrably changed. "The call did not throw" is not success.
 */
import { chromium, type Browser, type Page } from "playwright-core";
import type { Action, Executor, Observation } from "./types.js";

const NAV_TIMEOUT = 20_000;
const SETTLE_MS = 350;

/** Identifier shapes a confirmation page would plausibly display. Deliberately generic: no site,
 *  brand or vendor-specific pattern belongs in an executor. */
const ID_PATTERNS: RegExp[] = [
  /\b[A-Z]{2,5}-\d{3,10}\b/g,           // TQ-4471, ABC-12345
  /\b(?:ref|reference|confirmation|order|application|case)\s*(?:no\.?|number|id)?[:\s#]+([A-Za-z0-9-]{4,20})\b/gi,
  /\b\d{6,12}\b/g,                       // bare long numerics
];

function extractIdentifiers(text: string): string[] {
  const out = new Set<string>();
  for (const re of ID_PATTERNS) {
    for (const m of text.matchAll(re)) out.add((m[1] ?? m[0]).trim());
  }
  return [...out].slice(0, 12);
}

export class ReferenceExecutor implements Executor {
  readonly name = "reference";
  readonly preExisting = false;
  private browser: Browser | null = null;
  private page: Page | null = null;

  constructor(private readonly headless = true) {}

  private async ensurePage(): Promise<Page> {
    if (this.page) return this.page;
    this.browser = await chromium.launch({ headless: this.headless });
    this.page = await this.browser.newPage({ viewport: { width: 1280, height: 900 } });
    return this.page;
  }

  /** Everything the page will admit to, gathered the same way after every action so observations
   *  are comparable across steps. `outstandingRequired` is read from the DOM rather than inferred,
   *  which is what lets the orchestrator know a form is incomplete without asking the model. */
  private async observe(page: Page, ok: boolean, failure: Observation["failure"], detail: string): Promise<Observation> {
    const pageText = (await page.evaluate(() => document.body?.innerText ?? "").catch(() => "")).slice(0, 20_000);
    const outstandingRequired = await page.evaluate(() => {
      const out: string[] = [];
      for (const el of Array.from(document.querySelectorAll<HTMLElement>("input,select,textarea"))) {
        const f = el as HTMLInputElement;
        const required = f.required || f.getAttribute("aria-required") === "true";
        if (!required) continue;
        const empty = f.type === "checkbox" || f.type === "radio" ? !(f as HTMLInputElement).checked : !String(f.value ?? "").trim();
        if (!empty) continue;
        const label =
          (f.labels?.[0]?.innerText ?? "").trim() ||
          f.getAttribute("aria-label") ||
          f.getAttribute("placeholder") ||
          f.getAttribute("name") ||
          f.id || "(unlabelled field)";
        out.push(label.slice(0, 60));
      }
      return out.slice(0, 20);
    }).catch(() => [] as string[]);
    return { ok, failure, detail, pageText, url: page.url(), outstandingRequired, identifiers: extractIdentifiers(pageText) };
  }

  /** Find a control by what a human would call it, not by a brittle selector. */
  private locate(page: Page, description: string) {
    return page.getByRole("button", { name: description, exact: false })
      .or(page.getByRole("link", { name: description, exact: false }))
      .or(page.getByLabel(description, { exact: false }))
      .or(page.getByPlaceholder(description, { exact: false }))
      .or(page.getByText(description, { exact: false }))
      .first();
  }

  async execute(action: Action): Promise<Observation> {
    let page: Page;
    try {
      page = await this.ensurePage();
    } catch (e) {
      return { ok: false, failure: "transport", detail: `browser unavailable: ${String(e).slice(0, 200)}`, pageText: "", url: "", outstandingRequired: [], identifiers: [] };
    }

    try {
      switch (action.kind) {
        case "navigate": {
          const res = await page.goto(action.url, { timeout: NAV_TIMEOUT, waitUntil: "domcontentloaded" });
          const okNav = !!res && res.status() < 400;
          return this.observe(page, okNav, okNav ? null : "navigation_failed", okNav ? `loaded ${action.url}` : `HTTP ${res?.status() ?? "?"} for ${action.url}`);
        }
        case "inspect":
          return this.observe(page, true, null, action.note ? `inspected: ${action.note}` : "inspected the page");

        case "fill": {
          const field = this.locate(page, action.field);
          if ((await field.count()) === 0) return this.observe(page, false, "not_found", `no field matching "${action.field}"`);
          await field.fill(action.value, { timeout: 8_000 });
          await page.waitForTimeout(SETTLE_MS);
          // ACTION TRUTH: the value must actually be in the field. A framework that discards a
          // controlled input silently is the classic way a fill "succeeds" and achieves nothing.
          const landed = await field.inputValue({ timeout: 3_000 }).catch(() => "");
          const ok = landed.trim() === action.value.trim();
          return this.observe(page, ok, ok ? null : "value_discarded", ok ? `filled "${action.field}"` : `"${action.field}" did not retain the value (read back "${landed.slice(0, 40)}")`);
        }

        case "select": {
          const sel = this.locate(page, action.field);
          if ((await sel.count()) === 0) return this.observe(page, false, "not_found", `no dropdown matching "${action.field}"`);
          await sel.selectOption({ label: action.value }).catch(async () => { await sel.selectOption(action.value); });
          await page.waitForTimeout(SETTLE_MS);
          const chosen = await sel.inputValue({ timeout: 3_000 }).catch(() => "");
          const ok = Boolean(chosen.trim());
          return this.observe(page, ok, ok ? null : "value_discarded", ok ? `selected "${action.value}" in "${action.field}"` : `"${action.field}" did not take "${action.value}"`);
        }

        case "click": {
          const target = this.locate(page, action.target);
          if ((await target.count()) === 0) return this.observe(page, false, "not_found", `no control matching "${action.target}"`);
          if (await target.isDisabled().catch(() => false)) return this.observe(page, false, "not_actionable", `"${action.target}" is disabled`);
          const before = `${page.url()}::${(await page.evaluate(() => document.body?.innerText?.length ?? 0).catch(() => 0))}`;
          await target.click({ timeout: 8_000 });
          await page.waitForTimeout(SETTLE_MS);
          const after = `${page.url()}::${(await page.evaluate(() => document.body?.innerText?.length ?? 0).catch(() => 0))}`;
          // A click that changes nothing observable is reported as no_effect rather than success.
          const changed = before !== after;
          return this.observe(page, changed, changed ? null : "no_effect", changed ? `clicked "${action.target}"` : `clicked "${action.target}" but nothing on the page changed`);
        }

        case "read":
          return this.observe(page, true, null, `read: ${action.of}`);
      }
    } catch (e) {
      return this.observe(page, false, "transport", `${action.kind} threw: ${String(e).slice(0, 200)}`).catch(() => ({
        ok: false, failure: "transport" as const, detail: String(e).slice(0, 200), pageText: "", url: "", outstandingRequired: [], identifiers: [],
      }));
    }
  }

  async close(): Promise<void> {
    await this.browser?.close().catch(() => {});
    this.browser = null;
    this.page = null;
  }
}
