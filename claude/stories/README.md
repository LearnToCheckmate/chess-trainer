# `claude/stories/` — the id-space register

Read this before you write, quote or believe a case id.

## The collision this file exists to end

Two different suites use the prefix `TC-R` and both claim the paths `claude/stories/TEST-CASES.md` and
`claude/stories/USER-STORIES.md`:

| | this repo | the claude.ai project |
|---|---|---|
| size | 11 stories, 14 cases (`TC-R01`..`TC-R14`) | 30 stories, 31 cases (`TC-R01`..`TC-R31`) |
| `TC-R05` means | "tap a Skills number that has moves" | "read the summary" |
| executed by | `gates/regress/20-review.js`, `21-review-brilliant.js` | nothing — it is a specification, not a runner |
| visible to a build session | yes | no |

So **no sentence of the form "TC-R05 passed" is safe on its own.** That is not a theoretical risk: the repo suite's
results are copied into `TEST-CASES.md` verbatim from `gates/logs/<N>-all.log`, and the project suite's ids appear in
agent reports written by sessions that cannot see this repo. Same string, different case, both quoted as fact.

The audit of 2026-09-14 asked for one of the two to be renamed, and asked for it to happen **before** the 92 new
`TC-RL` cases are coded, on the grounds that adding cases to an ambiguous id space makes the ambiguity permanent.

## The register

| prefix | suite | file | owner |
|---|---|---|---|
| `US-Rnn` / `TC-Rnn` | the **gate-executed** Review suite — every case names the gate that runs it | `claude/stories/USER-STORIES.md`, `claude/stories/TEST-CASES.md` | this repo |
| `US-RFnn` / `TC-RFnn` | the **full** Review suite, 30 stories and 31 cases — a specification, broader than what the gates execute | `claude/stories/REVIEW-SUITE-FULL.md` (reserved; the document is still in the claude.ai project) | the test-lane sessions |
| `TC-RL-nnn` | the Review test lane: the 94 measured cases from `TEST-CASES-REVIEW.md`, 92 of them automatable | `gates/regress/*.js` as they are coded | the test-lane sessions, coded here by the build session |

### The gate-number register — read before adding a gate file

Three lanes published a gate on the afternoon of 2026-09-14 and two of them chose the same number, because
nobody could see what the others had just taken. The collision cost nothing only because it was caught before
any of them landed. **Claim a number here in the same commit that adds the file.**

| file | lane | authored as | notes |
|---|---|---|---|
| `23-full-walk.js` | build session | 23 | #390. Build-lane range |
| `22-engline-recovery.js` | build session | 22 | #389. Inside the new **10-29 build lane** range (procedure v13, section 6e item 4) |
| `41-coach-bubble.js` | build session | 41 | |
| `42-home-devrow.js` | build session | 42 | |
| `43-tcrl-analysis.js` | build session (TC-RL batch 1) | 43 | pushed first, so it kept 43 |
| `45-play-setup.js` | Play setup lane | **43** | renumbered: 43 was already pushed |
| `46-play.js` | Play lane | **44** | renumbered with it, to keep the two lanes adjacent |
| `47-menu.js` | Menu/settings test-authoring lane, pasted by the build session | 47 | #399. **47 WAS CLAIMED TWICE MORE.** See below |
| `48-lesson-flow.js` | Lesson test-authoring lane, pasted by the build session | 48 | #403. 195 assertions |
| `26-invariants.js` | build session | **26** | #404, extended #413. Authored as `47-invariants.js` by two flags; 47 was gone. See below. **67** assertions on two geometries as it last ran at #412 (its own header's #404 control run says 67 too; the "64" I first wrote here was a guess and the number is read off `gates/logs/412-all.log`); **200 at #413**, and the suite total moved 1779 -> 1912, the same +133 - it gained invariant **4b** (ink painted outside its own box and onto a sibling), the 375x568 column and the lesson PRACTICE screen |
| `27-scan-fen.js` | build session (board-scan spec, Part 6.1) | **27** | #405. The spec pencilled in **50**; 50-69 is the challenger range. See below |
| `28-scan-client.js` | build session (board-scan spec, Parts 4 and 6.3) | **28** | #408. The browser half of board scanning: R-BS-1 and R-BS-2. Next free build-lane number after 27 |
| `29-draws.js` | build session | **29** | #414. A drawn game never ended: threefold repetition and the fifty-move rule were detected nowhere while stalemate was. 20 assertions, including the 100-ply fifty-move path driven with a generated 106-ply knight sequence whose 107 positions are all distinct. Next free build-lane number after 28 |
| `49-home.js` | test authoring lane (HOME-LANE-2026-09-15) | **49** | #411. Published complete in docs/home-lane on 2026-09-15 and pasted unchanged. Its own header explains why 47 and 48 were not free |

**RANGES RESERVED, from procedure v13 section 6e item 4:** **10-29 build lane**, **30-49 test-authoring lane**,
**50-69 challengers and audits**, **70-89 the play lane**, **90-99 scratch and never committed.** Existing files
are NOT renumbered - the ranges apply from here on, which is why 41/42/43 and 45/46 sit outside them.

**`gates.sh` NOW FAILS LOUDLY ON A DUPLICATE NUMBER (#399, procedure 6e item 4).** This table stopped being the
only check. The guard reads the `regress/` DIRECTORY rather than the gates this invocation runs, so a subset run
catches a collision too, and it exits 1 naming both files before a single gate starts. Negative-controlled at
#399: with a second `47-*.js` present it printed `47: 47-dupe-control.js 47-menu.js` and exited 1 in under a
second; with the file removed the suite ran normally.

**NUMBER 47 WAS CLAIMED THREE TIMES, and two of the three claimants are still unpushed.** The external
supervisor caught this on 2026-09-15 while it was still catchable. `47-puzzles.js` (PUZZLES-LANE-2026-09-14)
came first by authoring date; `47-menu.js` (MENU-LANE-2026-09-15, 01:50Z) came second, and the two lane
documents written after it - LESSON-LANE and HOME-LANE - both assume 47 is menu and take 48 and 49. So:

- **47 goes to `47-menu.js`**, which is what this commit pushes. Not because it was first (it was not) but by
  this register's own existing rule: the file named in a pushed commit, in `gates/logs/` and in `RUN-LOG.md`
  keeps its number, because renaming it would rewrite the record of what was measured and when. Three of the
  four lane documents already read 47 as menu; moving it would falsify three documents to spare one.
- **`47-puzzles.js` must renumber before it is pasted.** `44` is the recommendation: it is in the
  test-authoring range, it is adjacent, and it is currently free. That does spend the deliberate 44 gap - the
  gap was left to make the 43/45/46 renumbering visible in the directory listing, and this paragraph now
  carries that record instead, which a directory listing never could.
- `48-lesson-flow.js` and `49-home.js` are unaffected and remain claimed by LESSON-LANE and HOME-LANE.
  `48-lesson-flow.js` LANDED at #403 with 195 assertions (two of its taps had to be guarded first: as pasted,
  its own negative control measured 16 FAIL of only 48 assertions RUN, because `D.tapBtn` throws and `L.run`
  catches at top level). `49-home.js` LANDED AT #411, pasted unchanged from
  `docs/home-lane`, and it is the last of the published-but-absent gates: 158 pass / 0 fail on #410, twelve
  builds after the run that authored it, so nothing on Home had moved. Its NC2 was re-run here rather than
  cited - 27 red on the full gate where the document records 15, because the document's 15 was a
  `CT_HM_BLOCKS=A,B` subset run printed as a bare count (measured: that subset gives exactly 15). So
  `standing-a-c2-gates-claimed-not-in-git` has nothing left in this column.

**THE BOARD-SCAN GATE IS 27, NOT THE 50 ITS SPEC PENCILLED IN.** #405. The spec (tracker
`jobs/build-spec-board-scan-server`, Part 6) wrote `gates/regress/50-scan-fen.js` and said in the same
paragraph that the number was "to be confirmed by the build lane", having noticed that three specs written on
the night of 2026-09-15 each picked a gate number without coordinating - online clocks took 47, video call took
49, and board scan took 50 - which is precisely how `45-play-setup.js` and `46-play.js` collided. Two things
settle it: **50-69 is reserved for challengers and audits**, and this is build-lane work, so it belongs in
**10-29**; and 27 is the next free number after `26-invariants.js`. The spec's own words were "somebody should
own the register before any of the three lands" - this table is that owner, and `gates.sh`'s duplicate-number
guard (#399) is what makes it mechanical rather than a matter of remembering. **The video-call spec's claim on
49 IS NOW A COLLISION AND NOT A RISK: `49-home.js` is in the repo since #411**, and `gates.sh`'s
duplicate-number guard will refuse the second file rather than let two gates share the number. Whoever pastes
the video-call gate must take a free build-lane number (16-19 or 29) rather than 49 - **28 went to `28-scan-client.js` at #408**, so the spare
build-lane numbers are now 16, 17, 18, 19 and 29.

**THE INVARIANT GATE IS 26, NOT 47, AND THAT IS THE FOURTH CLAIM ON 47.** #404. Flag `build-the-invariant-gate`
and flag `class-ink-clipped-by-own-ancestor-2026-09-15` were both written on 2026-09-15 and both name
`gates/regress/47-invariants.js`; `47-menu.js` landed the following night. By this register's own rule the
pushed file keeps the number, so the invariant gate moved - and it moved INTO the range it always belonged in:
**10-29 is the build lane**, and the invariant gate is the build session's own. 26 was free and sits next to
`25-online-clocks.js`. Nobody had to renumber anything, because nothing had been pushed under the name yet;
this is the first of the four 47 claims to be settled before it cost anything, and the reason is `gates.sh`'s
duplicate-number guard (#399) plus this table, not anyone remembering.

Theirs moved rather than mine for one reason, and it is the same reason this register exists for `TC-R` ids:
`43-tcrl-analysis` is named in a pushed commit, in `gates/logs/`, in `RUN-LOG.md` and in this file, and renaming
it would rewrite the record of what was measured and when. `gates.sh` runs `gates/regress/*.js` in NAME order,
so the number is ordering and nothing else. **44 is deliberately free** — leaving the gap costs nothing and
makes the renumbering visible to anyone reading the directory.

### TC-RL coding progress (started 2026-09-14, #386 re-gate)

The 94-case document is staged in the tracker artifact `20acb6cb-42bf-44a3-b2fe-5a8223cca1e2`, collection
`docs`, doc id `test-cases-review` — put there by the feedback session after this session flagged that the
project copy was unreadable from a build session (`testlane-item8-not-doable-from-build`). Work it in batches
of about ten, one batch per chain link, in document order, and gate after each batch.

| batch | cases | gate | coded | left out, and why |
|---|---|---|---|---|
| 1 | TC-RL-001 … 011 (US-R04) | `gates/regress/43-tcrl-analysis.js`, 32 assertions | 001, 002, 003, 005, 006, 007, 010, 011 | **004** NEEDS-KUNAL (K15: is a 200-ply review in scope at all); **008** NEEDS-KUNAL and the doc's own note says headless Chromium cannot reproduce it — it needs a phone recording; **009** NEEDS-KUNAL, no failure state exists in the build to assert against |

**What batch 1 deliberately does NOT pin:** the doc measured the summary arriving in 15–27 s. That is a
property of the machine, not the app, so pinning it would make the gate red on a slow container and green on
a fast one. Elapsed time is REPORTED on every run instead, so a real slowdown is visible without being
asserted against. What is pinned is what the app controls: the exact progress wording, the engine element,
the percentage never going backwards, exactly six buttons while an analysis runs, and byte-identical accuracy
across three cold contexts.

`TC-RL-nnn` does not collide with anything and needs no rename. `TC-RL-039` (the strip must re-sync at ply 0) and
`TC-RL-070` (every row of the review ⋯ sheet must be reachable) are coded as `gates/regress/37-strip-sync.js` and
`gates/regress/38-rev-sheet-reach.js`.

## Why the repo suite kept `TC-Rnn` and the project suite is the one that moves

Not seniority — traceability. The repo suite's ids are baked into 115 places that are **evidence**: gate source, the
`gates/logs/` files those results were copied from, `claude/agents/REGRESSION-LOG.md`, and the SAT rows in
`TEST-CASES.md` that cite a build and a log by name. Renaming those rewrites the record of what was measured and
when. The project suite's ids appear in documents that are still being drafted, so moving them costs nothing that
has already been proved.

## The rule, until the rename has landed

**Never write a bare `TC-R05`.** Name the suite in the same breath — "repo `TC-R05`" or "full-suite `TC-R05`" — or
use the new prefix. This applies to gate comments, agent reports, flags and messages to Kunal alike.

## What is still outstanding

The project-side half of this cannot be done from the build session: `REVIEW-SUITE-FULL.md` and its `TC-RFnn`
renumbering live in the claude.ai project, which this session cannot read or write. Tracker flag
`suite-id-collision-tc-r` carries the request, with the target names above. Until it lands, this register is the
thing that makes a repo sentence unambiguous, and the reserved row for `REVIEW-SUITE-FULL.md` is what stops anyone
claiming that path for something else in the meantime.
