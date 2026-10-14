# HANDOFF — after #520, the 14 October integration slot

**origin/main is at the sha this commit creates.** GATES GREEN #520 at 59 suites / 4885 PASS / 0 FAIL over bundle
`f47aa0197967` — main's own registered #511 artefact, re-gated under `CT_EXPECT='#511'` because no payload
touched a bundle input. **Gated sha `b06e08f`**; the three commits above it change only the build-number
register and the records, and no served file. Ninth consecutive build with no application code.

## READ THIS FIRST: a reverted commit's subject makes its payload read LANDED for ever

This run found it, measured it, and then **created a third instance of it on purpose**, because the only
alternative was rewriting history after launching the suite.

STEP 1I amendment 3 defines LANDED as "every `Subject:` header in the patch body is the subject of a commit
in `git log origin/main`". **That cannot see a revert.** A payload that was applied and then reverted leaves
its subjects on main permanently, so the selector reads it as LANDED and the manifest skips it, for ever,
while its artefact is absent from the tree.

Measured on the tree this run pushed, with its own commit subjects standing in for main's:

| payload | subjects on main | artefact on main | selector says |
|---|---|---|---|
| `proc-lane2-...-verify-log-sh-arm5-readguard-recut-2026-10-14` | yes | identical to main (reverted here) | LANDED |
| `proc-lane1-...-audit-suite-lock-contention-sh-2026-10-10` | yes | **ABSENT** | LANDED |
| `proc-lane3-...-audit-stamp-regex-selftest-sh-2026-10-07` | yes | **ABSENT** | LANDED |

The last two are genuinely owed work that **no integration pass can ever select**, which is why they appear
in none of this run's 23 and in none of #513's, #517's or #518's. They were surfaced only by
`gates/audit/landed-on-main.sh`'s L7/L8 arms — the instrument this run itself landed — which read
`L8-MANIFEST-BY-SELECTOR 19` against `L8-MANIFEST-TRUE 15` and named them.

**Antagonist A reported three such documents; it is two.** The third,
`orch-art-gates-fastgate-sh-2026-10-06`, has its subject on main AND its file on main (`gates/fastgate.sh`
v2 landed at `b672868`), so it is correctly LANDED by a different lineage. Re-derive before repeating a count.

**This is a defect in `prompts/build-run`, so it is the orchestrator's to fix [R17], and this run did not
and may not fix it.** The repair shape the two L8 arms already imply: LANDED should require the payload's
CONTENT on main, not its commit subjects — definition (ii)'s recorded sha has the same weakness.

## AND THE SAME INSTRUMENT HAS A SECOND HOLE: its L4b/L5/L8 arms read a key no run writes

Measured AFTER the push, with a control, because antagonist B predicted an effect and the real number
was worth more than the prediction.

`gates/audit/landed-on-main.sh:304` reads the **exact** key `integrationResult` (via `json_field`'s
`d.get()`), while STEP 1I amendment 3 (3) orders every pass to write its record as
`integrationResult<build number>` and defines EXAMINED over the **prefix**. So after this run wrote all
23 records, `L4b` still reads 8, `L5-PILE-DEPTHS-AGREE` still FAILs at 19-against-14, and
`L8-MANIFEST-BY-SELECTOR` still *names* `orch-art-gates-buildnum-sh-series-bound-2026-10-14` — a payload
that now carries `integrationResult520` with `landed: true`, and whose exact `integrationResult` key is
absent. **`L8`'s own label, "what STEP 1I's rule selects", is not what STEP 1I's rule selects.**

So B's finding-3 *measurement* was right and its *remedy* does not follow: writing records the prescribed
way cannot move those three arms. **Do not spend a pass writing more records to fix that number.** The fix
is one predicate — match the `integrationResult` prefix, exactly as amendment 3's own EXAMINED test does,
and re-derive L4b, L5 and L8 from it. Advisory only: 3b says this instrument never stops a run, and it
did not stop this one.

That is the **second** defect found in this one instrument today, and the same family as the finding above:
a check keyed on something other than what it claims to measure.

## What landed, and the one thing an auditor should check first

Five payloads, nine commits, every one a gate/harness/record file:
`gates/audit/landed-on-main.sh` (L7/L8) · `claude/stories/TEST-CASES.md` (TC-R50, TC-R32) ·
`gates/regress/26-invariants.js` (rev-summary non-vacuity) · `gates/records-gate.sh` (the parse-stability
arm) · `gates/buildnum.sh` + `gates/buildnum-selftest.sh` (the SERIES bound).

**`gates/regress/26-invariants.js` is the only gate file in the batch and its change moves a branch inside
a live gate** (an empty grade table now returns `null` instead of `{}`). Antagonist B named it as the one
thing it most wanted measured and could not, having no browser. This run's suite is that measurement: read
the three `rev-summary: the grade table was found and read (non-empty)` lines in
`claude/agents/gatelogs/520-all.log` and confirm each reads `10` — that is the state in which the changed
branch is NOT taken, and nobody has yet produced the state in which it is.

**A live hazard #519 recorded is fixed, measured both sides.** `gates/buildnum.sh sweep --add` on main
writes #999 and #1000 as rows and `next` then hands out `#1001` at exit 0 — 480 numbers burned in one
silent command, and it is the remedy `gates/build.sh` prints on every build. On this tree it refuses both
as implausible and leaves `next` at #521.

## Both antagonists vetoed. Neither was overruled.

1. **B: #519 answered `free`** to `check` at exit 0 and `stampable` exit 0 to any run, while #519 is minted
   to `build__1791943111789` whose row is on an unpushed branch — `gates/buildnum.sh:122`'s own "#416 defect
   reproduced inside the guard written to prevent it". Fixed by a row (`28ae60d`). **B's cross-read then
   found my fix inverted** — field 7 named the backfiller, so the true holder was locked out and the
   integration run could still stamp it — fixed by a second row carrying the true holder (`1278b93`). All
   three readings now refuse, which is right for a spent number.
2. **A, independently confirmed by B: `gates/verify-log.sh:842`** printed "9 stories at zero and 4
   wrong-width rows" against a live **8 and 2**. The payload was **DROPPED, not hand-fixed**, per STEP 1I;
   A accepted that disposition over its own proposed fix in its cross-read.

**Do NOT re-land the arm-5 payload as it stands.** The re-cut owes four things: live `$A5ZERO`/`$A5WIDE` at
`:842` and `:816`; a FLOOR ratchet so a *fall* counts as a non-reading (A truncated USER-STORIES.md from 35
headings to 27 and the guard stayed silent while prescribing a ceiling that then refuses the real register);
a control over a partially-read register; and `C18*` ids, because `C17..C17d` each named two controls.

## Still owed, none of it needing a decision from Kunal

1. **Two payloads dropped for the third time** on payload-level defects, re-measured from their bodies this
   pass: gate 67's G2 Mistake row (the assertion lowercases both sides, so the control cannot cross) — and
   A found a **second** defect in it, a `.filter()` that emits zero assertions where the `.find()` it
   replaced emitted one — and gate 65 block K's K0d/K0e (neither reads which side flagged). No re-cut exists.
2. **`patches/ta-art-claude-stories-TEST-CASES-md-hm-051-rows-2026-10-13` can never be landed by any pass.**
   Not format-patch output; `git am` answers "Patch format detection failed". Third pass to spend attention
   on it. Re-export or retire it.
3. **This push creates one new advisory red**: `b7fdda5` removed the only citation of
   `gates/run-brilliant-measurement.js`, orphaning its roster row, so `gates/audit/cited-not-run.sh` reads
   `STALE-ROSTER 1` where main read 0. Both antagonists confirmed cause and direction; the verdict is exit 1
   before and after, so no new refusal — it **hides inside a standing red**, which is the point. Fix is a
   one-line retire of the row at `gates/audit/cited-not-run.sh:213`.
4. **`TC-SUITE-RG-001` is published by `gates/records-gate.sh` and exists nowhere in the case register**, and
   `TC-BN-001` still cites "62 controls" for a tool now shipping **170**. This run edited `TEST-CASES.md`
   twice and re-derived neither [R18].
5. **A known gap in the arm that DID land**, direction corrected by B and then by A against both of their
   first readings: `consumer_row_count` copies `live_rows` (NF>=6) while `held.sh check` uses `match_rows`
   (NF>=2) at `:48`. live ⊂ match, so a drift dropping a 2-to-5-field row is invisible to the arm and
   visible to the consumer — a false **accept**. Latent today: live 11, match 11, nothing in the band.
6. **Do not implement B's finding-8 prescription.** It proposed `add <series_top+1>` as the non-destructive
   way out of a wedged series; A measured that `next` still refuses afterwards, because `delta_ok` compares
   `highest()` with the series top. It would take 48 further `add` calls, burn up to 432 numbers, and bypass
   `mint` entirely. The diagnosis (the refusal prints a remedy its own last sentence warns against) stands.
7. **The auditor has not run for nine consecutive builds** and the live site is unreachable from this
   container behind the egress proxy, so no run here has compared the deployed bundle to the committed one.
