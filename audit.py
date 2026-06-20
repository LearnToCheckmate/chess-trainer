#!/usr/bin/env python3
"""Content audit for Chess Trainer.

Parses chess.jsx, extracts every lesson in the OPENINGS / ENDGAMES / MORE
arrays, and validates:
  - the move line is legal (played from the lesson FEN if present, else the
    standard start position) via python-chess
  - notes length == line length (when a notes array is present)
  - any FEN is a legal position (is_valid) and the side to move is not already
    giving check (an impossible "it's my move but I'm checking you" position)
  - a move written with '#' actually delivers checkmate, and '+' delivers check
WARN-only (does not fail the build):
  - a per-move note that begins with a move prefix (the UI adds the move label,
    so notes should not repeat the move) -- this is the post-#224 convention

Exit code 0 = PASS, 1 = FAIL. deploy.py and the human gate both rely on this.
Usage: python3 audit.py [path-to-chess.jsx]
"""
import sys, re

try:
    import chess
except ImportError:
    print("FAIL: python-chess not installed "
          "(pip install python-chess --break-system-packages)")
    sys.exit(1)

SRC = sys.argv[1] if len(sys.argv) > 1 else "chess.jsx"
s = open(SRC, encoding="utf-8").read()


def _array_body(name):
    """Return the text between the [ and matching ] of `const NAME = [ ... ]`,
    respecting string literals so brackets inside strings do not confuse it."""
    m = re.search(r'const\s+' + name + r'\s*=\s*\[', s)
    if not m:
        return None
    i = m.end() - 1  # index of the opening '['
    depth = 0
    in_str = False
    esc = False
    strch = None
    for j in range(i, len(s)):
        ch = s[j]
        if in_str:
            if esc:
                esc = False
            elif ch == '\\':
                esc = True
            elif ch == strch:
                in_str = False
        else:
            if ch == '"' or ch == "'":
                in_str = True
                strch = ch
            elif ch == '[':
                depth += 1
            elif ch == ']':
                depth -= 1
                if depth == 0:
                    return s[i + 1:j]
    return None


def _objects(body):
    """Split an array body into its top-level { ... } object literals."""
    objs = []
    depth = 0
    start = None
    in_str = False
    esc = False
    strch = None
    for i, ch in enumerate(body):
        if in_str:
            if esc:
                esc = False
            elif ch == '\\':
                esc = True
            elif ch == strch:
                in_str = False
        else:
            if ch == '"' or ch == "'":
                in_str = True
                strch = ch
            elif ch == '{':
                if depth == 0:
                    start = i
                depth += 1
            elif ch == '}':
                if depth > 0:
                    depth -= 1
                    if depth == 0 and start is not None:
                        objs.append(body[start:i + 1])
                        start = None
    return objs


MOVE_PREFIX = re.compile(
    r'^(?:\u2026|\.\.\.)?\s*[A-Za-z0-9O][A-Za-z0-9O+#=x\-]*[!?]*\s*\u2014\s')

fails = []
warns = []
nlessons = 0

for arr in ["OPENINGS", "ENDGAMES", "MORE"]:
    body = _array_body(arr)
    if body is None:
        continue
    for obj in _objects(body):
        nm = re.search(r'name:"([^"]*)"', obj)
        if not nm:
            continue
        name = nm.group(1)
        nlessons += 1
        fenm = re.search(r'fen:"([^"]*)"', obj)
        linem = re.search(r'line:\[([^\]]*)\]', obj)
        notem = re.search(r'notes:\[([^\]]*)\]', obj)
        if not linem:
            fails.append((name, "no line array found"))
            continue
        line = re.findall(r'"([^"]*)"', linem.group(1))
        notes = re.findall(r'"([^"]*)"', notem.group(1)) if notem else []

        if notem and len(notes) != len(line):
            fails.append((name, "notes(%d) != line(%d)" % (len(notes), len(line))))

        board = None
        if fenm:
            try:
                board = chess.Board(fenm.group(1))
                if not board.is_valid():
                    fails.append((name, "illegal FEN: %s" % fenm.group(1)))
                    board = None
            except Exception as e:
                fails.append((name, "FEN parse error: %s" % e))
                board = None
        else:
            board = chess.Board()

        if board is not None:
            for k, mv in enumerate(line):
                try:
                    parsed = board.parse_san(mv)
                except Exception as e:
                    fails.append((name, "illegal move #%d '%s': %s" % (k + 1, mv, e)))
                    break
                board.push(parsed)
                if mv.endswith('#') and not board.is_checkmate():
                    fails.append((name, "move '%s' marked # but is not checkmate" % mv))
                elif mv.endswith('+') and not board.is_check():
                    fails.append((name, "move '%s' marked + but is not check" % mv))

        for k, nt in enumerate(notes):
            if MOVE_PREFIX.match(nt):
                warns.append((name, "note #%d repeats the move prefix: %r" % (k + 1, nt[:34])))
                break

print("Audited %d lessons across OPENINGS / ENDGAMES / MORE." % nlessons)

if warns:
    print("\nWARN: %d note(s) repeat a move prefix (UI adds the label):" % len(warns))
    for nm, msg in warns[:25]:
        print("  [%s] %s" % (nm, msg))

if fails:
    print("\nFAIL: %d issue(s):" % len(fails))
    for nm, msg in fails:
        print("  [%s] %s" % (nm, msg))
    sys.exit(1)

print("\nPASS: legal lines, legal FENs, aligned notes, correct #/+ annotations.")
sys.exit(0)
