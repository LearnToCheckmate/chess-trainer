# Benchmark: Home / Discover - one daily goal on Home, not two

**Provenance, read first.** The full write-up of this name lives in the claude.ai project (`claude/agents/BENCHMARK-HOME-2026-09-18.md`),
which a Claude Code session cannot read. What is copied here is every measurement and claim in the proposal's mockup, artifact
`77Z8gWxqwyobzVQ6iyGFPG` (https://claude.ai/artifact/77Z8gWxqwyobzVQ6iyGFPG, "One Today Card", benchmark of build #416 at 375x679,
proposal only), read with the Artifact tool's read action on 13 Nov 2026 by #550 helper app A. Nothing below is paraphrased into a
different number. If the project doc carries measurements the mockup does not, they are NOT here, and this file says so rather than
guessing them. Copied into the repository because `jobs/build-home-one-today-card` (its `whatWouldUnblock` and the orchestrator's
ruling of 7 Nov 2026) asks for the proposal's measurements to travel with the build.

Decision: Desk `bench-home-one-today-card`, Kunal: yes (Tue 22 Sep 2026) - build the one Today card as proposed.
Ruling: `jobs/build-home-one-today-card` `orchestratorRuling_2026_11_07` - 3 a day (Today n of 3: the day's lesson and two puzzles, a dot
each), his streak on the same card, and Next; the 1/5 strip leaves Home; XP and the five-a-day goal stay on the Puzzles header.

## The proposal (mockup 77Z8gWxqwyobzVQ6iyGFPG), as written

> After one solved puzzle, the top of Home reports "today" twice: a 🔥/⭐/🎯 strip saying **1/5** and the Daily 3 card saying
> **2 of 3**. Both talk about a streak and both open the same Puzzles roadmap. The proposal folds them into one card that keeps the
> Daily 3 plan and the streak number, and leaves XP and the 5-puzzle goal on the Puzzles screen, where they already appear.

Measured by the proposal, headless at 375x679 via `gates/drive/puzzles.js daily3-solved`, on #416 after one real solve:

- `🔥1 · ⭐60 · 🎯1/5` strip **68px @106** + Daily 3 **68px @190** = **152px, two goals**, one destination.
- chess.com comparison (`home-01-landing.jpg`, snapshot 2026-09-14, desktop 1536x674): **one streak number** ("1,059 Days", top
  right); the puzzle card has its own flame, but on the puzzle card; no daily plan at all.
- Proposed (drawn, not built): one card, **84px** (an estimate), reading `🔥 1-day streak` | `Today 2 of 3`, then dots
  `✓ Lesson` `✓ Puzzle` `○ Puzzle` and `Next ›`. "Everything below moves up ~68px; ⭐ XP and 1/5 stay on the Puzzles roadmap
  header, one tap away." Tiles and coach line unchanged on purpose.

| What changes | Now (measured, #416) | Proposed |
|---|---|---|
| Daily goals on Home | 2 (1/5 and 2 of 3) | 1 (Daily 3) |
| Streak mentions | 🔥 1 DAY + "keep the streak alive" | 🔥 1-day streak, once |
| Space at the top of Home | 152px | ≈84px |
| XP and the 5-puzzle goal | Home strip and Puzzles header | Puzzles header only |
| Tap target | 2 cards → same roadmap | 1 card → the next undone item |

Not proposed there, each its own decision: tiles that name the next thing (chess.com does), a coach line that changes with the
player, and Appearance in one place instead of two.

Before pictures (headless, the tree at `29bb4ce`, trial bundle md5 `d61a28998af1`, fresh and earned stores):
`claude/agents/shots/550-today-card-before-home-{fresh,earned}-{375x761,320x568}.png`.
