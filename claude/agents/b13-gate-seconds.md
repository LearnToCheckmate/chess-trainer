# Gate seconds, and the slowest gates (batch 13)

Job: `jobs/the-slowest-gates-are-made-faster-with-every-check-kept-2026-11-18`.

## Where the seconds come from

`claude/agents/gatelogs/551c-all.log`, the newest green full suite, **does not carry any per-gate seconds.** gates.sh
stamps only the time the suite starts (`2026-11-18 14:43:35 UTC`) and nothing per gate, and that run's per-gate logs
(`gates/logs/551c-*.log`, whose mtimes would give the seconds) are no longer in any container. So no gate's seconds can
be read out of that log. `node gates/audit/gate-seconds.js --log claude/agents/gatelogs/551c-all.log` prints the
145-gate roster and PASS counts, gives every gate's seconds as `n/a`, and exits 2. It does not estimate.

The seconds below were **measured here**, one gate at a time with `gates/audit/time-gates.sh`. It runs each gate the way
gates.sh does: `CT_OBSERVE_EXIT=1 timeout 900 node -r gates/lib.js gates/regress/<gate>.js`, never two at once, and
only once the 5-minute load reads 4 or under. Every row gives the 5-minute load at the moment that gate started.
Other seats were running browsers at the same time, so these are busy-machine seconds, not quiet ones.
Bundle: a trial build of 8c6b7bba, md5 `ea5ad8645463`.

To re-derive a table from rows like these: `node gates/audit/gate-seconds.js --tsv <rows> --md`. On the lead's next
full suite, run `node gates/audit/gate-seconds.js --log gates/logs/<stem>-all.log --dir gates/logs --md` before
anything touches gates/logs. That gives every gate's seconds from its per-gate log mtime.

## Measured (before any change, 8c6b7bba)

| gate | seconds | PASS | FAIL | exit | 5-min load at start |
|---|---|---|---|---|---|
| 22-engline-recovery | 709.5 | 113 | 0 | 0 | 2.64 |

(The table grows as the measuring continues. It was paused twice when the shared load went above 4.)
