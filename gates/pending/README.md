# gates/pending — gates that are written, proved, and deliberately NOT in the suite

`gates/gates.sh` runs `gates/regress/*.js` and nothing else. A gate in here is finished work held out of
the suite, with the reason written down.

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

| gate | why it is held | moves into `regress/` when |
|---|---|---|
| `35-width-containment.js` | Red on a real, confirmed defect. `lesson-lines` ("♟ Other lines (2)") runs **38.9px past the right edge at 320x568** (left 189.7, right 358.9, page scrollWidth 320, so the cut-off part cannot be scrolled to), and a 46px `⋯` button on lesson practice runs 3.1px past. Confirmed by hand from a clean browser, not just by the gate. At 375 the same button ends at **exactly 375.0** — fitted to the pixel, which is the signature of the hardcode rather than a coincidence. Kunal answered Z-06 "Support 320 properly, fix all three", but with the condition "i want to make sure it doesn't impact the display on the larger screens that we've so painstakingly tried to improve". That condition **cannot be met for this item**: the row is a CSS grid `1.8fr 1fr`, an `fr` track will not shrink below its content, and at 375 the row is already flush to the screen edge with no padding to give back — so fixing 320 necessarily moves it at 375. See flag `width320-gate-red-needs-kunal`. | He answers the 375 question and the two overhangs are fixed. |

## One known fault in `35-width-containment.js` itself

Recorded so nobody trusts its green prematurely. It walks every state in **one** browser, and it reported a
1.4px overhang at 375 on four states that a clean-browser probe **could not reproduce**. That is almost
certainly leakage between states, which is a fault in the gate and not in the app. Isolate the states — one
browser per state, or re-open between them — before this gate joins the suite. Until then its **green**
would be no more trustworthy than its red.
