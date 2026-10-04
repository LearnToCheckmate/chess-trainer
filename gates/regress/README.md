# gates/regress — the suite, and how to read its numbers

`gates/gates.sh` builds its gate list by globbing this directory and nothing else. A file here runs on
every full suite; a file anywhere else does not, however much a run report cites it. That is not a
style rule, it is the one that cost `gates/unit-drill-why.js` five weeks of silence — it was moved into
the repository to stop its published count going stale and landed one directory **above** the only
directory that is executed. See `jobs/a-test-in-the-repo-that-no-suite-runs-2026-09-28`.

What belongs here, what does not, and why a gate may be held out of the suite deliberately is in
`gates/pending/README.md`. The harness itself is `gates/lib.js`; read its header before writing a gate.

## Counting a gatelog's numbers: PASS by line, RED by distinct id

**This is the one thing a reader gets wrong, and it is wrong in the direction that inflates a failure.**

    # PASS — a line count is correct:
    grep -c '^PASS' <log>

    # RED — a line count is NOT correct. Count distinct assertion ids:
    grep -o '^FAIL [A-Za-z0-9]*' <log> | sort -u | wc -l

`gates.sh` **replays** a section's first few failed assertions into its own summary block, so one failing
assertion can produce several `^FAIL` lines in a suite-level `-all.log`. `^PASS` lines are **not** replayed.
Measured on one gatelog: `grep -c '^FAIL'` read 21 against **16** distinct ids — the replay added exactly
five, so a count of five or fewer reds can be inflated by up to 100%. The inflation is invisible to a
spot-check, because the replayed lines are byte-identical to the originals and carry the same ids. #473's
own antagonist filed "17 FAIL not 12" from a line count and withdrew it after reading the log's structure.

Wherever a red count is **published** — a run report, a `RUN-LOG.md` row, a ledger row, a job document —
use the distinct-id recipe. It is correct on both log shapes and costs nothing.

### The asymmetry is load-bearing in one direction, and nobody chose it

#405's footer check — the log's own `regression assertions (PASS lines): N` must equal the number of
`^PASS` lines in the file — works, and it works **because PASS is not replayed**. That is a property of
`gates.sh` that nobody designed and nobody wrote down. The mirror check for FAIL cannot be built the same
way without first subtracting the replay, so this project's log-integrity checking is asymmetric by
accident. `gates/verify-log.sh` is unaffected: it publishes no red count of its own, it refuses or it does
not, and a log carrying any FAIL never reaches `GATES GREEN`. So no push gate is fooled by this — which is
why the job is a P2 and not higher. What is affected is every human and every lane that counts reds to
size a failure.

The rejected alternative was re-prefixing the replayed lines in `gates.sh` so a line count would be right
by construction. It changes a log format every existing reader greps, so it needs its own control, and it
is recorded as rejected rather than pending.

The same recipe and the same reasoning sit beside `verify-log.sh`'s own PASS check, at the line that
computes `ACTUAL`. Two homes on purpose: that one is for whoever is editing the push gate, this one is for
whoever is reading a log or writing a gate.

## Two numbers that are not what they look like

- **A build number names an artefact, not a tree.** `gates/build.sh` embeds
  `TZ=America/New_York date '+%Y-%m-%d %H:%M'` in the stamp, so the bundle md5 changes on every rebuild in
  a new minute even from byte-identical source. Measured at #454: of the eight build numbers with an
  `app.js` commit in a shallow clone, **four name more than one distinct bundle**. So "measured on #NNN" is
  not a reference — cite the bundle md5.
- **A section that asserts nothing is red, not green.** A gate that is present but empty was once
  indistinguishable from a gate that passed; `gates.sh` now treats a section that exits clean and asserts
  nothing as a failing one. #405's "0 PASS is the tell", made mechanical.

## Before you trust a new gate's green

Prove it against a bundle built to fail it. This directory's history is largely the history of gates that
could not fail: an alternation matching every branch it was meant to tell apart, a containment check
satisfied by the very overlay it was written to detect, a cross-check fed by the thing under test, an
assertion keyed to a selector its own build added, and a geometry assertion over an empty array. A green
from an uncontrolled gate is a statement about the gate, not about the app.
