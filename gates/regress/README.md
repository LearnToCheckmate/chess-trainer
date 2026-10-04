# gates/regress — the suite, and how to read its numbers

**`gates/gates.sh` reaches exactly three things, and two of them are NOT in this directory:**

- `gates/regress/*.js`, globbed at `gates.sh:112` — this directory, in name order;
- `gates/mountcheck.js`, seeded as the first element at `gates.sh:202`;
- `gates/unit-drill-why.js`, invoked **by name** at `gates.sh:250`, before the regress loop.

Nothing else runs, however much a run report cites it. `grep -noE '\$G/[a-z0-9-]+\.js' gates/gates.sh`
returns those last two and nothing more.

**`gates/unit-drill-why.js` is the worked example of why that list matters, and it is now FIXED — present
tense.** It was written to protect a P0 Kunal reported, moved into the repository so its published count
could not go stale, and landed one directory *above* the regress glob, where no suite could reach it. It is
reached today: its 40 `ok` lines are translated into `^PASS unit-drill-why <name>` so they join the footer
total, and a non-zero exit, a non-zero FAIL count or **zero** oks all redden the suite. It uses a `--- `
marker rather than a `=== ` section header on purpose — `verify-log.sh` refuses any full log whose count of
`^=== ` lines differs from its roster, so a section header here would have refused every green log from the
moment it landed, while looking like a tidy-up. See
`jobs/a-test-in-the-repo-that-no-suite-runs-2026-09-28` and `TC-R50` in `claude/stories/TEST-CASES.md`,
which records that **five** other files under `gates/` are still cited as evidence and still unreachable.

What belongs in `gates/pending/` and why a gate may be held out of the suite deliberately is in
`gates/pending/README.md`. The harness itself is `gates/lib.js`; read its header before writing a gate.

## Counting a gatelog's numbers: PASS by line, RED by DEDUPLICATED LINE

    # PASS — a line count is correct:
    grep -c '^PASS' <log>

    # RED — a line count over-reports. Deduplicate WHOLE LINES:
    grep '^FAIL' <log> | sort -u | wc -l

`gates.sh` **replays** a red section's first five FAIL lines into its own summary block (`| head -5`), so one
failing assertion can produce several `^FAIL` lines in a suite-level `-all.log`. `^PASS` lines are **not**
replayed (`gates.sh:290` replays only `grep '^FAIL' "$log" | head -5`). The replayed lines are
**byte-identical** to the originals, which is what makes whole-line dedup exact and is why the inflation is
invisible to a spot-check.

### The distinct-id recipe does NOT work here, and this is the correction

**`grep -o '^FAIL [A-Za-z0-9]*' <log> | sort -u | wc -l` is the recipe
`jobs/a-fail-line-count-on-a-gatelog-over-reports-by-up-to-five-2026-10-03` prescribes. #477 measured it
wrong before enshrining it, and it is withdrawn here [R18].** It assumes the token after `FAIL ` is an
assertion id. **This log format has no assertion-id field**, and the character class makes it worse by
stopping at the first hyphen:

| log | `^FAIL` lines | the prescribed recipe | whole-line dedup |
|---|---|---|---|
| `claude/agents/controls/473-control-471-shipped-16-red.log` (2 sections) | 21 | 16 | **16** |
| `claude/agents/gatelogs/424-gate48-control-shipped-vs-prefix.log` (0 sections) | 19 | **6** | **19** |
| `claude/agents/gatelogs/457-all-STOPPED-AT-29-OF-49-RED-...log` (31 sections) | 6 | **1** | **3** |

- The **424** log is 19 genuine failures over seven geometries with **no replay at all**; the recipe reports
  6, because what follows `FAIL ` there is a geometry label (`se`, `short375`, `320x520`).
- The **457** log is 3 genuine failures replayed once into a summary; the recipe reports **1**, because all
  six lines begin with the word `the`. It is therefore **worse than the raw line count** — 6 is wrong by +3,
  1 is wrong by −2, and −2 is the dangerous direction.
- The **unit layer** is the sharpest case and it is this project's own newly-wired one: `gates.sh:260` emits
  `FAIL unit-drill-why <name>`, and `[A-Za-z0-9]*` truncates at the hyphen, so **all 40 of its assertions
  collapse to the single token `unit`**. A fully red unit layer would publish as one red.
- The **473** log is the only one of the three where the recipe is right, and it is the log the job measured
  — which is how a recipe that works on one gate's prose became general advice. Its first tokens happen to
  be real ids (`Gm3`, `Hm4`). Note it is a **SUBSET** log (`SUBSET RED #471`), not a suite `-all.log`; the
  replay delta there is exactly 5, matching `head -5`.

`^PASS` lines are no better shaped: `476-all.log` yields `PASS `, `PASS 10` and `PASS 21a`.

**THE CONTROL THAT SHOWS WHOLE-LINE DEDUP IS NOT JUST UNDER-COUNTING EVERYTHING:** on the logs with
`sections == 0` — a single gate's output, where the suite summary and therefore the replay cannot exist —
dedup equals the raw line count exactly (19/19, 16/16, 2/2). It removes duplicates only where duplicates
were manufactured.

**Its limit, stated:** two genuinely distinct failures printing byte-identical text would collapse to one.
That needs an assertion to fail identically at two inputs while printing no geometry and no numbers, which
none of the committed logs does — but it is the failure mode to watch, and the real repair is for `gates.sh`
to mark replayed lines so a count is right by construction. That changes a format every reader greps, so it
needs its own control and its own build. **`gates/verify-log.sh` still carries the unsound recipe in a
comment beside its own PASS check** — filed, not silently edited, because #477 held no lock on that file.

### The footer check works by SELF-CONSISTENCY, not because PASS escapes the replay

#405's check — the log's own `regression assertions (PASS lines): N` footer must equal the number of `^PASS`
lines in the file — is sound, and it is worth being precise about *why*, because the obvious explanation is
wrong. `gates.sh:292` computes the footer as `grep -c '^PASS' "$ALL"` and `verify-log.sh` recomputes
`ACTUAL` with the same predicate over the same bytes. **It would hold identically even if PASS were
replayed**, and `verify-log.sh`'s own comment says so in terms: the two "agree by construction whatever
gates.sh does with duplicates." So it is a self-consistency test, which is a real and useful property and a
*weaker* one than a count of distinct assertions. The mirror check for FAIL cannot be built the same way
without first subtracting the replay, so this project's log-integrity checking is asymmetric — and the
asymmetry is load-bearing in one direction only.

Wherever a red count is **published** — a run report, a `RUN-LOG.md` row, a ledger row, a job document — use
the dedup recipe and say which log you ran it on. `verify-log.sh` itself publishes no red count: it refuses
or it does not, and a log with any FAIL never reaches `GATES GREEN`, so **no push gate is fooled by any of
this.** What is affected is every human and lane that counts reds to size a failure.

## Two numbers that are not what they look like

- **A build number names an artefact, not a tree.** `gates/build.sh` embeds
  `TZ=America/New_York date '+%Y-%m-%d %H:%M'` in the stamp, so the bundle md5 changes on every rebuild in a
  new minute even from byte-identical source. Measured on `gates/build-numbers.tsv` at `2e5f30b`: of the
  **29** build numbers that carry a bundle md5, **18** name more than one distinct bundle (#456 names five;
  #471 and #474 name four each). So "measured on #NNN" is not a reference — **cite the bundle md5.** (#454
  published 4-of-8 from a shallow clone; the direction was right and the figure was a floor.)
- **A section that asserts nothing is red, not green.** A gate that is present but empty was once
  indistinguishable from a gate that passed; `gates.sh` now treats a section that exits clean and asserts
  nothing as a failing one. #405's "0 PASS is the tell", made mechanical.

## Before you trust a new gate's green

Prove it against a bundle built to fail it. This directory's history is largely the history of gates that
could not fail: an alternation matching every branch it was meant to tell apart, a containment check
satisfied by the very overlay it was written to detect, a cross-check fed by the thing under test, an
assertion keyed to a selector its own build added, and a geometry assertion over an empty array. A green
from an uncontrolled gate is a statement about the gate, not about the app.
