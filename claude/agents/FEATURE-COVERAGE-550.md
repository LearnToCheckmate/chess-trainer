# Feature coverage, #550 — 55 features and 31 surfaces, joined to stories, cases and gates

Written 2026-11-11 for job `coverage-count-features` (the orchestrator's gap of 10 Nov). Read-only research; one file.
Base tree **`14f1eff`** (origin/main, #549 close-out, committed 2026-11-07T18:45:14Z). HEAD column is **`8f1b3cf`**
(branch `claude/exciting-noether-v1swj8`, #550, not yet on main), read from committed blobs only (`git show HEAD:<path>`),
because the working tree had uncommitted edits to `chess.jsx` and gate 61 while this was measured. The clone is complete
(`git rev-parse --is-shallow-repository` printed `false`).

**THE ANSWERS, so a reader can stop here:**

| figure | 14f1eff | HEAD 8f1b3cf |
|---|---|---|
| feature denominator | **55** (Kunal, Desk `orch-feature-denominator-2026-10-06`, choice 55; arithmetic below reaches 55 from the 58 rows) | 55 |
| features covered | **25 / 55** | **26 / 55** (+`video-call`, via US-PL-24 / TC-PL-068 / gate 96) |
| surfaces (re-derived) | **31** = 11 screens + 20 sheets/modals | 31 assumed (HEAD's chess.jsx was not re-enumerated) |
| surfaces covered | **18 / 31** (screens 11/11, sheets 7/20) | **19 / 31** (+Skins sheet, via US-HM-15 / TC-HM-057, which names gate 92 - the tables show 49-home, see section 5's parser limit) |
| surface-id join | **partly built here (table in section 4), the full join SPLIT OFF** | - |

**"Covered" means exactly this, and nothing looser:** at least one row of `claude/stories/TEST-CASES.md` whose story cell
names one of the feature's (or surface's) story ids, AND whose gate file exists in `gates/regress/` AND has state
`required` in `gates/gate-manifest.tsv` at that tree. At 14f1eff all 73 required gates are on disk and all 73 on-disk
gates are required (so "exists and required" = 73 files); at HEAD it is 87 and 87.

**The step that is judgment, not measurement, is ONE step: assigning story ids to features and to surfaces** (the
`fmap`/`smap` columns below). Everything after it - story -> case rows -> gate files -> manifest - is mechanical and
re-runnable with the scripts in section 5. A reader who disagrees with an assignment changes one cell and re-runs.

---

## 1. The reconciliation: 58 rows -> 55 features

Source: `jobs/feature-inventory-2026-09-15`, field `result` (written at #397, `0f4b728`). Its header says "34 rows"; its
state table says SHIPPED 24 + PARTIAL 11 + COMMITTED-UNBUILT 13 + DEAD-IN-CODE 5 + UNREACHABLE 2 = **55**; its prose says
"over the **54** rows above (excluding the 2 dev-only)". Counted here:

```
awk '/^## The inventory/,/^## Counts/' inv-result.md | grep -c '^| `'        -> 58   (inv-result.md = the job's `result` field)
```

Every row, classified. "State" is the inventory's own cell, verbatim, as of #397 - not re-judged here (see the staleness
note under the table).

| # | inventory row id | state at #397 | classification |
|---|---|---|---|
| 1 | `game-review` | SHIPPED | feature |
| 2 | `review-import-cc` | SHIPPED | feature |
| 3 | `review-import-lichess` | SHIPPED | feature |
| 4 | `review-import-pgn` | SHIPPED | feature |
| 5 | `review-eval-graph` | SHIPPED (default OFF) | feature |
| 6 | `review-key-moments` | DEAD-IN-CODE | feature |
| 7 | `review-analysis-board` | SHIPPED | feature |
| 8 | `review-engine-line` | SHIPPED | feature |
| 9 | `review-play-from-here` | SHIPPED | feature |
| 10 | `review-compact-layout` | PARTIAL (one-way door) | feature |
| 11 | `review-brilliancies` | SHIPPED | feature |
| 12 | `review-mistake-practice` | SHIPPED | feature |
| 13 | `review-smaller-board` | COMMITTED-UNBUILT | feature |
| 14 | `play-vs-computer` | SHIPPED | feature |
| 15 | `play-named-bots` | SHIPPED | feature |
| 16 | `play-clocks-offline` | DEAD-IN-CODE | feature |
| 17 | `play-captured-pieces` | DEAD-IN-CODE | feature |
| 18 | `play-hint` | SHIPPED | feature |
| 19 | `play-opening-id` | COMMITTED-UNBUILT (hook exists) | feature |
| 20 | `online-play` | PARTIAL — unverifiable from here | feature |
| 21 | `online-quick-match` | PARTIAL, same basis | feature |
| 22 | `online-clocks` | COMMITTED-UNBUILT | feature |
| 23 | `online-correspondence` | PARTIAL, same basis | feature |
| 24 | `video-call` | PARTIAL — no signalling path found | feature |
| 25 | `friends` | PARTIAL | feature |
| 26 | `nearby-players` | PARTIAL | feature |
| 27 | `tournaments` | PARTIAL | feature |
| 28 | `board-scan` | PARTIAL — client complete, server absent | feature |
| 29 | `board-scan-loading` | PARTIAL — flag written, never read | **sub-feature of `board-scan`** (excluded) |
| 30 | `puzzles` | SHIPPED | feature |
| 31 | `puzzles-paywall` | DEAD-IN-CODE | feature (sub-feature candidate: belongs to `pro-subscription`, kept) |
| 32 | `lesson-openings` | SHIPPED | feature |
| 33 | `lesson-tactics` / `lesson-gambits` / `lesson-endgames` | SHIPPED | feature (one row naming three tiles; kept as ONE) |
| 34 | `lesson-notation` | SHIPPED (unfindable) | feature |
| 35 | `lesson-auto-finish` | SHIPPED (narrowed) | feature |
| 36 | `lesson-plans-box` | DEAD-IN-CODE | feature |
| 37 | `lesson-info-header` | UNREACHABLE | feature (sub-feature candidate: belongs to `lesson-openings`, kept) |
| 38 | `tactics-auto-demo` | UNREACHABLE | feature |
| 39 | `gambit-cross-links` | COMMITTED-UNBUILT | feature |
| 40 | `hint-cooldown-fix` | COMMITTED-UNBUILT | feature |
| 41 | `learn-streaks` | SHIPPED | feature |
| 42 | `achievements` | SHIPPED | feature |
| 43 | `rating` | SHIPPED | feature |
| 44 | `coach` | SHIPPED | feature |
| 45 | `coach-avatar` | COMMITTED-UNBUILT | feature |
| 46 | `appearance` | PARTIAL | feature |
| 47 | `pro-subscription` | PARTIAL | feature |
| 48 | `account-sync` | PARTIAL | feature |
| 49 | `feedback` | SHIPPED | feature |
| 50 | `offline` | COMMITTED-UNBUILT / absent | feature |
| 51 | `discover-reshuffle` | COMMITTED-UNBUILT | feature |
| 52 | `home-tile-icons` | COMMITTED-UNBUILT | feature |
| 53 | `font-sweep` | PARTIAL | feature |
| 54 | `saved-reviews-forever` | COMMITTED-UNBUILT | feature |
| 55 | `generated-piece-art` | COMMITTED-UNBUILT | feature |
| 56 | `cc-lichess-design-pass` | COMMITTED-UNBUILT | feature |
| 57 | `layout-diagnostics` | SHIPPED — dev-only | **dev-only** (excluded) |
| 58 | `puzzle-pack-loader` | SHIPPED — dev-only | **dev-only** (excluded) |

**THE ARITHMETIC:**

```
58  rows in the table
-2  dev-only: layout-diagnostics (#57), puzzle-pack-loader (#58) - both say "SHIPPED — dev-only", playerTypes "none"
=56 player-facing rows  (the prose's "54" is this figure miscounted; 58-2 is 56, not 54)
-1  board-scan-loading (#29): named "(the spinner for the above)", whyUnbuilt "see board-scan", dependsOn board-scan,
    and the ONLY non-dev row whose playerTypes cell is "—". The inventory's own evidence cell says it is the scanBusy
    flag of board-scan. It is a property of a feature, not a feature.
=55 features
```

**What the rule deliberately does NOT drop, so the 55 is falsifiable:** `puzzles-paywall` (#31, the inventory says it
"belongs to pro-subscription") and `lesson-info-header` (#37, "belongs to lesson-openings") are also parenthesised
sub-features; dropping them too gives 53. Row #33 names THREE tiles in one row; splitting it gives 57 (or 55 if both
#31 and #37 are also dropped). So **55 is reachable by more than one rule.** The rule above is the one with a mechanical
discriminator (the single non-dev row with no player type) and it is the one used for every count in this file.

**The rows re-tallied by state do NOT reproduce the inventory's state table, though the total matches:**

```
awk -F'\t' '$1<57{s=$3; sub(/^ +/,"",s); sub(/[ ,].*/,"",s); print s}' rows.tsv | sort | uniq -c
-> SHIPPED 23, PARTIAL 14, COMMITTED-UNBUILT 12, DEAD-IN-CODE 5, UNREACHABLE 2  = 56 ; minus board-scan-loading (PARTIAL) = 55
   the inventory's table: 24 / 11 / 13 / 5 / 2 = 55
```

So 55 = 55, but SHIPPED is off by one, PARTIAL by three and COMMITTED-UNBUILT by one: the table was not tallied from the
rows. **Kunal's Desk answer (`docs/kunal-answers-2026-10-08`, field `d1_featureDenominator`) labels his 55 "the split count
plus the one row the two later counts disagreed on".** I could not reproduce that label's member list from any document
available to this run, so I do NOT claim the 55 above is the same 55 member for member; I claim it is a stated rule that
reaches his number from the 58 rows, and every count below is over exactly these 55 ids.

**The states are 8 weeks stale and this file does not re-judge them.** Measured at 14f1eff: `{false&&` still guards
five blocks (`grep -n '{false&&' chess.jsx` -> lines 8680, 9484, 9490, 9661, 11350: paywall, captured pieces, offline
clock row, key moments, plans box), and `setThemeOpen(true` / `setInfoOpen(true` / `setTrainerDemo(true` /
`navigator.onLine` / `cooldown` all grep to 0. But at least three COMMITTED-UNBUILT rows now have shipped code and
covering cases (`online-clocks`, `coach-avatar` = the owl, US-HM-13; `discover-reshuffle` = US-HM-12), and
`play-clocks-offline`'s dead row sits beside a live m:ss clock inside the player bars (gate 46, US-PL-09). Re-stating
the inventory's states is `jobs/feature-inventory-2026-09-15`'s own work; it is named here, not done.

---

## 2. The 55 features joined to stories, cases and gates

Columns: **stories** = the story ids assigned to the feature (judgment, defined at 14f1eff;
`(+n)` = n more not shown); **cases** = count of TEST-CASES rows naming any of those stories, then the first ids;
**gates** = the required, on-disk gate files those rows name; **covered** = yes when at least one such row exists
(number of qualifying rows in brackets); **HEAD** = what #550 adds (new story ids defined, new case ids, new gates)
then the covered verdict at HEAD; **also quoted by** = required gates at 14f1eff whose SOURCE quotes one of the
feature's story ids but which no case row for that feature names - asserted, but unregistered, so it does NOT count.

| # | feature | stories (14f1eff) | cases | gates | covered at 14f1eff | HEAD 8f1b3cf | also quoted by (does not count) |
|---|---|---|---|---|---|---|---|
| 1 | game-review | US-R03 US-R05 US-R09 US-R10 US-R11 US-R18 US-R20 US-R37 (+6) | 51: TC-R02 TC-R02b TC-R04 TC-R05 (+47) | 19-review-grade-counts 20-review 21-review-brilliant 22-engline-recovery 26-invariants 31-antagonist373 (+6) | **yes** (48) | stories US-R113 US-R117 US-R118 US-R119 US-R46; cases TC-R184 TC-R57 TC-R185 TC-R186 (+10); gates 100-online-review-rating 101-review-summary-you-left 102-engine-no-go-into-a-running-search 67-sel-cls-consumers 91-review-next-not-star 99-review-engine-wait-shown; yes (57) | 14-uat-review-card 15-gallery-playall 67-sel-cls-consumers |
| 2 | review-import-cc | US-R02 US-R25 US-R36 US-R74 US-R93 US-R97 | 36: TC-R03 TC-R35 TC-R119 TC-R120 (+32) | 20-review 40-reachability 45-play-setup 51-drill-explain-why 61-review-list-month-independence 73-review-list-filter | **yes** (36) | yes (36) | - |
| 3 | review-import-lichess | US-R02 | 1: TC-R03 | 20-review | **yes** (1) | yes (1) | - |
| 4 | review-import-pgn | US-R01 | 7: TC-R01 TC-R02 TC-R02b TC-R66 (+3) | 20-review 33-reproducible-review 40-reachability | **yes** (7) | yes (7) | 14-uat-review-card 15-gallery-playall |
| 5 | review-eval-graph | US-R08 | 4: TC-R09 TC-R12 TC-R09b TC-R12b | 20-review | **yes** (4) | yes (4) | - |
| 6 | review-key-moments | - | 0 | - | no | no | - |
| 7 | review-analysis-board | US-R07 US-R96 | 3: TC-R11 TC-R71 TC-R94 | 20-review | **yes** (3) | yes (3) | 14-uat-review-card 15-gallery-playall 48-lesson-flow 53-lesson-hit-area |
| 8 | review-engine-line | US-R78 US-R86 | 3: TC-R83 TC-R83b TC-R88 | 20-review 22-engline-recovery | **yes** (3) | yes (3) | - |
| 9 | review-play-from-here | US-R33 | 1: TC-R43 | 55-play-from-here-terminal | **yes** (1) | stories US-PL-25; cases TC-PL-069; gates 97-setup-game-carries-its-fen; yes (2) | - |
| 10 | review-compact-layout | US-R04 US-R27 | 8: TC-R06 TC-R07 TC-INV-12 TC-R37 (+4) | 11-lesson 13-play-after-moves 19-review-grade-counts 20-review 26-invariants 31-antagonist373 (+3) | **yes** (8) | yes (8) | 14-uat-review-card 15-gallery-playall 43-tcrl-analysis 72-drill-prev |
| 11 | review-brilliancies | US-R06 US-R31 US-R75 US-R105 US-R106 US-R112 | 26: TC-R10 TC-R10b TC-R65 TC-R41 (+22) | 21-review-brilliant 22-engline-recovery 68-brilliant-sac-empty-square 72-drill-prev 82-brilliant-one-rule 83-missed-brilliant (+1) | **yes** (26) | cases TC-R118; yes (27) | 14-uat-review-card 15-gallery-playall |
| 12 | review-mistake-practice | US-R12 US-R13 US-R35 US-R76 US-R94 US-R98 US-R99 US-R100 (+1) | 17: TC-R15(NOTINTHESUITE:thegateisatgates/pending/,redonmainbydesign) TC-R16 TC-DR-01 TC-DR-02 (+13) | 17-drill-grade-arithmetic 50-drill-verdict-no-jump 51-drill-explain-why 52-drill-grades-the-move 72-drill-prev | **yes** (17) | stories US-R114 US-R116; cases TC-R15 TC-R181 TC-R183 TC-R177 (+2); gates 18-drill-credit-provenance 98-legacy-drill-card-hint; yes (22) | 67-sel-cls-consumers |
| 13 | review-smaller-board | - | 0 | - | no | no | - |
| 14 | play-vs-computer | US-PL-01 US-PL-02 US-PL-03 US-PL-04 US-PL-05 US-PL-06 US-PL-08 US-PL-10 (+13) | 43: TC-R19 TC-R44 TC-PL-039 TC-PL-050 (+39) | 16-cpu-result-line 29-draws 30-p1-fixes 46-play 54-play-resume 62-landscape-board-stable (+7) | **yes** (43) | cases TC-R45a TC-R45b TC-R45c; yes (46) | 20-review |
| 15 | play-named-bots | US-PL-19 US-PL-23 | 2: TC-PL-047 TC-PS-044 | 45-play-setup | **yes** (2) | yes (2) | - |
| 16 | play-clocks-offline | US-PL-09 | 0 | - | no | no | 46-play |
| 17 | play-captured-pieces | - | 0 | - | no | no | - |
| 18 | play-hint | US-PL-07 | 0 | - | no | no | 46-play |
| 19 | play-opening-id | - | 0 | - | no | no | - |
| 20 | online-play | US-OC-01 | 10: TC-OC-000 TC-OC-001 TC-OC-002 TC-OC-003 (+6) | 25-online-clocks | **yes** (10) | yes (10) | - |
| 21 | online-quick-match | - | 0 | - | no | no | - |
| 22 | online-clocks | US-OC-01 US-OC-02 | 16: TC-OC-000 TC-OC-001 TC-OC-002 TC-OC-003 (+12) | 25-online-clocks | **yes** (16) | stories US-PL-26; cases TC-PL-070; gates 103-online-flag-auto-end; yes (17) | - |
| 23 | online-correspondence | US-OC-02 | 6: TC-OC-007 TC-OC-008 TC-OC-009 TC-OC-010c (+2) | 25-online-clocks | **yes** (6) | yes (6) | - |
| 24 | video-call | - | 0 | - | no | stories US-PL-24; cases TC-PL-068; gates 96-video-call-timeout-and-optout; yes (1) | - |
| 25 | friends | - | 0 | - | no | no | - |
| 26 | nearby-players | - | 0 | - | no | no | - |
| 27 | tournaments | - | 0 | - | no | no | - |
| 28 | board-scan | US-SC-01 | 0 | - | no | no | - |
| 30 | puzzles | US-R17 US-R32 US-R47 US-R77 US-R80 US-R81 US-R82 | 20: TC-PZ-01 TC-PZ-02 TC-R58 TC-R20 (+16) | 18-drill-credit-provenance 26-invariants 39-pz-streak 57-pz-solved-explanation | **yes** (20) | cases TC-PZ-SOLVED39; yes (21) | 58-review-rating-source |
| 31 | puzzles-paywall | - | 0 | - | no | no | - |
| 32 | lesson-openings | US-R84 US-LS-01 US-LS-02 US-LS-03 US-LS-04 US-LS-05 US-LS-06 US-LS-07 (+11) | 32: TC-R64 TC-R64b TC-R64c TC-R64d (+28) | 11-lesson 48-lesson-flow 71-resume-row-agrees-with-the-board 74-lesson-card-hit-area 75-fit-loop-one-way-ratchet | **yes** (32) | stories US-LS-13 US-HM-16; cases TC-S08 TC-LS-059; gates 93-lib-filter 95-lesson-lines-legal; yes (34) | - |
| 33 | lesson-tactics/gambits/endgames | US-R79 US-R107 | 4: TC-LS-038 TC-LS-054 TC-LS-055 TC-LS-056 | 48-lesson-flow 84-lesson-free-defender | **yes** (4) | yes (4) | - |
| 34 | lesson-notation | - | 0 | - | no | no | - |
| 35 | lesson-auto-finish | - | 0 | - | no | no | - |
| 36 | lesson-plans-box | - | 0 | - | no | no | - |
| 37 | lesson-info-header | - | 0 | - | no | no | - |
| 38 | tactics-auto-demo | - | 0 | - | no | no | - |
| 39 | gambit-cross-links | - | 0 | - | no | no | - |
| 40 | hint-cooldown-fix | - | 0 | - | no | no | - |
| 41 | learn-streaks | US-HM-07 US-HM-08 US-R87 | 1: TC-LS-041 | 48-lesson-flow | **yes** (1) | yes (1) | 49-home |
| 42 | achievements | - | 0 | - | no | no | - |
| 43 | rating | - | 0 | - | no | no | - |
| 44 | coach | US-HM-09 | 0 | - | no | no | 49-home |
| 45 | coach-avatar | US-HM-13 | 2: TC-MN-049 TC-MN-050 | 47-menu | **yes** (2) | cases TC-MN-053; yes (3) | - |
| 46 | appearance | US-PL-21 | 3: TC-PL-049 TC-PL-049b TC-PL-049c | 16-cpu-result-line | **yes** (3) | stories US-HM-15; cases TC-HM-057; gates 49-home; yes (4) | - |
| 47 | pro-subscription | - | 0 | - | no | no | - |
| 48 | account-sync | US-R90 | 1: TC-R90 | 73-review-list-filter | **yes** (1) | yes (1) | - |
| 49 | feedback | - | 0 | - | no | no | - |
| 50 | offline | - | 0 | - | no | no | - |
| 51 | discover-reshuffle | US-HM-12 | 1: TC-HM-DISC | 49-home | **yes** (1) | yes (1) | - |
| 52 | home-tile-icons | US-HM-03 | 0 | - | no | no | 49-home |
| 53 | font-sweep | - | 0 | - | no | no | - |
| 54 | saved-reviews-forever | US-R90 | 1: TC-R90 | 73-review-list-filter | **yes** (1) | stories US-R115; cases TC-R182; gates 94-review-cache-keeps-every-review; yes (2) | - |
| 55 | generated-piece-art | - | 0 | - | no | no | - |
| 56 | cc-lichess-design-pass | - | 0 | - | no | no | - |

**Totals, with the command:** `awk -F'\t' '$6=="Y"' join.tsv | wc -l` -> **25** at 14f1eff; `awk -F'\t' '$11=="Y"' join.tsv | wc -l` -> **26** at HEAD.

**By the inventory's (stale) state**, so the 30 uncovered are not read as 30 omissions:

| state at #397 | covered | not covered | the uncovered ones |
|---|---|---|---|
| SHIPPED | 16 | **7** | play-hint, lesson-notation, lesson-auto-finish, achievements, rating, coach, feedback |
| PARTIAL | 5 | 8 | online-quick-match, video-call (covered at HEAD), friends, nearby-players, tournaments, board-scan, pro-subscription, font-sweep |
| COMMITTED-UNBUILT | 4 | 8 | review-smaller-board, play-opening-id, gambit-cross-links, hint-cooldown-fix, offline, home-tile-icons, generated-piece-art, cc-lichess-design-pass |
| DEAD-IN-CODE | 0 | 5 | review-key-moments, play-clocks-offline, play-captured-pieces, puzzles-paywall, lesson-plans-box |
| UNREACHABLE | 0 | 2 | lesson-info-header, tactics-auto-demo |
| **total** | **25** | **30** | 8 + 5 + 2 = 15 of the 30 have no code a player can reach, by the inventory's own reading |

**The seven SHIPPED-and-uncovered are the actionable list.** 25 of the 55 features have NO story id at all
(`awk -F'\t' '$3==""' join.tsv | wc -l` -> 25), so for them the gap is a missing story before it is a missing case.
Four uncovered features ARE asserted by a required gate that quotes their story but registers no case for it
(`play-clocks-offline` and `play-hint` by `46-play` via US-PL-09 / US-PL-07; `coach` and `home-tile-icons` by `49-home`
via US-HM-09 / US-HM-03). Registering those cases would take the count to 29 / 55 with no new gate. `board-scan` has a
story (US-SC-01) and a required gate (`28-scan-client.js`) and is still uncovered: that gate is cited by no case row at
all, nor are `14-uat-review-card`, `23-full-walk`, `42-home-devrow` and `67-sel-cls-consumers` at 14f1eff
(`comm -13 <(cited gates) ok.txt`; at HEAD 67 is cited, and 92 is cited only by number - see the parser limit in section 5).

**A feature is not a screen**, which is the point of Kunal's d19: the feature count moved by one at #550
(`video-call`) where the screen count also moved by one, but the features with no story cannot move at all until
someone writes the story, whatever the suite adds.

---

## 3. The surface count, re-derived from chess.jsx at 14f1eff, with Home worked through

The last published screen figure (45 surfaces / 108 surface-states) came from `jobs/scope-model-2026-09-15` at
`0f4b728`, when chess.jsx was 6335 lines; at 14f1eff it is **11723** (`git show 14f1eff:chess.jsx | wc -l`). It was not
re-derivable here (the scope-model's surface list is in the tracker, not in the repo), so this is a NEW count by a
stated rule, and it is not comparable to 45 member for member.

**The rule.** A surface is (a) a full-screen fixed layer - a render site carrying `position:'fixed',inset:0` - that a
player can open, or (b) an in-flow screen selected by the routing state (`mode` x `openIdx` / `playSetup` / `pzView` /
`mistakeMode` / `reviewView` / `anaMode`). Toasts, inline folds (`gfOpen`, `movesOpen`, `progOpen`) and the coach
sheet's inner sub-views (`coachChooserOpen`, `coachBrowseOpen`, `coachPlanOpen`) are states of a surface, not surfaces.
Commands:

```
git show 14f1eff:chess.jsx > c.jsx
grep -cE "position:'fixed',inset:0" c.jsx                                     -> 27 render sites
# each site's guard read from the 4 lines above it (loop in section 5): 27 = 23 reachable player layers
#   + 4 excluded: 8332 preview-gallery recorder (dev), 11666 layout grid (dev),
#                 8680 the Puzzles paywall ({false&&...}, dead), 9001 themeOpen (setThemeOpen(true -> 0, unreachable)
grep -oE "setMode\('[a-z]+'\)" c.jsx | sort | uniq -c                         -> analyze 14, learn 18, play 11, puzzle 16
grep -oE "setReviewView\('[a-z]+'\)" c.jsx | sort | uniq -c                   -> moves 10, summary 4
grep -oE "setPzView\('[a-z]+'\)" c.jsx | sort | uniq -c                       -> roadmap 12, online 2, browse 1
```

Of the 23 reachable fixed layers, 3 are screens (Home `:8359`, New Game setup `:8689`, Review summary `:9551`) and 20
are sheets/modals/cards. The in-flow screens add 8 (Discover, Lesson, Play board, Puzzles, Mistakes drill, Review list,
Review move screen, Analysis board). **11 screens + 20 overlays = 31 surfaces.** Puzzles' three `pzView` values and the
Review move screen's compact/classic layouts are counted as ONE surface each; splitting them gives 34, and the
ledger should say which it uses.

Same coverage rule as section 2; `smap` (the surface's story ids) is the judgment step.

| id | surface | stories (14f1eff) | cases | gates | covered at 14f1eff | HEAD 8f1b3cf |
|---|---|---|---|---|---|---|
| S1 | Home (overlay, chess.jsx:8359) | US-HM-01 US-HM-02 US-HM-03 US-HM-04 US-HM-05 US-HM-06 US-HM-07 US-HM-08 (+4) | 14: TC-HM-047 TC-HM-048 TC-HM-049 TC-HM-050a (+10) | 49-home | **yes** (14) | yes (14) |
| S2 | Discover (mode learn, openIdx null) | US-HM-12 | 1: TC-HM-DISC | 49-home | **yes** (1) | stories US-HM-16; cases TC-S08; gates 93-lib-filter; yes (2) |
| S3 | Lesson (mode learn, openIdx set; demo/practice) | US-LS-01 US-LS-02 US-LS-03 US-LS-05 US-LS-06 US-LS-07 US-LS-08 US-LS-09 (+12) | 37: TC-R64 TC-R64b TC-R64c TC-R64d (+33) | 11-lesson 48-lesson-flow 53-lesson-hit-area 71-resume-row-agrees-with-the-board 74-lesson-card-hit-area 75-fit-loop-one-way-ratchet (+1) | **yes** (37) | stories US-LS-13; cases TC-LS-059; gates 95-lesson-lines-legal; yes (38) |
| S4 | New Game setup (playSetup, :8689) | US-OC-01 US-OC-02 US-PL-16 US-PL-19 US-PL-23 US-R34 | 20: TC-R44 TC-OC-000 TC-OC-001 TC-OC-002 (+16) | 25-online-clocks 30-p1-fixes 45-play-setup 69-setup-sheet-live-game | **yes** (20) | yes (20) |
| S5 | Play board (mode play) | US-PL-01 US-PL-02 US-PL-03 US-PL-04 US-PL-05 US-PL-06 US-PL-07 US-PL-08 (+11) | 41: TC-R19 TC-PL-039 TC-PL-050 TC-PL-058 (+37) | 16-cpu-result-line 29-draws 46-play 54-play-resume 62-landscape-board-stable 63-gameover-chrome-keying (+5) | **yes** (41) | stories US-PL-24 US-PL-25 US-PL-26; cases TC-R45a TC-R45b TC-R45c TC-PL-068 (+2); gates 103-online-flag-auto-end 96-video-call-timeout-and-optout 97-setup-game-carries-its-fen; yes (47) |
| S6 | Puzzles (mode puzzle: roadmap/browse/online) | US-R17 US-R32 US-R47 US-R80 US-R81 US-R82 | 19: TC-PZ-01 TC-PZ-02 TC-R58 TC-R20 (+15) | 18-drill-credit-provenance 26-invariants 39-pz-streak 57-pz-solved-explanation | **yes** (19) | cases TC-PZ-SOLVED39; yes (20) |
| S7 | Mistakes drill (mistakeMode) | US-R12 US-R13 US-R35 US-R74 US-R75 US-R76 US-R98 US-R99 (+2) | 18: TC-R15(NOTINTHESUITE:thegateisatgates/pending/,redonmainbydesign) TC-R16 TC-DR-01 TC-DR-02 (+14) | 17-drill-grade-arithmetic 50-drill-verdict-no-jump 51-drill-explain-why 52-drill-grades-the-move 72-drill-prev | **yes** (18) | stories US-R114 US-R116; cases TC-R15 TC-R181 TC-R183 TC-R177 (+2); gates 18-drill-credit-provenance 98-legacy-drill-card-hint; yes (23) |
| S8 | Review list / import (mode analyze, no review) | US-R01 US-R02 US-R25 US-R36 US-R90 US-R93 US-R97 | 43: TC-R01 TC-R02 TC-R02b TC-R03 (+39) | 20-review 33-reproducible-review 40-reachability 45-play-setup 61-review-list-month-independence 73-review-list-filter | **yes** (43) | stories US-R115; cases TC-R182; gates 94-review-cache-keeps-every-review; yes (44) |
| S9 | Review summary (rev-summary, :9551) | US-R03 US-R10 US-R18 US-R20 US-R88 | 24: TC-R04 TC-R05 TC-R14 TC-R21a (+20) | 19-review-grade-counts 20-review 26-invariants 31-antagonist373 58-review-rating-source 66-winprob-ladder | **yes** (21) | stories US-R46 US-R118; cases TC-R57 TC-R185 TC-R180; gates 100-online-review-rating 101-review-summary-you-left 67-sel-cls-consumers; yes (24) |
| S10 | Review move screen (compact/classic) | US-R04 US-R05 US-R06 US-R08 US-R09 US-R11 US-R27 US-R31 (+11) | 57: TC-R02 TC-R02b TC-R06 TC-R07 (+53) | 11-lesson 13-play-after-moves 19-review-grade-counts 20-review 21-review-brilliant 22-engline-recovery (+13) | **yes** (57) | stories US-R113 US-R117 US-R119; cases TC-R184 TC-R186 TC-R118 TC-R176a (+8); gates 102-engine-no-go-into-a-running-search 91-review-next-not-star 99-review-engine-wait-shown; yes (64) |
| S11 | Analysis board (anaMode) | US-R07 US-R96 | 3: TC-R11 TC-R71 TC-R94 | 20-review | **yes** (3) | yes (3) |
| O1 | Tournaments sheet (:8060) | - | 0 | - | no | no |
| O2 | Play More sheet (moreOpen, :8110) | US-PL-15 US-PL-20 | 2: TC-PL-041 TC-PL-048 | 16-cpu-result-line 29-draws | **yes** (2) | yes (2) |
| O3 | Regrade preview (regrade, :8113) | US-R105 | 9: TC-R122 TC-R123 TC-R124 TC-R125 (+5) | 82-brilliant-one-rule | **yes** (9) | yes (9) |
| O4 | Review more sheet (revMore, :8128) | - | 0 | - | no | no |
| O5 | Celebrate card (celebrate, :8348) | - | 0 | - | no | no |
| O6 | Coach sheet (coachOpen, :8464) | - | 0 | - | no | no |
| O7 | Nearby sheet (:8579) | - | 0 | - | no | no |
| O8 | Friends sheet (:8616) | - | 0 | - | no | no |
| O9 | Achievements sheet (:8664) | - | 0 | - | no | no |
| O10 | Account sheet (acctOpen, :8947) | - | 0 | - | no | no |
| O11 | Feedback sheet (fbOpen, :8991) | - | 0 | - | no | no |
| O12 | Skins sheet (skinOpen, :9014) | - | 0 | - | no | stories US-HM-15; cases TC-HM-057; gates 49-home; yes (1) |
| O13 | Look and feel (lookOpen, :9038) | US-HM-13 | 2: TC-MN-049 TC-MN-050 | 47-menu | **yes** (2) | cases TC-MN-053; yes (3) |
| O14 | Menu sheet (menuOpen, :9073) | US-R89 US-R102 | 2: TC-MN-042 TC-MN-048 | 47-menu | **yes** (2) | yes (2) |
| O15 | Lesson intro card (introCard, :9451) | US-R91 | 1: TC-LS-042 | 48-lesson-flow | **yes** (1) | yes (1) |
| O16 | Lesson note sheet (noteOpen, :9535) | US-LS-04 | 0 | - | no | no |
| O17 | Puzzle celebrate / rank-up (pzCelebrate, :11025) | US-R77 US-R94 | 2: TC-R82 TC-R92 | 57-pz-solved-explanation 72-drill-prev | **yes** (2) | yes (2) |
| O18 | Promotion picker (promo, :11059) | US-R38 | 1: TC-R51 | 65-promotion-after-gameover | **yes** (1) | yes (1) |
| O19 | Lesson sheet (learnSheet, :11332) | US-LS-10 | 0 | - | no | no |
| O20 | Lesson More (lessonMore, :11707) | - | 0 | - | no | no |

**Totals:** `awk -F'\t' '$6=="Y"' joins.tsv | wc -l` -> **18 / 31** at 14f1eff (all **11 / 11** screens, **7 / 20**
overlays), **19 / 31** at HEAD. The 13 overlays nobody covers at 14f1eff are Tournaments, Review ⋯, Celebrate, Coach,
Nearby, Friends, Achievements, Account, Feedback, Skins (covered at HEAD), Lesson note sheet, Lesson sheet and Lesson
More (O1, O4-O12, O16, O19, O20) - several of which ARE driven by gates (menu.js has `feedback-home`, review.js has `more-sheet`) but
assert no registered case naming a story of theirs. "Screens 11 / 11" is the figure that cannot move, which is the
complaint the job opened with.

### Home, worked through

Home is the `zIndex:500` fixed overlay at `chess.jsx:8359`; its tiles at `:8401-8404`
(`grep -n "label:'Discover'\|label:'Puzzles'\|label:'Review'\|label:'Play'" c.jsx`). Its control roster is the one
gate 49 declares and enumerates off the running screen (`HOME_ROSTER`, `HOME_ROSTER_EARNED` in
`gates/regress/49-home.js` at 14f1eff): 14 controls on a fresh store; the earned store trades NEW HERE for the streak card.

| Home control (gate 49 id) | kind | its own story | registered rows for that story | covered at 14f1eff, and by what |
|---|---|---|---|---|
| tile-discover, tile-puzzles, tile-review, tile-play (the four tiles) | screen | US-HM-03 look, US-HM-04 reach, US-HM-05 opens its screen | **0** | yes - but ONLY through the class clause US-HM-11: TC-HM-051a (roster equals the running screen), 051b (reached, hit-tested), 051c (takes Home down), 051d (lands on the screen it named), all `49-home.js` |
| daily3 | screen | US-HM-08 | 0 | yes, TC-HM-048 + 051a-d (US-HM-11) |
| newhere (fresh store only) | screen | US-HM-11, US-HM-14 | 11 + 3 | yes, TC-HM-050a/b/c, 053, 054, 055, 056 |
| streak (earned store only) | screen | US-HM-07 | 0 | yes, TC-HM-047 (US-HM-11) |
| coachline | screen | US-HM-09 | 0 | yes, TC-HM-049 (US-HM-11) |
| home-menu, wave | sheet | US-HM-06 | 0 | yes for "Home stays up" only (TC-HM-051c); what the sheets do is the Menu / Account surfaces' business |
| home-look, stylerow, home-preview, home-feedback, intro | sheet | US-HM-10 (foot reachable) | 0 | as above, TC-HM-051c only |
| build stamp `home-build` (not a control) | - | US-BN-01 | TC-HM-052 | yes, 49-home |
| dev row `home-devrow` (the two 34x34 buttons) | - | none | 0 | **no**: `42-home-devrow.js` (10 `L.say` sites) is cited by NO case row at 14f1eff |

**What this shows.** The job's premise - "Home already counted as covered because one small file had touched two
34x34 developer buttons" - is no longer how Home is covered: gate 42 now contributes nothing under this rule, and Home
is covered by 14 registered rows of gate 49. But **US-HM-01 .. US-HM-10 have zero registered cases each**
(`awk -F'\t' '$3~/US-HM-0[1-9]|US-HM-10/' cases.tsv | wc -l` -> 0) while gate 49 asserts them: its source carries 45 of
the ids TC-HM-001 .. TC-HM-046 (024 absent), and the register carries none of them, because they are defined in
`claude/stories/HOME-LANE-2026-09-15.md`, which is not in this repository. So the tiles are covered as members of a class
and not as tiles: what each tile LOOKS like (HM-03, 84x84 boxes and ink) and whether it is reachable at 320x568 (HM-04)
are asserted every run and registered nowhere. That is the "every check landed on a screen already ticked" effect at its
smallest scale - and it is also why `home-tile-icons` reads uncovered in section 2.

---

## 4. The surface-id join: partly built, the full join split off

**What can be joined mechanically today, and was:** gate STATES to SCREENS, through the six driver modules
(`gates/drive/{home,lesson,menu,play,puzzles,review}.js`). Each module is one area, and each exports `states`:

```
cd gates && node -e "for(const m of ['home','lesson','menu','play','puzzles','review'])
  console.log(m,Object.keys(require('./drive/'+m).states).length)"
-> home 25, lesson 33, menu 25, play 38, puzzles 25, review 25  = 171 named states (HEAD's committed drive/;
   only drive/play.js differs from 14f1eff, by one line)
grep -lE "drive/(home|lesson|menu|play|puzzles|review)" regress/*.js | wc -l          -> 45 of 73 gates at 14f1eff
grep -oE "\.states\[['\"][a-z0-9-]+['\"]\]" regress/*.js | sort -u | wc -l            -> 123 literal (gate,state) pairs,
                                                                                          64 distinct state names
```

| driver module | states | gates requiring it (14f1eff) | surfaces its states fall on (by state name) |
|---|---|---|---|
| home | 25 | 3 | Home (`home`, `home-bottom`, `home-newhere`, `home-daily3-*`, `home-wave`...), Discover (`discover`, `discover-<group>[-end]`), Look (`home-look*`), Feedback (`home-feedback`), gallery (dev) |
| lesson | 33 | 10 | Lesson (`demo-*`, `practice-*`, `intro`, `longnote`), Discover lists (`openings-list`, `gambits-list`, `endgames-list`), Lesson ⋯ (`demo-more`, `practice-more`) |
| menu | 25 | 2 | Menu (`menu-*`), Feedback (`feedback-*`), Look (`menu-look`), Skins (`menu-skin-pro`) |
| play | 38 | 21 | New Game setup (`setup*`), Play board (`cpu-*`, `pp-*`), Play More (`cpu-more`, `pp-mate-more`, `cpu-resigned-more`) |
| puzzles | 25 | 8 | Puzzles (`roadmap*`, `train*`, `free-play*`, `long-*`, `daily3*`), Puzzle rank-up (`rankup*`) |
| review | 25 | 18 | Review list (`list-*`, `back-list`), summary (`summary*`), move screen (`moves-*`, `why-open`, `evalgraph*`, `flipped*`), Review ⋯ (`more-sheet`), Analysis board (`analysis*`) |

**And the selector half, at 14f1eff:** 185 literal `data-ct` ids in chess.jsx
(`grep -oE 'data-ct="[^"]+"' c.jsx | sort -u`, excluding one concatenated `'+k+'`), 149 ids named in gate source
(`grep -ohE "data-ct=[\\]?[\"'][a-zA-Z0-9_-]+" regress/*.js | sort -u`); **124 of the 185 are named by at least one
gate, 61 by none** - among the 61: `join-code`, `vc-start`/`vc-ring`/`vc-live`, `celebrate`, `rating-change`,
`discover-tiles`, `menu-evalgraph`, all four `prog-*`, `bril-pill`/`bril-pill-est`/`bril-downgrade`, `setup-opp-*`
(literal), `pz-verdict-box`. 25 gate-side ids match no literal app id: prefixes of concatenated ids (`look-th-`, `pbar-`,
`tile-ic-`, `setup-opp-`...) that a literal join cannot resolve, and ids the app does not carry (`board`, `rev-grid`,
`coach-bubble` - the last removed at #394; CLAUDE.md records that the first two never existed). HEAD's chess.jsx adds 12 ids (`ana-progress`, `drill-counter`, `drill-pick`, `drill-pick-n`,
`game-badge-col`, `lib-filter`, `lib-filter-none`, `lib-group-n`, `lib-sec-n`, `menu-newfeat`, `vc-err`, `vc-noring`).

**Why the full join is SPLIT OFF and not built here:**
1. **The surface ids it is meant to join to are not in the repo.** The ledger's EXECUTED column counts against
   `jobs/scope-model-2026-09-15`'s 45 surfaces / 108 surface-states, which live in the tracker. The 31 surfaces above
   are a new id space; joining to them is possible, but then the ledger's denominator changes and that is a ruling.
2. **Most gate states are not literal.** 123 literal pairs from 45 gates; the other 28 gates, and the loops inside
   those 45 (gate 26's `SCREENS` table of 14 states, gate 49's roster loop, `S[name]` dispatch in menu.js) reach
   states by variable, so a grep under-reports and a missing row would read as an unexecuted surface.
3. **`data-ct` ids are not attributed to surfaces in the source.** Many render inside more than one surface (the
   board, `pbar-*`, `foot-btn`), and the 27 fixed layers have start lines but no recorded end; a line-range or prefix
   assignment is a reading, not a measurement.
4. **"A gate names the selector" is not "a gate asserts on that surface"** - a selector may be used only to tap through.

**The split-off job, with what it needs** (proposed id `surface-id-join-executed-column`, owner: whoever holds the
coverage ledger):
- A surface roster committed to the repo (e.g. `claude/stories/SURFACES.tsv`: surface id, routing predicate, root
  selector or text marker, story ids) - the 31 rows of section 3 are a ready seed; agree it or the 45 with Kunal's
  ledger owner first.
- An instrumented run, not a grep: wrap each driver's `states[name]` and gate 26's `SCREENS` entries so that, after
  each state is entered, the harness records `{gate, state, surface}` by evaluating every roster predicate in the page.
  That needs a browser run (out of this run's scope) and it yields the EXECUTED column directly: surface executed =
  some gate entered a state whose page satisfied that surface's predicate.
- A control: delete one surface's render block in a trial bundle and show the join drops exactly that surface.

---

## 5. How to re-run every count

All inputs are read from git blobs; nothing here needs a browser. The scripts are reproduced so the file is
self-contained (they lived in this run's scratchpad, not in the repo).

```
T=14f1eff   # or HEAD
git show $T:claude/stories/USER-STORIES.md > US.md
git show $T:claude/stories/TEST-CASES.md  > TC.md
git show $T:gates/gate-manifest.tsv | grep -v '^#' | awk -F'\t' 'NF>1&&$2=="required"{print $1}' | sort > required.txt
git ls-tree --name-only $T gates/regress/ | sed 's#gates/regress/##' | grep '\.js$' | sort > ondisk.txt
comm -12 required.txt ondisk.txt > ok.txt                         # 73 at 14f1eff, 87 at HEAD
python3 stories.py US.md > stories.tsv                            # 136 story ids defined at 14f1eff, 151 at HEAD
python3 cases.py   TC.md > cases.tsv                              # 627 case rows at 14f1eff, 662 at HEAD
python3 join.py . > join.tsv   (with fmap.tsv)  ;  same with smap.tsv for surfaces
```

`stories.py` - a story is DEFINED by a `##`/`###` heading starting `US-<id>`, or a line starting `US-<id>` followed by
two spaces (the #549 imported one-liners). 11 further ids are mentioned but not defined (`US-R21`, `US-RF28`...).

```python
import re,sys; seen={}
for l in open(sys.argv[1]):
    m=re.match(r'^#{2,3}\s+(US-[A-Z]+-?\d+[a-z]?)\b\s*[-—:]?\s*(.*)',l) or re.match(r'^(US-[A-Z]+-?\d+[a-z]?)\s{2,}(.*)',l)
    if m and m.group(1) not in seen: seen[m.group(1)]=m.group(2)[:110]
for k,v in seen.items(): print(k+'\t'+v)
```

`cases.py` - a case is a line starting `| TC-`; its stories are the `US-` ids in its 2nd cell; its gates are every
`NN-name.js` in the row, or if none, those named in the nearest preceding `## ` heading (25 rows inherit this way at
14f1eff, e.g. the Home table, whose column 5 is a selector). 218 rows name no gate at all (213 are `TC-SUITE-*` shell
self-tests). The six `### TC-...` heading-form cases duplicate table rows and are not double-counted.

```python
import re,sys; G=re.compile(r'\b(\d{2,3}-[A-Za-z0-9-]+)\.js'); U=re.compile(r'US-[A-Z]+-?\d+[a-z]?'); sec=[]
for l in open(sys.argv[1]).read().split('\n'):
    if l.startswith('## '): sec=sorted(set(g+'.js' for g in G.findall(l)))
    if l.startswith('| TC-'):
        c=[x.strip() for x in l.split('|')]; st=sorted(set(U.findall(c[2])))
        g=sorted(set(x+'.js' for x in G.findall(l))) or sec
        print('\t'.join([c[1],','.join(st),','.join(g)]))
```

`join.py` - for each `fmap`/`smap` row (`n <tab> name <tab> story ids`): cases = rows whose story set meets the
row's; gates = their gate files that are in `ok.txt`; covered = at least one case row with a gate in `ok.txt`.

**`fmap` - the feature -> story assignment (the judgment step), as used:** game-review: R03 R05 R09 R10 R11 R18 R20 R37
R85 R88 R95 R104 R109 R110 (+HEAD R46 R113 R117 R118 R119) · review-import-cc: R02 R25 R36 R74 R93 R97 ·
review-import-lichess: R02 · review-import-pgn: R01 · review-eval-graph: R08 · review-analysis-board: R07 R96 ·
review-engine-line: R78 R86 · review-play-from-here: R33 (+PL-25) · review-compact-layout: R04 R27 ·
review-brilliancies: R06 R31 R75 R105 R106 R112 · review-mistake-practice: R12 R13 R35 R76 R94 R98 R99 R100 R108
(+R114 R116) · play-vs-computer: PL-01..06 PL-08 PL-10..18 PL-20 PL-22 R16 R34 R38 · play-named-bots: PL-19 PL-23 ·
play-clocks-offline: PL-09 · play-hint: PL-07 · online-play: OC-01 · online-clocks: OC-01 OC-02 (+PL-26) ·
online-correspondence: OC-02 · video-call: (+PL-24) · board-scan: SC-01 · puzzles: R17 R32 R47 R77 R80 R81 R82 ·
lesson-openings: LS-01..12 R72 R73 R83 R84 R91 R92 R103 (+LS-13 HM-16) · lesson-tactics/gambits/endgames: R79 R107 ·
learn-streaks: HM-07 HM-08 R87 · coach: HM-09 · coach-avatar: HM-13 · appearance: PL-21 (+HM-15) · account-sync: R90 ·
discover-reshuffle: HM-12 · home-tile-icons: HM-03 · saved-reviews-forever: R90 (+R115) · the other 25: none.
(`US-` prefix omitted; `+` = defined only at HEAD.) Stories may serve more than one feature (R90, R02, OC-01/02).

**Not checked, said plainly:**
- No browser was run and no gate was run; "covered" is a property of the registers and the manifest, not of a log.
  Whether each counted case row actually PASSED on its last run was not read.
- The story -> feature and story -> surface assignments were made by reading story titles and, where unclear, the
  first lines of the story body and the gates that quote it. They were not checked against each gate's assertions.
- Cases whose story cell is empty (16 rows) or names only a cross-app invariant (`US-INV-*`) or process story
  (`US-P0*`, `US-BN-01`, `US-GL-*`) count toward no feature and no surface by construction.
- The inventory's states were not re-judged (section 1). The surface rule was applied to 14f1eff only; HEAD's
  chess.jsx (11871 committed lines) was not re-enumerated, so "31 at HEAD" assumes #550 added no surface.
- The Desk card's own text for "the split count plus one" was not readable here; only the answer and its label were.
- **Parser limit, measured:** 17 rows at 14f1eff (18 at HEAD) name their gate only as "gate NN" with no `.js`, so
  `cases.py` reads no gate from them or inherits the section's. Checked one by one: 15 are `TC-SUITE-*`/`TC-FG-004`
  rows on process stories (US-BN-01, US-INV-01) plus TC-SUITE-255 on US-R03; TC-PL-038 names gate 46 and inherits
  16; TC-HM-057 (HEAD) names gate 92 and inherits 49. All the named gates are required and every affected verdict is
  already yes, so NO covered/uncovered verdict changes - but the gate attributions for TC-PL-038 and TC-HM-057 in the
  tables are the inherited ones, and `92-skin-icons.js` is wrongly listed as cited by no case at HEAD.
- `gates/verify-log.sh --citations` and `gates/story-join` outputs were not consulted; this join is independent of
  them and may disagree with them on rows whose layout `cases.py` reads differently.
