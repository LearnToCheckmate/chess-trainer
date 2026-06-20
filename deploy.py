#!/usr/bin/env python3
"""Deploy Chess Trainer.

Runs the content audit, bundles chess.jsx -> app.js with the build stamp,
commits the standard file set in ONE commit via the GitHub Git Data API, and
polls GitHub Pages until the new commit is built.

  python3 deploy.py --build 229 --msg "#229 strip move prefixes from old lessons"
  python3 deploy.py --build 230 --msg "..." --files extra1.py extra2.md
  python3 deploy.py --build 231 --msg "..." --skip-audit   # non-content builds

Token: read from $GITHUB_TOKEN, else /home/claude/.ght (the session stash).
Dirs:  --repo (default /home/claude/work/repo), --build-dir (/home/claude/work/build).
The build dir must contain entry.jsx + node_modules (react, react-dom); esbuild
is invoked via npx. Never writes the token to any file.
"""
import argparse, base64, json, os, subprocess, sys, time, urllib.request, urllib.error
from datetime import datetime, timezone, timedelta

REPO = "LearnToCheckmate/chess-trainer"
API = "https://api.github.com/repos/" + REPO
STD_FILES = ["app.js", "chess.jsx", "chess-trainer-backlog.md", "gen_tracker.py"]


def token():
    t = os.environ.get("GITHUB_TOKEN")
    if t:
        return t.strip()
    for p in ("/home/claude/.ght", os.path.expanduser("~/.ght")):
        if os.path.exists(p):
            return open(p).read().strip()
    sys.exit("FAIL: no token in $GITHUB_TOKEN or /home/claude/.ght")


def req(method, url, tok, data=None):
    for attempt in range(3):
        try:
            r = urllib.request.Request(
                url, data=(json.dumps(data).encode() if data else None), method=method)
            r.add_header("Authorization", "Bearer " + tok)
            r.add_header("Accept", "application/vnd.github+json")
            r.add_header("User-Agent", "chess-deploy")
            return json.load(urllib.request.urlopen(r))
        except urllib.error.HTTPError as e:
            if e.code == 403 and attempt < 2:
                time.sleep(20)
                continue
            sys.exit("FAIL: HTTP %d %s" % (e.code, e.read().decode()[:200]))


def run(cmd, cwd=None):
    return subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--build", required=True, type=int)
    ap.add_argument("--msg", required=True)
    ap.add_argument("--files", nargs="*", default=[])
    ap.add_argument("--repo", default="/home/claude/work/repo")
    ap.add_argument("--build-dir", default="/home/claude/work/build")
    ap.add_argument("--skip-audit", action="store_true")
    ap.add_argument("--skip-pages", action="store_true")
    a = ap.parse_args()
    tok = token()
    repo, bd = a.repo, a.build_dir
    stamp = "#%d \u00b7 %s EDT" % (
        a.build, datetime.now(timezone(timedelta(hours=-4))).strftime("%Y-%m-%d %H:%M"))

    # 1) content audit gate
    if not a.skip_audit:
        au = run([sys.executable, os.path.join(repo, "audit.py"),
                  os.path.join(repo, "chess.jsx")])
        sys.stdout.write(au.stdout)
        if au.returncode != 0:
            sys.exit("ABORT: audit.py FAILED, not deploying.")

    # 2) compile-check
    subprocess.run(["cp", os.path.join(repo, "chess.jsx"), bd], check=True)
    cc = run(["npx", "esbuild", "chess.jsx", "--bundle", "--external:react",
              "--external:react-dom", "--outfile=/dev/null"], cwd=bd)
    if cc.returncode != 0 or "error" in cc.stderr.lower() or "warning" in cc.stderr.lower():
        sys.exit("ABORT: compile check failed:\n" + cc.stderr[:600])

    # 3) bundle with stamp
    bl = run(["npx", "esbuild", "entry.jsx", "--bundle", "--format=iife",
              "--jsx=automatic", "--minify",
              "--define:process.env.NODE_ENV=\"production\"",
              "--define:__BUILD__=\"%s\"" % stamp, "--outfile=app.js"], cwd=bd)
    if bl.returncode != 0:
        sys.exit("ABORT: bundle failed:\n" + bl.stderr[:600])
    nc = run(["node", "--check", os.path.join(bd, "app.js")])
    if nc.returncode != 0:
        sys.exit("ABORT: node --check failed:\n" + nc.stderr[:400])
    app = open(os.path.join(bd, "app.js"), encoding="utf-8").read()
    if ("#%d" % a.build) not in app:
        sys.exit("ABORT: stamp #%d not found in bundle." % a.build)
    subprocess.run(["cp", os.path.join(bd, "app.js"), os.path.join(repo, "app.js")], check=True)
    print("bundle ok: %d bytes, stamp %s" % (len(app), stamp))

    # 4) one commit via Git Data API
    files = list(dict.fromkeys(STD_FILES + a.files))
    parent = req("GET", API + "/git/ref/heads/main", tok)["object"]["sha"]
    base_tree = req("GET", API + "/git/commits/" + parent, tok)["tree"]["sha"]
    tree = []
    for f in files:
        p = os.path.join(repo, f)
        if not os.path.exists(p):
            print("  skip (missing): %s" % f)
            continue
        blob = req("POST", API + "/git/blobs", tok,
                   {"content": base64.b64encode(open(p, "rb").read()).decode(),
                    "encoding": "base64"})["sha"]
        tree.append({"path": f, "mode": "100644", "type": "blob", "sha": blob})
    tsha = req("POST", API + "/git/trees", tok, {"base_tree": base_tree, "tree": tree})["sha"]
    csha = req("POST", API + "/git/commits", tok,
               {"message": a.msg, "tree": tsha, "parents": [parent]})["sha"]
    req("PATCH", API + "/git/refs/heads/main", tok, {"sha": csha})
    print("COMMIT %s" % csha[:8])

    # 5) poll Pages
    if not a.skip_pages:
        for i in range(10):
            try:
                b = req("GET", API + "/pages/builds/latest", tok)
                st, cm = b.get("status"), (b.get("commit") or "")[:8]
                print("  pages:", i, st, cm)
                if st == "built":
                    break
            except SystemExit:
                break
            time.sleep(15)

    print("\nDEPLOYED %s" % stamp)


if __name__ == "__main__":
    main()
