# #445run — rotating gate audit: gate 12-hint.js, and two hypotheses the control disproved

Run `build__1790803179000`, 2026-09-30T21:19Z–22:45Z. Bundle under test: the committed `app.js`
at the pile head `e74c7b8`, md5 `0bbc5c85b1df`, stamp `#442 - 2026-09-30 13:26 ET`.
No product code changed this run. Nothing pushed to main.

This is the rotating audit, owed for a fourth build, resumed at its documented point:
gate `11-lesson.js`'s SHORT AND NARROW block, then `12-hint.js` from the top.

## Gate 11, SHORT AND NARROW block — reviewed, no new finding

The block is unusually well-audited already. It names its own non-discriminating assertion in
the log text ("this cannot fail while the MOVES panel flexes, so it explains the shape rather
than guarding it"), it pins the board width per geometry rather than comparing the board only
to itself, and it re-derived that pin at #430 instead of swapping the number. Its one real
weakness — asserting glyph *consistency* via `getComputedStyle(e).fontSize` while two of the
five glyphs are SVGs whose ink is set by SVG props, not font size — is **already filed** as
`jobs/gate-11-asserts-consistency-on-fontsize-while-two-of-the-five-glyphs-are-svg-props-2026-09-30`.
Not re-filed [R25].

## Gate 12 — TWO HYPOTHESES, BOTH DISPROVED BY CONTROL

Recorded because a disproved hypothesis is the cheap half of an audit, and because this file
would otherwise read as though the first thing I guessed was the finding.

**H1: the 350ms baseline is the unsettled frame.** Gate 12 takes `before` at 350ms
(`b.card('A-06',350)`) while its own header says the hint is set at 700ms — structurally the
same shape as the documented `gate15-baseline-is-the-unsettled-frame` defect, and no gate-12
job existed. **DISPROVED.** Sampling the board rect every 50ms from the card click to 2200ms,
at all three of the gate's geometries: the board top reaches its final value by **50ms** and
exactly **one distinct value** is observed across the whole window (kunal 181.48, 390 278.5,
se 183.98). The hint header first appears at 600–650ms, i.e. after the baseline and before the
`settle(1800)` sample. The baseline is settled and the ordering is correct.

**H2: line 19 cannot fail because the container is shorter than its clamp allows.** At the
shipped content the box measures 26.88px against a 13.44px line-height — 2.01 lines — while
`-webkit-line-clamp` is 3, which reads like #396's clamp-vs-clip defect. **DISPROVED.** The box
is not fixed: lengthening the text grows it to 40.31px = **2.98 line-heights at kunal** and
36.94px = **3.00 at se**, exactly the 3 lines the clamp allows. Clamp and container agree.
The 2.01 figure was the box at the *current* content, not its capacity — a capacity read off one
input, which is the mistake this file exists to catch.

Control, injecting only the hint text and re-reading the instrument:

| text | chars | box | ink | scrollH/clientH | gate 12 L19 |
|---|---|---|---|---|---|
| as shipped | 54 | 26.88 (2.01 ln) | 27.44 | 27/27 | PASS |
| 2x | 106 | 40.31 (2.98 ln) | 40.88 | 40/40 | PASS |
| 4x | 210 | 40.31 (2.98 ln) | 67.75 | 67/40 | **FAIL** |
| 8x | 418 | 40.31 (2.98 ln) | 121.50 | 121/40 | **FAIL** |

So the assertion **does** discriminate. It crosses its own threshold, not merely disturbs it.

## THE FINDING: it discriminates only OUTSIDE the range any real hint occupies

`-webkit-line-clamp:3` caps `scrollHeight` to the clamped height. So `scrollHeight <= clientHeight`
is satisfied **by construction whenever the clamp is the thing doing the cutting**. It can only go
red once the text overruns by enough that the element stops being clamp-bound — measured above at
210 chars. The shipped hint corpus is 17 strings, `grep -oE 'hint\s*:\s*"[^"]{4,}"' chess.jsx`:

    n=17   min=52   median=99   p90=119   max=121

**No real hint reaches 210 characters.** Gate 12 loads exactly one of the 17 — the A-06 card's,
at 52/54 chars, in the shortest band — so line 19 has run over one input, at the one length where
nothing is near the clamp.

Driving all 17 real hints through the shipped element at the gate's own geometries:

- **at `kunal` (375): 0 of 17 clamped.** Thirteen render at exactly 3.04 line-heights — the clamp
  ceiling, with nothing lost.
- **at `se` (320): 3 of 17 are CLAMPED and lose text** — the 117-char "Don't rescue the attacked
  bishop on b4…", the 115-char "Hit two things at once with your queen…", and the 113-char
  "The back rank is wide open…". Each needs 4 lines and is drawn in 3.
- **gate 12 line 19 reads PASS on every one of the 17, at both geometries.**

Gate 12 *visits* `se`. It is the geometry where three hints are cut. It passes there because it
only ever loads the shortest hint in the corpus.

Honest scope, because it changes how this should be ranked: a `-webkit-line-clamp` **draws an
ellipsis**, so these three cuts are signalled, not silent — #387's rule is satisfied and this is
not the decapitated-glyph defect of #394/#396. What is lost is the actionable half of a hint
("…Take the e5-pawn with the g4-knight and a smothered mate appears"), on the narrowest supported
screen, with the one gate written to check "hint text not clipped" reporting PASS. Whether a
3-line hint is acceptable at 320 is a product call and is not this lane's to make; what is not a
product call is that the gate cannot tell anyone it happened.

Same family as #433 (a fixture whose input class did not contain the case), and R18's "count
inputs, not assertions: an assertion at one input is a demonstration."

## Reproduce

    node gates/regress/12-hint.js                 # the gate itself, green
    node claude/agents/probes/445run-probe12-baseline.js   # H1: board top vs time
    node claude/agents/probes/445run-probe12-control.js    # H2: the 1x/2x/4x/8x control
    node claude/agents/probes/445run-probe12-corpus.js     # all 17 real hints at kunal and se

## Not checked

- The other three geometries gate 12 does not run (`320x568`, `360x640`, `375x667`) — the corpus
  sweep covered only the gate's own `kunal`, `390` and `se`.
- Whether any hint is *added* dynamically for lesson or drill surfaces rather than coming from the
  17-string puzzle corpus.
- The remaining gates in the rotation after 12; the audit resumes at `13-*`.
