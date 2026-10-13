# HANDOFF — where the last run left off

Read this, then `claude/BUILD-CONTEXT.md`, then the flags. The procedure is tracker
`5326ERvZCZ5tEYRkPavPTF`, collection `prompts`, docs `common` then `build-run`; where it and CLAUDE.md
differ, the tracker wins.

Build **#517**, runId `build__1791911984000`, 2026-10-13. Pen taken free on a clean release (seventh
consecutive) and released at close-out.

## *** #517 WAS THE INTEGRATION SLOT. IT CHANGED NO APPLICATION CODE AND NO GATE ASSERTION. ***

**MEASURED, not assumed:** `app.js` (`f47aa0197967`), `chess.jsx` (`b6b7fbb25df0`) and `index.html`
(`4a95e865bca8`) are byte-identical to `origin/main`, checked with `md5sum` against
`git show origin/main:<f>`. `appChanged` is **no**, the bundle stays `f47aa0197967` stamped
`#511 - 2026-10-10 07:40 ET`, and #517 never ran `gates/build.sh`. **And not one path under
`gates/regress/` is in the diff**, so the suite's assertion set over this tree is IDENTICAL to main's.

**READ THAT SECOND SENTENCE BEFORE YOU CITE THE GREEN.** `GATES GREEN #517` is a **re-certification of
main's own bundle**, not a statement about new coverage. Every gate change this pass attempted was
dropped. Sixth consecutive build with no application code on main.

## What #517 did, in one line

Landed **3 of 20** parked process-lane payloads in **6 commits** — the first pass ever to execute STEP 1I
**amendment 5**, written at 10:44am ET the same morning after the 9:19am fire filed the job showing the
old rule stopped everything over four S2 collisions.

## The accounting, stated once so nobody has to reconcile it

**20 in the manifest = 4 excluded on S2 + 3 landed + 3 dropped on upheld antagonist vetoes + 10 refused.**
Six **payload** commits on a **seven**-commit branch, the seventh being the register commit. Every one of
the 20 carries an `integrationResult517` saying what happened to it and why.

Landed, all three whole with **no `git am --skip` of any kind**: `stamp-selftest`,
`fastgate-ratchet-mktemp`, `cited-not-run-closure`.

## *** BOTH BLIND ANTAGONISTS VETOED AND BOTH VETOES WERE UPHELD. THREE PAYLOADS WERE DROPPED. ***

Do **not** re-land these three from their current documents. Each has a job against its owning lane.

- **gate 67** (`proc-lane2-...-67-sel-cls-consumers-js-2026-10-13`) — its new `['Mistake','control-admissible']`
  row is asserted at `:507-512` as a third "G2 CONTROL" claiming the guard is selective, and it **cannot
  cross the threshold**: `chess.jsx:519`'s `drillGrade` returns `DRILL_GRADES[0]`=`'Mistake'` for that label
  and the total-flatten bug returns the literal `'mistake'`, and the assertion lowercases both. Instance
  **twelve** of the cannot-fail class CLAUDE.md records eleven times — shipped in the commit meant to close it.
- **gate 65 block K** (`proc-lane4-...-blockk-2026-10-10`) — `:1001` asserts a flag happened and `:1003`
  asserts the card matches `/Time/i`. `chess.jsx:5298` renders `'Time!'` for **any** time-out whichever clock
  ran out, so both pass for block I's already-covered cell. The discriminating value was measured by its own
  author and left in prose in `lane-4.md` (`'Time! You lose'`).
- **gate 26** (`proc-lane4-...-26-invariants-js-2026-10-13`) — its commit 2/2 is **TRUNCATED, not empty**: it
  declares ` create mode 100644 claude/process-log/lane-4.md` and 51 insertions with its hunks replaced by
  prose. The **code change is correct** and is still owed; lane 4 must re-cut an intact payload.

**Dropped rather than hand-edited**, per STEP 1I: a payload-level problem is a reason to drop and record,
never to resolve — the lane that writes a gate owns its assertions.

## THE SHARPEST THING THIS RUN FOUND IS A CORRECTION TO A JOB FILED FOUR HOURS EARLIER

`jobs/nine-integration-patch-bases-are-absent-from-origin-entirely-2026-10-13` says nine payload bases are
absent from origin, apply order can **never** be established, and nine payloads must be re-cut or retired.
**It rests on a category error.** `S6-APPLY-ORDER` reads the `From <sha>` line and calls it a base;
`git format-patch` emits `From <commit-id>` where the commit-id is **the sha of the commit being exported**,
so it names the lane's own unpushed commit and is absent from origin **by construction** for every payload
here. The real base is the document's `baseSha`, and **16 of 20 resolve**. The control is the job's own
evidence: `51249a09`, one of the two shas it cites as proof, belongs to a payload **that landed in this pass**.
Acting on that remedy would have discarded working payloads.

## What the next run should know, shortest first

1. **`gates/stamp-selftest.sh` is now on main and controls NOTHING.** It executes in no automated path, its
   header cites `gates/lib.js:113` **ten** times for a regex at `:217`/`:255`, and `drive()` holds a third
   uncompared copy. Antagonist B objected to landing it; I **overruled with reasons** on the job. Do not read
   it as evidence the stamp regex is guarded.
2. **`gates/audit/landed-on-main.sh:286` reverse-applies against the WORKING TREE, not `origin/main`.** Run it
   **before** you apply anything, as the 9:19am fire did, or it reads your own work back as `content=ON-MAIN`.
   Mine was contaminated and is annotated as such.
3. **Never pass `-c user.email` on a build commit.** The container is configured; the `git am` commits prove it.
   Getting this wrong cost 22 minutes of suite time, because `gates.sh:174` samples the gated sha early.
4. **Two payloads are permanently invisible to the manifest** and it is not fixed: `suite-lock-contention` and
   `stamp-regex-selftest` were applied and reverted by #513, so their subjects AND their artefact commits are
   on main while their files are not, and both LANDED arms read true. Arm (ii) is broken too, which is new.
5. The R22 90-minute budget cannot hold for an integration run that pays a full suite. Say so rather than
   rushing the antagonists.

## Inherited and still live

The live site is blocked by the egress proxy so no run from this container can verify the deployed app. The
auditor has not run for several builds. Gate 50 is in `gates/pending/`. The three known-absent gates mean every
`GATES GREEN` here is honest and blind in exactly those places — the suite reports them every run on purpose.

## The gate figures

`GATES GREEN #517`, **59 suites / 4885 PASS / 0 FAIL / 0 RED / 0 `<<<`**, over bundle **`f47aa0197967`**
from source `b6b7fbb25df0`, gated sha **`46d919dc`**. Suite 18:07:07Z to 19:5xZ, about 106 minutes, from the
frozen sibling copy `gates/.gates-run-517c.sh` whose md5 equals `gates/gates.sh` **at launch and at finish**.
Manifest 58 required / 58 present / 0 missing / 0 unlisted / **5 known-absent** / 0 unjustified.
`verify-log.sh gates/logs/517-all.log '#517'` returns **OK**; `held.sh check` reads **not held**.

**4885 is the SAME total `513-all.log` and `514-all.log` report over this same bundle**, re-counted here
from all three files rather than quoted — three suites, three containers, agreeing to the assertion. That is
what makes this green evidence rather than a reading, and it is also why it says nothing new about coverage.

**This suite was run THREE TIMES and the first two were killed on purpose.** Attempt A died at 17 sections
(a committer-identity amend would have orphaned its gated sha); attempt B at 6 sections (both antagonists
vetoed and the tree changed). Both are preserved under `gates/logs/killed-517a/` and `killed-517b/` and
neither authorises anything. Only this third log exists at `517-all.log`.
