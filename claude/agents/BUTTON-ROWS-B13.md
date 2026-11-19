# Every button row in the app - batch 13 inventory (seat B3)

Job: `jobs/every-button-row-is-icons-only-in-one-style-with-two-kinds-of-arrows-2026-11-18` (Kunal, questions/Q24 "A, icons only",
11:15pm EST Tue 17 Nov 2026; FB-13 "none of the buttons should actually have something written on them").

Measured, not read: every row below was found by a probe that lists each group of two or more visible buttons sharing a parent and a
top edge, at 375x761 (kunal761), on the trial bundles before (`73dbc284724b`, f62b2460) and after this job.

## The shared style (chess.jsx)

| piece | what it is |
|---|---|
| `footBtnStyle` | the one look: 44 floor, radius 12, flat `ROW_BTN_BG` face `rgba(255,255,255,.08)`, no border, no gradient, white ink; `hot` (a toggle that is on) is the accent tint, `primary` the solid accent. FootBtn (the lesson footer and the Review transport row) renders it unchanged. |
| `RowBtn` | a row button on that style, **no words**: its name is `aria-label` (and `title`); `dis` dims it to .42 and makes it inert; `aria-pressed` on a toggle. |
| `StepArrow` | the WHITE chevron (`data-icon="step-left/right"`): steps through the moves of a game, a puzzle or a lesson. |
| `NavTri` | the BLUE solid triangle (`data-icon="nav-left/right"`, `NAV_BLUE` #5b9bd5 in every skin): the previous or next puzzle, card, lesson, motif or idea. |
| `RowIcon` | one icon per action, one stroke weight, each scaled to about 19.5px of ink: moves, hint, show, reset, flip, more, review, rematch, analyze, copy, share, feedback, lines, tick, close. |

## The rows

| screen and state | row (left to right) | drawn by | status |
|---|---|---|---|
| Play vs computer, live (`play-ctlrow`) | Moves (toggle), StepArrow back, StepArrow forward, Hint, Flip, More | this job | icons only, RowBtn, 58x44 each; the row keeps its 51 so the board does not move |
| Play vs computer / Pass & Play, game over | Moves, StepArrow back, StepArrow forward, Review, Rematch, More | this job | icons only |
| Pass & Play, live | as the live row; Hint dimmed (no hint against a person) | this job | icons only |
| Puzzles, phone row (`pz-row`) | NavTri previous puzzle, Hint, Show move, Reset, NavTri next puzzle | this job (Q27 redraws Puzzles) | icons only, five equal buttons |
| Puzzles, solved | NavTri previous, NavTri next | this job | icons only, two equal buttons (was a 315-wide "Next ›") |
| Drills (mistakes drill, `drill-row`) | Hint, Show move, Reset, NavTri previous card, NavTri next card; solved: Analyze, Reset over the hidden helpers | this job | icons only at every width (was words at 430 and wider) |
| Tactics (`tactics-row`) | Hint (toggle), Show answer; answered: NavTri next motif | this job | icons only |
| Strategy (`tactics-row`) | NavTri previous idea, NavTri next idea | this job | icons only |
| Lesson demo, under the board (`lesson-demo-row`) | **"✋ Now I'll try it"** (start button, words), Flip / Other lines (N) | this job (Q28 redraws Lessons) | second cell an icon RowBtn, 58 wide |
| Lesson practice, under the board (and in the bar on a short phone) | Flip, Hints (toggle), Try again (reset icon) / NavTri next lesson / Bank it (tick) | this job | icons only, three equal buttons (44 each in the bar) |
| Lesson footer bar (`lesson-footer`) | ✕ close, StepArrow back a move, ▶/⏸/↻ play, StepArrow forward a move, ⋯ more; short phone adds ✋ | #549 item (80), FootBtn | already icons only; back/forward now StepArrow (same drawing) |
| Menu sheet, Share row (`menu-share-row`) | Share, Send feedback (developer) | this job | icons only |
| Moves panel header (lessons, Play) | Analyze this line, Copy moves | #550 a6 | already icon-only CHIPS, kept small at Kunal's word ("making those buttons icons and making them smaller", 11 Nov); not a RowBtn row |
| Home dev row (`home-devrow`) | 🎬 gallery, 💬 feedback | #550 | already icons only (developer only) |

## Held, not in this part

| row | why |
|---|---|
| Game review: the transport row (`rev-*`, FootBtn), Analyze, the eval band and summary | **held: B2 on the Review screen** (batch 13). FootBtn already carries the shared style; its step arrows and words are the lead's later part. The new gate lists it as excluded with that note. |
| The sideways (landscape) layouts: the game-over four (`land-over-btns`: Review, Rematch, New game, More), the puzzle rail's words, the landscape result Back/Forward | not reached in this part; Kunal's "Option A" for the sideways game over (a23) gave those four their words, so changing them is his call. |
| Scan (setup sheet's "📷 Scan with camera", "🖼 Upload a photo") | Q30 redraws Scan (its own job). |
| Review list | Q25 redraws it; its row is "?" (icon) and **"⚡ Analyze game"** (a start button, words kept). |

## Buttons left with words, and why

| button | why |
|---|---|
| ✋ Now I'll try it (lesson demo) | the lesson's single start button (named in the job) |
| ⚡ Analyze game (Review list) | the Review list's single start button |
| ▶ Start game (setup sheet), Continue ▶ (rank up) | a screen's single start button |
| Online / Computer / Pass & Play, White / Black, bot tiles, clocks, Coach mode (setup sheet); Above / Left / Off (menu eval bar); Tactics / Strategy (tab switch) | CHOICES, not actions: each shows the option it picks. Not changed here - question (a) to Kunal. |
| The tab bar (Home, Discover, Puzzles, Review, Play) | navigation with icon and word; not changed here - question (b) to Kunal. |
| Top corners ("‹ Home", "‹ Back to review", "‹ Back" on the setup sheet) | the top-row standard's (gate 139); its own note says gates 45, 49, 54, 55 find the exit by its words. |
| Home tiles, Discover tiles, list rows, sheet rows (More sheet, menu rows) | cards and list rows, not button rows. |
