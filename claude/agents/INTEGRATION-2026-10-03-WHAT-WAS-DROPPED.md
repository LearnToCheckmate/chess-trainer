# Integration, 2026-10-03: what was NOT landed, and the live defect one of them found

Written by the daily integration slot (`build__1791066013164`) in the same step as the drop, because
antagonist B's veto was right about the record: the tracker carried the reasoning and
`git log --oneline` for this branch carried nothing, and B — which has no database tool by design —
could only see that a gate had silently become byte-identical to `origin/main` again.

This file exists so the next reader finds it from the repository. #450's lesson is the precedent:
#441's stand-down warning lived only in a prose cell on a branch that never merged, and it was lost.

## The batch

Burst wave 1 parked 15 patches in the tracker (the burst sessions' git proxy refuses write to this
repository, so no `claude/burst-*` ref exists and none ever will). This run recovered them and landed
**11**. Wave 2 stood down having spawned zero agents; wave 3 is recommended cancelled. No application
code is in this batch: `app.js` and `chess.jsx` are byte-identical to `origin/main`, so the bundle
under test is #474's, md5 `8b958354102b`.

## DROPPED — and the one that matters

### gate 16 (`gates/regress/16-cpu-result-line.js`) — DROPPED, AND IT FOUND A REAL DEFECT

Parked at tracker `docs/burst-06-gate-16-clip-patch-2026-10-03`, applied, measured, dropped. The file
on this branch is byte-identical to `origin/main`'s.

**Measured under the real harness** (`gates/gates.sh '#474'` subset, against `app.js` on `origin/main`):
**137 pass / 1 fail**. The one fail is its new assertion N3 at 730x350, and **the red is true**:
the CPU result line's Elo estimate is clipped at the bottom in landscape.

| | |
|---|---|
| element box | `{x:290.6, y:206.5, w:64.8, h:15}` → bottom 221.5 |
| composed clip window of 5 ancestors | bottom **217** |
| real glyph ink lost | **2.0 device rows**, about the bottom 20% of the digits in `≈450 Elo` |

The 2.0px figure is antagonist B's, by pixel comparison of the gate's own clipped (730x350) and
unclipped (730x375) screenshots of the same string — 10 ink rows against 8, the cut landing exactly at
217 — corroborated by `canvas.measureText`, which gives a real glyph ink height of 10.00px.

**A number this run published and withdraws here [R18]:** I first reported the ink loss as **4.5px**,
reasoning that because the gate's `ink` rect equalled its `box` rect there was no slack for the clip to
eat harmlessly. That reasoning is backwards. `Range.getBoundingClientRect()` returns the **font box**,
not glyph ink (measured: 12px font / 15px line-height → box 15, Range 14, real ink 10; at 12px/30px the
Range is still 14), so `ink == box` means *the instrument cannot tell them apart*. The verdict survives;
the magnitude was wrong by 2.25×.

**Why it was dropped rather than landed:** a correct assertion that is red against the shipped bundle
makes the suite emit `GATES RED` for every lane, and nothing in this project may push on a red log — so
landing it blocks the whole fleet until an app fix exists. Nothing was weakened or skipped to get green.

**Owed:** `jobs/cpu-result-line-elo-is-clipped-45px-in-landscape-at-730x350-2026-10-03`. Land N3 **with**
the `chess.jsx` fix, in one commit, so the suite is never red — and **not as written**: `cutInk` is a box
number wearing an ink label and `unclipped` is `cutBox<=0.5` ANDed with itself, so it will false-red on the
first element with real line-height slack. Use `actualBoundingBoxAscent/Descent`.

### gates/buildnum.sh — DROPPED, it breaks a control it never ran

Parked at `docs/burst11-art-gates-buildnum-sh-patch-2026-10-03`. Green on its own 12 controls; takes
`gates/buildnum-selftest.sh` from **76 pass / 0 fail to 75 / 1**. It recomputes the absent set with
`comm -23` over two `LC_ALL=C sort -u` streams, so on a four-digit register the difference is
lexicographic: it calls #100 absent and misses #1001. Owed:
`jobs/buildnum-patch-computes-the-absent-set-lexicographically-and-breaks-its-own-selftest-2026-10-03`.

### gate 50 (`gates/regress/50-drill-verdict-no-jump.js`) — NOT LANDED, on its own instruction

Its document says `doNotLandYet`: `gates/gate-manifest.tsv` records it absent, landing it reddens the
suite at 20 measured fails, and it waits on a board-height decision that is Kunal's.
`gates/gatemanifest.sh check` independently reports it known-absent. Nothing was rebuilt.

### agent 01's `gates/held.sh` work — LOST, and not by any decision of this run

`docs/burst-patch-held-sh-field7-2026-10-03` claims to carry a `gates/held.sh` patch closing two jobs
with 12 green controls. Its `patch` field is a `git format-patch` of `f3ae36a` — **its own `baseSha`** —
whose only diff hunk is `RUN-LOG.md`, which is #473's close-out and already an ancestor of `main`. The
tell is free: the patch's `From` sha equals its own base. That agent's commit existed only in a container
that has been discarded, so the work is unrecoverable and the two jobs it names are **not** closed. Owed:
`jobs/the-held-sh-burst-work-is-lost-the-parked-patch-was-the-base-commit-2026-10-03`, and the charter fix
`jobs/nothing-verifies-a-parked-patch-so-one-of-fifteen-carried-the-wrong-commit-2026-10-03`.

## Two claims this run will NOT make

- **The register edits did not fix the citation reds.** `verify-log.sh --citations` is RED at 18 dead
  paths / 19 unsupported case ids / 9 misfiled rows both before and after this batch's 138 lines of
  register changes — byte-identical verdicts, measured by rebuilding the tree with `origin/main`'s
  registers and the new checker. Six more citations resolve; every red count moved by zero.
- **A green suite here does not say the suite is sound.** `verify-log.sh`'s two strictness flags key on
  `app.js`'s md5 and on the log's own sha, and this batch changed neither — so 1228 insertions across
  `gates.sh`, `verify-log.sh` and `gatemanifest.sh` are invisible to the tool that authorises pushes.
  Filed as `jobs/the-push-gate-has-no-key-for-the-suite-itself-2026-10-03`, under the cause
  `jobs/the-push-gate-is-the-least-adversarially-executed-script-in-the-project-2026-10-03`.
