# PHASE 01 — Project Foundation (executed as an audit)

**Status:** IN_PROGRESS → see completion report
**Order change:** this phase was specified as "create the new hackathon repository". The
repository already exists with ten in-period commits. Recreating it would destroy the
build-history evidence the program exists to produce, so the phase is executed as an
**audit against its own requirements**, closing gaps. Recorded as AD-003.

---

## 1. Current verified state

Read from disk on 2026-08-24.

    repo        /Users/zubairkhalid/andiwal/laspoh-proof   branch main, clean
    HEAD        67f4bdc (Phase 00 docs)
    history     11 commits, first 2026-08-20, zero before 2026-08-03
    source      1,761 LOC TypeScript, 18 files
    scripts     build · dev · start · test · typecheck
    remote      NONE
    gitignore   node_modules/ dist/ .env *.log .DS_Store
    secrets     no tracked .env / credential / key files

## 2. Objective

Bring the repository to the standard a judge should find: reproducible, lintable, CI-gated,
publicly readable, with environment and licensing explicit — without disturbing the history
that proves when it was built.

## 3. Why this phase exists

**Judging (30% demo & production readiness).** "Clean repository" and "reproducible setup"
are explicit criteria. A repo with no linter, no CI and no public URL scores badly however
good the code is.

**Judging (30% architecture).** CI that runs typecheck and tests on every push is evidence
of discipline that a README cannot supply.

**Eligibility.** A public repository is what allows a judge to verify the provenance claims
independently. Without it, the disclosure is unfalsifiable — which is worse than absent.

## 4. Exact scope

1. Linting and formatting configuration, wired to scripts.
2. `.env.example` documenting every environment variable the service reads.
3. A licence.
4. CI running install → typecheck → lint → test on push and PR.
5. A secret scan of the full history before anything is published.
6. Creation of the public GitHub repository and first push.

## 5. Explicit non-scope

- No source-code behaviour changes. Not one line of `src/` logic.
- No dependency upgrades.
- No README rewrite (Phase 18 owns that).
- No architecture diagram (Phase 19).

## 6. Protected functionality

The 45 passing tests, the deployed Cloud Run service, and the deploy/migrate scripts must
all behave identically after this phase. Lint configuration must not be allowed to force
churn in `src/` — if the linter disagrees with existing code, the linter is configured to
the code's existing conventions, not the reverse. This phase changes scaffolding only.

## 7. Security requirements

**A public push is irreversible in practice** — anything committed is scrapeable within
minutes even if force-removed afterwards. Therefore, before the repository is created:

1. Scan the entire git history (not just the working tree) for credential-shaped strings:
   API keys, `AIza…` Google keys, private-key headers, bearer tokens, `.env` contents.
2. Confirm no service-account JSON was ever committed.
3. Confirm the GCP project id and service URL are *safe to publish* — they are: the service
   is intentionally public, and the runtime uses ADC/workload identity with no key material.

The service holds no secrets in code: Vertex is reached via the runtime service account,
and `GEMINI_API_KEY` is read from the environment and never committed.

## 8. Failure modes

| Scenario | Handling |
|---|---|
| A secret exists in history | Do not publish. Report, rotate, rewrite before any push. |
| Linter rewrites `src/` wholesale | Config matched to existing style; `--max-warnings` tolerant initially |
| CI fails on first push | Expected and useful — fix before declaring the phase complete |
| Public repo exposes the owner's identity | The account is already the owner's; no new exposure |
| `gh` creates the repo in the wrong account | Verify owner in the returned URL before pushing |

## 9. Tests

- `pnpm typecheck` — clean
- `pnpm lint` — clean (new script)
- `pnpm test` — 45 passing, unchanged
- Secret scan — zero findings across all commits
- CI — green on the first push

## 10. Acceptance criteria

- [ ] Linter configured and passing
- [ ] `.env.example` lists every variable the code reads, with no real values
- [ ] LICENSE present
- [ ] CI workflow runs typecheck + lint + test
- [ ] Secret scan across full history returns zero findings
- [ ] Public repository exists and contains the full in-period history
- [ ] 45 tests still pass after all changes
- [ ] `git log` in the public repo shows first commit 2026-08-20

## 11. Rollback

Every item is additive scaffolding. Rollback is deleting the added config files. The one
irreversible step is repository publication — gated behind the secret scan above, and the
repository can be deleted or made private via `gh repo delete` / `gh repo edit --visibility`.

## 12. Evidence required

- Secret-scan command and its zero-finding output
- `pnpm lint` output
- Public repository URL
- CI run URL and conclusion
- Confirmation that the first commit date is visible publicly as 2026-08-20
