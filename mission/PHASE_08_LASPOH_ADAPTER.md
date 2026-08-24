# PHASE 08 — Optional Laspoh Executor Adapter

**Status:** IN_PROGRESS → see completion report

## 1. Current verified state

    src/executors/laspoh.ts   73 lines · preExisting = true · POSTs to ${bridgeUrl}/execute
    src/server.ts:42          selected ONLY when a caller passes executor: "laspoh"

Import audit (Phase 00): zero references from this repository into the pre-existing project.

## 2. The risk this phase exists to close

Phase 00 recorded it explicitly:

> The two-executor claim is currently proven by INTERFACE, not by both running. "Swap the executor
> and the agent is unchanged" is demonstrated one-sided.

A hostile judge's version of the same objection: *"You wrote an interface and one implementation.
The second one has never executed anything. How do you know the abstraction is real?"*

That is a fair question, and "it typechecks" is not an answer — an interface satisfied only at
compile time can still be wrong about everything that matters at runtime.

## 3. Objective

Demonstrate the abstraction by running the **same mission actions through a second executor**, over
the real transport, and comparing what the agent receives.

## 4. What is honest to prove, and what is not

**Honest:** that the adapter satisfies the contract — it speaks the transport, normalises replies,
handles an unreachable bridge, refuses to let a malformed reply masquerade as success, and returns
Observations the agent consumes identically to the reference executor's.

**Not honest:** claiming this proves the *pre-existing Laspoh runtime* works through the adapter.
It does not. That would need the real bridge, which is not running, and saying otherwise would be
precisely the kind of overclaim this project is built to prevent.

So the bridge in the test is a **stub that speaks the bridge protocol**, and the test says so in
its own words. What is proven is the seam. What is not proven is recorded as not proven.

## 5. Exact scope

1. A stub bridge implementing the `/execute` protocol.
2. Contract tests: both executors, same actions, agent-visible behaviour compared.
3. Adversarial transport tests: unreachable, malformed, HTTP error, timeout.
4. Update `PREEXISTING_DISCLOSURE.md` with what is and is not demonstrated.

## 6. Explicit non-scope

- No import of pre-existing code. The adapter stays HTTP-only.
- No change to the default executor. The adapter remains opt-in.
- No claim that Laspoh itself was exercised.

## 7. Failure modes the adapter must survive

| Bridge behaviour | Required adapter behaviour |
|---|---|
| Unreachable | `ok:false`, `transport`, names the URL — never a throw |
| HTTP 500 | `ok:false`, `transport`, states the status |
| `{}` | `ok:false` — absent fields must never read as success |
| `{"ok":"yes"}` | `ok:false` — a truthy string is not a boolean, and coercion here would let a malformed reply pass as a success |
| Never responds | Aborts at the timeout and reports it |

## 8. Acceptance criteria

- [ ] Both executors run the same actions through one interface, in one test
- [ ] Every adversarial transport case returns an Observation rather than throwing
- [ ] Disclosure updated to state precisely what was and was not demonstrated

## 9. Evidence required

Test output naming both executors; commit SHA.
