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
 ("play","Captured-pieces display per player","done","#256","Contrast fixed in #256."),
 ("play","Drag-and-drop castling","done","",""),
 ("play","Turn cue consolidated into player bars","done","#259","Text labels were gone (#97/#119); #259 highlights the active player's bar + dropped the redundant dots."),
 ("play","Correspondence mode (1/3/7-day per move)","done","","Already live: 1/3/7-day picker in the online lobby + multi-day clocks."),
 ("play","Play nearby (neighbours by approx location)","done","#129","App-side done: coarse geolocation + ZIP fallback + challenge. Backend is your CTCloud side."),
 ("play","Video call during online play (WebRTC)","open","",""),
 ("lessons","Openings library (159 engine-verified lessons)","done","#279","#279 added Allgaier KG, Caro Fantasy, Pirc Austrian, Alekhine Four Pawns, Sicilian OKelly."),
 ("lessons","Gambits bucketed by first move","done","",""),
 ("lessons","Endgames & theory lessons","done","",""),
 ("lessons","Tactics mini-track (Fork, Skewer, Discovered/Double Check, Pin)","done","#237",""),
 ("lessons","Notation trainer (reading + checks/mates/promotion)","done","#235",""),
 ("lessons","Classic mates (Fool's, Arabian, Epaulette, Dovetail)","done","",""),
 ("lessons","Lesson-to-lesson navigation buttons","done","",""),
 ("lessons","Square of the Pawn visualization","done","",""),
 ("lessons","Move-prefix stripped from all lesson notes","done","#229",""),
 ("lessons","Rousseau 4.d4 line fixed (Smirnov trap)","done","#258","Auto-plays in the gallery to verify."),
 ("lessons","Reorder lesson rows by popularity","done","#259","Sorted by best-guess popularity (display-only; progress is name-keyed so safe)."),
 ("lessons","Lesson videos (embedded player + curated IDs)","part","#278","Player + link-outs done; 24 lessons had videos. #278 added real YouTube IDs for Najdorf, Dragon, Nimzo-Indian, Alekhine. ~100 lessons still need a curated ID - I can keep adding in batches; you swap any bad picks."),
 ("puzzles","Lichess CC0 puzzle roadmap (tiered)","done","",""),
 ("puzzles","Puzzles free (not Pro-gated)","done","#108",""),
 ("puzzles","Roadmap scenery (themed layered SVG, all 12 themes)","done","#280","#280 redesign slice: rich landscape the winding road threads through; follows your board theme. Review via the gallery scenery card (cycles all themes)."),
 ("review","Chess.com + Lichess game import","done","",""),
 ("review","Eval + blunder analysis","done","",""),
 ("review","Two-column Game Review summary card","done","#98",""),
 ("review","Great-move classification chip","done","#231",""),
 ("review","Tap 'Better was X' to show best move on board","done","#42",""),
 ("review","Review overhaul (eval bar, brilliant heuristic)","part","#260","Eval bar BUILT #260 (thin vertical, in the gallery - decide keep/remove). Brilliant heuristic still needs a sample PGN."),
 ("review","Best-move play-out (full engine line, then snap back)","open","","Only the single best move is stored (green arrow). Full PV needs an on-demand engine run - confirm scope."),
 ("coach","Coach section (Pro, taste-then-gate)","done","#242","3 free Coach replies before paywall."),
 ("tourn","Tournaments lobby + create + pairing (all 3 formats)","done","","Round-robin, knockout, Swiss."),
 ("tourn","Tournaments full run (Stage 3+)","open","","Lobby/create/join/pairing/start built (#168-170); the live run (results -> standings -> advance) needs backend + your testing."),
 ("social","Friends network (add by user ID, mutual accept)","done","","Already built: share-your-ID, add by ID, mutual accept, friends list. Backend is your CTCloud side."),
 ("money","Pro gates Coach section only","done","",""),
 ("money","Pricing $2.99/mo + $19.99/yr (in-app paywall)","done","",""),
 ("money","Board skins (Playful/Medieval) stay Pro","done","",""),
 ("money","Stripe extension + webhook installed","done","",""),
 ("polish","App-wide font increase (body to 14px)","done","#256","Verify in the gallery font screens."),
 ("polish","Smallest fonts bumped (Discover, Puzzles)","done","#254",""),
 ("polish","Duplicate lesson title removed","done","#236",""),
 ("polish","Avatar at bottom-right","done","",""),
 ("polish","Preview gallery (verification scenarios)","done","","Auto-plays screens for you to record."),
 ("polish","Streak retention phase 1 (in-app)","done","#249",""),
 ("infra","React PWA on GitHub Pages (installable)","done","",""),
 ("infra","Firebase (Google auth, Firestore, Blaze)","done","",""),
 ("lessons","List your own openings not yet in the library","openY","","You still owe me this list."),
 ("coach","Coach avatar redesign","openY","","My mockups weren't app-grade; send art or pick an open set."),
 ("polish","Chess.com-style redesign (structure borrow, dark+green identity)","part","#281","Q1-Q9 LOCKED. #280 roadmap scenery (all themes). #281 filled control icons + in-game bar for vs Computer/pass-and-play (Moves/Back/Forward/Hint/Flip/More + More sheet + compact ticker). NEXT: same bar for Online, review/puzzle control icons, bottom tab bar, Discover tiles, streak+XP, home tidy."),
 ("polish","Custom piece art (theme phase 2)","openY","","My mockups weren't app-grade; send art or pick an open set."),
 ("polish","iPad two-column landscape Home","openY","#278","Mockups built (3 layouts A/B/C) - open ipad-home-mockups.html and tap one; I'll build it."),
 ("money","Recreate Stripe TEST prices at $2.99/$19.99","openY","","Current test IDs are old $0.99/$9.99."),
 ("money","Run Stripe 4242 test checkout","openY","",""),
 ("infra","Sign-in persistence on installed iOS PWA","open","","Known WebKit storage-partitioning; real fix needs device testing. Safari works now."),
 ("infra","Buy gambitcoach.com domain","openY","","~$10.46 at Cloudflare."),
 ("infra","Closed-app streak push (FCM VAPID key)","openY","","Biggest retention gap."),
 ("infra","Photo-to-board: app-side built; needs scanBoard function","openY","#127","App capture/upload/render done #127; deploy the Cloud Function + vision API key."),
 ("infra","Legal pages (privacy + terms)","openY","",""),
]
TASKS=[]
for g,t,s,b,n in T:
    you=s.endswith("Y"); s=s[:-1] if you else s
    TASKS.append({"g":g,"t":t,"s":s,"you":you,"b":b,"n":n})
QUESTIONS=[
 {"id":"ipadhome","q":"iPad landscape Home - which layout should I build? (see ipad-home-mockups.html)","o":["A - Spotlight + grid","B - Sidebar + dashboard","C - Hero + two columns"]},
 {"id":"videos","q":"Lesson videos - keep auto-adding curated YouTube IDs in batches?","o":["Yes, keep adding in batches","I'll curate them myself"]},
]
edt=(datetime.datetime.now(datetime.timezone.utc)-datetime.timedelta(hours=4)).strftime("%Y-%m-%d %-I:%M %p")
stamp="Snapshot "+edt+" EDT - live build #295"
HTML=r'''<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Chess Trainer - plan</title><style>
:root{--bg:#14171c;--card:#1c2027;--line:rgba(255,255,255,.08);--tx:#e8eaee;--dim:rgba(255,255,255,.58);--r:12px;--ac:#2c5f8a}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--tx);font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;padding:18px 14px 100px}
h1{font-size:20px;margin:0 0 2px}h2{font-size:15px;margin:18px 0 8px}
.stamp{color:var(--dim);font-size:12.5px;margin-bottom:10px}
.intro{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:11px 13px;font-size:13px;color:var(--dim);margin-bottom:16px;line-height:1.5}
.q{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:11px 13px;margin-bottom:10px}
.qt{font-size:14px;font-weight:600;margin-bottom:8px}
.opts{display:flex;gap:7px;flex-wrap:wrap}
.opt{border:1px solid var(--line);background:#222730;color:var(--tx);border-radius:10px;padding:8px 12px;font-size:13px;cursor:pointer}
.opt.sel{background:#2c6e3f;border-color:#2c6e3f;color:#fff;font-weight:600}
.chips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
.chip{border:1px solid var(--line);background:var(--card);color:var(--tx);border-radius:18px;padding:7px 14px;font-size:13px;cursor:pointer}
.chip.on{background:var(--ac);border-color:var(--ac)}
.grp{margin-bottom:18px}.gh{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600;margin:0 0 8px}
.gdot{width:10px;height:10px;border-radius:50%}
.task{background:var(--card);border:1px solid var(--line);border-left-width:3px;border-radius:var(--r);padding:10px 12px;margin-bottom:8px}
.trow{display:flex;align-items:flex-start;gap:8px}.tt{flex:1;font-size:14px;font-weight:550}
.pill{font-size:10.5px;border-radius:8px;padding:2px 8px;font-weight:700;white-space:nowrap;margin-top:1px}
.p-open{background:rgba(123,209,255,.16);color:#7bd1ff}.p-part{background:rgba(224,184,90,.16);color:#e0b85a}.p-done{background:rgba(74,103,65,.5);color:#9fd28f}
.you{font-size:10.5px;border-radius:8px;padding:2px 8px;font-weight:700;background:rgba(224,90,90,.18);color:#f0a0a0;margin-top:1px;white-space:nowrap}
.bb{font-size:10.5px;color:var(--dim);margin-top:1px;white-space:nowrap}.nn{color:var(--dim);font-size:12.5px;margin-top:5px}
.pick{margin-top:8px;border:1px solid #3a6e8a;background:transparent;color:#9bd0f0;border-radius:9px;padding:6px 11px;font-size:12.5px;font-weight:600;cursor:pointer}
.pick.on{background:#2c5f8a;border-color:#2c5f8a;color:#fff}.num{display:inline-block;min-width:15px}
.bar{position:fixed;left:0;right:0;bottom:0;background:rgba(20,23,28,.97);border-top:1px solid var(--line);padding:10px 14px calc(env(safe-area-inset-bottom,0px) + 10px);display:flex;align-items:center;gap:10px}
.cnt{flex:1;font-size:12.5px;color:var(--dim)}
.cpy{border:none;background:linear-gradient(135deg,#6ea8fe,#3b76e8);color:#fff;border-radius:11px;padding:11px 18px;font-size:14px;font-weight:700;cursor:pointer}
</style></head><body>
<h1>Chess Trainer - plan</h1><div class="stamp">__STAMP__</div>
<div class="intro">Tap <b>+ Build next</b> on the open items you want me to do, in the order you want them (the number is priority). Answer the decisions. Then tap <b>Copy my plan</b> and paste it back to me.</div>
<div id="qsec"></div><div class="chips" id="chips"></div><div id="root"></div>
<div class="bar"><div class="cnt" id="cnt"></div><button class="cpy" id="cpy">Copy my plan</button></div>
<script>
const GROUPS=__GROUPS__,TASKS=__TASKS__,QUESTIONS=__QUESTIONS__;
const picks=[],answers={};let filt="all";
const FILTS=[["all","All"],["open","To build"],["you","Needs you"],["done","Done"]];
function esc(x){return String(x||"").replace(/&/g,"&amp;").replace(/</g,"&lt;");}
function pill(s){return s==="open"?'<span class="pill p-open">OPEN</span>':s==="part"?'<span class="pill p-part">IN PROGRESS</span>':'<span class="pill p-done">DONE</span>';}
function able(t){return (t.s==="open"&&!t.you)||t.s==="part";}
function pass(t){if(filt==="all")return true;if(filt==="you")return t.you&&t.s!=="done";if(filt==="open")return able(t);return t.s===filt;}
function qr(){var q=document.getElementById("qsec");q.innerHTML='<h2>Decisions</h2>'+QUESTIONS.map(function(Q){return '<div class="q"><div class="qt">'+esc(Q.q)+'</div><div class="opts">'+Q.o.map(function(o){return '<button class="opt'+(answers[Q.id]===o?' sel':'')+'" data-q="'+Q.id+'" data-o="'+esc(o)+'">'+esc(o)+'</button>';}).join('')+'</div></div>';}).join('');q.querySelectorAll('.opt').forEach(function(b){b.onclick=function(){answers[b.dataset.q]=b.dataset.o;qr();cnt();};});}
function tr(){var root=document.getElementById("root");root.innerHTML="";GROUPS.forEach(function(g){var ts=TASKS.filter(function(t){return t.g===g.key&&pass(t);});if(!ts.length)return;var d=document.createElement("div");d.className="grp";d.innerHTML='<div class="gh"><span class="gdot" style="background:'+g.color+'"></span>'+esc(g.nm)+'</div>'+ts.map(function(t){var i=TASKS.indexOf(t);var pi=picks.indexOf(i);return '<div class="task" style="border-left-color:'+g.color+'"><div class="trow"><div class="tt">'+esc(t.t)+'</div>'+pill(t.s)+(t.you&&t.s!=="done"?'<span class="you">NEEDS YOU</span>':'')+(t.b?'<span class="bb">'+esc(t.b)+'</span>':'')+'</div>'+(t.n?'<div class="nn">'+esc(t.n)+'</div>':'')+(able(t)?'<button class="pick'+(pi>=0?' on':'')+'" data-i="'+i+'">'+(pi>=0?'<span class="num">'+(pi+1)+'.</span> Queued':'+ Build next')+'</button>':'')+'</div>';}).join('');root.appendChild(d);});root.querySelectorAll('.pick').forEach(function(b){b.onclick=function(){var i=+b.dataset.i;var at=picks.indexOf(i);if(at>=0)picks.splice(at,1);else picks.push(i);tr();cnt();};});}
function chips(){var c=document.getElementById("chips");c.innerHTML="";FILTS.forEach(function(f){var b=document.createElement("button");b.className="chip"+(filt===f[0]?" on":"");b.textContent=f[1];b.onclick=function(){filt=f[0];chips();tr();};c.appendChild(b);});}
function cnt(){var na=Object.keys(answers).length;document.getElementById("cnt").textContent=picks.length+" queued \u00b7 "+na+"/"+QUESTIONS.length+" answered";}
function plan(){var s="[Chess Trainer plan]\nBuild next (in order):\n";if(picks.length)picks.forEach(function(i,n){s+=(n+1)+". "+TASKS[i].t+"\n";});else s+="(none picked)\n";s+="\nDecisions:\n";QUESTIONS.forEach(function(Q){s+="- "+Q.q+" => "+(answers[Q.id]||"(no answer)")+"\n";});return s;}
document.getElementById("cpy").onclick=function(){var txt=plan(),ok=false;try{navigator.clipboard.writeText(txt);ok=true;}catch(e){}if(!ok){try{var ta=document.createElement("textarea");ta.value=txt;ta.style.position="fixed";ta.style.opacity="0";document.body.appendChild(ta);ta.focus();ta.select();ok=document.execCommand("copy");document.body.removeChild(ta);}catch(e){}}if(ok){var b=document.getElementById("cpy");b.textContent="Copied!";setTimeout(function(){b.textContent="Copy my plan";},1600);}else{prompt("Copy this and paste it back to me:",txt);}};
qr();chips();tr();cnt();
</script></body></html>'''
html=HTML.replace("__STAMP__",stamp).replace("__GROUPS__",json.dumps(GROUPS)).replace("__TASKS__",json.dumps(TASKS)).replace("__QUESTIONS__",json.dumps(QUESTIONS))
assert "__" not in html.replace("__STAMP__","X"), "placeholder leftover"
for ph in ["__GROUPS__","__TASKS__","__QUESTIONS__","__STAMP__"]: assert ph not in html
open("chess-tracker.html","w",encoding="utf-8").write(html)
print("buildable open items:",sum(1 for t in TASKS if (t["s"]=="open" and not t["you"]) or t["s"]=="part"))
print("questions:",len(QUESTIONS),"| html bytes:",len(html))
