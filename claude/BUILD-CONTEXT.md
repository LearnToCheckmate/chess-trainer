# Build context — everything the builder needs that is not already in this repo

**For the pen-holder to commit to the repo as `claude/BUILD-CONTEXT.md`.** It exists because the
build session cannot read the claude.ai project docs, and roughly twenty of them accumulated there
between 2026-09-11 and 2026-09-13. This is those docs, condensed to what changes what you build.

Written 2026-09-13 by the feedback session. Where it contradicts an older document **in this repo**,
this wins, and it says so explicitly each time.

---

## 0. The channels, and which ones you can actually read

| channel | you (build session, repo attached) | the feedback session |
|---|---|---|
| this repo | read/write | read only |
| claude.ai project docs (`claude/agents/*`) | **cannot see them at all** | read/write |
| tracker flags, artifact `20acb6cb-42bf-44a3-b2fe-5a8223cca1e2` | read/write | read/write |
| metrics dashboard, artifact `3478220d-8023-43ba-b08a-4397eb054cc3` | read | read/write |
| pickup board, artifact `f38b7157-4bd7-4ae2-b2ce-2c7594b8cf36` | read/write | read/write |
| the other chat's conversation | never | never |

**The tracker is the only two-way channel between the sessions.** Everything that must reach you
goes there first. Start every run with the flag `start-here-read-first`, then list the whole `flags`
collection and read every document — not just the newest. Acknowledge each with an `acked` field
saying how you understood it.

## 1. Who builds

Only `session_01Ar5fWLg9DZuPaRDBfKnXvs` — you — builds, gates, commits or pushes. Kunal's decision,
2026-09-13 evening. Live rule: flag `pen-lock-one-writer`.

- **Never use GitHub's upload page.** It strips the `Claude-Session` trailer. `14f06ac` went in that
  way and is the only commit in this repo whose author cannot be traced.
- **Build numbers come from you only.** One sequence. Two trees must never carry the same number —
  that already happened once with #375.
- **Before any push:** `git fetch && git log -1 origin/main`. If main moved, rebase onto it.
- Work from another session arrives as a **patch you commit**, never as a parallel upload.

## 2. How runs are staffed — the charter

Kunal's standing instruction, dictated 2026-09-12. Three review agents (supervisory, antagonistic,
audit) plus five testing roles: **user story**, **test case**, **regression**, **SAT**, **UAT**.

- **User stories** in the player's voice with objectively checkable criteria → `claude/stories/USER-STORIES.md`, ids `US-001` up.
- **Test cases**: a pass condition must be a *measurement or a visible string*, never a judgement.
  "board width equals the width at ply 0 within 2px", not "the board should not shrink."
- **Regression**: every fixed defect and every item Kunal certifies becomes an assertion running in
  the deploy gate on *every* build. The suite also has to prove it still fails against a
  deliberately broken build, or a green run means nothing.
- **SAT**: before Kunal sees anything, drive the running app at his phone size and check every
  acceptance criterion. This is the step that catches items marked done that are not done.
- **UAT**: see §3 — **the charter's recording-based design has been replaced.**

### Coverage — this reversed an earlier constraint

Kunal, 2026-09-12: *"it should be testing everything from scratch. the entire workflow and
functionality. I only found what i came across. if i have to do that every time we'll be stuck
forever. And I'm okay if we don't do as many builds. as long the builds make the product
progressively better."*

Spec and test the **whole app**, screen by screen, in the order he uses them: Review, Play, Lesson,
Puzzles, Home/Discover, Menu, then the never-tested areas. The discipline is not writing less — it
is that **nothing is written that is not executed in the same pass.**

### The four numbers, every close-out

1. **Open P0** — zero at the end of any run that did not create one. A P0 outranks everything.
2. **Open P1** — must fall, or the run explains why not.
3. **Coverage** — screens fully specced *and* tested, out of the total.
4. **Regression assertions** — only ever rises.

**Anti-gaming rule:** if new coverage finds defects that were already there, the open count goes UP
and that is a **good** run. Label it that way.

## 3. How testing works now — supersedes charter §2.5

Kunal, 2026-09-13: *"This is not a great way to test. it should probably open the github site in a
browser and run the test cases. I can't record everything. the clip would be gigantic."*

**Headless, against the live bundle, at 375x730** — his real phone geometry. Not 375x679; that
number came from a readout that subtracted the status bar twice. Serve the repo locally
(`python3 -m http.server`) because `learntocheckmate.github.io` is blocked by the egress proxy;
`github.com` is reachable. Chromium is at `/opt/pw-browsers/chromium`; do not run
`playwright install`.

Recordings are kept **only** for what a device alone can show: Apple emoji ink, iOS Safari, real
touch, engine timing on his phone, signed-in state. Everything else is measured headlessly.

Where a recording and a sandbox measurement disagree, **the recording still wins** — it is his real
device.

## 4. The rules that bind every agent, and why each exists

- **Measure, do not read.** No claim about size, spacing, overflow or position taken from source.
  Every layout item that went wrong in this project went wrong because a number was read off code.
- **A crop is a reading, not a measurement.** A crop of a review board *looked* squashed and was
  filed as a P0; a pixel scan then showed every rank at 139-141px in both states. The finding was
  withdrawn. If the evidence is an image, measure the pixels before writing it down. **A bad
  selector is the same failure**: four verdicts in one headless pass on 2026-09-13 were selector
  artifacts — one matched a `<style>` element's `@import` text, another measured the whole document
  as "the sheet". Scope selectors to painted elements and exclude `head`/`style` nodes.
- **Absence is the hardest thing to measure.** A positive measurement needs one place; proving
  something is *not* there needs every place. A "this does not exist" verdict must list the screens
  and states actually checked. One such verdict was published and withdrawn on 2026-09-13, because
  the feature lived in a sheet that had not been opened.
- **Check `git log -S` before accepting a regression report.** "The minute clocks disappeared" was
  not a regression: online play never had them.
- **Drive the app before building from a feedback list.** His feedback spans many deploys, so parts
  of it are already done. Three items were nearly rebuilt that already existed.
- **Kunal certifies closed, not you.** You may mark an item done; done is a claim until he confirms
  on his phone, with before and after.
- **Disagreement goes in the record.** If the antagonist objects and you ship anyway, log the
  objection and why it was overruled.

## 5. Decisions — do not build ahead of an answer

**23 questions are open with Kunal right now**, gathered on the metrics dashboard under "Waiting on
you", 20 of them carrying real renders of the app as it stands. They span all four lanes: coverage
scope, known defects, committed features, and changes raised since the baseline.

**Before touching any item, check collection `decisions` on artifact `3478220d` for its id.** If
there is no answer, do not build it. Answers carry `choice` and an optional `note`, and are mirrored
into tracker flags named `kunal-decided-*`.

Settled ones worth knowing, from `DECISIONS-LOG.md` in this repo — **search that file before asking
him anything**: eval bar left and vertical (he accepted the 22px cost); the WHITE/BLACK word removed
(reverses #344, do not re-add); coach avatar is a chess piece with character; coach bubble built
without the avatar; online clocks built properly with flag-fall.

## 6. Scope accounting — so rework never reads as progress

Everything is priced in **runs**. What is already built is valued at what it would cost to **build
once**, not at the 374 builds actually spent. Three lanes, never averaged, plus a fourth outside the
baseline:

- **Coverage** — 1 of 10 screens fully specced and tested. The headline, because it is the only lane
  with an agreed finish line.
- **Known defects** — 28 at baseline, plus 3 added 2026-09-13.
- **Committed features** — 20, asked for before the baseline.
- **Raised since baseline** — everything new, **counted separately so the three denominators above
  never move.** Kunal's reason: *"if we think of an additional feature, that's a nightmare... so we
  can keep ourselves honest."* Currently 2 items, both changes of mind, priced at 1.1 runs.

Current: **46% complete, 39.3 of 87.5 runs. 62% functional, 0% ASSURED.** That gap — largely built,
barely verified — is the honest state of the app and the reason it kept feeling like going round and
round.

> **CORRECTED 2026-09-16 at #403.** This line read *"43% complete, 37.8 of 88.6 runs. 60% functional,
> 10% assured"* and every part of it was stale — the assured figure most of all. Kunal rolled Review's
> coverage back from `done` to `open` on 2026-09-14 (*"put it back to what it really is"*), because its
> 30 cases had been executed ONCE, against #373, by a file that was not in the repository. Assured has
> been **0 of 10** ever since, not 10%. The figures above are read off the dashboard's live snapshot.
>
> Why this one line mattered more than its size: STANDING CHECKS A found it (check C2-3, run
> 2026-09-16-08) and pointed out that **this is the document new build sessions are told to read
> first**, right after CLAUDE.md — so a withdrawn number sat at the top of the onboarding path for two
> days. A stale figure in a working note is untidy; the same figure in the induction document is how a
> corrected number comes back to life.
>
> **Do not re-cite a completion figure from here.** The live pair is in the dashboard's newest
> `snapshots` row (artifact `3478220d-8023-43ba-b08a-4397eb054cc3`), and `assuredDone` moves only when
> a whole screen closes — its three conditions are in the build procedure's section 5.

## 7. Kunal's feedback from 2026-09-13, measured before it was written down

From a live game against Rosa (900) on the live #375 build. Flags `kunal-fb-*` carry the full text.

| item | measured |
|---|---|
| **Move list rendered twice** on Play | `play-moverow`, a bordered box 357x30 at y=527, *and* the MOVES panel at y=660. Same moves, 130px apart. Removing the strip frees 30px; **the board stays 357 either way**. He says it is "across the board too" — check Review and Lesson. |
| **Eval bar invisible** against the background | Painted pixels: dark half `rgb(32,30,37)` on a page of `rgb(15,16,19)` = **1.15:1**, against a 3:1 floor for a UI element. White half is 8.78:1. The bar is 10px wide. So he can see where *white* ends and cannot see the bar. |
| **Analyze and Copy into More** | More holds only New game and Resign. Analyze (92x43) and Copy moves (121x43) sit in a row of their own at y=616. |
| **Takeback vs the computer** | Absent everywhere in live play. **Not a contradiction of #362** — his round-1 rule was "remove from live play, keep for practice." A game vs Rosa *is* practice; #362 dropped both halves when only one was asked for. |
| **Dedicated top chrome row** | `play-home` and `play-menu` (34x30 each) sit inside `pbar-top`. A 44px row puts the board **39px lower**, width unchanged at 357, no scroll introduced. The opening name already prints above the player bar, so the middle of that row is contested. |

Also observed, both previously open: **his profile photo does render** in the player bar (`n9` was
parked as "needs your phone"), and **minute clocks work vs the computer**.

## 8. Parked — do not spend runs here and do not ask again

- **The iPad, entirely.** Kunal, 2026-09-13: *"we need to figure out the iPhone layout first, and
  then we can worry about iPad."* Covers `Y-05` and the empty right-hand column.

## 9. Still open and genuinely unresolved

- **`k12`, the phone-only board/ply desync.** Root cause found: tapping "why" at a mate asked the
  engine for a continuation *from the mated position*, leaving the board on the pre-move position for
  10-14s. #374 fixed the label half, #375 the board half. The `setPly` instrumentation on branch
  `claude/ecstatic-tesla-m9updx` is the next step and is **not yet on main** — see §10.
- **Brilliancy explanations**, raised five times. The gap is named precisely now: the line states the
  *outcome* and never the *comparison*. chess.com shows what the brilliant move **beat**. Showing
  that is the missing half. He also wants it in a bubble over the top rather than the fixed box at
  the bottom, and he wants that **drawn before it is built**.
- **`S-01`**: "Other lines (2)" runs 55px off the right edge at 320 wide, on the lesson screen. Eight
  green gallery cards missed it because cards assert positions, not widths.
- **The stuck-worker timeout is unguarded.** The review's timeout was `Math.max(4000, movetime*8)`;
  at 4s it truncated real searches and stored a shallow depth-14 opinion as the answer, which is why
  a move that walks into mate read as "Great". It is 20s now. The only gate that would catch a
  regression here was `repro373.js`, which lived in a sandbox that no longer exists. **Rebuild it in
  `gates/` early**: two fresh browser contexts with `localStorage.clear()`, same PGN, same bundle,
  run sequentially; assert the two accuracy figures agree within 1.0 point, the nine verdict counts
  are identical, and the run times are within 12s. About 2 minutes.

## 10. First job: the two #375s

| ref | commit | app.js md5 | based on |
|---|---|---|---|
| `origin/main` | `14f06ac` | `ec6765a5` | the reconciliation — **the build Kunal is testing** |
| `origin/claude/ecstatic-tesla-m9updx` | `960b643` | `546ff19a` | `5822b67` (#374) |

Both stamped #375; diverged, main +1, branch +1. Rebase the branch onto `origin/main`, renumber
**#376**, re-run the full gate suite **on the rebased tree**, verify the stamp and hash at the pushed
SHA, then fast-forward. Expect conflicts in `app.js` around the review path — keep #375's
reproducible-review work from main and put `setPly` on top — and in `HANDOFF.md` / `RUN-LOG.md`,
where both sets of entries survive in date order.
