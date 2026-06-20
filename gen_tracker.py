import json, datetime
GROUPS=[
 {"key":"play","nm":"Play","color":"#6ea8fe"},
 {"key":"lessons","nm":"Lessons & Discover","color":"#5fbf7f"},
 {"key":"puzzles","nm":"Puzzles","color":"#b07fd8"},
 {"key":"review","nm":"Review","color":"#4fbfb0"},
 {"key":"coach","nm":"Coach","color":"#e0a05a"},
 {"key":"tourn","nm":"Tournaments","color":"#e07a7a"},
 {"key":"social","nm":"Friends & Social","color":"#e07ab0"},
 {"key":"money","nm":"Monetization (Pro)","color":"#e0c05a"},
 {"key":"polish","nm":"Polish & UX","color":"#9aa3ad"},
 {"key":"infra","nm":"Infra & Setup","color":"#7a9ab0"},
]
T=[
 ("play","Play vs Stockfish engine","done","",""),
 ("play","Pass-and-play (local 2-player)","done","",""),
 ("play","Online play by invite code","done","#162",""),
 ("play","Back/forward move navigation in live games","done","",""),
 ("play","Minute-based time controls (1/2/3/5/10 min)","done","",""),
 ("play","vs-Computer time control surfaced in setup","done","#253",""),
 ("play","Captured-pieces display per player","done","#256","Replaced 'Material even'; dark-on-dark contrast fixed in #256."),
 ("play","Drag-and-drop castling","done","",""),
 ("play","Remove redundant 'You are Black' / turn labels","open","","Player bars already show side + whose turn; labels are redundant."),
 ("play","Correspondence mode (1/3/7-day per move)","open","","Bigger build; picker in the online lobby."),
 ("play","Play nearby (neighbours by approx location)","open","","Bigger build."),
 ("play","Video call during online play (WebRTC)","open","","Bigger build."),
 ("lessons","Openings library (~175 engine-verified lessons)","done","",""),
 ("lessons","Gambits bucketed by first move","done","",""),
 ("lessons","Endgames & theory lessons","done","",""),
 ("lessons","Tactics mini-track (Fork, Skewer, Discovered/Double Check, Pin)","done","#237",""),
 ("lessons","Notation trainer (reading + checks/mates/promotion)","done","#235",""),
 ("lessons","Classic mates (Fool's, Arabian, Epaulette, Dovetail)","done","",""),
 ("lessons","Lesson-to-lesson navigation buttons","done","",""),
 ("lessons","Square of the Pawn visualization","done","",""),
 ("lessons","Move-prefix stripped from all lesson notes","done","#229",""),
 ("lessons","Rousseau 4.d4 line fixed (Smirnov trap)","done","#258","7...Qxd5 8.Nc3 Qxf5 wins a piece; auto-plays in the gallery."),
 ("lessons","Reorder lesson rows by popularity","open","","You chose 'most popular first'; reorder pending."),
 ("puzzles","Lichess CC0 puzzle roadmap (tiered)","done","",""),
 ("puzzles","Puzzles free (not Pro-gated)","done","#108",""),
 ("review","Chess.com + Lichess game import","done","",""),
 ("review","Eval + blunder analysis","done","",""),
 ("review","Two-column Game Review summary card","done","#98",""),
 ("review","Great-move classification chip","done","#231",""),
 ("review","Tap 'Better was X' to show best move on board","done","#42",""),
 ("review","Review overhaul (eval bar, brilliant heuristic)","part","#217","Part 1 shipped; rest needs a sample PGN from you."),
 ("review","Best-move play-out (full engine line, then snap back)","open","",""),
 ("coach","Coach section (Pro, taste-then-gate)","done","#242","3 free Coach replies before the paywall."),
 ("tourn","Tournaments lobby + create + pairing (all 3 formats)","done","","Round-robin, knockout, Swiss; pairing engine verified."),
 ("tourn","Tournaments full run (Stage 3+)","open","","Bigger build; needs your testing."),
 ("social","Friends network (add by user ID, mutual accept)","open","","Planned; 'Add friend' on past opponents."),
 ("money","Pro gates Coach section only","done","",""),
 ("money","Pricing $2.99/mo + $19.99/yr (in-app paywall)","done","",""),
 ("money","Board skins (Playful/Medieval) stay Pro","done","",""),
 ("money","Stripe extension + webhook installed","done","",""),
 ("polish","App-wide font increase (body to 14px)","done","#256","Verify in the gallery font screens."),
 ("polish","Smallest fonts bumped (Discover, Puzzles)","done","#254",""),
 ("polish","Duplicate lesson title removed","done","#236",""),
 ("polish","Avatar at bottom-right","done","",""),
 ("polish","Preview gallery (verification scenarios)","done","","Ongoing; auto-plays screens for you to record."),
 ("polish","Streak retention phase 1 (in-app)","done","#249",""),
 ("infra","React PWA on GitHub Pages (installable)","done","",""),
 ("infra","Firebase (Google auth, Firestore, Blaze)","done","",""),
 # NEEDS-YOU (open + you)
 ("lessons","List your own openings not yet in the library","openY","","You still owe me this list."),
 ("coach","Coach avatar redesign (minimalist)","openY","","You said yes/minimalist; needs SVG mockups first."),
 ("polish","Custom piece art (theme phase 2)","openY","","Needs style mockups first."),
 ("polish","iPad two-column landscape Home","openY","","Parked; needs iPad screenshots."),
 ("money","Recreate Stripe TEST prices at $2.99/$19.99","openY","","Current test IDs are the old $0.99/$9.99."),
 ("money","Run Stripe 4242 test checkout","openY","",""),
 ("infra","Sign-in persistence on installed iOS PWA","open","","Known WebKit storage-partitioning issue; workaround Safari."),
 ("infra","Buy gambitcoach.com domain","openY","","~$10.46 at Cloudflare."),
 ("infra","Closed-app streak push (FCM VAPID key)","openY","","Biggest retention gap."),
 ("infra","Photo-to-board (scanBoard function + vision API)","openY","","Function deploy + API key."),
 ("infra","Legal pages (privacy + terms)","openY","",""),
]
TASKS=[]
for g,t,s,b,n in T:
    you=s.endswith("Y"); s=s[:-1] if you else s
    TASKS.append({"g":g,"t":t,"s":s,"you":you,"b":b,"n":n})
edt=datetime.datetime.utcnow()-datetime.timedelta(hours=4)
stamp="Snapshot "+edt.strftime("%Y-%m-%d %-I:%M %p")+" EDT - live build #258 - significant items, curated from the backlog"
tpl=open("chess-tracker.template.html",encoding="utf-8").read()
html=tpl.replace("__STAMP__",stamp).replace("__GROUPS_JSON__",json.dumps(GROUPS)).replace("__TASKS_JSON__",json.dumps(TASKS))
assert "__GROUPS_JSON__" not in html and "__TASKS_JSON__" not in html and "__STAMP__" not in html
open("chess-tracker.html","w",encoding="utf-8").write(html)
from collections import Counter
c=Counter(t["s"] for t in TASKS); y=sum(1 for t in TASKS if t["you"] and t["s"]!="done")
print("tasks:",len(TASKS),"| done:",c["done"],"| open:",c["open"],"| in progress:",c["part"],"| need you:",y)
print("bytes:",len(html))
