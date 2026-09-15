# Chess Trainer — read this before you build

This file exists because a Claude Code session reads nothing automatically except this file, and
roughly twenty of this project's documents live in the claude.ai project (`claude/agents/*`) where
this session cannot see them. If something matters to a builder, it belongs in this repo.

**Start every run by reading tracker flag `start-here-read-first`**, then list the whole `flags`
collection on artifact `20acb6cb-42bf-44a3-b2fe-5a8223cca1e2` and read every document, not just the
newest. Any flag with `broken: true` outranks the queue. Acknowledge each with an `acked` field
saying how you understood it. Then read `claude/BUILD-CONTEXT.md`, which is those project docs
condensed to what changes what you build.

## Who builds

Only `session_01Ar5fWLg9DZuPaRDBfKnXvs`, the Claude Code chat with this repo attached, builds,
gates, commits or pushes. Kunal's decision, 2026-09-13. Every other chat may read, measure, test,
and write docs and flags. The live rule is tracker flag `pen-lock-one-writer`.

- **Never use GitHub's upload page.** It strips the `Claude-Session` trailer, which is why `14f06ac`
  is the one commit here whose author cannot be traced.
- **Build numbers are issued by this session only**, one sequence. Two trees must never carry the
  same number; that happened once with #375 and cost a rebase.
- **Before any push:** `git fetch && git log -1 origin/main`. If main moved, rebase onto it. Never
  push over it.
- Work from another session arrives as a **patch committed here** with the trailer intact, never as
  a parallel upload.

## Where the truth lives

| file or artifact | what it holds |
|---|---|
| `HANDOFF.md` | where the last run left off. Read before building. |
| `claude/BUILD-CONTEXT.md` | the project docs condensed for builders. Where it contradicts an older file in this repo, it wins. |
| `FEEDBACK-INBOX.md` | everything Kunal has raised. Append-only; never reword an entry. |
| `DECISIONS-LOG.md` | what he decided and why. **Search it before asking him anything.** |
| `RUN-LOG.md` | ETA against actual per build, and the four numbers per close-out. |
| `claude/stories/`, `claude/agents/` | stories, test cases, and the agent reports this repo owns. |
| tracker flags `20acb6cb-42bf-44a3-b2fe-5a8223cca1e2` | live instructions, both directions. The only two-way channel between the sessions. |
| metrics dashboard `3478220d-8023-43ba-b08a-4397eb054cc3` | the open decisions and the scope baseline. Read `decisions`; WRITE a `snapshots` row at close-out so the numbers move when a build lands (Kunal, 2026-09-14 - it used to be read-only from here). Never set `certified` anywhere: that is his alone. |
| pickup board `f38b7157-4bd7-4ae2-b2ce-2c7594b8cf36` | who did what, append-only. |

**Nothing waiting on an answer gets built before the answer exists.** Check the item's id in
collection `decisions` on the dashboard, not your memory. Twenty-three questions are open with him.

## How this app is tested

Headless, in real Chromium, against the bundle under test, at **375x730** — his actual phone's
layout viewport. It is not 375x679; that number came from subtracting the status bar twice, and two
sessions made the mistake independently. Keep 375x679 as a shorter-phone column and 390x844 as the
wider one.

- `cd gates && npm ci` once, then `gates/build.sh '#NNN'` to bundle and stamp, and
  `gates/gates.sh '#NNN'` from the top before any push. A build is gated only when the log ends
  `GATES GREEN`.
- **`gates/gates.sh '#NNN' '20-review 21-*'` runs a SUBSET, and a subset NEVER authorises a push.** Measured at
  #391: three gates in **2m27s** against about **60 minutes** for the full suite, so the diagnose-fix-recheck
  loop costs two and a half minutes instead of an hour. The guard is mechanical, not a comment: a subset run
  **cannot emit the string `GATES GREEN`** (every consumer in this project greps for exactly that, so a subset
  log is unusable as a push gate by every reader that already exists), it writes to `<N>-subset-all.log` so it
  can never overwrite the full log, and an unknown gate name fails loudly rather than silently running fewer.
- **`gates/verify-log.sh <log> [#NNN]` is the one place that decides whether a log authorises a push.** Run it
  before citing any log. It refuses a subset, refuses anything not ending in a clean `GATES GREEN #NNN`, and
  refuses a log whose header and footer name different builds - which is the #388 mistake an external challenger
  caught and this lane did not.
- **COPY `gates/logs/<N>-all.log` INTO `claude/agents/gatelogs/`, NOT the terminal output.** They are different
  files: gates.sh `tee`s only the summary lines to stdout and writes every PASS line to the log. Every gatelog
  committed before #391 is the 57-line stdout capture rather than the ~1200-line real log, so the footer totals
  in them are right and nothing else can be audited. `verify-log.sh` reports the PASS count, which makes the
  thin ones obvious: a full suite reporting "0 PASS" is the tell.
- The harness library is `gates/lib.js`; read its header before writing a gate.
- Serve locally. `learntocheckmate.github.io` is blocked by the egress proxy; `github.com` is not.
  Chromium is at `/opt/pw-browsers/chromium`; never run `playwright install`.
- Recordings are kept only for what a device alone can show: Apple emoji ink, iOS Safari, real
  touch, engine timing on his phone, signed-in state. Where a recording and a sandbox measurement
  disagree, the recording wins.

## The rules that have cost the most when broken

- **Measure, do not read.** No claim about size, spacing, overflow or position taken from source.
- **A crop is a reading, not a measurement, and so is a bad selector.** Both produced false P0s in
  one day. Scope selectors to painted elements; exclude `head` and `style` nodes.
- **"Below the fold" is not "unreachable", and `document.scrollingElement` is the wrong thing to ask.** `#root` is
  the app's scroller and index.html says so: "The app scrolls inside here if its content ever overflows - the page
  never does." So `docScrollY` is 0 on every screen BY DESIGN, and a report that reads it as "nothing scrolls"
  will call reachable content stranded. This produced TWO false P0s in one night (#380 the ⋯ sheet, #382 the
  Review entry screen), both with real-looking numbers - the second one's "overflows 80.2px" was the scroller's
  own range read as spill. An element below the fold is unreachable only when NO ancestor with a computed
  `overflow-y` of auto or scroll can bring it on screen, measured by ACTUALLY SCROLLING that ancestor and
  re-reading the rect. Two traps inside that: script can scroll an `overflow:hidden` box and a finger cannot, so
  `scrollIntoView` always says yes; and finding *some* scrollable ancestor proves nothing unless scrolling it
  moves THIS element. `gates/regress/40-reachability.js` is the reference implementation, and its own first
  version made both mistakes and went green against a build with the scroller removed. Vertical spill inside a
  scroller is fine. **Horizontal** spill past the viewport is the real unrecoverable bug - see
  `sweep372-other-lines-320`.
- **A transform is paint, not layout, and `getBoundingClientRect()` cannot tell you which you are looking at.**
  It includes transforms, so a deliberate visual effect reads as a layout failure. Every piece on the board is
  drawn inside `transform:scale(1.06)`; 46.875 x 1.06 = 49.6875, and that 49.69px box "overhanging 1.4px at 375"
  was filed as a real defect (`puzzle-board-square-1px-375`) before anyone checked the source. It was never
  painted past the edge at all - the board clips at 374.98, INSIDE the viewport. It reproduced in a clean
  browser, in one state, on two bundles: **reproducible and real are not the same claim.** Clip-intersection is
  the obvious fix and it is wrong, because the board clips at 374.98 and the lesson column clips at exactly 320,
  so it excuses the REAL 38.9px defect just as readily as the false one. What separates them is that one is a
  transform and the other is layout: excuse an element only when its nearest layout box above the outermost
  transform in its chain is itself inside the viewport. `gates/regress/35-width-containment.js` is the reference,
  and it pins the exclusion to its MECHANISM - every excused box must be a div or img exactly 1.06x the square it
  sits in - because the first draft asserted a bare count and a count loose enough to pass is loose enough to hide
  a real defect appearing beside the pieces.
- **A negative control must cross the threshold, not just disturb the mechanism.** Reverting half of #384's fix
  left the row still overflowing its box, by 19px instead of 48 - but the trailing button landed at 294 on a 320
  screen and stayed on it, so the gate was right to stay green. "The numbers moved" is necessary and not
  sufficient; they have to move past the line the assertion actually draws.
- **A gate that enters a state by the shortest route often enters the wrong one.** #385's "no bubble in
  analysis mode" passed against a bundle with that guard deleted, because the gate reached analysis through
  the driver's shortest path - which goes to ply 0, where an unrelated `ply>0` condition already hid the
  bubble. The assertion was about `anaMode` and `anaMode` was never the thing under test. When an assertion
  says "X is absent in state S", assert FIRST that X was present just before, and that S was actually
  reached; both checks are one line each and they are what turn a green into evidence.
- **A written warning is not a guard, and a harness that substitutes the thing under test silently will be
  believed.** `gates/lib.js` used to serve `gates/.pin-app.js` by DEFAULT whenever `CT_APP` was unset. That
  file was a **#372** bundle from two days earlier; it was gitignored, so `git status` never mentioned it,
  and `gates/pending/README.md` carried a paragraph saying exactly what would go wrong. It went wrong anyway:
  on 2026-09-14 four ad-hoc `node gates/...` probes measured the two-day-old app and were reported as the
  current build, including one written up to Kunal as "ground truth on the shipped bundle". `gates.sh` names
  its bundle explicitly, so the SUITE was never affected and no shipped conclusion changed - but the
  provenance of four measurements did. The pin is now opt-in (`CT_PIN=1`) and the stale file is deleted, and
  **every `L.launch` prints the bundle path and the stamp it read out of it**. If a run's output does not say
  what it measured, it is not evidence. Ask of any harness default: *what does it do when I forget?*
- **A SHAPE is not a VALUE, and the cheapest way to find out is to cross-check against whatever else on
  screen shows the same quantity.** #385's coach chip shipped formatted with the CENTIPAWN formatter against
  a number held in PAWNS, so it printed every evaluation divided by a hundred: `+0.0` on twenty-one plies of
  the Opera Game while the eval bar beside it on the same board read up to `+5.9`, and `+1.0` over a mated
  king. Its gate was green, because the assertion was a regex on the chip's text and `+0.0` satisfies a regex
  for an evaluation perfectly. Nothing compared it to the bar eight pixels away. When two elements show the
  same quantity, assert they agree — not exact equality if they are different snapshots of it, but SCALE: a
  factor of a hundred is not a rounding difference.
- **AN ALTERNATION THAT MATCHES EVERY BRANCH PINS NOTHING.** `gates/regress/21-review-brilliant.js` is the
  only gate covering brilliancy explanations - the item Kunal raised five times before it landed - and it passed
  7 of 7 against a build whose explanation had CHANGED, from "Nothing else came close: Bxf6 was 1.1 pawns worse"
  to "Bxf6 was the only other try, 1.1 worse". The assertion read
  `/Nothing else came close|worse|next best|instead/i` and the bare word "worse" appears in all four branches of
  `dropTxt` (chess.jsx:667-673), so it could not tell them apart. An external challenger found it on 2026-09-14
  by running the designed negative control; nobody reading the gate had noticed, because the regex looks
  thorough. Before writing an alternation over wordings, READ ALL THE BRANCHES THE CODE CAN PRINT and check the
  pattern rejects the others. Better still, assert the branch: match ONE template, assert exactly one of the
  known templates matched, and check the NUMBER the template printed lies in the band that template is printed
  for - the challenger's break puts a 1.1 inside the 0.35-0.99 wording, and that mismatch is detectable even if
  the pin is later loosened. #388.
- **A CROSS-CHECK AGAINST A READOUT FED BY THE THING UNDER TEST IS NOT A CROSS-CHECK.** The "shape is not a
  value" rule sends you to whatever else on screen shows the same quantity - but check WHERE that second
  readout gets its number first. #389's gate needed to prove the engine line's evaluation was not wrong-signed,
  and the eval bar shows the same quantity eight pixels away. It is worthless there: with `engOn` the bar
  renders `engLine` ITSELF (`_engBar`, chess.jsx:3809), so the two agree by construction and the assertion is
  decoration that looks like rigour. The genuinely independent readout, the coach chip, turned out to render
  EMPTY in that state, and two assertions built on it went red on the GOOD bundle before that was noticed.
  What survived is pinned to a fact about the GAME rather than to any readout: White is winning after both
  10.Nxb5 and 13.Rxd7, so a negative number is wrong no matter which element prints it. When no independent
  readout exists, pin to the domain, not to a sibling of the thing under test.
- **A FAILED QUERY IS NOT AN ANSWER, AND CACHING IT IS HOW "BROKEN ONCE" BECOMES "BROKEN FOR EVER."** `sfBestLine`
  resolves `null` on every failure path - worker not ready, idle check failed, postMessage threw, aborted, or
  the WASM trapping mid-search - and never rejects, so the caller could not tell a dead search from a real one
  and stored `{line:''}` as the engine's reply. The position was then never re-queried and the user read a bare
  ellipsis for the rest of the session. Measured on #387: plies 19 and 25 of the reference game, three revisits
  each, never recovered. Before caching anything that came from a worker, an engine or a network call, ask what
  that call returns when it FAILS, and whether the cache can tell the difference. #389.
- **A LESSON RECORDED IN ONE GATE DOES NOT TRAVEL TO THE NEXT ONE BY ITSELF.** At #386, `42-home-devrow` found
  that its own tap was landing on nothing, because the home dev row is BELOW THE FOLD at 375x730 and 320x568; it
  was fixed there by scrolling the finger-scrollable ancestor and asserting the button is on screen before
  tapping. At #390 a brand new gate, `23-full-walk`, opened the SAME gallery from the SAME button and went 4 red
  on the first run for the SAME reason. The rule was written down, in this file, and it still did not carry,
  because it had been filed as a fact about one gate rather than as a habit. **Before tapping anything in a new
  gate, ask whether an existing gate already had to fight that control** - `git log` and the regression log are
  faster than rediscovering it.
- **When something is cut off, assert WHICH THING DID THE CUTTING.** "Nothing is ever truncated" is usually
  the wrong test — on a small screen some text genuinely will not fit. What must never happen is cutting
  without saying so. A `-webkit-line-clamp` draws an ellipsis; a box with `overflow:hidden` does not, and if
  the box is the shorter of the two it wins silently. #387's assertion is that the bubble never sits on its
  own height cap, so the clamp is always what truncates.
- **A flaky assertion is worse than no assertion, and text that arrives late is a common cause.** #387's ply
  walk disagreed with itself between runs of the SAME bundle, because on a Brilliant or Great move the coach
  sentence GROWS about half a second after you land on it — the sacrifice refutation comes from a debounced
  engine query. A 220ms settle measured the short sentence and a 240ms one sometimes the long. Settle past
  the thing you are racing, then prove it by running the gate twice and getting the same numbers.
- **A PREDICATE THAT DEPENDS ON WHICH ANSWER AN ENGINE HAPPENS TO RETURN IS A COIN FLIP WITH EXTRA STEPS, and
  running the gate twice will NOT find it.** #387's rule - settle past what you are racing, then prove it with
  two identical runs - covers timing. It does not cover this. Gate 22 shipped at #389 with
  `/\d+\.+\s*[KQRBNO]?[a-h1-8]/` as its test for "is this a chess variation": that needs a file or rank
  immediately after the piece letter, so it matches `16. Qd5+` and NOT `16. Qxf7`, where the next character is
  the capture `x`. It went green twice because both runs happened to return a line containing one non-capture
  move, and four builds later the engine returned a line that was ALL captures and the gate called a perfectly
  good variation a bare ellipsis - red on a healthy build. **When an assertion parses something an engine wrote,
  enumerate what the engine can legally produce and unit-test the predicate against that list**, including the
  cases it must REJECT. Eight strings took a minute and would have caught it on the day. #391.
- **"THAT WOULD BE A BIGGER CHANGE" IS AN ESTIMATE, AND AN ESTIMATE IS NOT A MEASUREMENT.** At #389 the
  first-visit half of the engine-trap defect was deferred with the words "fixing the first visit means detecting
  the trap and recovering the worker, which is a bigger change", and a wrong-signed evaluation - a number telling
  the user they are LOSING a position they are winning - shipped as a named residual for two builds. It was one
  line. `sfBestLine` resolves `line||[bm]`, so an empty line means the search returned neither a pv nor a
  bestmove; it died, and the partial score came out of that same dead search, so the fix is to fall back to the
  stored analysis. Naming a residual honestly is good and it is not a substitute for spending ten minutes
  finding out how big it actually is. **Before deferring something user-visible, open the code and look.** #392.
- **A GATE THAT HALTS ON THE FIRST MISSING ELEMENT HIDES EVERY REGRESSION AFTER IT.** `tapCt` throws when its
  target is absent, so #393's new assertion took the whole Review gate down against its control bundle: 4 red
  and then the harness threw, leaving NINETY assertions unrun. Red either way, so the control still worked - but
  had that been a real regression on a real build, the Review screen's only coverage would have stopped at the
  first absence and reported nothing about the rest. Guard anything that TAPS or NAVIGATES on a thing that might
  not be there: go red on its own assertion, then carry on. 89 pass / 8 fail says far more than 2 pass / 4 fail.
- **THE APP KEEPS SEVERAL SCREENS MOUNTED AT ONCE, so "in the DOM, laid out, on screen" is NOT "the user can use
  it".** Home is a `position:fixed` full-viewport layer over the tab screens; `rev-summary` is `fixed inset:0
  zIndex:500` and opaque; menu, look and setup are sheets. A naive hit test that asks "does elementFromPoint at
  this button's centre return this button" reports SIX SCREENS of false defects, because every button on every
  screen underneath fails it. Excusing them by "the covering element is big" is worse than useless: `rev-summary`
  IS big, so that rule hid the very defect the probe was written to find - the same shape as the clip-intersection
  trap, which excuses the real 38.9px overflow as readily as the false 1.4px one. #393 tried three versions and
  shipped none of them; the defect was fixed on direct measurement instead. **An assertion you cannot ground is
  worse than no assertion**, and a pinned footer over a scrolling list will fool the same probe again - those
  buttons are reachable by scrolling, which is "below the fold is not unreachable" wearing another costume.
- **AN OVERLAY RENDERED INSIDE THE THING IT COVERS DEFEATS EVERY "IS IT STILL THE THING" HIT TEST, and that
  is the containment trap wearing its third costume.** #394 removed the coach bubble and the gate's headline
  assertion - nine points across the top third of the board must hit-test to the board - PASSED against the
  control bundle with the bubble fully up. Two faults, and the second is the one that generalises. First, the
  ancestor selector named `[data-ct="rev-grid"]` and `[data-ct="board"]` and NEITHER EXISTS: the board carries
  no `data-ct` at all, and `gates/lib.js` finds it the only way there is, by the widest div whose
  `gridTemplateColumns` is a `repeat(8,...)`. A selector that cannot match reports a defect that is not there,
  which is the "a bad selector is a reading" rule again. Second, and worse: once the selector was right,
  `grid.contains(hit)` was STILL satisfied by the bubble, because the bubble renders as a child of the grid, a
  sibling of the 64 squares. **"The element under your finger is somewhere inside the board" is satisfied by
  the very overlay you are trying to detect.** The fix is to name the thing that must be hit, not its
  container: the 64 squares, so a piece, a badge or a rank label still counts and anything else does not. Ask
  of any containment check: *is the thing I am trying to exclude a DESCENDANT of the thing I am asserting?*
  The same shape as clip-intersection excusing the real 38.9px overflow, and as "the covering element is big"
  hiding the very defect it was written for at #393.
- **A THRESHOLD BELONGS TO THE INSTRUMENT IT WAS CALIBRATED ON, AND MOVING A CROSS-CHECK TO A NEW READOUT DOES
  NOT CARRY THE NUMBER WITH IT.** When the bubble went, gate 21's eval cross-check moved from the coach chip to
  the eval bar and kept its `>= 3.0`. It went RED at +2.8 on a healthy bundle. The 3.0 is real and is the app's
  own - `chess.jsx:727` prints "<mover> is winning here." iff `evM>=3` - but `evM` is the STORED per-ply
  analysis, which is what the chip rendered, while the bar renders a LIVE `sfHit` probe. Two instruments
  measuring the same quantity are allowed to disagree in the decimal; that difference is exactly what makes
  the check independent rather than circular, so demanding they agree to it is self-defeating. Split it: pin
  the BRANCH (the app printed the winning clause, so the stored value is in that band by construction) and
  require the independent readout to agree in SIGN AND SCALE. A >= +2.0 band still rejects everything the
  assertion exists for - a wrong sign (#389 shipped -2.5 on a won position), a hundredfold error (#385 printed
  +0.0 beside a bar reading +5.9), and a dead search returning nothing. **When an assertion you just moved goes
  red, find out which of the two readings changed before you touch the number.**
- **A CONTAINER IS NOT ITS CONTENTS, AND THE CHECK YOU WOULD NATURALLY WRITE PASSES ON THE BUNDLE HE IS
  COMPLAINING ABOUT.** Kunal reported the lesson footer icons as too small. Every one of those buttons measures
  50.5pt square on his phone - above the 44pt minimum, the same height as the pills above them - so a tap-target
  assertion, which is the obvious one to reach for, goes GREEN while the complaint stands. What was small was
  the INK: a 9.2pt close x, 13.8 x 18.3 chevrons, 17.2 x 3.1 dots, inside those 50.5pt boxes. Measure the thing
  the user is looking at: the text node's own box (a Range over the button's contents) or the SVG's, not the
  button's rect. The fix then goes INSIDE the box and never to the box, because that row is `position:fixed` and
  growing it spends board height. `gates/regress/11-lesson.js` is the reference, and its control is the proof
  the distinction is real: on the pre-fix bundle the three GLYPH assertions go red at every geometry while the
  container-height assertion stays green. #395, and the same family as #347's "icons still sized for the text
  labels they stopped carrying" - the tell there and here is a bare glyph left at a font size that was chosen
  for a word.
- **A CLOSED FLAG WITH A FROZEN DENOMINATOR ANSWERS "NONE" TO THE QUESTION IT EXISTS FOR.**
  `gates-without-a-negative-control` was closed at #381 reading "ALL 19 SUITES have now been run against a
  bundle built to fail them". True when written. The suite is now 27, nine gates landed after it closed, and
  the one place anyone would look to ask *which gates are uncontrolled* said "none" - so 44% of the assertions
  in this suite had never been shown able to fail, including its two largest gates, covering the two screens
  the audit ranks #1 and #2 by risk. An external challenger found it; nobody inside the lane did, because the
  flag looked finished. **When a ledger counts against a total that can grow, either it tracks the total or it
  must be reopened when the total moves - never closed at the number that happened to be true that day.** And
  when someone hands you a list like that, CHECK IT rather than repeat it: a grep for "control" clears
  `45-play-setup` and `46-play` wrongly, because both use the word to mean a UI control. #395.
- **Absence is the hardest thing to measure.** "This does not exist" must list the screens and
  states actually checked.
- **The board is sacred.** Maximise the board, minimise everything else, and the board must never
  jump. A row that can appear must reserve its space. If a fix costs board height, put it in a sheet.
- **Kunal certifies closed, not you.** Done is a claim until he confirms on his phone.
- **Measure after interaction, not at the start position.** Two P0s lived for months at game over
  and at a lesson's end because every measurement was taken at move 0.
- **A gate must exercise the configuration the USER has, not the one the fix was written for.**
  #375 made the review reproducible on the worker-pool path and left the single-worker fallback
  serving the old, unreproducible code out of the same build - and the gate written to guard that
  fix forced a 3-worker pool for every run, so it exercised the fixed path twice and would have gone
  green on every broken build. Found in #377 by reading the source. When a code path is chosen by
  the device (`hardwareConcurrency`, `deviceMemory`, a `ct_*` override), the gate covers EVERY
  branch or it is not a gate.
- **Prove a gate against a deliberately broken build before trusting its green.** Twice in one day a
  gate passed on a bundle built to fail it. Both times the fix was to assert the thing itself, in the
  BUNDLE UNDER TEST, rather than only its downstream symptom - a symptom that a fast machine may not
  be able to produce at all.

## Temporary code, with an expiry

Anything shipped as a diagnostic gets a removal condition written down here on the day it ships, because
permanent dead code is how the last pile of ghosts built up. Remove it when its condition is met, and delete
its row.

| what | where | comes out when |
|---|---|---|
| the ply log: records each ply change behind the Layout readout switch | `chess.jsx`, search `plyLogOnRef`; gate `gates/regress/32-plylog.js` | Kunal certifies `k12` closed on his own phone (#376, 2026-09-13) |

## The overnight run

A scheduled task wakes THIS session at 04:00 UTC (midnight ET) — never a fresh chat, because a second
builder is exactly what collided on 13 September. It runs only if there is work, and the bar is
deliberately high: a flag counts as outstanding only when `broken` is true AND it has no `handled`
field. **`acked` is not `handled`** — the first means someone read it, the second means it shipped.
An answered decision counts only when the `choice` selects a real option; "draw me options first" and
"let's talk" are not answers. Nothing outstanding means stop silently; a quiet night on a clean queue
is the right outcome, and inventing work to justify the run is the failure mode.

## Parked

The iPad, entirely, until the phone layout is settled. Do not spend a run on it and do not ask
about it again.
