# process-build lane 1 — this lane's own record

ONE FILE PER LANE, created 2026-10-10. `claude/PROCESS-LOG.md` moved to this lane's MAY-NOT list on
2026-10-10 and the reason is measured: twelve payloads were parked and unlanded across ten artefact
paths and NINE of the twelve touched that one shared records file, so applied oldest-first the chain
died with `CONFLICT (content): Merge conflict in claude/PROCESS-LOG.md ... Patch failed at 0002` on
the second member, while that same patch applied alone onto main is exit 0. Nine finished pieces of
work held by a records file none of them was about. No two lanes ever write this path, so it cannot
conflict with another lane; the record commit is still kept ISOLATED AND LAST so that if it ever does
collide, `git am --skip` costs the record alone and never the work in commit one.

---

## 2026-10-10 — 2:35pm ET, run process-build-1__1791657312767

WHAT I CHANGED. `gates/buildnum.sh` and `gates/buildnum-selftest.sh`, one commit, taking two jobs
that are one cause in one block of one file [R09]:
jobs/sweep-computes-the-absent-set-before-it-takes-the-lock-2026-10-02 and
jobs/swept-register-rows-cite-no-sha-so-they-cannot-be-audited-without-the-tool-2026-10-02.

- `sweep --add` re-derives the absent set INSIDE the lock as `ONREG_NOW`/`ABSENT_NOW` and appends only
  what is still missing, so it is idempotent under concurrency rather than merely serialised. New
  names, not a reassignment, so the pre-lock report keeps saying what it measured [R18].
- every swept row now carries, in field 3, the OLDEST commit sha whose subject names that number,
  resolved with `git cat-file -e` before it is written, with the `git show --no-patch --format=%s`
  that re-derives the row in the note. A miss REFUSES loudly instead of falling back to `-`.
- ten new cases in the selftest, including the negative half: the fixture's pre-existing #900 row
  carries `-` in field 3, so both predicates are run against it and must say NO.

WHY THESE TWO AND NOT SOMETHING HIGHER. Back-pressure measured 17 unlanded patches against a ceiling
of 20 with the oldest dated 2026-10-09, so the lane was not halted. Of this lane family's 19
finish-first jobs the three above priority 13 each have a remainder that is the BUILD LANE's
integration slot or `chess.jsx`, and priority 15's remaining parts depend on `gates/records-gate.sh`,
which exists only in another lane's parked-and-unlanded payload. These two are the highest-priority
pair whose fix is wholly inside this lane's allow-list, on a free artefact, and FOUR of the 19 sit on
this one file - the 287-jobs-on-44-files concentration R44 exists for.

WHICH CHECKS I RAN AND THEIR NUMBERS.
| check | result |
|---|---|
| `gates/buildnum-selftest.sh` on origin/main 2bb09bf, before any edit | 76 pass / 0 fail, REAL EXIT 0 |
| same, after the fix and before the new cases | 76 pass / 0 fail, REAL EXIT 0 |
| same, with the ten new cases | 86 pass / 0 fail, REAL EXIT 0 |
| R36 determinism, three runs, verdict sets sorted and hashed | byte-identical, md5 `22b6001c3ccf7df9fc0ff3ccff4cb149` |
| `bash -n` on both changed files | clean |
| `gates/buildnum.sh sweep --report` on the real repository | REAL EXIT 3 over 1168 commits on 103 refs, one absent (#512), nothing written |
| `git status --porcelain` after all of it | only the two intended files |

The 76/0 baseline is not decoration: it is the exact figure that burst wave 1's patch 11 on this same
file broke (76/0 -> 75/1) on 2026-10-04, through mawk 1.3.4's leftmost-shortest `match()` on
`/[0-9]{3,4}/`. There is no awk interval match anywhere in this change; the one awk compares a whole
field for equality.

WHAT I DID NOT CHECK.
- `sweep --add` was NEVER run against the real `gates/build-numbers.tsv`, because that path is outside
  this lane's allow-list. The sha-carrying rows are proved on the selftest's git fixture only, so the
  end-to-end write onto main's register is unproven by this run and is the integration slot's to see.
- the concurrency finding is still NOT RACED. The control asserts the ORDER of operations by reading
  the script, which is what the job itself proposes, because a two-process case would have to argue
  R36 admission first. Nothing here claims a race was run.
- `sweep --report` reports #512 as named-and-absent on this clone. That is the build lane's in-flight
  number at the time of this run, not a finding, and nothing here touches it. Not re-checked later.
- no gate under `gates/regress/` was run and no browser was launched; this change cannot reach a
  bundle and no application code was touched.
- the push was refused as documented - `git push --dry-run` returned the proxy's 403 and REAL EXIT 128
  on the first attempt of the run - so the payload is PARKED and nothing of this reached main.
