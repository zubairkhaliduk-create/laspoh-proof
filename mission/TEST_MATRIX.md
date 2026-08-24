# Test Matrix

Every row names the failure it exists to catch. A test that cannot name its failure is
decoration.

Last run: **2026-08-24** — `npx vitest run` → **45 passed**, 4 files, 0 failed.

---

## Integrity — the guarantees that must hold whatever the model says

| Test | Failure it catches | File |
|---|---|---|
| Downgrades a proven verdict citing nothing | Model claims proof it cannot quote | `test/integrity.test.ts` |
| Blank citations are not citations | Whitespace passing as evidence | `test/integrity.test.ts` |
| Keeps a proven verdict that quotes evidence | Over-strictness making the system useless | `test/integrity.test.ts` |
| Never upgrades unproven/contradicted | Silent promotion to success | `test/integrity.test.ts` |
| Counts only proven steps | Activity reported as progress | `test/integrity.test.ts` |
| Refuses `complete` unless all proven | A green tick over incomplete work | `test/integrity.test.ts` |
| Stall counter ignores merely-attempted work | Looking busy forever while proving nothing | `test/integrity.test.ts` |

## Blind-submit gate

| Test | Failure it catches | File |
|---|---|---|
| Flags a required control no step would fill | Submitting blind, learning from rejection | `test/integrity.test.ts` |
| Leaves covered fields alone | Repair duplicating planned work | `test/integrity.test.ts` |
| Matches a dropdown covered by `select` | Verb-blind matching | `test/integrity.test.ts` |
| Quiet when nothing outstanding | Gate firing on healthy forms | `test/integrity.test.ts` |
| Ignores navigate/inspect | Non-filling steps counted as coverage | `test/integrity.test.ts` |
| Recognises already-satisfied controls | Completed work recorded as failure | `test/integrity.test.ts` |
| Never skips a differing value | Refusing a legitimate change | `test/integrity.test.ts` |

## Executor — against a real browser and a real server

| Test | Failure it catches | File |
|---|---|---|
| Reads the form's actual required fields | Silent DOM-read failure reading as "empty form" | `test/executor.test.ts` |
| Reports values absent from page text | Fills structurally unprovable | `test/executor.test.ts` |
| Filled field drops off outstanding | Stale requirement lists | `test/executor.test.ts` |
| Checkbox tick counts as an effect | Re-clicking a ticked box forever | `test/executor.test.ts` |
| Missing control → `not_found` | Inventing controls | `test/executor.test.ts` |
| Incomplete submit is not success | The core false-completion bug | `test/executor.test.ts` |
| Native dropdown set by value | Clicking a browser-painted list | `test/executor.test.ts` |

## Recovery

| Test | Failure it catches | File |
|---|---|---|
| Stops repeating an action that changed nothing | Blind repeat loops | `test/core.test.ts` |
| Stands down when the page names the next action | Escalating over ground truth | `test/core.test.ts` |

## Gaps — to be closed in later phases

| Gap | Phase |
|---|---|
| Prompt injection from page content | 13 |
| Resume after process restart | 05, 16 |
| Repeated-run reliability rate (n≥10) | 16 |
| Verifier adversarial suite (stale/forged/wrong-site evidence) | 10 |
| Duplicate-submission idempotency | 05 |
