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
| metrics dashboard `3478220d-8023-43ba-b08a-4397eb054cc3` | the open decisions and the scope baseline. Read-only from here. |
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

## Parked

The iPad, entirely, until the phone layout is settled. Do not spend a run on it and do not ask
about it again.
