# Final owner checklist — deadline Mon 31 Aug 2026, 17:00 PT

## 1. Re-auth, then one command (5 min + ~10 min unattended)
    gcloud auth login          # zubair@laspoh.com
    cd ~/andiwal/laspoh-proof && ./finalize.sh
Deploys the frozen build, proves it live, runs 8 real adversarial missions, and renders the hero
receipt from whichever mission actually performed best. Then:
    git add -A && git commit -m "chore: final live evidence" && git push

## 2. Record the video (the one thing worth 30%)
docs/demo-final-script.md — shot for shot, ≤3:50, ONE continuous take, YouTube/Vimeo **Public**.
docs/youtube-metadata.md has the title, description and thumbnail direction.

## 3. Devpost — draft NOW, submit early
Paste docs/devpost-writeup.md. Track: **The Taskmaster**. Upload submission/gallery-*.png in
order (receipt first). Fields in mission/SUBMISSION_MANIFEST.md.

## 4. Bonus (+0.4 candidate, ~20 min)
- Publish docs/bonus-article.md on dev.to — **public**; it already carries the required
  "created for the purposes of entering this hackathon" line.
- Post docs/social-post.md (LinkedIn) and/or the ≤280-char X variant — hashtag
  **#AllThingsAgenticHackathon** exactly.
- Put both URLs into the Devpost bonus fields.

## 5. Gemma arming (+0.2 candidate, 5 min, console only)
ai.studio/projects → laspoh-proof-251233 → enable Gemini API billing (currently 429 "prepayment
credits depleted"). Then say "gemma billing done": the scoped key is already minted, and arming
is store-secret → grant accessor → redeploy. /health flips `armed: true` on its own.
If it stays false, nothing is wrong — /health states it honestly and no asset claims otherwise.

## 6. Hygiene
Delete project **laspoh-proof-260823** (only zubair@samstar.org can see it). Until then it is
harmless: no submission asset references that URL.
