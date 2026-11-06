import sys
p=sys.argv[1]; s=open(p).read()
old='    printf \'%s\' "$live" | grep -qxF "$(printf \'%s\\t%s\' "$mode" "$path")" \\\n      || gone='
new='    case $\'\\n\'"$live"$\'\\n\' in *$\'\\n\'"$mode"$\'\\t\'"$path"$\'\\n\'*) : ;; *) false ;; esac \\\n      || gone='
assert s.count(old)==1, "records-gate pattern not found"
open(p,"w").write(s.replace(old,new))
