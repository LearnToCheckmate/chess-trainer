# HANDOFF — where the last run left off

Read this, then `claude/BUILD-CONTEXT.md`, then the flags. The procedure is tracker
`5326ERvZCZ5tEYRkPavPTF`, collection `prompts`, docs `common` then `build-run`; where it and CLAUDE.md
differ, the tracker wins.

Build **#514**, runId `build__1791674417817`, 2026-10-11. Pen taken free on a clean release (third
consecutive) and released at close-out.

## *** #514 CHANGED NO APPLICATION CODE. NOTHING ON KUNAL'S PHONE CHANGED, AND THAT IS BY CONSTRUCTION. ***

**MEASURED, not assumed:** `git rev-parse origin/main:app.js` and `HEAD:app.js` return the same blob
`53eeef62`, and `chess.jsx` the same blob `01a1ebb3`. Byte-identical, not merely equivalent. `appChanged`
is **no**, the bundle stays **`f47aa0197967`** stamped `#511 - 2026-10-10 07:40 ET`, and #514 never ran
`gates/build.sh` at all — it took build number 514 for the register's sake and minted no bundle. A green
suite here is a statement about the **harness**, not about anything a player sees. Third such build in a
row (#512, #513, #514).

## What #514 did, in one line

Fixed the tier check that compared a **stamped** bundle — `gates/build.sh` embeds a minute-resolution
stamp at three sites, so no rebuild is ever byte-identical and the fast tier could never be reached by
anything that rebuilt — and then **measured that the fix buys nothing yet, and said so in four places.**

## *** READ THIS BEFORE YOU TRUST THE FAST TIER: THE MARGINAL IS ZERO ***

The change is correct and controlled and **it does not let the build lane reach the fast tier.** Taking a
build number writes a `minted` row to `gates/build-numbers.tsv`, which `classify()` puts in **FORCE**, so
a commit that actually rebuilt still goes full. The exemption can only fire on a commit that moved
`app.js` and touched **no** forced file.

**Measured over the last 400 commits on `origin/main`: 73 touch `app.js`, 64 of those also touch
`gates/build-numbers.tsv`, and ZERO are commits where this exemption could have fired.** A per-commit
upper bound, derived independently three times (antagonist A found the mechanism, antagonist B produced
the number, I re-derived both).

**Part two is NOT available.** Letting a records-classified register row stop forcing is the #509 ratchet,
which **both** of #509's antagonists vetoed on two reproduced attacks, and it is blocked on two named
jobs. So the single remedy available was to state the marginal, which is done in the script header, in the
FORCE loop's own printed lines, in the log the tier emits, and in the commit message. **Do not "discover"
that fast mode is still unreachable and file it as a defect — it is recorded as the measured expectation.**

The honest case for landing it anyway: **the benefit and the new trust surface are gated by the same
condition.** The exemption cannot fire, so it cannot save a suite — and it also cannot wrongly exempt
anything. Today's risk is zero for exactly the reason today's benefit is zero.

## THE SUITE: `GATES GREEN #514`

**59 sections / 4885 PASS / 0 FAIL**, 00:27:56Z to 02:14:58Z (**107 minutes**), run from the frozen
sibling copy `gates/.gates-run-514.sh` so no later edit could reach the running interpreter (#461, #493).
The copy's md5 equalled `gates/gates.sh` **at launch and again at finish** — checked both times, because
#461 cost a whole 48-section suite its footer.

Bundle md5 **`f47aa0197967`**; gated sha **`be615f5`**; log at `claude/agents/gatelogs/514-all.log`
(6306 lines, a real log and not a stdout capture).

**`CT_EXPECT='#511'` was set on the run.** That is the `gates.sh:161` seam (#506's resolution): mountcheck
asserts the bundle's **true** stamp while the log is stemmed and footed `#514`. Without it a suite over an
un-rebuilt bundle cannot be stamped with this run's number at all.

**Nothing was committed while the suite ran.** The gated sha is exactly the tree the log measured, against
`jobs/amending-a-commit-after-launching-the-suite-orphans-the-logs-own-gated-sha-2026-10-07`.

## THE BLIND PAIR: 13 FINDINGS, BOTH VETOES UPHELD, AND THE PAIR STILL MISSED ABOUT FIVE

Launched in **one message** before the suite (so neither's findings existed while the other worked), B as
the **Explore** agent type with **no database tool**, handed the frozen diff and both bundles as files.
uniqueToA **6**, uniqueToB **3**, common **4**; Lincoln-Petersen ⇒ about **18** exist, so **both missed
about five**. An overlap of 4 of 13 is a far more stable denominator than #511's 1 of 11.

**The two decisive findings were each structurally invisible from the other's door — the sixth consecutive
build to find this shape.**
- **A (diff door):** the failure path returned **exit 1 where main returned 2**, so a control that could
  not be *built* took an ordinary commit from "go run the suite" to **REFUSED**. The only measured
  regression in either pass. B says in terms it could not reach this: its nine-way fail-safe matrix
  perturbed the **head** nine ways and **never once perturbed the base**.
- **B (shipped-surface door):** the printed log claimed "no regress gate asserts the stamp", which is
  **false** — `gates/regress/49-home.js:554` matches the Home build line against its own regex — so the
  soundness argument rested on a **cross-file regex coupling** with nothing checking it.

**The cross-read was a third tree-changing stage and it is worth reading** (full text on
`runreports/build__1791674417817`): it made **A withdraw its own veto ground on a measurement** — the Home
build line has ~8 characters of wrap margin against an excursion the regex bounds to **1** — and I kept
the length pin anyway **for B's different reason**, publishing both halves in the shipped comment.

## WHAT IS LEFT, NAMED

1. **Implausible stamps are accepted.** `so_pred` pins shape and length, not value: `#100 - 2020-01-01
   00:00 ET` is also 26 bytes and passes, and `CT_STAMP_TIME` is unvalidated. Sound for what the predicate
   is *for*; it is not a plausibility bound. Both antagonists found it independently.
2. **`gates/held.sh check` is still not called from this tier.** Deliberately not added: `held.sh` exits
   **1 = HELD** and **2 = USAGE**, so a naive wiring maps a usage error onto GO FULL and re-creates exactly
   the regression A had just found. B also established the gap is *structurally* closed — `held.sh`'s only
   rebuild-surviving key is `sourceMd5` over `chess.jsx`, and the exemption proves `chess.jsx` unchanged.
3. **The auditor has not run.** This is the **fourteenth consecutive** build with `expectedAuditors` naming
   `build-external-challenger` and `auditedBy` empty.
4. **CLAUDE.md carries two stale selftest figures** — `gatemanifest.sh selftest` is written as 19 controls
   and reads **48**; `buildnum-selftest.sh` is written as 47 and reads **86**. Both measured by running
   them. CLAUDE.md is a FORCED file and outside this item's scope, so untouched.
5. **`prompts/build-run` is 172,301 characters** while CLAUDE.md and `prompts/common` both say ~92,000 —
   stale by 87%. Same FORCED-file reason.
6. **The `build-one-door` blocker still needs an outcome** before two `blocked` jobs can be re-tested.

## A DEFECT FOUND IN THE TRACKER BY AN ORDINARY QUERY — AND IT WILL BITE YOU TOO

`order_by buildNumber desc limit 3` on the `builds` collection returns **`'485'`, `'472'`, `'466'`** while
**513 exists**. `buildNumber` is a **string on 42** of 101 documents, an **int on 40**, **absent on 18**
and null on 1, and strings and numbers sort in **separate bands**. The 19 with no usable value are
excluded from any ordered query on that field altogether.

**So "show me the newest build record" — the most ordinary query in this lane, on the collection the build
lane writes every single pass — answers 28 builds out of date, and no tool reports it.** It was not found
by a sweep; it was found by needing a template for this very record.

Appended as a dated recurrence to the live parked job
`jobs/a-run-record-row-in-the-snapshots-collection-outranks-every-real-snapshot-2026-10-01`, where it
answers that job's own `notChecked` item "the other collections … for the same two-type problem" with a
**yes**. **Not filed as a new job** [R09/R25]; the park **not** lifted [R23]. I did not repair the 42 rows
— the closed sibling records that #508's own type repair replaced a wrong type with a wrong *time* by
600,000 ms, and the same job establishes that the copy-forward convention reinstates the type, so the fix
belongs at the write step. `builds/514` is written with an **integer** `buildNumber`.

## The four numbers at this close-out

**openP0 6, openP1 88**, coverage **0 of 10** (carried, not re-derived), assertions **4885**.

**Know the instrument before you compare these to anything.** This is `status = ready` AND
`severity in [P0, P1]`, **all lanes** — #513's method, and it returns exactly #513's pair. #477 measured
that the lane-filtered variant leaves **165 of 316** ready build-lane jobs **unbucketable** (numeric
`priority`, no `severity` field), **45 of which name a P0 in their own text** — so **6 is a floor, not a
count**, and that is #405's frozen denominator wearing the `severity` field as a costume. Two open jobs
already carry this; this close-out adds no third method.

## If you are the next run

- `app.js` and `chess.jsx` are byte-identical to main. If you intend to change application code, you are
  the first in four builds — re-read "the board is sacred" first.
- Fast mode was **OFF** for #514 and will likely be off for you: `docs/fast-gate-state` certifies bundle
  `227126b82b81` while main serves `f47aa0197967`, so the nightly's certification is **two app-builds
  stale**. That was the **first live firing** of the fourth test added 2026-10-10, and it is appended to
  `jobs/fast-gate-state-certifies-a-bundle-main-no-longer-carries-and-step-0f-cannot-see-it-2026-10-07`.
- **Eleventh consecutive shallow container.** `origin/main` read `97392e2` — nine builds stale — until
  `git fetch --unshallow` as the **first** git action. Do that before any ancestry claim, or
  `merge-base --is-ancestor` will lie to you.
- The UAT kick (`fire_trigger` on `trig_01JGZboE9JSXYgMSXqA5GWkB`) is **not available** in this session. I
  did not substitute another trigger and did not enable, disable or edit any trigger [R21].
