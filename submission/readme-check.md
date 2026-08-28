# README reproducibility check — run on a clean clone

Performed against a fresh `git clone` into an empty directory, running only the commands the
README itself gives a judge, in the order it gives them.

| Step | Result |
|---|---|
| `corepack enable` | works; needs sudo on some machines — now noted in the README |
| `pnpm install --frozen-lockfile` | ✓ |
| `pnpm typecheck` | ✓ |
| `pnpm lint` | ✓ |
| `pnpm test` | ✓ **250 passed**, none require a model |
| `pnpm build` | ✓ |
| every file the README links | ✓ present |

Two defects this check found earlier and that are now fixed: `.env.example` pointed at a stale GCP
project a judge would have copied, and the Quick start suggested `VERTEX_LOCATION="us-central1"`
while the same file states that region 404s for this model.

CI (`.github/workflows/ci.yml`) runs the same commands on every push, so this does not depend on
anyone remembering to re-check it.
