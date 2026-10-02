#!/usr/bin/env bash
# gates/build.sh "#373"  -> bundles chess.jsx (via entry.jsx) into <repo>/app.js with the build stamp.
# Refuses: a missing/odd build number, A BUILD NUMBER ALREADY ON gates/build-numbers.tsv (see below), a bundle
# without createRoot (#351 white screen), a bundle without the stamp, a bundle node --check rejects.
# Prints bytes, md5 and the stamp.
# Env: CT_RUNID your runId, used to attribute the register row and to tell YOUR build numbers from another
#      run's - set it on every build; CT_STAMP_TIME overrides the time (tests only); CT_OUT a trial bundle
#      path; CT_RENUM=1 overrides the build-number refusal.
#
# ── THE BUILD NUMBER IS CHECKED FOR REUSE HERE (jobs/mint-build-numbers-from-one-place, #454) ────────────────
# "#416" names two different trees because each run picked its number from what it could see. This script is the
# one place a number becomes an artefact, so it is where the refusal belongs: `gates/buildnum.sh check` runs
# BEFORE esbuild, and a number already on the register stops the build. Take one with
# `CT_RUNID=<runId> gates/buildnum.sh mint '<what this build is for>'`.
#
# BE PRECISE ABOUT WHAT THIS ENFORCES, because the first draft of this header was not and #454's antagonist A
# measured it: THIS ENFORCES NON-REUSE, NOT MINTEDNESS. `gates/build.sh '#300'` and `'#777'` both succeed - they
# are absent from the register, so they are "free" - and #777 then advances the series, so the next `mint` hands
# out #778. The run therefore still CHOOSES its number; what it can no longer do is choose one already used.
# The header first claimed the number was "no longer the run's to choose", which is PROSE: the acceptance test
# is absence from a file, and CLAUDE.md calls absence the hardest thing to measure. Stamping a number with no
# `minted` row is WARNED about below and not refused, because refusing it changes the workflow of every lane
# that builds before minting and that change needs its own run and its own control. Filed as a job.
#
# TWO DELIBERATE HOLES, both of which would otherwise break work this project does every day:
#   * CT_OUT set means a TRIAL bundle that never touches the repo's app.js - which is how every negative control
#     in this suite is built, always under an existing number. A trial bundle is not an issued build, so the
#     check is SKIPPED, loudly. Refusing here would have broken the control workflow outright, which is the
#     larger defect: a guard that makes the project stop proving its gates is worse than an ambiguous stamp.
#   * CT_RENUM=1 overrides the refusal for a deliberate REBUILD of an existing number, and says so on stdout
#     with the rows it is overriding. It exists because reproducing a historical bundle is legitimate; it is
#     loud because #450's first draft of --ignore-held overrode SILENTLY, and that run caught it with its own
#     control. Never use it to issue new work under an old number.
# After a successful bundle, build.sh appends a `built` row itself, so every number RESOLVES to the artefacts
# stamped with it. That write is BEST EFFORT and never fails the build: a bookkeeping failure must not stop a
# bundle, or the guard becomes the outage.
set -euo pipefail
N="${1:-}"
[[ "$N" =~ ^#[0-9]{3,4}$ ]] || { echo "FAIL: build number required, like: gates/build.sh '#373'"; exit 1; }
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
G="$ROOT/gates"
# ── CT_OUT MUST NOT BE THE REPO'S OWN app.js (#454, antagonist A) ───────────────────────────────────────────
# The comment below says a CT_OUT build "never touches app.js", and nothing enforced it. Demonstrated: with
# CT_OUT pointing at $ROOT/app.js, the number check was skipped as a "trial", the SHIPPED artefact was
# overwritten, and nothing was written to the register - a trial bundle quietly replacing the real one, with the
# guard switched off. Compared by realpath so a symlink or a relative path cannot route around it.
if [ -n "${CT_OUT:-}" ]; then
  _ro="$(realpath -m "$ROOT/app.js" 2>/dev/null || echo "$ROOT/app.js")"
  _co="$(realpath -m "$CT_OUT" 2>/dev/null || echo "$CT_OUT")"
  if [ "$_ro" = "$_co" ]; then
    echo "FAIL: CT_OUT resolves to the repository's own app.js ($_co)."
    echo "  That is not a trial bundle, it is a real one with the build-number check switched off."
    echo "  Drop CT_OUT to build the repo's app.js, or point it somewhere else for a trial."
    exit 1
  fi
fi
# ── the build-number refusal, before anything is compiled ────────────────────────────────────────────────────
if [ -n "${CT_OUT:-}" ]; then
  # CHECKED BUT NOT ENFORCED, rather than skipped outright. Enforcing here would break every negative control
  # in this suite, which builds a trial bundle under an existing number on purpose. But SKIPPING the call meant
  # the trial path never exercised the predicate at all, so the mint-then-build deadlock could not be caught by
  # any test that avoided writing app.js - which is every test that can run while a suite is live (#454).
  echo "build.sh: CT_OUT is set, so this is a TRIAL bundle -> the build-number verdict is reported, not enforced:"
  if [ -x "$G/buildnum.sh" ]; then
    CT_RUNID="${CT_RUNID:-}" "$G/buildnum.sh" stampable "$N" 2>&1 | sed 's/^/    /' || true
  fi
elif [ ! -x "$G/buildnum.sh" ]; then
  echo "build.sh: WARNING - $G/buildnum.sh is missing or not executable, so the build number was NOT checked."
  echo "  Proceeding, because a missing tool must not stop a build - but $N may be a reuse."
elif CT_RUNID="${CT_RUNID:-}" "$G/buildnum.sh" stampable "$N" >/dev/null 2>&1; then
  # STAMPABLE, NOT MERELY ABSENT. `check` is true of any row at all, including the `minted` row this run was
  # just issued, so asking it here deadlocked mint-then-build (#454, antagonist B). `stampable` asks whether the
  # number is THIS RUN'S, which permits the happy path and the mid-run rebuild and refuses another run's number.
  "$G/buildnum.sh" stampable "$N" 2>/dev/null | sed 's/^/build.sh: /'
else
  RC=$?
  if [ "$RC" = "2" ]; then
    # EXIT 2 IS A USAGE OR TOOL FAULT, NOT A VERDICT ON THE NUMBER, and conflating the two sent the reader to
    # the wrong place: with the register file moved away, `build.sh '#455'` printed "rejected '#455' as a build
    # number" when #455 was fine and the TOOL was broken (#454, antagonist A). It is now diagnosed as a tool
    # fault, and it WARNS AND PROCEEDS for the same reason the missing-tool branch above does - a guard that
    # cannot answer must not become a total build outage. The asymmetry was the defect, not the strictness.
    echo "build.sh: WARNING - gates/buildnum.sh could not answer for '$N' (exit 2). Its message:"
    "$G/buildnum.sh" check "$N" 2>&1 | sed 's/^/    /' || true
    echo "  That is a USAGE OR TOOL fault (a missing or malformed register, or a number outside"
    echo "  ^#[0-9]{3,4}\$), NOT a finding about $N. Proceeding UNCHECKED, so $N may be a reuse:"
    echo "  fix the register and run \`gates/buildnum.sh check '$N'\` before you push."
  fi
  if [ "$RC" = "2" ]; then
    : # warned above; fall through to the build
  fi
  if [ "$RC" = "2" ]; then
    : # already warned; not a reuse verdict
  elif [ "${CT_RENUM:-}" = "1" ]; then
    echo "build.sh: CT_RENUM=1 - OVERRIDING the build-number refusal for $N. The rows being overridden:"
    "$G/buildnum.sh" check "$N" || true
    echo "build.sh: continuing under the override. This bundle will be a SECOND artefact under $N."
  else
    echo "FAIL: $N is not this run's to stamp."
    CT_RUNID="${CT_RUNID:-}" "$G/buildnum.sh" stampable "$N" 2>&1 | sed 's/^/    /' || true
    echo
    echo "  Take your own number: CT_RUNID=<your runId> gates/buildnum.sh mint '<what this build is for>'"
    echo "                        then build it: CT_RUNID=<your runId> gates/build.sh '<the number it printed>'"
    echo "  Deliberate rebuild of ANOTHER run's number? CT_RENUM=1 gates/build.sh '$N'   (loud, records a row)"
    echo "  Trial bundle?         CT_OUT=/path/app.js gates/build.sh '$N'   (checked but not enforced)"
    echo "  If CT_RUNID is unset, every number looks like somebody else's. Set it."
    exit 1
  fi
fi
[ -d "$G/node_modules/esbuild" ] || { echo "FAIL: run (cd gates && npm ci) first"; exit 1; }
B="$G/.build"; rm -rf "$B"; mkdir -p "$B"
cp "$ROOT/chess.jsx" "$B/chess.jsx"; cp "$G/entry.jsx" "$B/entry.jsx"
ln -s "$G/node_modules" "$B/node_modules"
STAMP="$N - ${CT_STAMP_TIME:-$(TZ=America/New_York date '+%Y-%m-%d %H:%M')} ET"
ESB="$G/node_modules/.bin/esbuild"
# 1) compile check (warnings count as failures, as deploy.py did)
CC=$("$ESB" "$B/chess.jsx" --bundle --external:react --external:react-dom --outfile=/dev/null --log-level=warning 2>&1 || true)
if [ -n "$CC" ]; then echo "FAIL: compile check:"; echo "$CC" | head -20; exit 1; fi
# 2) bundle with the stamp
"$ESB" "$B/entry.jsx" --bundle --format=iife --jsx=automatic --minify \
  --define:process.env.NODE_ENV='"production"' --define:__BUILD__="\"$STAMP\"" --outfile="$B/app.js" --log-level=warning
node --check "$B/app.js" || { echo "FAIL: node --check"; exit 1; }
grep -q 'createRoot' "$B/app.js" || { echo "FAIL: bundle has no createRoot (chess.jsx bundled instead of entry.jsx?)"; exit 1; }
grep -qF "$STAMP" "$B/app.js" || { echo "FAIL: stamp '$STAMP' not in bundle"; exit 1; }
grep -qF '"18.3.1"' "$B/app.js" || { echo "FAIL: React 18.3.1 not in bundle"; exit 1; }
OUT="${CT_OUT:-$ROOT/app.js}"   # CT_OUT=/some/path builds a trial bundle without touching the repo's app.js (CT_APP serves it)
cp "$B/app.js" "$OUT"
echo "BUILD OK: $STAMP  -> $OUT  bytes=$(stat -c %s "$OUT")  md5=$(md5sum "$OUT" | cut -c1-12)"
# ── record the triple so the number RESOLVES to this artefact (point 2 of the minting job) ───────────────────
# Only for a real bundle: a trial bundle is not an issued build. Never fatal - `|| true` and a set -e guard,
# because a register that can stop a build has become the outage it was written to prevent.
if [ -z "${CT_OUT:-}" ] && [ -x "$G/buildnum.sh" ]; then
  # HASH THE SOURCE THAT WAS ACTUALLY COMPILED (#454, antagonist A). esbuild builds $B/chess.jsx, a copy taken
  # at the top of this script; re-reading $ROOT/chess.jsx here would record a sourceMd5 that was never built if
  # the tree changed during the bundle. $B/chess.jsx IS the compiled input, byte for byte.
  # CT_RUNID IS THE ONE ATTRIBUTION build.sh NEVER ASKED FOR (#454, antagonist B): `mint` and `add` both refuse
  # without it on the grounds that an untraceable number is "the #416 defect with extra steps", and `record` -
  # the path that runs on EVERY build - defaulted silently to unknown-run. Warned here rather than made fatal,
  # because failing a good bundle over a bookkeeping field is the guard becoming the outage.
  if [ -z "${CT_RUNID:-}" ]; then
    echo "build.sh: WARNING - CT_RUNID is unset, so $N's register row will read 'unknown-run'."
    echo "  Re-run as CT_RUNID=<your runId> gates/build.sh '$N' to leave a traceable row."
  fi
  BMD5="$(md5sum "$OUT" | cut -c1-12)"; SMD5="$(md5sum "$B/chess.jsx" | cut -c1-12)"
  "$G/buildnum.sh" record "$N" "$BMD5" "$SMD5" || echo "build.sh: WARNING - could not record $N in the register (build itself is fine)."
  # MINTEDNESS IS WARNED, NOT ENFORCED - see the header. A number with no `minted` row was chosen by this run
  # rather than issued to it, which is the thing the register exists to end; it is surfaced here so the choice
  # is visible in the build output rather than only discoverable by reading the register later.
  # #456: THIS GREP CARRIED THE '#' AND THE REGISTER NEVER DOES, so it matched nothing and the NOTE below
  # fired on EVERY build - including the first correctly minted one, which was this one. Measured at
  # 2026-10-01T23:33Z on a register holding 2 `minted` rows: `grep -cE "^#456\tminted\t"` is 0 and the same
  # grep with the '#' stripped is 1, and `grep -c '^#[0-9]'` over the whole file is 0, so no row has ever
  # carried it. Every other consumer (`stampable`, `record`) normalises the number; this one did not.
  # IT IS THE ALARM-THAT-IS-ALWAYS-WRONG FAILURE CLAUDE.md RECORDS AT #454, one turn worse: that one was
  # wrong 4 times in 5, this one was wrong 5 times in 5, and it told the run that had just followed the
  # documented mint-then-build sequence that it had chosen its own number. The one column that proves the
  # happy path ran was therefore unreadable by the only thing that reads it.
  NBARE="${N#\#}"
  if ! grep -qE "^$NBARE"$'\t'"minted"$'\t' "$G/build-numbers.tsv" 2>/dev/null; then
    echo "build.sh: NOTE - $N has no \`minted\` row, so it was CHOSEN by this run, not issued to it."
    echo "  Not an error and not refused. Next time: CT_RUNID=<runId> gates/buildnum.sh mint '<what for>'."
  fi
  # ── AND RUN THE SWEEP, BECAUSE A COMMAND NOTHING CALLS IS NOT A GUARD (#465, antagonist A) ───────────────
  # A measured that `gates/buildnum.sh sweep` had NO CALLER anywhere: not gates.sh, not build.sh, not
  # deploy.py, and its selftest is deliberately outside gates/regress so no gate runs it either. So the thing
  # built to stop the register's denominator freezing again was a manual command, and this file already
  # records what that costs - both roles in section 2b of the build procedure were "chartered 2026-09-12 and
  # ran twice", because nothing told anything to run them. Here is the one place that is already reading and
  # writing this register on every build, so here is where it goes.
  # IT WARNS, IT NEVER REFUSES, and that is deliberate on two counts. A divergence between the register and
  # the commit history is not a property of the bundle being built, so failing the build for it would stop
  # work for a bookkeeping fact; and every negative control in this suite builds under an existing number, so
  # a refusal here would break the workflow that proves this project's own gates - the same reasoning that
  # left mintedness a warning three lines above, and the same reasoning that makes `--this-bundle` opt-in.
  # ON A SHALLOW CLONE IT SAYS SO AND CLAIMS NOTHING. The routine's container starts shallow, which A named
  # as the reason the sweep "can only ever warn" there; `sweep` exits 3 on a shallow clone whatever it finds,
  # so what prints is the unmeasured warning rather than a false all-clear. That is the honest output for
  # that container, and it is also a standing nudge to unshallow, which this build's own run had to do.
  if [ -z "${CT_SKIP_SWEEP:-}" ]; then
    # `|| SWRC=$?` AND NOT `; SWRC=$?`, AND THE FIRST VERSION OF THIS GOT IT WRONG IN THE WORST WAY.
    # This script runs under `set -euo pipefail`, so a bare assignment from a failing command substitution
    # ABORTS THE SCRIPT. Measured with the positive control for this very block: with #276's row removed so
    # the sweep exits 3, `gates/build.sh '#465'` wrote the bundle, recorded the register row, and then exited
    # 3 WITHOUT EVER PRINTING THE WARNING. So the guard was invisible and the build looked failed to any
    # caller reading the exit code - a bookkeeping warning turned into a build failure, which is precisely
    # what the comment above promises it is not. Putting the substitution in a compound keeps set -e out.
    SWRC=0
    SWOUT="$("$G/buildnum.sh" sweep 2>&1)" || SWRC=$?
    if [ "$SWRC" != "0" ]; then
      echo "build.sh: NOTE - the build-number register and the commit history DISAGREE (sweep exit $SWRC):"
      printf '%s\n' "$SWOUT" | sed 's/^/    /'
      echo "  Not an error and not refused: this is bookkeeping, not a property of the bundle."
      echo "  To record them: CT_RUNID=<runId> gates/buildnum.sh sweep --add   (then commit the register)"
    fi
  fi
fi
