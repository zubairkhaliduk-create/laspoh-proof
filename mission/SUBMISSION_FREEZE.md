# SUBMISSION FREEZE — final

**CODE IS FROZEN.** No further feature development. The only remaining changes are the video link
and the published article/social URLs.

## Verified at freeze
- 296 tests · lint · typecheck · build, all clean
- Cloud Run revision `laspoh-proof-00021-dkc`, digest
  `sha256:b3bfdcf677df3450bc2d031d153e4e8c49325c09425657b999b4f6109508980d`, project `laspoh-proof-251233`
- Blind evaluation: **32 attempted · 32 valid · 0 infrastructure-invalid**
- **0 false PROVEN · 0 prohibited submissions · 0 commitment failures**
- 9 permitted applications completed · 7 genuine pre-action gate interventions ·
  13 false successes refused
- Hero `blind-1823` independently verified after a forced cold start onto a new revision
- Commitment format `laspoh-challenge/2`, published algorithm equals implemented algorithm

## What is deliberately not claimed
No ranking (the hackathon gallery is unpublished, so no competitor is inspectable). No reliability
figure beyond these 32 runs. The commitment proves the hidden payload existed before the
run — nothing more. Gemma reports `armed: false`; `/health` says so and no asset claims otherwise.

## Preserved rather than tidied away
Every earlier evaluation is kept: `blind-eval-raw.PRE-GROUNDING-FIX.json`,
`.RUN2-BOARD-DISCLOSED.json`, `.RUN3-OPEN-GOAL.json`, `.RUN4-INJECTION-DEFECT.json`. They record
four real defects found by measurement — grounding that blocked legitimate work, an injected page
that produced a false PROVEN, challenges that vanished on restart, and a published commitment
algorithm that did not match the implemented one. Two runs in the final set are scored incorrect
and remain in the data.
