## Disclosure of pre-existing work

**Laspoh** is a pre-existing experimental browser-automation platform of mine. Its repository begins
**24 June 2026**, forty days before this hackathon's submission period, and 462 of its 542 commits
predate 3 August 2026. **It is not this submission and is not presented as hackathon work.**

**Laspoh Proof** is a new Gemini + Genkit autonomous verification agent built during the **3–31
August 2026** submission period. First commit 20 August 2026; zero commits before 3 August. The
submitted agent's planning, orchestration, mission state, reference executor, evidence pipeline,
independent verification, recovery, security boundaries and receipt architecture were all developed
during the submission period.

The only point of contact is a 73-line HTTP adapter (`src/executors/laspoh.ts`), written during the
period, which carries `preExisting = true` into every receipt produced through it. **It is disabled
by default.** The demo, the deployed service and the entire test suite run on the new reference
executor.

Verifiable directly:

    git log --reverse --format='%h %ad' --date=iso | head -1   # 2026-08-20
    git rev-list --count --before=2026-08-03 HEAD              # 0
    grep -rn "andiwal/laspoh\|@laspoh/" src test               # no matches
