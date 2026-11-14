#!/usr/bin/env bash
# claude/agents/control-audit-550/ctl01.sh [checkout] - TC-CTL-01's control, run by hand (#550 test-system helper B).
# It runs in a scratch clone, so the working tree is never dirty: a DIRTY gate would fall for the wrong reason, which is a
# trap and not a control. The script clones the checkout's HEAD and commits, in the clone only, the deletion of gate 15's
# one sound CONTROL-RECORD (fb7bfc7 2026-11-14). It runs gates/control-audit.js and gates/audit/control-floor.sh there,
# before and after, then deletes the clone. Expected: covered falls by exactly one, and the floor goes from exit 0 to
# exit 1, naming 15-gallery-playall as FELL.
# If that record is ever superseded, re-point the pattern at the gate's newest sound record (the audit's 'sound' line).
set -u
W="${1:-$(git rev-parse --show-toplevel)}"
T="$(mktemp -d)"
trap 'cd /; rm -rf "$T"' EXIT
git clone -q --no-local "$W" "$T/c" || exit 2
[ -e "$W/gates/node_modules" ] && ln -s "$(cd "$W/gates/node_modules" && pwd -P)" "$T/c/gates/node_modules"
cd "$T/c" || exit 2
git config core.hooksPath /dev/null
P='CONTROL-RECORD: fb7bfc7 2026-11-14'
echo "== unmutated clone at $(git rev-parse --short HEAD)"
node gates/control-audit.js 2>&1 | grep -E '^SUMMARY|^  15-gallery'
bash gates/audit/control-floor.sh 2>&1 | tail -1; echo "floor exit ${PIPESTATUS[0]}"
echo "records to delete: $(grep -c "$P" gates/regress/15-gallery-playall.js)"
grep -v "$P" gates/regress/15-gallery-playall.js > "$T/g15" && cp "$T/g15" gates/regress/15-gallery-playall.js
git commit -qam 'scratch control: gate 15 loses its one sound CONTROL-RECORD'
echo "== mutated clone at $(git rev-parse --short HEAD) (the clone only; deleted on exit)"
node gates/control-audit.js 2>&1 | grep -E '^SUMMARY|^  15-gallery'
bash gates/audit/control-floor.sh 2>&1 | grep -E 'FELL|pass /'; echo "floor exit ${PIPESTATUS[0]}"
