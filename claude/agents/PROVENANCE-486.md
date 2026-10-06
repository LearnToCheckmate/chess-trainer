# Provenance for the four commits of #486 that carry no `Claude-Session` trailer

Written by the #486 integration run (`build__1791307196104`,
session `session_019GS6uX8wH2mZWovNR4esy6`) at 2026-10-06T18:1xZ.

## Why this file exists

`CLAUDE.md` puts it first in the never-do list: **"Never use GitHub's upload page. It strips the
`Claude-Session` trailer, which is why `14f06ac` is the one commit here whose author cannot be
traced."** The rule has always been written as a prohibition on a *route*. This file exists because
the same loss happened on the **sanctioned** route.

Four of #486's eleven commits carry no `Claude-Session:` trailer. They arrived that way in two
parked patch payloads and `git am` applied them unchanged. Found by this run's diff-door antagonist,
not by any tool: `gates/audit/verify-patch-set.sh` audits a patch set for new-file collisions,
shared edits, duplicate commits, gate-number reuse and apply order, and
`grep -niE 'claude-session|trailer|co-authored'` over it returns **nothing**. It is the only auditor
that sees a payload before it becomes history, and it does not look. Filed as
`jobs/the-patch-set-auditor-never-checks-the-claude-session-trailer-2026-10-06`.

## Why a record rather than an amendment

The antagonist's remedy was to amend the four messages. This run could not take it. The commits were
already pushed to `origin/claude/cool-noether-jwf8cy`, and amending them means rewriting history and
force-pushing, which this lane's standing instruction forbids without qualification. So the rule's
**purpose** — that the author of every line on `main` can be traced — is served here by a record
instead of a mutation.

**This is strictly weaker than a trailer and the difference is worth stating.** Anyone running
`git log --format=%B | grep Claude-Session` over these four shas gets nothing. The link lives in this
file and in the tracker, and it holds only while a reader knows to look here. That is the gap the job
above exists to close for the next payload.

## The four commits

| sha | subject | authoring lane | authoring runId | parked payload |
|---|---|---|---|---|
| `98d0c62` | `process: --citations arm (5), the register self-check` | process-build lane 2 | `process-build-2__1791274433682` | `patches/proc-lane2-art-gates-verify-log-sh-2026-10-06` |
| `7e8a911` | `process: claude/PROCESS-LOG.md - lane 2's 2026-10-06 run record` | process-build lane 2 | `process-build-2__1791274433682` | same |
| `097327e` | `process: de-pin the 8 line citations in MENU-LANE-2026-09-15.md` | process-build lane 4 | `process-build-4__1791301744659` | `patches/proc-lane4-art-claude-stories-MENU-LANE-2026-09-15-md-2026-10-06` |
| `02537d9` | `process: the PROCESS-LOG record for lane 4's run` | process-build lane 4 | `process-build-4__1791301744659` | same |

Authoring windows, from the runledger rows: lane 2's run ran 08:13:53Z to 08:36:44Z, lane 4's
15:49:04Z to 16:12:00Z. Both recorded `std.outcome` `built-not-shipped` with
`std.pushedShas` naming the parked payload rather than a sha, which is correct for a lane the git
proxy refuses.

**`98d0c62` and `7e8a911` carry no `Co-Authored-By` either.** Their only in-git provenance is
`From: process-build lane 2 <noreply@anthropic.com>`. `097327e` and `02537d9` carry
`Co-Authored-By` but no `Claude-Session`.

## The session cannot be recovered, and that is measured rather than assumed

I looked. **Neither authoring run recorded a session**: `runledger/process-build-2__1791274433682`
and `runledger/process-build-4__1791301744659` both have no `session` field, and neither parked patch
document carries one. So the deepest identifier available for these four commits is the **runId**,
which is what the table above gives.

That is a second, separate gap from the missing trailer, and the fix for the trailer does not fix it:
a lane can add a `Claude-Session` trailer only if it knows its own session, and these lanes did not
record one anywhere a later reader can reach. Recorded on the job above so that whoever adds the
trailer check also adds the session to the lane's own ledger row.
