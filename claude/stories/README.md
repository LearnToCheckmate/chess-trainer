# `claude/stories/` — the id-space register

Read this before you write, quote or believe a case id.

## The collision this file exists to end

Two different suites use the prefix `TC-R` and both claim the paths `claude/stories/TEST-CASES.md` and
`claude/stories/USER-STORIES.md`:

| | this repo | the claude.ai project |
|---|---|---|
| size | 11 stories, 14 cases (`TC-R01`..`TC-R14`) | 30 stories, 31 cases (`TC-R01`..`TC-R31`) |
| `TC-R05` means | "tap a Skills number that has moves" | "read the summary" |
| executed by | `gates/regress/20-review.js`, `21-review-brilliant.js` | nothing — it is a specification, not a runner |
| visible to a build session | yes | no |

So **no sentence of the form "TC-R05 passed" is safe on its own.** That is not a theoretical risk: the repo suite's
results are copied into `TEST-CASES.md` verbatim from `gates/logs/<N>-all.log`, and the project suite's ids appear in
agent reports written by sessions that cannot see this repo. Same string, different case, both quoted as fact.

The audit of 2026-09-14 asked for one of the two to be renamed, and asked for it to happen **before** the 92 new
`TC-RL` cases are coded, on the grounds that adding cases to an ambiguous id space makes the ambiguity permanent.

## The register

| prefix | suite | file | owner |
|---|---|---|---|
| `US-Rnn` / `TC-Rnn` | the **gate-executed** Review suite — every case names the gate that runs it | `claude/stories/USER-STORIES.md`, `claude/stories/TEST-CASES.md` | this repo |
| `US-RFnn` / `TC-RFnn` | the **full** Review suite, 30 stories and 31 cases — a specification, broader than what the gates execute | `claude/stories/REVIEW-SUITE-FULL.md` (reserved; the document is still in the claude.ai project) | the test-lane sessions |
| `TC-RL-nnn` | the Review test lane: the 94 measured cases from `TEST-CASES-REVIEW.md`, 92 of them automatable | `gates/regress/*.js` as they are coded | the test-lane sessions, coded here by the build session |

`TC-RL-nnn` does not collide with anything and needs no rename. `TC-RL-039` (the strip must re-sync at ply 0) and
`TC-RL-070` (every row of the review ⋯ sheet must be reachable) are coded as `gates/regress/37-strip-sync.js` and
`gates/regress/38-rev-sheet-reach.js`.

## Why the repo suite kept `TC-Rnn` and the project suite is the one that moves

Not seniority — traceability. The repo suite's ids are baked into 115 places that are **evidence**: gate source, the
`gates/logs/` files those results were copied from, `claude/agents/REGRESSION-LOG.md`, and the SAT rows in
`TEST-CASES.md` that cite a build and a log by name. Renaming those rewrites the record of what was measured and
when. The project suite's ids appear in documents that are still being drafted, so moving them costs nothing that
has already been proved.

## The rule, until the rename has landed

**Never write a bare `TC-R05`.** Name the suite in the same breath — "repo `TC-R05`" or "full-suite `TC-R05`" — or
use the new prefix. This applies to gate comments, agent reports, flags and messages to Kunal alike.

## What is still outstanding

The project-side half of this cannot be done from the build session: `REVIEW-SUITE-FULL.md` and its `TC-RFnn`
renumbering live in the claude.ai project, which this session cannot read or write. Tracker flag
`suite-id-collision-tc-r` carries the request, with the target names above. Until it lands, this register is the
thing that makes a repo sentence unambiguous, and the reserved row for `REVIEW-SUITE-FULL.md` is what stops anyone
claiming that path for something else in the meantime.
