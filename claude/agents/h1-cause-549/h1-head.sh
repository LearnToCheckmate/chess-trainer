#!/bin/bash
# H1 replica, from gates/fastgate-drive.sh's own H1 text (fixed mode). Usage: h1rep.sh <repo> <outdir> [strace-delay-us]
set -uo pipefail
ROOT="$1"; OUT="$2"; DLY="${3:-}"
mkdir -p "$OUT"; W="$(mktemp -d)"; C="$W/clone"; trap 'rm -rf "$W"' EXIT
CAND="$(git -C "$ROOT" rev-parse HEAD)"
git clone --quiet --no-hardlinks --shared "$ROOT" "$C" >/dev/null 2>&1 || { echo CLONEFAIL; exit 2; }
git -C "$C" -c advice.detachedHead=false checkout --quiet "$CAND" >/dev/null 2>&1
git -C "$C" update-ref refs/remotes/origin/main "$CAND"
NOWET="$(TZ=America/New_York date '+%Y-%m-%d %H:%M')"
BASESTAMP="$(grep -aoE '#[0-9]{3,4} - 20[0-9]{2}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2} ET' "$C/app.js" | head -1)"
N="$(cd "$C" && bash gates/buildnum.sh next 2>/dev/null)"; N="${N%%$'\n'*}"; N="${N#\#}"
(cd "$C" && CT_RUNID=fastgate-drive bash gates/buildnum.sh mint "fastgate-drive.sh fixture, never pushed" >/dev/null 2>&1) || { echo MINTFAIL; exit 2; }
python3 -I - "$C/app.js" "$BASESTAMP" "#$N - $NOWET ET" <<'PY'
import sys
p,o,n=sys.argv[1],sys.argv[2].encode('latin1'),sys.argv[3].encode('latin1')
b=open(p,'rb').read(); assert b.count(o)==3; open(p,'wb').write(b.replace(o,n))
PY
(cd "$C" && CT_RUNID=fastgate-drive bash gates/buildnum.sh record "$N" "$(md5sum app.js|cut -c1-12)" "$(md5sum chess.jsx|cut -c1-12)" >/dev/null 2>&1)
git -C "$C" add -A -- ':!gates/.buildnum.lock' && git -C "$C" -c user.name=ct-drive -c user.email=ct-drive@local commit --quiet -m "H1 replica"
if [ -n "$DLY" ]; then
  ( cd "$C" && CT_FASTGATE_DRIVE=1 strace -f -qq -o /dev/null -e trace=write -e inject=write:delay_enter=$DLY bash gates/fastgate.sh "$CAND" > "$OUT/fg.out" 2>&1 ); rc=$?
else
  ( cd "$C" && CT_FASTGATE_DRIVE=1 bash gates/fastgate.sh "$CAND" > "$OUT/fg.out" 2>&1 ); rc=$?
fi
cp "$C"/gates/logs/fast-*-all.log "$OUT/" 2>/dev/null
echo "rc=$rc  $(grep -aE '^FAST GATE|FULL SUITE' "$OUT/fg.out" | tail -1)"
