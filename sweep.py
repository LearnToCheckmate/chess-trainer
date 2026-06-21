#!/usr/bin/env python3
"""Engine sweep for Chess Trainer lessons (catches Rousseau-type mislabels).

audit.py proves every move is LEGAL. This goes further: it runs Stockfish
(/usr/games/stockfish) over every lesson, evals each position, and flags any
move that loses more than THRESHOLD cp versus best play -- i.e. a line that is
legal but relies on a move no engine would play. Run on NEW/CHANGED lessons
before deploy. Named traps/gambits will flag by design (the opponent's mistake
is the lesson) -- the job is to confirm those are FRAMED as traps and that no
line is mislabeled "best".

Usage: python3 sweep.py [chess.jsx] [threshold_cp]
"""
import re, sys, time, chess, chess.engine
SRC=sys.argv[1] if len(sys.argv)>1 else "chess.jsx"
TH=int(sys.argv[2]) if len(sys.argv)>2 else 200
s=open(SRC,encoding="utf-8").read()
def _body(name):
    m=re.search(r'const\s+'+name+r'\s*=\s*\[',s)
    if not m:return None
    i=m.end()-1;d=0;st=False;esc=False;sc=None
    for j in range(i,len(s)):
        ch=s[j]
        if st:
            if esc:esc=False
            elif ch=='\\':esc=True
            elif ch==sc:st=False
        else:
            if ch in '"\'':st=True;sc=ch
            elif ch=='[':d+=1
            elif ch==']':
                d-=1
                if d==0:return s[i+1:j]
def _objs(b):
    o=[];d=0;sj=None;st=False;esc=False;sc=None
    for i,ch in enumerate(b):
        if st:
            if esc:esc=False
            elif ch=='\\':esc=True
            elif ch==sc:st=False
        else:
            if ch in '"\'':st=True;sc=ch
            elif ch=='{':
                if d==0:sj=i
                d+=1
            elif ch=='}':
                if d>0:
                    d-=1
                    if d==0 and sj is not None:o.append(b[sj:i+1]);sj=None
    return o
L=[]
for arr in ["OPENINGS","ENDGAMES","MORE"]:
    bb=_body(arr)
    if not bb:continue
    for o in _objs(bb):
        nm=re.search(r'name:"([^"]*)"',o)
        if not nm:continue
        fen=re.search(r'fen:"([^"]*)"',o);lm=re.search(r'line:\[([^\]]*)\]',o);sd=re.search(r'side:"?([wb])"?',o)
        if not lm:continue
        L.append((nm.group(1),fen.group(1) if fen else None,re.findall(r'"([^"]*)"',lm.group(1)),sd.group(1) if sd else "?",arr))
eng=chess.engine.SimpleEngine.popen_uci("/usr/games/stockfish")
def ev(b):
    sc=eng.analyse(b,chess.engine.Limit(time=0.10))["score"].white()
    if sc.is_mate():return 10000 if sc.mate()>0 else -10000
    return sc.score()
def evalpos(b):
    if b.is_checkmate():return 10000 if b.turn==chess.BLACK else -10000
    if b.is_game_over():return 0
    return ev(b)
flagged=[];t0=time.time();done=0
for name,fen,line,side,arr in L:
    if time.time()-t0>235:print("(time budget hit)");break
    try:b=chess.Board(fen) if fen else chess.Board()
    except:continue
    evals=[evalpos(b)];ok=True;bl=[]
    for k,mv in enumerate(line):
        mover=b.turn
        try:p=b.parse_san(mv)
        except:ok=False;break
        b.push(p);evals.append(evalpos(b))
        loss=(evals[k]-evals[k+1]) if mover else (evals[k+1]-evals[k])
        if loss>TH:
            who="WHITE" if mover else "BLACK";taught=("white" if side=="w" else "black" if side=="b" else "?")
            bl.append((k+1,mv,who,loss,who.lower()!=taught and taught!="?"))
    done+=1
    if ok and bl:flagged.append((max(x[3] for x in bl),name,side,arr,bl))
eng.quit();flagged.sort(reverse=True)
print("Swept %d lessons. Flagged %d with a >%dcp swing:"%(done,len(flagged),TH))
for mx,name,side,arr,bl in flagged:
    print("\n[%s] (%s, taught=%s) worst %dcp"%(name,arr,side,mx))
    for ply,mv,who,loss,opp in bl:
        print("   ply %d %s by %s loses %dcp%s"%(ply,mv,who,loss," <-- opponent (verify it's framed as a trap)" if opp else ""))
