# gates/pending — gates that are written, proved, and deliberately NOT in the suite

`gates/gates.sh` reaches `gates/regress/*.js` (globbed at `gates.sh:112`) plus exactly two files it invokes
BY NAME — `gates/mountcheck.js` (`:202`) and `gates/unit-drill-why.js` (`:250`). Nothing in *this* directory
is reached by any of the three. A gate in here is finished work held out of the suite, with the reason
written down.

*(This sentence read "runs `gates/regress/*.js` and nothing else" until #477. It was wrong on both named
files, and it is the sentence a reader uses to decide whether a file must move into `regress/` to run at
all — so it was worth correcting rather than inheriting. Antagonist B measured it against the live suite log
of the run that fixed it.)*

This is **not** a parking lot for gates that turned out to be inconvenient. The only thing that belongs
here is a gate whose subject is **blocked on a decision Kunal has not made**, because putting it in
`regress/` would leave main permanently red and block every later build for a defect nobody is allowed to
fix yet. A gate that is red because the app is broken belongs in `regress/`, and the app gets fixed.

Run one by hand, with the bundle named explicitly:

    CT_APP=$PWD/app.js node gates/pending/<gate>.js

**Always pass `CT_EXPECT` too, when you run `mountcheck.js` by hand.** With it unset, mountcheck skips the stamp
comparison entirely: measured 2026-09-14, the **#378** bundle passed 16 of 16 and exited 0 while being presented as
a later build. `gates.sh` exports `CT_EXPECT` itself (defaulting to its own argument), so the suite is immune and a
stamp mismatch is caught in about 21 seconds - but a bare `node` run is not, and it is the same shape of trap as
the pinned-bundle one below.

**~~Always pass `CT_APP`.~~ FIXED IN #386 - the trap is gone, and how it went is worth keeping.** `gates/lib.js`
used to fall back to `gates/.pin-app.js` when `CT_APP` was unset, and that file was a stale **#372** bundle.
`gates.sh` exports `CT_APP` itself so the suite was always immune; a bare `node` run was not.

**This warning was already written here, and it did not work.** On 2026-09-14 a build session wrote four
ad-hoc `node gates/...` probes without `CT_APP`, measured the two-day-old bundle, and reported the numbers as
the current build - one of them in a message to Kunal as "ground truth on the shipped bundle". Nothing shipped
was wrong (every validating run used `CT_APP` or `gates.sh`) but four measurements were mislabelled. A
paragraph you have to already know to read is not a guard.

So, in #386: `gates/.pin-app.js` is deleted, the pin is **opt-in** (`CT_PIN=1`), and **every `L.launch` prints
the bundle path and the build stamp read out of that file**, with the reason it chose it. A run that does not
say what it measured is not evidence. Keep it that way.

**THIS DIRECTORY HOLDS TWO KINDS OF FILE AND ONLY ONE OF THEM IS A HELD GATE.** The rule above — a gate
blocked on a decision Kunal has not made — governs the first table. The second table is one-off **probes and
renderers**, run by hand against a named `CT_APP` and not candidates for `regress/`. They were landing here
unlisted, which is how this README came to have one row against **twelve `.js` files**; the fix is a second
table with its own rule, not a looser first one. See
`jobs/a-unit-test-written-for-the-p0-is-not-in-the-suite-2026-09-28`.

**AND FOUR OF THE ELEVEN DO ASSERT, SO "THEY PRINT, THEY DO NOT ASSERT" IS NOT THE RULE THAT HOLDS THEM OUT
[R18].** #477 wrote that sentence and antagonist B measured it false the same hour: `grep -c 'L\.say('` gives
`probe466-lessonelo.js` **7**, `probe466-rect.js` **6**, `probe466-pfh.js` **5** and `render469.js` **1**,
while the other seven are genuinely 0. What actually holds all eleven out is narrower and is the honest
statement: **each was written for ONE build against ONE bundle to take ONE measurement, so its selectors,
its line references and its expected values are pinned to a tree that has moved.** Three of them carry real
assertions and are therefore *candidates* in principle — admitting one needs R36's three-run determinism
check and a re-pin, which is a build, not a file move. Said here because "it does not assert" would have
parked three assertion-bearing tests outside the runner on a false premise, which is the exact class
`TC-R50` exists to detect.

| gate | why it is held | moves into `regress/` when |
|---|---|---|
| `35-width-containment.js` | Red on a real, confirmed defect. `lesson-lines` ("♟ Other lines (2)") runs **38.9px past the right edge at 320x568** (left 189.7, right 358.9, page scrollWidth 320, so the cut-off part cannot be scrolled to), and a 46px `⋯` button on lesson practice runs 3.1px past. Confirmed by hand from a clean browser, not just by the gate. At 375 the same button ends at **exactly 375.0** — fitted to the pixel, which is the signature of the hardcode rather than a coincidence. Kunal answered Z-06 "Support 320 properly, fix all three", but with the condition "i want to make sure it doesn't impact the display on the larger screens that we've so painstakingly tried to improve". That condition **cannot be met for this item**: the row is a CSS grid `1.8fr 1fr`, an `fr` track will not shrink below its content, and at 375 the row is already flush to the screen edge with no padding to give back — so fixing 320 necessarily moves it at 375. See flag `width320-gate-red-needs-kunal`. | He answers the 375 question and the two overhangs are fixed. |

## One known fault in `35-width-containment.js` itself

Recorded so nobody trusts its green prematurely. It walks every state in **one** browser, and it reported a
1.4px overhang at 375 on four states that a clean-browser probe **could not reproduce**. That is almost
certainly leakage between states, which is a fault in the gate and not in the app. Isolate the states — one
browser per state, or re-open between them — before this gate joins the suite. Until then its **green**
would be no more trustworthy than its red.

## Probes and renderers — each pinned to one build's tree, and none of them reached by any suite

Each was written for one build, against one bundle, to take one measurement that no gate could reach. They
are kept because a probe that produced a published number is the only way a later reader can re-take that
measurement, and deleting one silently turns its number into folklore. **A row here is not a promise that
the probe still runs**: they slice the app by selector and by line, so a probe older than the screen it
measures may be stale, and the honest test is to run it against a named bundle and see. Four of them do
carry `L.say` assertions (marked below); that makes them candidates in principle and not in practice, for
the reason above.

Run one the same way as a held gate, with the bundle named explicitly and never from a bare `node`:

    CT_APP=$PWD/app.js node gates/pending/<probe>.js

| probe | build | what it measures, and why no gate could |
|---|---|---|
| `probe-card3-424.js` | #424 | Reaches `lesson-demo-end` through **preview gallery card 3**, the route gate 35 and the headless gallery take, rather than by driving the Italian Game. Written because `uat422` measured 8.77px past the viewport at 320x568 on card 3/8 while the drive route measured the same button 7.70px **inside** it — two routes over two lessons, so the two numbers were not comparable until something ran both. |
| `probe-mincontent-424.js` | #424 | Asks whether the `min-content` override answers the question at all: it must return the SAME number where the grid fits and where it is blown out, because `min-content` is a property of the content and not of the row. A control on an instrument, not on the app. |
| `probe-otherlines-424.js` | #424 | The lesson demo row's two-button grid, measured against **the row's own right edge as well as the viewport's**, because the job's `doneWhen` was "the button fits inside the row" and that is a two-element comparison. Prints each child's `min-content` so the ladder's arithmetic can be checked rather than assumed. Each geometry is time-boxed: v1 hung for six minutes on a geometry that could not reach `demo-end`. |
| `probe-verify-424b.js` | #424 | Post-veto verification: that the vars branch survived the Flip revert, the two new pin values 39.55 and 19.16, the tracks-vs-clone 2.00px gap, and what the Flip branch's residual became once it was back at 14px — the number that veto accepted as a recorded residual rather than fixing. |
| `shot-otherlines-424.js` | #424 | The before-and-after rendering for definition-of-done (d), at TWO geometries deliberately: at 375x730 the honest rendering shows **nothing changed**, which is Kunal's Z-06 condition and is itself the claim, so the change is only visible where the board is narrow. `CT_APP` picks the bundle, so "before" is the shipped #423 bytes rather than a reconstruction. |
| `probe438-cpu.js` | #438 | The configuration gate 64 structurally cannot enter: **vs Computer, landscape, at game over**. The bot chip, the Elo pill and the Elo slider mount only in wide and only once the game is over; Pass & Play never mounts them at all, so gate 64's six sessions cannot see them. The job's own `notChecked` names this gap. |
| `probe438-landscape.js` | #438 | Both halves of the landscape game-over job — the live row surviving and the rail clipping it — measured against whatever bundle `CT_APP` names, **before** any fix. Its own header says it: not a gate, it prints. |
| `probe466-lessonelo.js` **(asserts: 7 × L.say)** | #466 | Antagonist A's six-tap reproduction, **driven rather than reasoned about**: an endgame lesson that ends in mate, played out in practice, closed, then the Play tab — where the adaptive-Elo effect wakes with a mated `game` whose history arrived with the board while `playHist` is empty, and moves `ct_elo` silently because the setup sheet is up and `eloMsg` is never seen. A found a fourth route the class sweep missed and that #466's first guard sailed past; neither A nor the build had driven it. |
| `probe466-pfh.js` **(asserts: 5 × L.say)** | #466 | The three harms of the "Play from here at a terminal ply" job, re-measured on the bundle under test, because that job's evidence was from #424/#427 while #434/#435 had since rewritten the status-line behaviour harm 3 is about [R35]. |
| `probe466-rect.js` **(asserts: 6 × L.say)** | #466 | The one measurement antagonist B asked for and could not take: the amber note is a longer string in the TOP slot of a sheet whose own source records a 32px overrun at 375x679. Gate 55 asserts the note's TEXT and the button's disabled state and **nothing about either rect**, so a clipped or off-screen note would pass all of it. Measures whether the refusal is READABLE and the exit REACHABLE. |
| `render469.js` **(asserts: 1 × L.say)** | #469 | The before-and-after at Kunal's 375x730 with a red box, for definition-of-done (d). **Run after the suite, never during it**: three subagent browsers inside a timing-sensitive suite nearly produced a false red at #419. |
