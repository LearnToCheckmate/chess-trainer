#!/bin/bash
# H1 replica of the FLAKED configuration: 9a4663e's harness text, unfixed base = c661487's fastgate/buildnum/build.
# Usage: h1rep-old.sh <oldtree> <outdir> [strace-delay-us]
set -uo pipefail
ROOT="$1"; OUT="$2"; DLY="${3:-}"; UP=c661487
mkdir -p "$OUT"; W="$(mktemp -d)"; C="$W/clone"; trap 'rm -rf "$W"' EXIT
CAND="$(git -C "$ROOT" rev-parse HEAD)"
git clone --quiet --no-hardlinks --shared "$ROOT" "$C" >/dev/null 2>&1 || { echo CLONEFAIL; exit 2; }
git -C "$C" -c advice.detachedHead=false checkout --quiet "$CAND" >/dev/null 2>&1
for f in gates/fastgate.sh gates/buildnum.sh gates/build.sh; do git -C "$C" show "$UP:$f" > "$C/$f"; chmod +x "$C/$f"; done
python3 -I - "$C/gates/fastgate.sh" <<'PY'
import sys
p=sys.argv[1]; s=open(p).read()
old="\"$G/records-gate.sh\" --entries 2>/dev/null \\\n  | grep -qxF \"$(printf 'appendonly\\tgates/build-numbers.tsv')\" && BNRATCHET=yes\n"
new="BN_ENT=\"$(\"$G/records-gate.sh\" --entries 2>/dev/null)\"; case \"$BN_ENT\" in *\"$(printf 'appendonly\\tgates/build-numbers.tsv')\"*) BNRATCHET=yes ;; esac\n"
assert s.count(old)==1, "pattern not found"
open(p,"w").write(s.replace(old,new))
PY
git -C "$C" add -A >/dev/null 2>&1; git -C "$C" -c user.name=ct-drive -c user.email=ct-drive@local commit --quiet --allow-empty -m "UNFIXED BASE" >/dev/null 2>&1
BASESHA="$(git -C "$C" rev-parse HEAD)"; git -C "$C" update-ref refs/remotes/origin/main "$BASESHA"
NOWET="$(TZ=America/New_York date '+%Y-%m-%d %H:%M')"
BASESTAMP="$(grep -aoE '#[0-9]{3,4} - 20[0-9]{2}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2} ET' "$C/app.js" | head -1)"
n="$(cd "$C" && bash "$C/gates/buildnum.sh" next 2>/dev/null | grep -oE '#?[0-9]{3,4}' | head -1 | tr -d '#')"
[ -n "$n" ] || { echo "NEXTEMPTY"; exit 3; }
out="$(cd "$C" && CT_RUNID=fastgate-drive bash "$C/gates/buildnum.sh" mint "fastgate-drive.sh fixture, never pushed" 2>&1)" || { echo "MINTFAIL $out"; exit 3; }
python3 -I - "$C/app.js" "$BASESTAMP" "#$n - $NOWET ET" <<'PY'
import sys
p,o,n=sys.argv[1],sys.argv[2].encode('latin1'),sys.argv[3].encode('latin1')
b=open(p,'rb').read(); assert b.count(o)==3; open(p,'wb').write(b.replace(o,n))
PY
(cd "$C" && CT_RUNID=fastgate-drive bash gates/buildnum.sh record "$n" "$(md5sum app.js|cut -c1-12)" "$(md5sum chess.jsx|cut -c1-12)" >/dev/null 2>&1) || echo "(record nonzero)"
git -C "$C" add -A -- ':!gates/.buildnum.lock' && git -C "$C" -c user.name=ct-drive -c user.email=ct-drive@local commit --quiet -m "H1 replica"
if [ -n "$DLY" ]; then
  ( cd "$C" && CT_FASTGATE_DRIVE=1 strace -f -qq -o /dev/null -e trace=write -e inject=write:delay_enter=$DLY bash "$C/gates/fastgate.sh" "$BASESHA" > "$OUT/fg.out" 2>&1 ); rc=$?
else
  ( cd "$C" && CT_FASTGATE_DRIVE=1 timeout 250 bash "$C/gates/fastgate.sh" "$BASESHA" > "$OUT/fg.out" 2>&1 ); rc=$?
fi
cp "$C"/gates/logs/fast-*-all.log "$OUT/" 2>/dev/null
echo "rc=$rc  $(grep -aE '^FAST GATE|FULL SUITE' "$OUT/fg.out" | tail -1)"
