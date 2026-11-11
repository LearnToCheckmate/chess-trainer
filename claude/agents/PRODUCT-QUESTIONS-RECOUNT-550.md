# Recount of the 17 open product questions (job `post-product-questions-in-batches`)

Read only. Measured 11 Nov 2026 against: tracker `docs/product-question-audit-2026-09-22` (v1, 78 items, 17 `open`);
the Decision Desk `UKPL3gJtQwR4BvzZ3v5LaQ`, collections `questions` (202 docs, both pages) and `answers` (195);
tracker `decisions` (166) on `5326ERvZCZ5tEYRkPavPTF`; dashboard `decisions` (76) on `3478220d-...`;
`DECISIONS-LOG.md`, `FEEDBACK-INBOX.md` and `chess.jsx` at HEAD `36f7576` (#550 item 135; clone not shallow).
Screenshot geometry is **375x761, insets 51/31 (`kunal761` in gates/lib.js)**. The job's `what` field still says 375x730,
which CLAUDE.md withdrew at #548 item (157).

## The 17, in rank order

| rank | id | question (one line) | verdict | evidence |
|---|---|---|---|---|
| 1 | Q3 | Charge for Pro at launch, and what does Pro unlock? | **SETTLED (payments), left out per brief** | tracker `decisions/pro-payments-out-of-the-30-oct-release-2026-10-23` (Kunal, 23 Oct: leave payments out); Desk `stripe-test-prices` answer `leave-out`; Desk `B10-Q1` answered `hide` 11 Nov (hide the "Unlock Pro (test mode)" button). LOOSE END, not asked anywhere: whether the PRO badges on the Playful/Medieval skins and the Pro box in the Account sheet (chess.jsx:9094-9110, "Chess Trainer Pro", Monthly/Annual checkout buttons) stay visible while nobody can buy Pro. |
| 2 | Q12a | Today card: what counts as a streak day, and what does a fresh install show? | **STILL OPEN** | Today card job `build-home-one-today-card` is unbuilt (outcome `cannot`, #550, 11 Nov). `orchestratorRuling_2026_11_07` settles the TARGET (3 a day, 1/5 strip leaves Home) but not the streak-day rule or the fresh-install display. Code today: `bumpDaily` (chess.jsx:4585) bumps `daily.streak` on any one lesson or puzzle, while Daily 3 (chess.jsx:3833-3841, :8521) says "keep the streak alive" and toasts "Daily 3 complete! Streak safe." only after all three - two rules on one screen. |
| 3 | Q7 | Delete the classic review layout, or give it a way back? | **SETTLED** | Desk `B8-LAYOUT` item 3 "retire that option", Kunal "Take your picks" 4 Nov 2026; built at #548 item (103): chess.jsx:4402-4407 ("THE CLASSIC REVIEW LAYOUT IS RETIRED", `const revCompact=true`, sheet row gone). |
| 4 | K14 | What does Review show when engine analysis fails? | **STILL OPEN** | Dashboard `decisions/k14-analysis-failed-screen`: choice A with note "HOLD - show me mockups ... DO NOT BUILD until he has seen the mockups". No Desk card, no later decision. chess.jsx:10408-10425 has only the progress screen ("Analyzing your game", `data-ct="ana-progress"`); no failure state exists. |
| 5 | N2 | Hints-and-banking asks (the "10-minute lock") | **STILL OPEN, NARROWED** | Half settled: Desk `lesson-hint-what-it-should-do-2026-10-10` answered `warn-first` (11 Oct) and built - chess.jsx:4183 "#547 item (90): Kunal's 'warn-first' - the lesson lightbulb starts OFF"; chess.jsx:6755 now says why a hints-on run banks nothing. This also covers K-LS-1. NOT settled: FEEDBACK-INBOX.md:719-726 (12 Sep, status open) - "playing another lesson should also unlock banking a flawless day (then drop the time limit)" and "proactively suggest banking the flawless day" after a good hints-on run. The "time limit" he names is most likely the one-day-per-lesson rule, chess.jsx:6760 "Today is already banked, tomorrow counts next." `grep -ci cooldown chess.jsx` still returns 0. |
| 6 | Q13b | Smallest text size the app may use? | **STILL OPEN** | No floor anywhere: there is no Desk card, no tracker decision and no DECISIONS-LOG line. `R2-NARROW-LEVERS` (`icon-font-ls`) covers narrow-phone buttons only. chess.jsx still has fontSize 8 and 9 (board coordinates :3485-3486, :3642-3643) and `fontSize:11` (Home subtitle :8492). |
| 7 | Q5 | Eleven built-but-hidden pieces: keep them hidden and delete them later? | **STILL OPEN (list changed)** | No decision. Five `{false&&...}` blocks remain: chess.jsx:8805 (full-screen overlay, likely the Puzzles paywall), :9619 (captured-pieces strip), :9625 (clock row vs computer), :9801 (key-moments list), :11512 (`learnPlansBox`). The Home streak-at-risk banner now RENDERS (chess.jsx:8504-8510, not behind `false`), so the list is no longer eleven. It needs a recount before it is posted. |
| 8 | HM-K7 | Home tiles below the fold at 320x568: scroll or must fit? | **SETTLED IN PRINCIPLE (verify 320)** | Desk `B10-AUD-H01` answered `compact` (11 Nov): "You said a page like this should never need a scroll"; jobs `pages-that-scroll-must-fit-on-one-screen-2026-11-11`. That card measured his phone (375), not 320x568, so the builder should check that the compact build also fits at 320 before treating HM-K7 as closed. |
| 9 | PK8 | Signed out, Scan with camera: which message? | **STILL OPEN** | No decision. chess.jsx:8882 sets `upgradeMsg='Sign in to scan a board.'` and opens the Account sheet, but that message renders at the BOTTOM of the Pro box (chess.jsx:9111), under the generic "Sign in to sync your progress ... and to unlock Pro" line (:9089). So the audit's description still holds. |
| 10 | BP-2 | Which buttons belong in the live-game control row? | **STILL OPEN** | Dashboard `q-play-buttons-now` is still on HOLD ("show what chess.com has so i can compare"). No Desk card. The row is unchanged: chess.jsx:10704+ Moves, Back, Forward, Hint, Flip, More (Review/Rematch at game over). |
| 11 | Q4 | What is Play against the computer for? | **STILL OPEN** | No decision found. Bot results still move `ct_elo` (chess.jsx:3811, :5242). |
| 12 | Q13a | How close must the Home tile icons be to count as even? | **STILL OPEN** | Desk `icon-sizes-four-or-leave-2026-10-10` (`uneven-rows`) is a different question, and its own knownLimits say "'even' needs a rule on drawn size that Kunal has not given". Tiles are still emoji ink-matched by `inkScale` (chess.jsx:2805-2816, :3388). Desk `B10-Q22` (11 Nov, comment: icons look "childish") may replace these icons, so this could be overtaken. Hold it until B10-Q22's follow-up lands. |
| 13 | Q6 | Lichess import in the release? | **STILL OPEN** | No Desk or tracker item about import (the Lichess hits are all about grading). Import is live: chess.jsx:542, :6553, :9877. |
| 14 | N1 | Offline behaviour? | **STILL OPEN** | No decision. `navigator.onLine` appears 0 times. |
| 15 | Q12b | Achievements: keep them? | **STILL OPEN** | No mention by him. Still built and reachable (chess.jsx:3698, :8794, :9847). |
| 16 | Q10 | Tactics payoff auto-plays only after forced mates. Right? | **STILL OPEN** | No answer found. The behaviour stands as built (chess.jsx:6890-6896, #358). |
| 17 | K-LS-5 | Long lesson note: scroll in the box AND a tap-to-sheet? | **STILL OPEN** | No answer. Both exist: `noteOpen` sheet `data-ct="lesson-note-sheet"` (chess.jsx:3821, :9672). DECISIONS-LOG.md:359 records the build's choice, not his. |

**Tally: 3 settled (Q3 payments, Q7, and HM-K7 in principle); 14 still open.** Of the 14, N2 is narrowed and Q5 needs recounting. Q13a may be overtaken by B10-Q22.

Note for the poster: the job's first batch was Q3, Q12a, Q7. Two of those are now settled, so the first batch in rank order
becomes **Q12a, K14, N2**. Q13b is next after them.

---

## Draft 1: Q12a. What counts as a streak day?

**Title:** Streak: what counts as a day?

**Question (plain words):**
Home shows one streak, but two rules feed it today. Do any one lesson or puzzle and the streak goes up. The Daily 3 card,
though, says "keep the streak alive" and only says "Streak safe" after all three. The one Today card you approved needs a single
rule, and a line for a brand-new player who has done nothing yet.

**Options:**
- **MY PICK: Any one lesson or puzzle keeps the streak.** Today shows "0 of 3" and no streak number until day one is done. This is the rule the app already counts by, and it is what the at-risk banner says ("Do one lesson or puzzle today to keep it going").
- All three of Today's items, or the day does not count.
- Puzzles only: only the puzzle streak counts.

**Screenshot (375x761, insets 51/31, real build, signed out):**
- Frame 1: Home on a FRESH store (clear localStorage). Red box around the **Daily 3 card**: the card headed "Daily 3" with
  the small right-hand text "keep the streak alive" and three empty dots (chess.jsx:8517-8521, no data-ct; find it by the text "Daily 3").
- Frame 2: Home after one lesson and one puzzle (seed `ct_daily` {date: today, count:1, streak:1} and `ct_daily3`
  {date: today, lesson:1, puz:1}, or do them for real). Red box around BOTH the **streak strip** at the top ("🔥 1 DAY · ... TODAY",
  built at chess.jsx:8495, `_streak`) and the **Daily 3 card** under it, so he can see the two counts side by side.
- Optional third frame: the approved mockup https://claude.ai/artifact/77Z8gWxqwyobzVQ6iyGFPG (or B9C-HOME-TODAY.jpg named in
  the 7 Nov ruling), labelled "approved, not built".

## Draft 2: K14. What Review shows when the analysis fails

**Title:** Review: when the analysis fails

**Question (plain words):**
You picked "a short message with a Try again button" on 14 Sep and asked to see mock-ups first. Here they are, drawn over
the real analysis screen. Today, if the engine dies, nothing tells you. Which one should we build?

**Options:**
- **MY PICK: A short message with a Try again button** (your lean). Example: "The review stopped before it finished." [Try again] [Back to games]
- Try once more on its own, and show the message only if that fails too.
- A message with "Back to games" only, and no retry.

**Screenshot (375x761, real build):**
- Frame 1 (real): Review → load any game (paste the Opera Game PGN) → the **analysis progress screen** while it runs. Red box
  around the progress block: the ring with the knight, "Analyzing your game", and the line `data-ct="ana-progress"`
  ("NN% · checking every move"), chess.jsx:10408-10422.
- Frames 2-4 (mock-ups, drawn over the same real frame, each clearly labelled MOCK-UP): the same block replaced by each
  option's message and buttons. Red box on the new message and buttons. The failure state cannot be captured, because the
  build has none (TC-RL-009 could not induce one), so these frames have to be drawn. He has asked for them twice.

## Draft 3: N2 (what is left). Banking a flawless day

**Title:** Lessons: banking a flawless day

**Question (plain words):**
On 12 Sep you asked for four things about hints and banking a day. The hint now starts off, with a warning (your 11 Oct pick),
so that part is done. Two asks are still open. First, a lesson can bank only one day; run it again and the app says "Today
is already banked, tomorrow counts next." Second, after a good run with hints on, nothing suggests going back to bank the day.
Build these two?

**Options:**
- **MY PICK: Build both.** Finishing a different lesson does not wait for tomorrow. After a clean run with hints on, Complete! offers "Bank it: play again with hints off".
- Only the suggestion after a hints-on run. Keep one day per lesson per day.
- Neither. The warning you already have is enough.

(Say plainly on the card that no 10-minute lock was found in the code, and that if he sees one again a screen recording is the way to catch it.)

**Screenshot (375x761, real build):**
- Lesson: Discover → Openings → Italian Game → practice. Turn the 💡 on, finish the line, and reach **Complete!**. Red box
  around the completion sentence in the lesson message line ("... Hints were on during this run, so it doesn't bank a day.
  Play it with 💡 off to bank one.", chess.jsx:6755, rendered in the `openMsg` span at chess.jsx:9653).
- Second frame: the same lesson finished flawless twice on one day. Red box around "Flawless again. Today is already banked,
  tomorrow counts next." (chess.jsx:6760). This frame shows the "time limit" the ask is about.

---

## What I could not determine
- Whether Kunal's "10-minute cooldown" (N2) is the one-day-per-lesson rule or something else. It cannot be found in code, and only his phone can show it.
- Whether HM-K7 holds at 320x568 after the B10-AUD-H01 compact build. I ran no browser.
- The exact current count for Q5. Five `false&&` blocks remain and the at-risk banner is live. I did not check the other "unreachable" pieces (the lesson opener and the tactics auto-demo) or the YOUR COACH and CONTINUE cards.
- Line 8805's `false&&` overlay is assumed to be the Puzzles paywall from its shape. I did not confirm this.
