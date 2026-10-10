# HANDOFF — where the last run left off

**Build #509. If you are about to touch `gates/fastgate.sh`, read the RATCHETED RECORDS block's header
and the two withdrawal notes inside `classify()` first.** Everything below is either measured this run
or explicitly marked as not.

## What #509 did, in one line

Made the tiered gate reachable. It had been on main since #490, is about 700x faster than the full
suite, and **had never once been used**, because two arms of `classify()` named paths that every build
close-out writes. **No app behaviour changed** — `app.js` is `227126b82b81` and `chess.jsx` is
`a510e35796cb`, byte-identical to main at my base, measured with `git show | md5sum` on both sides.

## The one number that matters to the next run

**A close-out touching only `RUN-LOG.md` and `HANDOFF.md` now takes `FAST GATE GREEN` in about 7
seconds instead of the 84-minute suite.** Measured, control (e), 7421 ms. Ask the script; do not judge
the changed set yourself:

    bash gates/fastgate.sh "$(git rev-parse origin/main)"

`0` = you may push THIS COMMIT. `2` = GO FULL, which is not a failure. `1` = STOP.

STEP 0F(3) still applies: `docs/fast-gate-state` must be green and under 36 hours old, or fast mode is
off whatever the changed set says.

## What is NOT records-only, and the second one will surprise you

`gates/`, `chess.jsx`, `app.js`, the two guard registers — and **`CLAUDE.md`**. That last arm is new
and is the whole subject of this run's cross-read; see below. `RUN-LOG.md`, `HANDOFF.md`,
`DECISIONS-LOG.md`, `FEEDBACK-INBOX.md`, `README.md`, `chess-trainer-backlog.md` and
`feedback-inbox.md` ARE records-only, each behind a ratchet.

## PART TWO WAS WITHDRAWN. Do not re-take it without reading its job.

The job had two parts. Part one landed. **Part two — moving `gates/held-trees.tsv` and
`gates/build-numbers.tsv` out of `FORCE` — is withdrawn on both antagonists' veto.**

**A byte-level append ratchet cannot protect a grep-level register.** The ratchet's notion of "append"
is BYTES; every consumer's is LINES SURVIVING `grep`, and `grep` goes binary on a NUL anywhere in a
file and suppresses the matching lines. **One appended `0x00` satisfies every byte condition** — it
grows the file, changes no base byte — and takes `held-trees.tsv` from 12 live rows to 0,
`held.sh check a4df39c38222` from exit 1 to exit 0, and `buildnum.sh stampable '#509'` from exit 1 to
exit 0. That last is the predicate `gates/build.sh` consults to refuse build-number reuse, so a second
run could stamp one number over two trees — the #416 defect the register exists to prevent. `wc -l`
reads 538 both sides; `git show --stat` reads "2 files changed, 2 insertions(+)".

I added a **TEXT** condition that refuses it, and it **is not enough to move the files**: a
*well-formed* appended row is legal by every condition and still burns the series (see the buildnum job
— and note the mechanism there was corrected: the damaging number is **#999**, not #9999).

**The cost of withdrawing it is measured and small.** Over main's last 400 commits, both antagonists
independently re-derived: **83** commits can take the fast tier as the script stood, **173 with part
one alone**, 96 with part two alone, **192 with both**. Part one carries **90 of the 109**.

## The arms, and which one protects what — said plainly, not left looking load-bearing

| what | protected by | why that arm |
|---|---|---|
| the two guard registers | `classify()` FORCE | the ratchet is not sufficient for them; see above |
| `CLAUDE.md` | `classify()` FORCE | it is the push bar, not a record of a run |
| `FEEDBACK-INBOX.md`, `DECISIONS-LOG.md` | TEXT + NOSHRINK + APPENDONLY | CLAUDE.md declares them append-only |
| `RUN-LOG.md`, `HANDOFF.md`, `README.md`, `chess-trainer-backlog.md`, `feedback-inbox.md` | TEXT + NOSHRINK | they ARE rewritten in place every close-out; a byte prefix would refuse every honest run |

**With the registers FORCED, the ratchet's APPENDONLY arm over them cannot fire** — FORCE wins first.
That is #490's own phrasing about its block and it is true of mine: what protects the registers is the
classifier; the ratchet is what protects the eight root records part one un-forced.

The three conditions are **reported separately, not as one conjunct**, because each fails without the
others: TEXT (no NUL, no C0 control byte but tab/newline/CR), NOSHRINK (the line count a consumer
actually sees may not fall), APPENDONLY (every base byte byte-identical at head, and the base must end
in `0x0a` or the append is REPORTED and never credited).

## TEXT's honest limit, swept by both antagonists independently

Each appended all 256 byte values in turn and counted surviving rows. **Exactly one byte of 256
suppresses lines — `0x00` — under `LC_ALL=C` and `LC_ALL=C.utf8` alike.** A lone `0xFF` or a truncated
multibyte sequence prints its lines normally and warns on stderr only, so antagonist A's own
encoding-error hypothesis was measured **false** and withdrawn before it could cost a wrong fix. So
TEXT closes the grep class **on this toolchain** — a property of grep 3.11 plus a non-UTF-8 default
locale, not of the invariant, and nothing in the repo pins either. **It is a byte-class guard that
happens to cover the one byte grep cares about, not a semantic guard.** The condition that would catch
the whole shape is the consumer's own row count, and that is on the registers job.

It is deliberately **not** printable-ASCII: `CLAUDE.md` carries 36 non-ASCII bytes and
`gates/fastgate.sh` 1263, so an ASCII test would refuse the tree it protects.

## Three defects the CROSS-READ found in the veto fix — the stage, not the antagonist pass

1. **The veto ground was not closed.** `CLAUDE.md` had `NOSHRINK`, a line count, and A's attack was a
   **zero-net-line-change** rewrite. B drove it against my *fixed* tree: 742 lines at base, 742 at
   head, 9 bytes smaller, one of CLAUDE.md's two statements of the held-tree requirement deleted —
   FAST GATE GREEN, exit 0. Fixed by **classification, not a stronger ratchet**: `APPENDONLY` is wrong
   for CLAUDE.md (it is legitimately edited in place, by deliberate decision) and `NOSHRINK` is too
   weak, so a commit that rewrites the rules every session reads is not a records commit. Control (l).

2. **An append must start at a line boundary.** The byte prefix never required it, and A measured the
   live case: `README.md`'s last byte is `0x72`. The base must end in `0x0a` or the append is reported,
   never credited. All four APPENDONLY files end in `0x0a` today, so this guards the arm, not the tree.

3. **`rev-parse --verify` does not assert blob-ness, and both halves of the build asked it.**
   `cat-file blob` on a tree truncated the staged copy to 0 bytes, the prefix comparison became
   empty-against-empty, and the block **printed its own success sentence**. A directory named
   `.nojekyll` reported `yes`. **`^{blob}` is NOT the fix and A measured that before I reached for it:**
   `git rev-parse --verify "<sha>:<path>^{blob}"` answers `fatal: Needed a single revision`, exit 128,
   on a real blob. The working form is `git cat-file -t`. Controls (g2) and (i).

## Two defects I found against myself, and the second one invalidated my own controls

4. **NOSHRINK could not fire on an empty head** — the case it most exists for. `grep -c '' < empty`
   prints `0` **and exits 1**, so the `|| echo 0` fallback ran too, the captured value was two lines,
   the integer test errored, and the refusal never happened — while the block printed its success
   sentence naming the contradicting numbers: `HANDOFF.md: no shrink and no control bytes (103 lines at
   base, 0 ...)`. Counted with `awk END{print NR}` now, which exits 0 always, reads 0 for empty, and
   counts a final line with no trailing newline. Control (m).

5. **The patch left a DUPLICATE ratchet behind and the duplicate was doing the work.** The veto-fix
   patch replaced the **first 39 lines** of a longer block, so for three commits the file carried two
   ratchets: the new one over ten files and an orphaned 44-line one over the two registers. Controls
   (b), (c) and (f) returned the right exit codes **in the old block's wording** and I read that as my
   new code working. It surfaced only because moving the new block took its `REGTMP` with it, leaving
   the orphan's undefined under `set -u`; the controls then returned a bare EXIT 1 with no verdict
   sentence, and that mismatch is what I looked at.

   **The habit, one line: after a scripted block replacement, grep for the OLD block's distinctive
   identifier and assert it is gone.** `grep -c REGBAD` read 22 for three commits and nothing asked.
   It reads 0 now and the assertion is in the pre-launch check.

   This is *the check and the thing being checked were the same object* again — here, the same FILE at
   two places in it. A control that passed because of code the commit was supposed to have removed.

6. **The block was in the wrong place, measured not noticed.** It sat above `classify()`, where #490
   put its own `SHORTER` guard, so a commit that both rewrites a record AND touches `chess.jsx` was
   REFUSED (exit 1) when it should be told GO FULL (exit 2). Moved below the FORCE decision. **The
   pre-existing `SHORTER` block one block above still has that defect** — control (k2) returns exit 1
   "a register of cases or stories got SHORTER" on a `chess.jsx` commit instead of exit 2 naming it.
   That one is #490's and is filed, not fixed here.

## Claims withdrawn, in the documents that carried them

- **"a measured 4.1 seconds" is wrong.** The one number in my own commit message I did not measure — I
  copied it from the job document. A timed n=6 (median 7.22s); B timed n=6 across three different green
  commits (median 7.12s). **My own control had already read 7389 ms and I published 4.1 beside it.**
  ~700x, not 1200x.
- **"a root index.md is not rendered or served at all"** — the second half is false. It IS served,
  verbatim, at `/index.md`. What `.nojekyll` removes is the RENDERING.
- **And part one's REASON is not the one it looked like.** Of 31 tracked `.md` files **zero** carry YAML
  front matter, and Jekyll renders only files that have it, copying the rest verbatim — so a root
  `index.md` **would not have been rendered at `/` even without `.nojekyll`**, and `index.html` is
  tracked at the root so `/` resolves to it either way. The old arm's stated premise was **already
  false**. The honest reason for this change is *"un-forcing root .md needs the dotfile-publishing
  switch to be explicit, present, and itself FORCED"* — not *"it closes a live Jekyll render path"*. A
  fix justified by a consequence nobody can reproduce gets withdrawn along with its reason.
- **"that one arm costs 90 of them"** stated one marginal unconditionally: 90 is the marginal with the
  registers FORCE (the tree that ships), 96 with them records-only.

## Disclosure the commit message owed

`.nojekyll` makes `/.nojekyll` and `/.gitignore` fetchable URLs that were not before, because Jekyll
does not publish dotfiles. `.gitignore` was read: scratch paths and comments, no secret. Measured
against the premise, which answers the job's own open question: no `.github/`, no `_config.yml`, no
`Gemfile`, no `CNAME`, and `deploy.py` polls `/pages/builds/latest` — a legacy branch-root Pages site,
so `.nojekyll` is the right switch; and with zero front-matter files and zero Liquid tags in the six
served `.html` files, **no served page's bytes change**.

## The control set: 16, re-run from scratch after the orphan was removed

The earlier set measured a tree with two ratchets in it, so all of it was re-derived against the final
tree. Every exit code captured in a variable on its own line, never through a pipe.

| control | expectation | real exit | arm that fired |
|---|---|---|---|
| (e) `RUN-LOG.md` + `HANDOFF.md` only | GREEN | **0**, 7421 ms | — |
| (p) legitimate append to `DECISIONS-LOG.md` | GREEN | **0** | — (non-vacuity green) |
| (a-pos) root `index.md`, `.nojekyll` present | GREEN | **0** | — |
| (b) register row edited in place | FORCE | **2** | classify |
| (c) register row deleted | FORCE | **2** | classify |
| (f) NUL appended to a register | FORCE | **2** | classify |
| (d) records + `chess.jsx` | FORCE | **2** | classify |
| (k) record gutted + `chess.jsx` | FORCE | **2** | classify (the position fix) |
| (l) **zero-net-line-change `CLAUDE.md` rewrite** | FORCE | **2** | the new CLAUDE.md arm |
| (i) `.nojekyll` as a **directory** | FORCE | **2**, reads `no` | blob check |
| (a) root `index.md`, no `.nojekyll` | FORCE | **2** | classify |
| (refusal) this build's own commits | FORCE | **2** | classify |
| (f2) NUL appended to `FEEDBACK-INBOX.md` | refuse | **1** | TEXT |
| (m) `HANDOFF.md` emptied | refuse | **1** | NOSHRINK (the vacuity fix) |
| (n) `FEEDBACK-INBOX.md` truncated | refuse | **1** | NOSHRINK |
| (o) one line rewritten inside `FEEDBACK-INBOX.md`, equal line count | refuse | **1** | PREFIX |
| (g2) register a **tree at BASE** | refuse | **1** | "BASE is a tree, not a blob" |

**Every arm has a control that fires it alone.** (a)/(a-pos) is a true one-variable pair — the two
bases differ in exactly one 0-byte file (`1 file changed, 0 insertions(+), 0 deletions(-)`) and the
`index.md` commit is identical in both.

**(j), the consumer control my first set did not have**, measures `held.sh` and `buildnum.sh`, which no
commit of this build touches:

    permitted append  held.check=1  stampable=1  verifylog=0  heldLive 11->11  regRows 475->476
    NUL append        held.check=0  stampable=0  verifylog=0  heldLive 11->0   regRows 475->365

## `.nojekyll` itself has no arm, on purpose

It falls to the default `*)` FORCE, so touching or deleting it costs the full suite. Default-is-FULL is
the whole shape of that script. Do not "tidy" it into an arm.

## Found en route, and fixed for the runs it would have hidden

**#508's dashboard snapshot was dated two hours in the future of its own `atIso`** (`at` = 04:55:00Z,
`atIso` = 02:55:00Z, and 02:55 matches its close-out commit). The collection sorts on `at`, so between
02:55Z and 04:55Z any run closing out with a TRUE timestamp would have sorted BELOW it and been hidden
— the dashboard would have shown #508's numbers over a later build. **Three hourly fires landed in that
window.** I was not hidden by it myself, so this was fixed for the runs that would have been. One field
corrected in place; added as a sighting to `jobs/a-partial-snapshot-hides-the-last-good-one-...`, which
had already argued for exactly this check and **had no instance of it on a COMPLETE snapshot — the part
that matters, because the shape check that job proposes would have passed this row.**

## The blind pair, and its estimate

Both independence conditions held: launched in ONE message at 03:32Z **before** the suite, and B ran as
the Explore agent type, which carries no database tool, handed the frozen inputs as files. The freeze
was taken **once, after the last edit** — #508's own lesson against itself.

**uniqueToA 6, uniqueToB 6, common 5, over 17 upheld. Lincoln-Petersen ≈ 24, so both missed about 7.**

Sharper than the arithmetic: **each door's decisive finding was structurally invisible from the
other's.** A's is a fact about the instrument's own code paths — nothing on the shipped surface shows
it, because the tree is correct and the instrument is blind. B's is a fact about how the consumers
parse, and it is not in the diff at all. **A single-antagonist run at either door would have shipped one
of the two, and at B's door I would have shipped a ratchet that certifies the exact attack it was built
to stop, with its own success sentence in the log.**

**And the cross-read found more than either antagonist's own pass did** — see items 1 to 3 above. That
is now filed as a finding against the procedure: six builds have recorded "launch the antagonists
before the suite" as paying off, and **none recorded that the cross-read is also a tree-changing
stage**, which is why this run complied in full and still paid 24 suite-minutes.
`jobs/the-cross-read-is-a-third-tree-changing-stage-...`.

## Still owed, and none of it is mine to take

- **The drill-verdict P0 Kunal reported twice is still live on main.** Eleven P0s read `ready`. I took
  none of them, under STEP 0F(5), and said so in a `reprioritised` note.
- The auditor did not run, making it **ten consecutive builds**. Structural: seventeen of eighteen
  lanes have no enabled scheduled task and a build lane may not enable a trigger.
- The three stranded payloads #506 named by id are owed by a **fifth** consecutive run. STEP 1I's
  window is hour >= 11 UTC; my wake was 03.
- The live site is unverifiable from this container (egress-blocked), so every claim here is about a
  bundle and never about the deployed site.
- `legal-pages-fill-placeholders` is blocked by an explicit **"later"** from Kunal
  (`legal-pages-approve-draft-2026-09-22`, choice `later`), not by a missing answer. Re-tested [R23].
- R15's **quality** mean still cannot be computed: zero `quality` figures exist anywhere in
  `scores/build`, re-derived at n=37 value figures. #504's finding (8), reproduced at a larger n.

## Provenance

`GATES GREEN #509`, **59 sections, 4621 PASS, 0 FAIL**, 0 `<<<` markers, over bundle `227126b82b81`,
gated sha `86c2221`, base `38a8a25`, suite 04:20:30Z to 05:59Z (99 min) from the frozen sibling copy.
Figures **re-derived, not read off the footer**: the actual `^PASS` count equals the footer's 4621.
`verify-log.sh '#509'` REAL EXIT 0; `held.sh check` REAL EXIT 0, not held. All 87 suite-read files
byte-identical between launch and finish (aggregate `f781590fd58f`), so the log is not a collage of two
trees. Shipped as a clean fast-forward `38a8a25..5ba16d7`, verified with `merge-base --is-ancestor` and
an independent `ls-remote`. Manifest 58 required / 58 present / 0 missing / 0 unlisted / **4
known-absent**, so this green is honest and blind in exactly four places, as it says every run. **FIVE AS OF #510** [R18]: that build added `gates/pending/75-fit-loop-one-way-ratchet.js` with an `absent` row, so the tool now reports five and this sentence — which is scoped to #509's green and so is not false — is the one line a handoff reader uses for coverage. Antagonist B flagged it against the tree it describes.

**A green log is a statement about the suite, not permission to push** [#450]. This tree was not held,
and nothing about it is held now.
