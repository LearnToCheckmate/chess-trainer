# HANDOFF — after #521: THE ARM SPLIT IS BUILT AND CONTROLLED AND IT DID NOT LAND

**NOTHING FROM #521 IS ON main EXCEPT THIS RECORD.** `origin/main` is unchanged at `d85ffb0` for the application
and for `gates/`; this commit carries records only (this file, `RUN-LOG.md`, and the gate log) through main's own
RECORDS tier, which is why it exists at all. **Read the next three paragraphs before planning anything.**

**GATES RED #521 — 59 sections, 58 green, 1 red, 4884 PASS; the red is 48-lesson-flow.** ONE assertion, in `gates/regress/48-lesson-flow.js` at 320x540
`[endgame-demo-end]`: the lesson demo board sits at **192px** and the ⟳ Flip control runs **35.23px** past its own
row, because at board 192 the row cannot hold its two children's min-content (**227.23px** against 192px).
Bundle `f47aa0197967` — main's own registered #511 artefact, re-gated under `CT_EXPECT='#511'` because nothing in
the diff touches a bundle input. **Tenth consecutive build with no application code.**

**THE RED IS NOT THIS BUILD'S, AND THAT IS MEASURED THREE WAYS, NOT ARGUED.** (1) `git diff --name-only
d85ffb0..49ec643` is **two files**: `gates/fastgate.sh` and `gates/build-numbers.tsv`. (2) Every input gate 48
reads is **byte-identical** between main and the gated sha, checked with `git rev-parse` per path —
`gates/regress/48-lesson-flow.js`, `gates/lib.js`, `gates/drive/lesson.js`, `gates/mountcheck.js`, `app.js`,
`chess.jsx`, `index.html`. (3) Gate 48 was **green at #520 with 353 PASS / 0 fail over this same bundle**, and it
visited 320x540 there too. Those same three numbers — 192, 35.23, 227.23 — are what **#512** recorded, on the same
gate at the same geometry that **#467** and **#468** each went red on.

**AND THE DIFFERENTIAL PINS A MECHANISM THAT JOB SAYS IS NOT ESTABLISHED.** Comparing the same assertion's own
JSON payload across the two runs, on byte-identical inputs: `needed` is **227.23 in both, identical to the
hundredth**, while `board`/`rowW` read **236.4/236.39 at #520** and **192/192 here**. The two children measured
159.64 + 70.75 at #520 and 159.64 + 61.59 here — **the first child is identical to the hundredth**. So the
nondeterminism is in **board sizing**, not in fonts, not in text metrics, not in the row's content: a font or
fontconfig difference would have moved the first child, and would not have left the row's min-content identical.
192 is the documented floor, so what varies is whether the fit loop latches to it.
`jobs/lesson-demo-board-is-bistable-at-375x568-2026-09-29` is status **blocked** under Kunal's product pause with
his answer already given (`refit-no-blink`, 13 Oct), and #515 built two candidate fixes that this same gate 48
falsified.

## WHERE THE WORK IS, AND WHAT IT IS WORTH

**Branch `claude/practical-sagan-8t3gj4`, head `55ef500`, whose TREE is byte-identical to the gated sha
`49ec643`.** The head is a merge built with `git commit-tree` so the gated sha would not move while the suite ran;
the second parent `e5c5969` is a superseded early push. **No rebase is needed as of this record** — measured, not
assumed: `git merge-base --is-ancestor d85ffb0 55ef500` is TRUE, so the branch is strictly ahead and nothing on
main is deleted on the way in. Re-check it, because main moves.

The hand-off job is
`jobs/521-the-register-arm-split-is-built-and-controlled-and-held-on-the-parked-lesson-board-latch-2026-10-14`
(owningLane build, status ready, priority 17 — not below the parent's). The figures are in `builds/521`.

**DO NOT REBUILD OR RE-DERIVE IT.** The arm split, the `BNRATCHET` premise, the blob-identity guard, all **14 of
14** controls and both antagonist vetoes are done and recorded. The amendment made after those controls is
provably comments-only, two independent ways: comment-stripped md5 `af69b6528737` at both `812698d` and
`49ec643`, and `git diff` between them is **33 changed lines of which 33 are comments and 0 are not**.

**THE ONLY STEP LEFT IS A GREEN FULL SUITE, AND BE HONEST ABOUT WHAT THAT IS.** `gates/fastgate.sh` is FORCE by
its own `classify()` — *"this script gates itself by the full suite"* — so the tier cannot gate the change that
builds it, and the full suite was the only door. The latch is bistable but **stable within a run**, so a re-gate
is **a coin flip, not a fix**. Three builds in this exact position (#467, #468, #512) stood down rather than
re-roll. Say which it was in the record.

## WHAT WAS BUILT, IN ONE SENTENCE


`classify()`'s shared arm `gates/held-trees.tsv|gates/build-numbers.tsv` is SPLIT: the build-number register is
RECORDS, so a commit that rebuilt the bundle AND minted its number can reach the fast tier; `gates/held-trees.tsv`
stays FORCE alone. This is PART TWO of
`jobs/the-tier-check-compares-a-stamped-bundle-so-no-rebuild-is-ever-byte-identical-2026-10-10`, on Kunal's "Yes."
in chat at about 11:26am ET on 14 Oct, under `docs/restart-readiness.directOpening_2026_10_14`.

**#514's stamp exemption now fires for the first time.** Before this arm it reached **0 of 400** commits, measured
twice independently; the two halves are what make a close-out reachable and neither does anything alone.

## READ THIS FIRST: THE NUMBERS, AND FOUR OF MINE ARE WITHDRAWN

Each version's own `classify()` over `origin/main`'s last 400 commits' changed sets, `NOJEKYLL=yes`:

| model | reach |
|---|---|
| main's arm today | 162 of 400 |
| this arm, pure classify | 181 (+19) |
| this arm, #514's stamp-only condition ACTUALLY APPLIED | **191 (+29, adds 10)** |
| this arm, app.js exempt unconditionally — AN UPPER BOUND | 192 (+30) |

- **173/192 was in circulation and does not reproduce.** The +19 marginal does, exactly; the absolutes do not.
- **192 is NOT the exemption applied.** Antagonist A disputed it and I re-derived it myself: `so_pred` over each
  of the 11 commits the exemption newly reaches returns ten STAMP-ONLY and one not — `b5732bc`, "#491 mint and
  bundle", whose differing bytes are not confined to the three stamp sites. So **191**. My label had asserted a
  condition I had not applied, one row below a paragraph withdrawing two figures for exactly that.
- **The register row counts are 11 and 11, not the 13/13 I published.** My awk excluded neither `#` comments nor
  rows cleared with a leading `-`; `held.sh`'s own `match_rows`/`live_rows` exclude both. `held.sh check`
  printing "11 matchable row(s) checked" is what contradicted me.
- **"nine other places" is 35 occurrences across 30 lines** of `records-gate.sh` (A's measurement, re-derived).
- **Do not publish #514's "73 commits touch app.js / 64 also touch the register" beside 191** — that census is on
  #514's window. On this window B censused 61 app.js-touching commits, all 3-stamps-to-3-stamps.

## WHY held-trees.tsv STAYS, AND WHY THE SPLIT IS THE RIGHT SHAPE

`records-gate.sh`'s `consumer_row_count` copies `held.sh`'s `live_rows` (NF>=6) while `held.sh check` uses
`match_rows` (NF>=2); live is a subset of match, so a drift dropping a 2-to-5-field row is invisible to the arm
and visible to the consumer — a false ACCEPT. Measured through both pipelines: match 11, live 11, **band ZERO**,
so it is latent. The job made settling it the condition for moving this path and this run did not settle it.

**But for the register that MOVED there is no asymmetry at all**, and this is the part worth carrying forward:
`consumer_row_count`'s build-numbers arm (`records-gate.sh:238`) is **byte-identical to `gates/buildnum.sh:102`'s
own `rows()`** — the single filter every buildnum consumer reads the register through — 500 rows both ways. The
arm is faithful for the file that now leans on it and miscounts only for the file left forced.

## THE RESIDUAL THIS SHIPS, NAMED AND NOT CLOSED

**A well-formed register row that is hostile by VALUE is now cheap to plant, and its undo is still refused.**
Both antagonists drove it independently, one commit over main:

- an appended row numbered `#999` (B) or `#600` (A) takes **EXIT 0 FAST GATE GREEN**;
- `gates/buildnum.sh next` then **exits 2** — "number(s) cut off from its own series" — and **no run can mint**
  until a human retires the row or every call carries `BUILDNUM_MAX_DELTA`;
- deleting the row answers **EXIT 1 NOSHRINK**, so the undo costs a full suite on the lane that caused it;
- the accident, not just the attack: a mint row with **one extra digit typed** (`521` → `5211`) does the same;
- a second value class none of the three mechanisms sees: one appended row claiming a number for a **different
  runId** flips ownership, so `stampable` locks the true holder out of its own number — the #519/#520 incident.

**The honest counterweight is the antagonists' own, and it sets the severity.** `gates.sh` never runs
`gates/buildnum.sh`, so **the full suite never checked these values either**: the FORCE arm was a TOLL, not a
check. What #521 changes is the PRICE (about 110 minutes to about 7 seconds) and the verdict word, not the
reachability. The series bound that landed at #520 is the protection and it works — it turns a silent wedge into
a loud refusal naming the problem. What it does not do is prevent the plant.

**THE NEXT STEP, AND IT IS A CONTROL SET AND A CALL SITE, NOT A NEW ALGORITHM.** Add a value-plausibility arm to
`records-gate.sh`'s build-numbers case refusing an appended row whose number is cut off from the series — the
predicate `gates/buildnum.sh:256`'s `delta_ok` already computes from `series_run()`. It would have refused every
one of both antagonists' appends. **It was deliberately NOT taken here:** Kunal's authorisation covers taking
this path out of the FORCE arm and nothing wider, and antagonist A said it would have objected had I taken it,
because shipping a values guard with no controls in the same run that removes the values protection is the shape
this project files against.

## AND #514's RESIDUAL (1) IS NOW LIVE — ITS WHOLE MITIGATION WAS THE SENTENCE THIS BUILD FALSIFIED

#514 named three residuals and said of the first that its impact was low "for a structural reason rather than a
lucky one — a REAL build also writes a `gates/build-numbers.tsv` row, which `classify()` FORCEs, so anything that
genuinely rebuilt goes full anyway." **#521 took that FORCE arm off, so the mitigation is void.** A drove the
consequence: replacing all three stamps with `#001 - 2026-10-10 07:40 ET` — same length, lower number, a lie —
plus an ordinary mint row takes **EXIT 0** where main takes exit 2. Bounded honestly: no code byte moves, so no
app defect reaches a player this way; what degrades is the three on-screen stamps and the provenance of every
archived log and register row keyed on the number. `49-home.js` still passes because it asserts the FORMAT. The
realistic accident is a wrong DATE through `build.sh`'s unvalidated `CT_STAMP_TIME`, not a wrong number.

Residual (2), `held.sh check`, is genuinely still closed: any `chess.jsx` in the diff exits 2 at `classify()`, so
the `sourceMd5` key is unchanged. A re-verified that.

## THE BLIND PAIR, AND THE ONE RESULT THAT OUTLIVES THIS BUILD

Both antagonists VETOED. **Both vetoes upheld and fixed; neither overruled.** Records: `flags/antagonist-a-521`,
`flags/antagonist-b-521`, `flags/antagonist-pair-coverage-estimate-521`. Overlap: **common 6, unique to A 8,
unique to B 8** — both blindness conditions held (one message, B on an agent type with no database tool), so the
estimate is publishable; B contributed 8 of 22 unique against 2b's one-in-five stop condition, so the pairing is
earning its budget.

**B BROKE A's OWN PROPOSED FIX, AND THAT SEQUENCE IS THE STRONGEST ARGUMENT FOR THE PAIR THIS PROJECT HAS.**
B found my new `BNRATCHET` guard answered `yes` for a door that had dropped the entry (a trailing comment on the
assignment line satisfies a line-anchored grep) and drove it to a fast green over three register rows rewritten
in place. I fixed it by extracting the quoted VALUE. A broke that: reading the door's SOURCE is reading the wrong
object, because the tier RUNS the door from the WORKING TREE while my check read it from the object store, tied
together only by `git status` — and `git update-index --assume-unchanged` gives a fast green with **no prior
commit at all**. A prescribed asking the door via `--entries`. **B then broke THAT**, with one line inside
`entries_live()` in the working tree: `--entries` lists the register while the ratchet loop still skips it.
"One list" is not a property of a FILE, it is a property of an HONEST COPY of that file.

**So the repair that is on the branch is neither antagonist's prescription:** a blob-identity guard comparing the commit's
blob against the working-tree blob for **every file the tier EXECUTES** — and B's list of three was short, because
`gates/gatemanifest.sh` is executed too. All four are covered. It is a no-op on any honest tree, because a clean
`git status` already implies worktree == index == HEAD, so it can only fire where the status check was being lied to.

## FOURTEEN CONTROLS, EVERY ONE A REAL EXIT CODE THROUGH THE SCRIPT IN A SCRATCH CLONE

| control | verdict |
|---|---|
| H1 base script, close-out-shaped commit | exit 2, FULL SUITE REQUIRED, names the register |
| H2 this script, the SAME commit | **exit 0, FAST GATE GREEN** |
| R1 a register row edited in place | exit 1, PREFIX |
| R2 a register row deleted | exit 1, NOSHRINK |
| R3 one NUL appended after a legitimate row | exit 1, TEXT |
| R4 register append + `chess.jsx` | exit 2 naming chess.jsx — go full, NOT a refusal |
| R5 `held-trees.tsv` appended | exit 2, FORCE alone — the split |
| G1 `RUN-LOG.md` + `HANDOFF.md` only | exit 0 |
| G2 one legitimate register append alone | exit 0 |
| P1 ratchet entry removed at base | exit 2, `--entries` names what left |
| P2 root `index.md`, `.nojekyll` absent at base | exit 2 naming index.md |
| **N1 B's trailing-comment attack** | **exit 2** (was exit 0 FAST GATE GREEN) |
| **N2 A's assume-unchanged defang, no prior commit** | **exit 1**, blob guard, `git status` saw 0 paths |
| **N3 B's two-line `--entries` lie** | **exit 1**, blob guard, `--entries` DID list it |

## WHAT THIS RUN COST, DECLARED RATHER THAN LEFT TO BE FOUND

1. **I found three MORE false sentences after both vetoes, by running the grep the antagonists taught me** —
   including one that contradicted a correction I had made two paragraphs above it. Fixing them moved the tree, so
   I killed the 6-minute-old suite rather than let the log name a sha that was no longer HEAD, and relaunched. The
   partial log is `gates/logs/521-all-ABANDONED-tree-moved-before-relaunch.log` and authorises nothing. The
   amendment is provably comments-only: comment-stripped md5 `af69b6528737` at both shas.
2. **I committed the #416 trap.** Stopping that suite I ran `pkill -f 'gates/regress/'` from a shell whose own
   command line contained that string, and killed my own shell (exit 144) — the exact failure CLAUDE.md records,
   in a run that had read the paragraph an hour earlier. I had used the bracket trick correctly for `pgrep` two
   lines above. Nothing was lost; the aftermath was verified with `ps`, 0 survivors, no stale `.suite.lock`.
3. **My branch is 1 ahead / 1 behind what I pushed**, because I amended twice after pushing it. Only a force-push
   could move that ref and that is forbidden, so `origin/claude/practical-sagan-8t3gj4` stays at `e5c5969`,
   inert, and main carries the real content.
4. **I published 13/13 and the stale 192** before measuring them. Both withdrawn above.

## STILL OWED, AND NONE OF IT IS THIS LANE'S TO TAKE

1. **The value-plausibility arm** (above) — the named next step for the register.
2. **`jobs/the-guard-registers-cannot-leave-force-until-the-ratchet-speaks-the-consumers-language-2026-10-10` is
   NOT credited and must not be.** Antagonist B's veto of #518 stands and the opening forbade crediting it.
   `gates/held-trees.tsv` is still FORCE, which is what that job is about.
3. **A's rotating audit found a live gate defect nobody was looking at:**
   `gates/regress/70-live-game-reset-guard.js:187-190`, where B3's three deltas each fall back to `0` when the row
   is absent or renamed, so it PASSES on the worse defect — thirty lines above `C4`'s `worst=999`, which handles
   exactly that case. Plus five `b.errs.length===0` absence assertions with no positive control anywhere.
4. **B's P2 set:** nothing pins the copied consumer pipelines (now load-bearing); premise check part two is blind
   to `__dirname+'/../..'` concatenation (latent); `gates/*.tsv) RECORDS` is the live default for any NEW `.tsv`;
   and a row written `#521` rather than `521` makes `check` answer **free**, `stampable` exit 0 to any run and
   `next` hand out #521 again — the #416 defect by one character, reachable only by an in-place edit, which
   PREFIX catches.
5. **The reverted-commit-subject defect from #520 is still open and still the orchestrator's** [R17]: LANDED must
   require the payload's CONTENT on main, not its commit subjects.
6. **Two stale `parked-unlanded` artefact locks.** `claims/art-gates-fastgate-sh` and
   `claims/art-gates-records-gate-sh` both read `parked-unlanded` while their payloads are ON MAIN (#517 and
   #518/#520). R44 A2 gives the clearing condition but names nobody to apply it, and the landing pass writes the
   `integrationResult` on the PATCH and never touches the LOCK — so a parked-unlanded lock is cleared by no step
   in any lane's procedure. I took the fastgate one over on measured evidence and recorded why.

## ALSO FOUND, OUT OF STEP 0b: THE BRANCH-PUSH CONFLICT WAS NEVER A CONFLICT

**Corrected in the TRACKER only. `CLAUDE.md` on main still carries the error** — `classify()` calls
`CLAUDE.md` FORCE (*"a commit that rewrites the rules every session reads is not a records commit"*), so the
fix could not ride this records commit, and the full suite is red. The authoritative copy IS corrected:
`prompts/build-run` wins over this repo by the routine's own instruction, and its text and
`triggerPromptVerified_2026_10_14b` both carry it. The exact replacement text for `CLAUDE.md` is at the end
of this file so it survives this container and can be applied in one edit by whoever next has a green suite.

Not a widening of the authorisation — `takeNothingElse` governs work taken, and this is a records correction to
the two documents the opening step reads, found by a required step.

**The trigger-prompt verification itself found nothing**: fired PART 1 len 1508 md5 `94e526c6dad18209`, equal to
the stored `triggerPrompt` field and to today's 02:14Z figure, byte-identical after normalisation, push-authority
clause present in both copies checked by three substrings. Recorded as `triggerPromptVerified_2026_10_14b`.
One method change worth carrying: this session was context-compacted before STEP 0b ran, so the prompt was taken
from the session transcript jsonl rather than written out. A from-memory capture would have been a paraphrase of
a *summary*, and the eight earlier fields' wording ("I wrote my own scheduled-task prompt ... verbatim") cannot
tell the two apart.

**What was wrong was the documents.** CLAUDE.md's branch-record row and `prompts/build-run` both attributed the
sentence "**PUSH** to the specified branch when your changes are complete" to the routine's own prompt. Measured
on this run's own fire: `PUSH` occurs **once** in that prompt, in its own PUSH AUTHORITY paragraph, about
**main**; `branch` **once**, in "never delete a branch"; `"specified branch"` **0**; `"designated"` **0**; this
run's own branch name **0**. The sentence and the branch name arrive in a harness-injected
`## Git Development Branch Requirements` block, delivered as a system-reminder in the same turn.

**And both documents inverted the authorities.** They cast build-run's R1 — "the designated-branch instruction is
satisfied by developing there" — as a tracker interpretation that cannot repeal what the routine fires with.
R1 restates **Kunal's own standing decision**, `decisions/desk-round-1-2026-09-19` field `d14_branch`, 19
September: *"Q-BRANCH = main. Builds land on main, as CLAUDE.md says. The designated-branch instruction is
satisfied by DEVELOPING there. Push to main. Fetch and rebase if main moved. Never the GitHub upload page."*
The conflict is a harness block against the project owner, with this lane's own procedure on the owner's side.

Both also routed an ask to `jobs/branch-record-cannot-ever-be-current-2026-09-28`, which has been **closed since
2026-10-10T18:35Z** as not-a-defect on exactly that ground.

**#428 measured the harness/routine split on 2026-09-28** and its job field
`theAskMayBeAimedAtTheWrongPlace_2026-09-28T22-14Z` names *both* documents as citing it wrongly — then fixed only
the literal-prefix half and left the attribution standing in the two homes its own note had identified. Corrected
at #521 in both, quoting the withdrawn text [R18]. Not written to the closed job: the orchestrator owns it and
nothing is owed on it.

**What does not change:** the harness block still fires every wake, this lane cannot edit it, `d14` does not
forbid pushing the per-run ref, and #521 pushed its own. The push is **permitted and optional**, not mandated by
the routine.

**How this run's branch push was done, because the method is reusable.** The pushed tip `e5c5969` had been
superseded by two amendments, so the branch needed `49ec643` without a force-push (barred) and without moving
HEAD while the suite was gating it. A merge commit was built with `git commit-tree` — tree = `49ec643`'s tree,
parents = `49ec643` and `e5c5969` — and pushed to the branch ref: a genuine fast-forward (`e5c5969..55ef500`),
the old tip preserved as a second parent, HEAD never touched. Same instrument #500 used on main.

## THE RESIDUAL #521 LEAVES IN ITS OWN NEW GUARD — MEASURED, NOT ESTIMATED

The blob-identity guard added at `gates/fastgate.sh:86` covers the four files the tier **EXECUTES**
(`records-gate.sh`, `gatemanifest.sh`, `verify-log.sh`, `control-audit.js`). **It does not cover the files the
tier READS and derives a verdict from, and there are two such sites.** Same class as the hole antagonist B
found — the tier reasoning about the COMMIT out of the WORKING TREE — reached through a read instead of an exec.

| site | what it reads from the working tree | direction of the hole |
|---|---|---|
| `:393` control (g) | `gates/regress/49-home.js`, to extract gate 49's stamp regex | a **looser** working-tree regex makes the containment check PASS where the committed one would fail. Deleting the literal is already a hard red (empty extraction, `(iii)`); **loosening it is not.** |
| `:900` premise check | `gates/regress/*.js`, `mountcheck.js`, `lib.js`, `engine-extract.js`, `drive/*.js`, grepped for `require()` targets | a `require()` **removed** in the working tree lets the premise pass while the COMMITTED gate still requires that records-classified file — verbatim the #490 defect the same block records, via a different door. |

Both require a deliberate `git update-index --assume-unchanged` or `--skip-worktree`, which is the threat model the
guard's own refusal message already names. Neither lets a bad *application* byte ship: no app code is involved.

**WHY IT IS NOT FIXED IN THIS BUILD, stated as a decision and not as an estimate.** I opened the code and read
both sites [#392's rule] before deferring. The fix is NOT a longer hand-written file list — `:903` in this same
block records that "a second list is the defect, whatever its patterns say", and #490's antagonist A proved it
there with an unanchored glob. The sound fix is a `git ls-files`-driven loop comparing `hash-object` against
`HEAD:` for the whole read set (~50 files, ~100 subprocesses, a second or two in a 7-second tier), and that needs
its own controls — including one proving it reddens on a loosened `49-home.js` regex, which is the half no
existing control covers. Taking it would also mean editing `fastgate.sh` and so killing a suite 40 minutes in for
the second time this run, which by this project's own rule (an un-landed run wastes the work) costs more than the
gap it closes. Filed as `jobs/the-tier-guards-what-it-executes-but-not-what-it-reads-2026-10-14`.

---

## APPENDIX: THE EXACT `CLAUDE.md` EDIT #521 COULD NOT LAND, READY TO APPLY

`classify()` calls `CLAUDE.md` **FORCE** — "the push bar itself, not a record of a run: a commit that rewrites the
rules every session reads is not a records commit". That rule is right and this appendix is the way round it that
does not break it: the TEXT lands here, as a record, and the edit to `CLAUDE.md` waits for a green suite.

**Where.** The branch-record table's per-run-branches row, in the sentence beginning *"THE CONFLICT, NAMED SO THE
NEXT RUN DOES NOT RE-LITIGATE IT"*. Two anchors, each unique in the file (verified: 1 occurrence each), and the
edit keeps the row a single line with its 3 pipes intact.

**Anchor A** — insert the block below immediately after this exact text:

    so not-pushing is not this lane's decision to take.

**Anchor B** — replace this entire sentence:

    **So the per-run refs keep accruing until Kunal or the orchestrator changes the routine's prompt, and that ask is routed as part of `jobs/branch-record-cannot-ever-be-current-2026-09-28`.**

with the replacement block below. Both blocks are in `claude/agents/` nowhere — they are here, verbatim:

### BLOCK FOR ANCHOR A

 **THAT SENTENCE'S ATTRIBUTION IS FALSE, IS WITHDRAWN HERE [R18], AND IT INVERTS WHOSE INSTRUCTION IS WHOSE.** It reads "the ROUTINE'S OWN per-run prompt - which this lane cannot edit and does not outrank - says in terms '**PUSH** to the specified branch when your changes are complete'". MEASURED at #521 against the prompt this run was actually fired with, taken verbatim from the session transcript rather than from memory, whitespace-normalised to len 1508 md5 `94e526c6dad18209` - equal to the tracker's stored `triggerPrompt` field and to the figure today's 02:14Z run recorded, all three identical and byte-identical after normalisation. In that prompt `PUSH` occurs **once**, in its own `PUSH AUTHORITY` paragraph, which is about **main**; `branch` occurs **once**, in `never delete a branch`. Occurrences of "specified branch": **0**. Of "designated": **0**. Of the branch name this run was given: **0**. **The routine's stored prompt does not mention the per-run branch at all.** Both that sentence and the branch name arrive in the harness-injected `## Git Development Branch Requirements` block, which reaches the session as a system-reminder in the same turn and is not the routine's text. **AND THE INVERSION IS THE PART THAT MATTERS.** This row casts prompts/build-run R1 - "the designated-branch instruction is satisfied by developing there" - as a mere tracker document that cannot repeal what the routine fires with. R1 is not a tracker opinion. It is a restatement of KUNAL'S OWN STANDING DECISION, `decisions/desk-round-1-2026-09-19` field `d14_branch`, answered 2026-09-19: "Q-BRANCH = main. Builds land on main, as CLAUDE.md says. The designated-branch instruction is satisfied by DEVELOPING there. Push to main. Fetch and rebase if main moved. Never the GitHub upload page." So the conflict this row names as beyond the lane's authority is a harness block against the project owner, with the lane's own procedure on the owner's side - not a tracker document losing to the routine. **#428 MEASURED ALL OF THIS SIXTEEN DAYS AGO AND FIXED IT IN NEITHER HOME, WHICH IS WHY THIS IS THE SECOND R18 ON THIS ROW.** Job field `theAskMayBeAimedAtTheWrongPlace_2026-09-28T22-14Z` says the instruction "is injected by the harness, not by the routine", and names the error in this file in terms - "That is the sentence both CLAUDE.md and prompts/build-run cite as the authority the lane cannot repeal". #428 then fixed only the literal-prefix half, in both homes, and left the attribution standing in the home whose own note had just identified it. A finding recorded beside the thing it corrects, in a field nobody's step reads, is #493's "a fix recorded in one home does not travel" with the homes one document apart. **AND THE ASK THIS ROW ROUTES NO LONGER EXISTS:** the job was CLOSED 2026-10-10T18:35Z as not-a-defect, on the ground that he had already settled it on 19 September, so this row has pointed a live ask at a closed job for four days. **WHAT DOES NOT CHANGE, so the next run does not over-read this:** the harness block still fires every wake and this lane still cannot edit it, d14 does not forbid pushing the per-run ref, and #521 pushed its own (as a merge, since a force-push is barred). What changes is that the branch push is PERMITTED AND OPTIONAL rather than mandated by the routine, and that nothing is owed to anyone on it.

### BLOCK FOR ANCHOR B

**So the per-run refs keep accruing while the harness-injected block keeps asking for them, and NO ASK IS OWED TO ANYONE: he answered this on 19 September (`d14_branch`, quoted in the withdrawal above) and `jobs/branch-record-cannot-ever-be-current-2026-09-28` was closed on 2026-10-10 as not-a-defect on exactly that ground. The sentence this row used to carry - that the refs accrue "until Kunal or the orchestrator changes the routine's prompt, and that ask is routed as part of" that job - is withdrawn [R18] on both halves: the routine's prompt does not contain the instruction, and the job is closed.**

**The same error is in `prompts/build-run` and was fixed there this run**, quoting the withdrawn text, because a
tracker document could be corrected without a gate. If you apply the above, the two homes agree again.
