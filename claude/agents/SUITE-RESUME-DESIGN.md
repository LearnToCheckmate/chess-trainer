# The full suite resumes after a container restart - design

Job: `jobs/the-full-suite-resumes-after-a-container-restart-from-the-first-unfinished-gate-2026-11-18` (part 1 of its
close condition). Decision: `decisions/batch-13-avoids-wasted-full-suite-reruns-2026-11-18`, part 2, Kunal's words:
"The full suite resumes after a container restart from the first unfinished gate, on the same tree and bundle proven
by hash, and the joined log must still pass gates/verify-log.sh before it can authorise a push; its design is reviewed
before use."

Written by batch 13 seat B1 BEFORE the code, as the decision asks. **Status: NOT REVIEWED.** The review is the lead's to
arrange and goes on the job. Nothing in the routine's procedure should use `CT_RESUME` until that review is written.

## 0. The shape in one paragraph

Resume is **opt-in twice**. A full suite launched with `CT_RESUMABLE=1` keeps a **journal** beside its log and writes
one **mark** line into the log after every gate it finishes. If the container restarts, a new full suite launched with
`CT_RESUME=<that journal>` (same tree, same bundle, same build number) re-runs everything before the gate loop
exactly as a fresh suite does, then, inside the gate loop, **copies each finished gate's section byte for byte from the
killed run's log** (after re-checking its md5 against the journal) instead of running it, and runs the rest. The joined
log is an ordinary full log - one header, one prelude, one section per gate, one footer computed by the unchanged footer
code over the joined file - plus the marks and one `resume:` footer line. `gates/verify-log.sh` judges it as it judges
any log and, when marks are present, also runs `gates/verify-join.sh`, which refuses a join it cannot account for.
With neither variable set, nothing in `gates/gates.sh` or `gates/verify-log.sh` behaves differently (section 8).

## 1. Where the code lives, and the hooks

| file | what |
|---|---|
| `gates/suite-resume.sh` | NEW. Sourced by gates.sh only when `CT_RESUMABLE` or `CT_RESUME` is set. All the logic: the journal, the start checks, import, marks, the footer line. |
| `gates/verify-join.sh` | NEW. The join judge. Called by verify-log.sh only when the log carries a mark or a `resume:` line. |
| `gates/suite-resume-selftest.sh` | NEW. Its controls (TC-R241), node and shell only, no browser. |
| `gates/gates.sh` | FOUR one-line hooks, each a no-op unless `SR_ON=1`: (a) after `red=0`, load and `sr_begin`; (b) first line of the gate loop, `sr_import` (continue if imported); (c) last line of the loop, `sr_mark`; (d) in the footer before the `gates ran` line, `sr_footer`. |
| `gates/verify-log.sh` | ONE hook after its red-marker checks: if the log carries a `    resume-mark: ` or `resume: ` line, run verify-join.sh and refuse on its refusal (or refuse if verify-join.sh is absent). |

Hook (a) sits after the gate list is built and BEFORE the unit layers, so a refused resume costs seconds, not the unit
layer's minutes. It is outside every block `gates.sh --selftest` extracts by pattern (the gap-fill block ends at
`gates=(`, the drive block starts at `DRIVESH=`, the footer block starts at `TC_LINE=`).

## 2. What is recorded for each finished gate

### 2a. The journal: `gates/logs/<STEM>-resume.tsv` (gitignored with the rest of gates/logs)

Tab-separated, one record per line, appended with a single `printf >>` per record so a kill leaves at most one torn
last line (a torn line is refused, never half-read).

```
#suite-resume v1
start  <N>  <STEM>  <ALL log path>  <bundle path>  <bundle md5, 32 hex>  <HEAD sha>  <HEAD tree>  <tree digest>  <status digest>  <roster digest>  <env digest>  <gate count>  <UTC time>
from   <parent journal path>  <parent journal md5>  <gates imported>            (a resumed run only)
gate   <i>  <name>  <run stem>  <green|red>  <byte offset in THIS run's ALL>  <byte length>  <unit md5, 32 hex>
```

- **tree digest**: sha1 over the `tracked`, `untracked` and `gitmeta` lines of gates.sh's own `tree_fingerprint`
  (tracked bytes read raw, the untracked set including ignored files minus the suite's own outputs, `.git`
  config/hooks/info). The `refs` line is deliberately left out: fetching, or pushing the per-run branch to save the
  work - which CLAUDE.md recommends doing early - moves refs and changes nothing the gates read. HEAD itself is
  carried separately.
- **status digest**: md5 of the `git status --porcelain` listing at start (`DIRTYL0`).
- **roster digest**: md5 of the gate list in order (basenames). The gate files' bytes are in the tree digest.
- **env digest**: md5 of every `CT_*` variable (sorted `name=value`) plus `FONTCONFIG_FILE`, `PLAYWRIGHT_BROWSERS_PATH`,
  `TZ`, `LANG`, `LC_ALL`, EXCEPT `CT_RESUME`, `CT_RESUMABLE`, `CT_GATES_SELFCOPY` (carries a pid), `CT_RUNID` and
  `CT_GAPFILL_OVERRIDE`. The last two act only on the prelude, which the resumed part re-runs and records in its own
  log; everything else that could change what a gate does must be equal.
- **unit**: the bytes a gate contributed to the log: from its `=== name ===` line through its mark line, inclusive.

### 2b. The mark: one line in the log after each finished gate

```
    resume-mark: gate <i>/<n> <name> | run <stem> | bundle <md5 32> | head <sha> | tree <tree sha> | body md5 <md5 32>
```

`body md5` is the md5 of the section from `=== name ===` up to the line before the mark. The line starts with four
spaces and never contains `RED (`, `PASS`, `FAIL`, `<<<` or `GATES`, so no existing reader of the log counts it as
anything (verify-log's red-marker pattern is `^ {4}[^ ]+: RED \(`; the SECBAD awk reads `^PASS`, `: green (` and
`N pass, M fail`). An imported unit keeps the mark its own run wrote, so a joined log says which run produced each
section.

A gate is **finished** when its verdict line has been written and its mark and journal row are both written. A kill
between the verdict and the journal row re-runs that gate: the safe direction.

## 3. How a restart finds the first unfinished gate

`CT_RESUME` names the journal (or the killed run's `-all.log`, from which `<STEM>-resume.tsv` is derived). `sr_begin`
reads its `gate` rows. They must be exactly `1..k` in order, with names equal to this run's roster positions `1..k`,
no repeats, no gaps, no torn line. The first unfinished gate is `k+1`. Anything else is refused (section 6), never
"repaired": a journal that is not a clean prefix is a journal whose run did something this design did not foresee.

## 4. How the tree and the bundle are proven unchanged before it resumes

`sr_begin` recomputes every field of the `start` record in the resuming run and refuses on the first difference, naming
it: build number, bundle md5 (whole file, all 32 hex, not the 12 the header prints), HEAD sha, HEAD tree, tree digest,
status digest, roster digest, env digest, gate count. Then, for each of the `k` rows, it reads the unit's bytes from the
killed run's log at the recorded offset and length and checks the md5; and it checks each unit's own mark names the
same bundle, head and tree as the start record. It checks the killed log carries no `GATES GREEN`/`GATES RED`/`SUBSET`
verdict line: a finished run is re-run, never resumed. All of this runs BEFORE the unit layers.

At import time (inside the loop) the md5 is checked AGAIN, because the unit layers ran in between and the killed log is
an ordinary file.

## 5. How the joined log reads as one run

```
gates.sh #NNN  bundle ...  md5 <same 12>  <resumed run's start time>     <- part 2's header (bundle proven equal)
...prelude: manifest, gap-fill door, unit layers, tree check...          <- part 2's, re-run on the same tree
=== mountcheck ===  ... green ... resume-mark (run 552)                   <- copied from part 1, md5-checked
=== 01-... ===      ... green ... resume-mark (run 552)                   <- copied
=== 02-... ===      ... green ... resume-mark (run 552b)                  <- run by part 2 (first unfinished gate)
...
regression assertions (PASS lines): ...                                   <- the UNCHANGED footer code, over the joined file
...
resume: joined run of 2 part(s): 552 gates 1-2, 552b gates 3-145 | every part on bundle <md5> head <sha> tree <sha> | journal <path> md5 <md5>
gates ran (145): ...
...
GATES GREEN #NNN
```

- **verify-log.sh's existing checks** (footer arithmetic, section-by-section PASS counts, red markers, manifest, floor,
  roster count = sections, held register, calibration) read the joined file exactly as they read any log, because it
  IS one file with one header and one footer. The calibration line in the footer is computed over every section, so
  two parts measured on different fonts reads `DRIFTED MID-RUN` and goes red - a resume across a font change cannot
  be green.
- **The roster check** (`gates ran (N)` = number of `=== ` sections = MANIREQ + 1) is unchanged and is computed from
  the resumed run's own roster, which the roster digest proved equal to the killed run's.
- **The footer** can say `GATES GREEN` by the same predicate as an unbroken run: no red anywhere (an imported red gate
  sets `red=1`), not orphaned, no assertion-count fall, records door green.

## 6. What is refused, never green

At resume time, by `gates/suite-resume.sh` (gates.sh prints `RESUME REFUSED: <reason>` and `GATES RED #NNN`, exit 1,
before the unit layers):

| refused | why |
|---|---|
| `CT_RESUME` or `CT_RESUMABLE` on a SUBSET run | a subset authorises nothing; resuming one would only add a path to confusion |
| journal missing, unreadable, no `start`, wrong version, a torn or malformed row | it cannot be read whole |
| another build number | a different invocation |
| another bundle (md5 of the whole file) | the decision's "same bundle proven by hash" |
| another HEAD sha or HEAD tree | the decision's "same tree" |
| tree digest or status digest moved | a tracked byte, an untracked file, git config/hooks, or the dirty listing changed since part 1 started |
| another roster (gates added, removed, reordered) | the joined log would not be one suite |
| another environment digest | a gate option differs, so part 2 is not the same measurement |
| rows not exactly 1..k in roster order (gap, repeat, reorder) | not a clean prefix |
| a unit's bytes in the killed log do not match its md5, at start or at import | the killed log was edited, truncated or overwritten |
| a unit's mark names another bundle, head or tree | a unit from another run was spliced in |
| the killed log carries a verdict line | a finished run is re-run, not resumed |

By `gates/verify-join.sh`, called from verify-log.sh whenever a log carries a mark or a `resume:` line:

| refused | why |
|---|---|
| marks without a `resume:` line, a `resume:` line without marks, or two `resume:` lines | half a join |
| a section with no mark, a mark with no section, or two marks in one section | the section and its proof disagree |
| a mark's index, count or name disagreeing with the section's position and the roster | **a gate missing** or **a gate counted twice**, even when the two cancel out in the count (which the existing roster-count check alone cannot see) |
| a roster name with no section, or a name with two sections | the same, stated by name |
| two marks naming different bundles, heads or trees | **two parts with different hashes** |
| a mark's bundle not beginning with the header's md5, or its head not the ref line's HEAD | **another bundle or tree** than the log says it gated |
| a section whose body md5 is not its mark's | edited after it was written, or assembled from elsewhere |
| the `resume:` line's parts not equal to the marks' run stems as contiguous blocks, in order | the join's own account disagrees with its contents |

## 7. What it does NOT protect against (declared limits)

- **verify-join.sh reads only the log** (the #419 limit): marks and body md5s are written by the same harness that wrote
  the sections, so a forger who rewrites sections and recomputes marks passes it. What protects provenance is
  gates.sh's start checks and the lock, not anything read afterwards. A joined log with every mark and the `resume:`
  line deleted reads as an unbroken log, and verify-log cannot tell; the existing roster and section checks still
  apply to it.
- **Natural variation between parts**: the imported gates ran under part 1's machine load and the rest under part 2's.
  Settle-based gates measure the machine, and a joined run is two machine states. This is the same variation two
  unbroken runs show; it is named here so nobody reads a joined log as one machine state.
- **The per-gate logs** of imported gates stay under part 1's stem in gates/logs; the joined `-all.log` carries their
  full text, which is what is archived and judged.
- **Part 1's prelude is discarded.** The unit layers, manifest and door that count in the joined log are part 2's, run
  on the proven-same tree. A prelude red in part 1 does not carry; a gate red in part 1 does.
- **`--this-suite` and `--on-main`** apply unchanged to the ref line, which is part 2's; part 2's HEAD is proven equal to
  part 1's.
- **Chained resumes** (killed twice) work by the same rule: part 2's journal carries the imported rows (pointing into
  part 2's own log) and its own, so part 3 resumes from part 2's journal. Shown in the selftest on the small roster.

## 8. Off by default, and how that is proven

With `CT_RESUMABLE` and `CT_RESUME` both unset: hook (a) sets `SR_ON=0` and loads nothing; (b), (c), (d) test
`SR_ON` and do nothing; verify-log.sh's hook greps for two strings no unbroken log carries (no mark lines exist unless
a run opted in) and does nothing. Proven by: every existing self-test of gates.sh, verify-log.sh, held, fastgate-drive
and unit-held-guard giving the same counts at the base commit and after; and the selftest running the gate loop
extracted from the base commit's gates.sh and from the new one, with the variables unset, over the same three tiny
gates, and comparing the two logs byte for byte (timestamps excluded; the tiny gates print none).

## 9. How it was shown, and what was not

- Shown, node and shell only, no browser: the real gate loop and hooks of gates.sh, extracted as `gates.sh --selftest`
  extracts its other arms, over a roster of three tiny gates in a throwaway repository: an unbroken resumable run; a run
  killed with SIGKILL in the middle of gate 2; the resume, whose joined log holds each gate once and whose PASS and FAIL
  lines equal the unbroken run's; a second kill and a second resume (three parts); and every refusal of section 6.
  verify-join.sh accepts that joined log. verify-log.sh (all of it) accepts a joined log assembled with the same mark and
  footer code from the real committed green `claude/agents/gatelogs/474-integration-all.log`, and refuses each bad join.
- **Not shown: a real full suite killed and resumed.** That costs a full suite (about six hours) and this seat may not
  run one. The first run that may spend one should launch with `CT_RESUMABLE=1`; if it is not killed, its log is still a
  normal log plus marks and a `resume:` line, which verify-log accepts (and the selftest shows that shape too).

## 10. How to use it (after the review)

```
CT_RESUMABLE=1 CT_RUNID=<run> bash gates/gates.sh '#NNN'                 # launch; writes gates/logs/NNN-resume.tsv
# ... container restarts mid-suite ...
CT_RESUME=gates/logs/NNN-resume.tsv CT_RUNID=<run> bash gates/gates.sh '#NNN'   # same tree, same bundle, same env
bash gates/verify-log.sh gates/logs/NNNb-all.log '#NNN'                    # the joined log; verify-join runs inside it
```

Archive the joined log AND the killed part's log; name the killed one `NNN-all-INCOMPLETE-container-restart.log` as
prompts/build-run already says.
