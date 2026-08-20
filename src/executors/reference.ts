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
    // NOTE: no named inner functions in here. This body is serialised and re-parsed in the page,
    // and the bundler's keep-names helper (`__name`) does not exist on that side — a named inner
    // arrow makes the whole read throw, which shows up as "the form has no fields" rather than as
    // an error. Everything below is deliberately inline.
    const form = await page.evaluate(() => {
      const outstanding: string[] = [];
      const state: string[] = [];
      for (const el of Array.from(document.querySelectorAll("input,select,textarea"))) {
        const f = el as HTMLInputElement;
        const toggle = f.type === "checkbox" || f.type === "radio";
        const empty = toggle ? !f.checked : !String(f.value ?? "").trim();
        const required = f.required || f.getAttribute("aria-required") === "true";
        const label = (
          (f.labels?.[0]?.innerText ?? "").trim() ||
          f.getAttribute("aria-label") ||
          f.getAttribute("placeholder") ||
          f.getAttribute("name") ||
          f.id ||
          "(unlabelled field)"
        ).slice(0, 60);
        if (required && empty) outstanding.push(label);
        state.push(`${label} = ${toggle ? (f.checked ? "checked" : "not checked") : String(f.value ?? "").slice(0, 80) || "(empty)"}`);
      }
      return { outstanding: outstanding.slice(0, 20), state: state.slice(0, 30) };
    }).catch(() => ({ outstanding: [] as string[], state: [] as string[] }));
    const outstandingRequired = form.outstanding;
    return { ok, failure, detail, pageText, url: page.url(), outstandingRequired, formState: form.state, identifiers: extractIdentifiers(pageText) };
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
      return { ok: false, failure: "transport", detail: `browser unavailable: ${String(e).slice(0, 200)}`, pageText: "", url: "", outstandingRequired: [], formState: [], identifiers: [] };
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
          // Two independent effect signals, because either one alone lies. Page-level change misses
          // a checkbox (ticking one alters no text); control-level state misses a navigation. A
          // control that toggles ITSELF has done something, and calling that "no effect" is how an
          // agent ends up re-clicking a box it already ticked.
          const controlState = async () =>
            await target.evaluate((el) => {
              const f = el as HTMLInputElement;
              return [f.checked === true ? "1" : "0", f.getAttribute("aria-checked") ?? "", f.getAttribute("aria-pressed") ?? "", f.getAttribute("aria-expanded") ?? "", String(f.value ?? "")].join("|");
            }).catch(() => "");
          const pageState = async () => `${page.url()}::${await page.evaluate(() => document.body?.innerText?.length ?? 0).catch(() => 0)}`;
          const before = await pageState();
          const beforeControl = await controlState();
          await target.click({ timeout: 8_000 });
          await page.waitForTimeout(SETTLE_MS);
          const after = await pageState();
          const afterControl = await controlState().catch(() => "");
          // A click that changes nothing observable is reported as no_effect rather than success.
          const changed = before !== after || (beforeControl !== "" && beforeControl !== afterControl);
          return this.observe(page, changed, changed ? null : "no_effect", changed ? `clicked "${action.target}"` : `clicked "${action.target}" but nothing on the page changed`);
        }

        case "read":
          return this.observe(page, true, null, `read: ${action.of}`);
      }
    } catch (e) {
      return this.observe(page, false, "transport", `${action.kind} threw: ${String(e).slice(0, 200)}`).catch(() => ({
        ok: false, failure: "transport" as const, detail: String(e).slice(0, 200), pageText: "", url: "", outstandingRequired: [], formState: [], identifiers: [],
      }));
    }
  }

  async close(): Promise<void> {
    await this.browser?.close().catch(() => {});
    this.browser = null;
    this.page = null;
  }
}
