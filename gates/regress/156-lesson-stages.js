// regress/156-lesson-stages.js   THE STAGE LESSON: a technique taught as stages, each move judged on the board by the stage's own test.
// #550, jobs/lessons-teach-the-finish-not-the-method-2026-09-24 (its remainder: "the lesson schema still cannot express a technique: one
// fixed line, with no stages, no progress test and no free defender"). Built in its smallest checkable form: a `stages` field in
// lessons.js, the stage player in chess.jsx (stageBox / stageVerdict / stageHint / stageMove), and ONE worked example, "Queen Mate: the
// Box Method" (king and queen against king). Two Bishops was not taken: its free-defender engine test is calibrated on a 300ms search and
// falsely rejects correct engine moves on this machine, so it cannot carry a test that must be reliable. TC-LS-070..074.
//
// WHAT IT GUARDS
//   TC-LS-070 (node) the schema: exactly one lesson carries `stages`, it is the worked example, every stage has a name, a goal, a rule, a
//             keep list of known tests and a done test, and the last stage's done is mate. No other lesson changes format.
//   TC-LS-071 (node) the progress test, PINNED TO THE BOARD rather than to the code under test: after 1.Qe4 the king's box is exactly the
//             twelve squares listed below (read off the board by hand: files a-d, ranks 5-8, less the queen's diagonal b7, c6, d5 and a8),
//             and the gate's own flood (written here, not read from chess.jsx) agrees with stageBox on every position of the book line and of
//             the refusal positions. The book line replays: every white move passes its stage, every black move is the reply the app's
//             defender actually gives, stage 1 closes at 6.Kc4 (ply 11) and 7.Qb4 mates. A non-book move (2.Ke2) passes; 2.Qe2 is refused
//             because the box grows 12 -> 20; in stage 2, Qd5 is refused because the king can reach b2, off the edge; and where NO move can
//             keep the rule the rule is relaxed rather than leaving the learner without a move.
//   TC-LS-072 (browser, 375x761) a flawless run that leaves the book on move 2 (Ke2 for Kd2) is ACCEPTED move after move, the lone king
//             answers with legal moves of its own, stage 2 opens on screen, the run mates and banks the day.
//   TC-LS-073 (browser, 375x761) the refusals, with their reasons as the board shows them: 2.Qe2 "its box grows from 12 squares to 20",
//             stage 2's Qd5 "it can reach b2", Qc5 stalemate; the board does not move on any of them, and the run banks nothing. Off the
//             book the hint paints the stage's own move (Kd3 after 2.Ke2 Kd6).
//   TC-LS-074 (browser, 375x761) THE OLD LESSONS PLAY AS BEFORE: King & Queen Mate (scripted, no stages) opens practice with no stage text,
//             refuses the safe non-book Qd3 (guarded by the king) with the board unmoved, and accepts its book Qd8.
//
// CONTROLS: CT_APP trial bundles (one change each to chess.jsx), CT_SRC for the node layer, CT_LESSONS for the schema lines. Every one of
// the 32 assertions is red under at least one record below. Baseline on the trial ecbe2f65a71a (chess.jsx 88ca01b7a240 = 16e5a75): 32 pass /
// 0 fail, twice. Under the scripted controls (NC1, NC5) the TC-LS-073 lines read "not legal here": the gate's player follows the lone king's
// answers from the note, and a scripted run prints none, so the board it tracks stops - red for the right cause (no stage play), named here.
// CONTROL-RECORD: 68b829c 2026-11-13 total=22 red=14 scope=trial:64d439092772 how=NC5 THE SUBJECT REMOVED: the branch tip e28dc81's app.js and chess.jsx (CT_SRC) before the stage player - TC-LS-071 PRECONDITION red (no stage functions, so its ten node lines do not run, hence total 22), every TC-LS-072 and TC-LS-073 line red; the lesson practises as a script
// CONTROL-RECORD: 68b829c 2026-11-13 total=32 red=13 scope=trial:72f90331de97 how=NC1 startPractice's _stg forced false, so the stage lesson practises the script - every TC-LS-072 line and every TC-LS-073 line red (Ke2 refused as not the line, no stage note, no hint Kd3)
// CONTROL-RECORD: 68b829c 2026-11-13 total=32 red=7 scope=trial:0754f9e44185+env:CT_SRC=nc2.jsx how=NC2 stageKeepFail returns null (both keep tests off), bundle and CT_SRC - TC-LS-071 Qe2 refused / Qd5 refused / relaxed red, TC-LS-073 Qe2 ACCEPTED ("Its box: 20 squares") and the run's later lines red
// CONTROL-RECORD: 68b829c 2026-11-13 total=32 red=2 scope=trial:69051aa642a0 how=NC3 the OLD LESSONS CHANGE FORMAT: every lesson with a fen practises free (on: ...||!!op.fen) - TC-LS-074 Qd3 accepted in King & Queen Mate, and its book Qd8 never reached
// CONTROL-RECORD: 68b829c 2026-11-13 total=32 red=1 scope=trial:8435816ec142 how=NC7 the stage intro is written into every lesson's practice - TC-LS-074 "no stage text" red in King & Queen Mate
// CONTROL-RECORD: 68b829c 2026-11-13 total=32 red=1 scope=trial:7afe84df0fad how=NC6 a stage refusal no longer marks the run (learnRepRef miss) - TC-LS-073 "banks nothing" red: the run with two stage refusals banked a day
// CONTROL-RECORD: 68b829c 2026-11-13 total=32 red=3 scope=env:CT_LESSONS=nc4-lessons.js how=NC4 lessons.js with stages added to King & Queen Mate and the worked example's stage 1 rule removed - all three TC-LS-070 schema lines red
// CONTROL-RECORD: 68b829c 2026-11-13 total=32 red=4 scope=env:CT_LESSONS=none.js how=NC11 a lessons path that does not exist - TC-LS-070 PRECONDITION red and the three schema lines with it
// CONTROL-RECORD: 68b829c 2026-11-13 total=32 red=5 scope=env:CT_SRC=nc8.jsx how=NC8 stageBox floods orthogonally only - TC-LS-071 the twelve-square pin, the gate's-flood agreement (4 of 7), Ke2 passes, Qe2 12->20 and the relaxed line red
// CONTROL-RECORD: 68b829c 2026-11-13 total=32 red=1 scope=env:CT_SRC=nc9.jsx how=NC9 freeFallbackReply plays the first legal move - TC-LS-071 "every black move is the defender's reply" red (ply 2 Kc7)
// CONTROL-RECORD: 68b829c 2026-11-13 total=32 red=1 scope=env:CT_SRC=nc10.jsx how=NC10 freeSyncVerdict's stalemate arm removed - TC-LS-071 "Qc5 is refused as stalemate" red
// CONTROL-RECORD: 68b829c 2026-11-13 total=32 red=1 scope=env:CT_SRC=nc12.jsx how=NC12 stageEdge always false - TC-LS-071 "stage 1 closes at 6.Kc4" red (closedAt null)
// CONTROL-RECORD: 68b829c 2026-11-13 total=32 red=3 scope=env:CT_SRC=nc13.jsx how=NC13 the box keep refuses an equal box (>= for >) - TC-LS-071 book line passes (ply 3 relaxed), Ke2 passes and Qe2 refused red
'use strict';
const L=require('../lib');
const D=require('../drive/lesson');
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..','..');
const NAME='Queen Mate: the Box Method';
const START='8/8/3k4/8/8/8/8/4K2Q w - - 0 1';
const BOOK=['Qe4','Kc5','Kd2','Kd6','Kc3','Kc5','Qe6','Kb5','Qd6','Ka5','Kc4','Ka4','Qb4#'];
const BOX_QE4=['a5','a6','a7','b5','b6','b8','c5','c7','c8','d6','d7','d8'];

function stageHelpers(){
  const E=require('../engine-extract.js');
  const src=fs.readFileSync(process.env.CT_SRC||path.join(ROOT,'chess.jsx'),'utf8').split('\n');
  const want=['freeHangs','freeSyncVerdict','freeFallbackReply','stageBox','stageRim','stageEdge','stageKeepFail','stageVerdict','stageHint','stageIntro','stageKey'];const out={};
  const starts=[];for(let i=0;i<src.length;i++)if(/^(async\s+function|function|const|let|var)\s/.test(src[i]))starts.push(i);
  for(let s=0;s<starts.length;s++){const m=/^(?:function|const)\s+([A-Za-z_$][\w$]*)/.exec(src[starts[s]]);if(m&&want.includes(m[1]))out[m[1]]=src.slice(starts[s],s+1<starts.length?starts[s+1]:src.length).join('\n');}
  if(want.some(n=>!out[n]))return {missing:want.filter(n=>!out[n]),E};
  const code=want.map(n=>out[n]).join('\n')+'\nreturn {'+want.join(',')+'};';
  const H=new Function('opp','isAttacked','FILES','getStatus','getLegal','findKing','makeMove',code)(E.opp,E.isAttacked,E.FILES,E.getStatus,E.getLegal,E.findKing,E.makeMove);
  return {H,E};
}
const sanOf=(E,g,m)=>E.toSAN(g,m,E.applyMove(g.board,m));
const bySan=(E,g,san)=>E.getLegal(g).find(m=>E.cleanSAN(sanOf(E,g,m))===E.cleanSAN(san))||null;
const sqs=(E,m)=>[E.FILES[m.fc]+(8-m.fr),E.FILES[m.tc]+(8-m.tr)];
// THE GATE'S OWN BOX: every square the black king can step to, square by square, that no white piece attacks with the king lifted off.
// Written here from the definition so stageBox is checked against something that is not itself.
function ownBox(E,board){const b=board.map(r=>r.slice());let k=null;for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(b[r][c]&&b[r][c].c==='b'&&b[r][c].t==='k'){k=[r,c];b[r][c]=null;}
  const ok=(r,c)=>!b[r][c]&&!E.isAttacked(b,r,c,'w');const seen={},res=[];const st=[k];seen[k[0]*8+k[1]]=1;if(ok(k[0],k[1]))res.push(k);
  while(st.length){const [r,c]=st.pop();for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){const nr=r+dr,nc=c+dc;if(nr<0||nr>7||nc<0||nc>7||seen[nr*8+nc])continue;seen[nr*8+nc]=1;if(ok(nr,nc)){res.push([nr,nc]);st.push([nr,nc]);}}}
  return res.map(([r,c])=>'abcdefgh'[c]+(8-r)).sort();}
const loadLessons=()=>{const LP=process.env.CT_LESSONS||path.join(ROOT,'lessons.js');try{const ctx={};new Function('window',fs.readFileSync(LP,'utf8'))(ctx);const C=ctx.CTLESSONS;return [].concat(C.OPENINGS||[],C.ENDGAMES||[],C.MORE||[]);}catch(e){return [];}};

// ── page helpers ──
const position=(b)=>b.page.evaluate(()=>{
  const g=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).sort((a,c)=>c.getBoundingClientRect().width-a.getBoundingClientRect().width)[0];
  if(!g)return null;const h=(s)=>{let x=5381;for(let i=0;i<s.length;i++)x=((x*33)^s.charCodeAt(i))>>>0;return x.toString(36)[0];};
  return [...g.children].slice(0,64).map(k=>{const im=k.querySelector('img');return im?h(im.getAttribute('src')||''):'.';}).join('');});
const hintSquares=(b)=>b.page.evaluate(()=>{
  const g=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).sort((a,c)=>c.getBoundingClientRect().width-a.getBoundingClientRect().width)[0];
  if(!g)return null;const kids=[...g.children].slice(0,64);const bl=kids[56]?(kids[56].innerText||''):'',br=kids[63]?(kids[63].innerText||''):'';
  const flip=/h/.test(bl)&&!/a/.test(bl)?true:(/a/.test(br)&&!/h/.test(br)?true:false);
  const nm=(i)=>{const c=i%8,rw=Math.floor(i/8);const f=flip?7-c:c,r=flip?rw:7-rw;return String.fromCharCode(97+f)+(r+1);};
  const out=[];kids.forEach((k,i)=>{if([...k.children].some(d=>d.style&&d.style.background==='rgba(255, 200, 30, 0.75)'))out.push(nm(i));});return out.sort();});
const learnDays=(b,name)=>b.page.evaluate((n)=>{try{const p=JSON.parse(localStorage.getItem('ct_learnprog')||'{}');const c=p[n];return c&&Array.isArray(c.days)?c.days.length:0;}catch(e){return -1;}},name);
// Tap one white move and wait until the lone king has answered (the note stops saying it is moving), or a refusal shows.
async function tapMove(b,E,g,m){const [f,t]=sqs(E,m);await b.move(f,t,150);let n='';for(let i=0;i<40;i++){n=(await D.noteText(b))||'';if(!/is moving/.test(n))break;await b.page.waitForTimeout(150);}await b.settle(200);return n;}
async function openPractice(b,re){await D.openLesson(b,'Endgames',re);await D.startDemoPaused(b);await D.toEnd(b);await D.tapBtn(b,/^(✋ Now I'll try it|Now I'll try it)$/,700);}

L.run(async()=>{
  const X=stageHelpers();const E=X.E;
  // ════════ TC-LS-070: the schema ════════
  {const all=loadLessons();const st=all.filter(o=>o&&o.stages!=null);const op=st[0];
   L.say(all.length>100,'TC-LS-070 PRECONDITION lessons.js loads ('+all.length+' lessons)');
   L.say(st.length===1&&op.name===NAME,'TC-LS-070 exactly one lesson carries stages, and it is "'+NAME+'" - no other lesson changes format',st.map(o=>o.name));
   const okSt=!!op&&Array.isArray(op.stages)&&op.stages.length>=2&&op.stages.every(s=>s&&s.name&&s.goal&&s.rule&&Array.isArray(s.keep)&&s.keep.length&&s.keep.every(k=>k==='box'||k==='edge')&&(s.done==='edge'||s.done==='mate'));
   L.say(okSt&&op.stages[op.stages.length-1].done==='mate','TC-LS-070 every stage has a name, a goal, a rule, keep tests from {box, edge} and a done test, and the last stage ends in mate',op&&op.stages);
   L.say(!!op&&op.fen===START&&JSON.stringify(op.line)===JSON.stringify(BOOK)&&Array.isArray(op.notes)&&op.notes.length===BOOK.length,'TC-LS-070 the worked example starts from '+START+' and its demo line is the 13 plies this gate replays, each with a note',op&&{fen:op.fen,line:op.line});}

  // ════════ TC-LS-071: the progress test, on the board ════════
  L.say(!!X.H,'TC-LS-071 PRECONDITION chess.jsx declares the stage functions',X.missing||null);
  const ST=(loadLessons().find(o=>o&&o.name===NAME)||{}).stages||[{keep:['box'],done:'edge'},{keep:['edge'],done:'mate'}];
  if(X.H){const {H}=X;
    let g=E.fromFEN(START),si=0,agree=0,cmp=0,allPass=true,repliesMatch=true,closedAt=null,mated=false;const why=[];
    const g1=E.makeMove(g,bySan(E,g,'Qe4'));
    L.say(JSON.stringify(H.stageBox(g1.board,'b'))===JSON.stringify(BOX_QE4)&&JSON.stringify(ownBox(E,g1.board))===JSON.stringify(BOX_QE4),'TC-LS-071 after 1.Qe4 the box is exactly the twelve squares read off the board ('+BOX_QE4.join(' ')+'), by stageBox and by the gate\'s own flood',{stageBox:H.stageBox(g1.board,'b'),own:ownBox(E,g1.board)});
    for(let i=0;i<BOOK.length;i++){const m=bySan(E,g,BOOK[i]);if(!m){allPass=false;why.push('ply '+(i+1)+' illegal');break;}const ng=E.makeMove(g,m);
      if(i%2===0){const sv=H.freeSyncVerdict(ng);if(sv.mate){mated=i===BOOK.length-1;}else{const v=H.stageVerdict(ST[si],g,ng);if(!v.ok||v.relaxed){allPass=false;why.push('ply '+(i+1)+' '+JSON.stringify(v));}if(v.done){closedAt=i+1;si++;}}
        cmp++;if(JSON.stringify(H.stageBox(ng.board,'b'))===JSON.stringify(ownBox(E,ng.board)))agree++;
        if(!sv.mate){const rp=H.freeFallbackReply(ng);if(!rp||E.cleanSAN(sanOf(E,ng,rp))!==E.cleanSAN(BOOK[i+1]||'')){repliesMatch=false;why.push('ply '+(i+2)+' defender plays '+(rp&&sanOf(E,ng,rp)));}}}
      g=ng;}
    L.say(allPass,'TC-LS-071 every white move of the book line passes its stage\'s test, none by relaxation',why);
    L.say(repliesMatch,'TC-LS-071 every black move of the book line is the reply the app\'s defender gives (the demo is what practice plays)',why);
    L.say(closedAt===11&&mated,'TC-LS-071 stage 1 closes at 6.Kc4 (ply 11: the king can reach only a4 and a5) and 7.Qb4 is mate',{closedAt,mated});
    L.say(cmp>=7&&agree===cmp,'TC-LS-071 the gate\'s own flood agrees with stageBox on all '+cmp+' positions after a book white move',{agree,cmp});
    const p2=E.makeMove(g1,bySan(E,g1,'Kc5'));
    const ke2=E.makeMove(p2,bySan(E,p2,'Ke2')),qe2=E.makeMove(p2,bySan(E,p2,'Qe2'));
    const vK=H.stageVerdict(ST[0],p2,ke2),vQ=H.stageVerdict(ST[0],p2,qe2);
    L.say(vK.ok===true&&!vK.relaxed&&vK.size===12&&ownBox(E,ke2.board).length===12,'TC-LS-071 the NON-book 2.Ke2 (the book plays Kd2) passes stage 1: the box stays 12 (gate\'s flood: '+ownBox(E,ke2.board).length+')',vK);
    L.say(vQ.ok===false&&vQ.why==='box'&&vQ.from===12&&vQ.to===20&&ownBox(E,qe2.board).length===20,'TC-LS-071 2.Qe2 is refused: the box grows from 12 to 20 (gate\'s flood: '+ownBox(E,qe2.board).length+')',vQ);
    const s2=E.fromFEN('8/8/3Q4/8/k1K5/8/8/8 w - - 0 7');const qd5=E.makeMove(s2,bySan(E,s2,'Qd5'));const vE=H.stageVerdict(ST[1],s2,qd5);const ob=ownBox(E,qd5.board);
    L.say(vE.ok===false&&vE.why==='edge'&&vE.sq==='b2'&&ob.includes('b2'),'TC-LS-071 stage 2 (after 6.Kc4 Ka4): Qd5 is refused because the king can reach b2, off the edge (b2 is in the gate\'s flood: '+ob.join(' ')+')',vE);
    const vM=H.freeSyncVerdict(E.makeMove(s2,bySan(E,s2,'Qb4')));const vS=H.freeSyncVerdict(E.makeMove(s2,bySan(E,s2,'Qc5')));
    L.say(vM.mate===true&&vS.ok===false&&vS.why==='stalemate','TC-LS-071 there, Qb4 is mate and Qc5 is refused as stalemate',{vM,vS});
    // Kc6, Qe2 against Kd4: every legal safe white move grows the box (the gate counts them with its own flood), so the rule cannot be kept
    // and the stage relaxes it for that move rather than refusing every move on the board.
    const dl=E.fromFEN('8/8/2K5/8/3k4/8/4Q3/8 w - - 0 2');const b0=ownBox(E,dl.board).length;let safe=0,grow=0;
    for(const m of E.getLegal(dl)){const n2=E.makeMove(dl,m);if(!H.freeSyncVerdict(n2).ok)continue;safe++;if(ownBox(E,n2.board).length>b0)grow++;}
    const anyM=E.getLegal(dl).find(m=>H.freeSyncVerdict(E.makeMove(dl,m)).ok);const vR=anyM&&H.stageVerdict(ST[0],dl,E.makeMove(dl,anyM));
    L.say(safe>0&&grow===safe&&!!vR&&vR.ok===true&&vR.relaxed===true,'TC-LS-071 where every one of the '+safe+' safe moves grows the box ('+grow+' grow, by the gate\'s flood) the rule is relaxed, not a dead end',vR);
  }

  // ════════ browser ════════ each block runs in its own launch and a throw is its own red, so one missing control cannot hide the rest
  const geo='kunal761';
  const block=async(tag,name,fn)=>{let b=null;try{b=await L.launch({geo,name});await b.open();await fn(b);}catch(e){L.say(false,tag+' could not run to the end: '+String(e&&e.message||e).slice(0,160));}finally{if(b)try{await b.close();}catch(e){}}};
  // play a white move by SAN and take the lone king's answer from the note; a move that is not legal here is reported, never tapped
  const mkPlayer=(b)=>{const P={g:E.fromFEN(START)};
    P.play=async(san)=>{const m=bySan(E,P.g,san);if(!m)return '(not legal here: '+san+')';const n=await tapMove(b,E,P.g,m);if(/^✗/.test(n))return n;P.g=E.makeMove(P.g,m);const rs=(n.match(/answers (\S+?)\./)||[])[1];const rm=rs&&bySan(E,P.g,rs);if(rm)P.g=E.makeMove(P.g,rm);return n;};
    P.refuse=async(san)=>{const m=bySan(E,P.g,san);if(!m)return {n:'(not legal here: '+san+')',same:false};const p0=await position(b);const n=await tapMove(b,E,P.g,m);const p1=await position(b);return {n,same:p0===p1&&p0!=null};};
    return P;};
  // TC-LS-072: a flawless off-book run to mate
  await block('TC-LS-072','g156-run',async(b)=>{L.note(geo+': bundle stamp '+(await b.stamp()));
   await openPractice(b,/^Queen Mate: the Box Method$/);
   const t0=(await D.noteText(b))||'';
   L.say(/Stage 1 of 2 · Box it in: drive the king to the edge/.test(t0),'TC-LS-072 practice opens on stage 1\'s goal',t0);
   const W=['Qe4','Ke2','Kd3','Qd4+','Kc3','Qd6','Kc4','Qb4#'];let g=E.fromFEN(START),accepted=0,legalReplies=0,last='',keNote='',stNote='';const replies=[];
   for(let i=0;i<W.length;i++){const m=bySan(E,g,W[i]);if(!m)break;const p0=await position(b);last=await tapMove(b,E,g,m);const p1=await position(b);
     if(i===1)keNote=last;if(/Stage 1 done\./.test(last))stNote=last;
     if(!(new RegExp('^(✓|🎉) '+W[i].replace(/[+#]/g,'\\$&')).test(last))||p0===p1)break;accepted++;
     g=E.makeMove(g,m);if(/ is checkmate!/.test(last))break;
     const rs=(last.match(/answers (\S+?)\./)||[])[1];const rm=rs&&bySan(E,g,rs);if(!rm)break;legalReplies++;replies.push(rs);g=E.makeMove(g,rm);}
   L.say(/^✓ Ke2 — the king answers/.test(keNote),'TC-LS-072 the non-book 2.Ke2 (the book plays Kd2) is ACCEPTED and the king answers',keNote);
   L.say(accepted===W.length,'TC-LS-072 all '+W.length+' moves of the off-book run are accepted ('+accepted+')',last);
   L.say(legalReplies===W.length-1,'TC-LS-072 the lone king answers every move with a legal move of its own ('+replies.join(' ')+')',replies);
   L.say(/^✓ Kc4 — the king answers Ka4\. Stage 1 done\. Stage 2 of 2 · Mate on the edge/.test(stNote),'TC-LS-072 after 7.Kc4 Ka4 (the king can reach only a4 and a5) the note closes stage 1 and opens stage 2',stNote);
   L.say(/ is checkmate!/.test(last)&&E.getStatus(g)==='checkmate','TC-LS-072 the run ends in a checkmate the board bears out',last);
   L.say(/Flawless/.test(last)&&(await learnDays(b,NAME))===1,'TC-LS-072 the flawless run banks the day (ct_learnprog: '+(await learnDays(b,NAME))+')',last);
   await b.shot('g156-mate');});

  // TC-LS-073: the refusals, and the hint off the book
  await block('TC-LS-073','g156-refuse',async(b)=>{
   await openPractice(b,/^Queen Mate: the Box Method$/);const P=mkPlayer(b);
   await P.play('Qe4');
   const r1=await P.refuse('Qe2');
   L.say(/^✗ Qe2 lets the king out: its box grows from 12 squares to 20\./.test(r1.n)&&r1.same,'TC-LS-073 2.Qe2 is refused with the box it opens (12 squares to 20) and the board does not move',r1.n);
   for(const s of ['Kd2','Kc3','Qe6','Qd6'])await P.play(s);
   const n6=await P.play('Kc4');
   L.say(/Stage 1 done\. Stage 2 of 2/.test(n6),'TC-LS-073 PRECONDITION the book reaches stage 2 at 6.Kc4 Ka4',n6);
   const r2=await P.refuse('Qd5');
   L.say(/^✗ Qd5 lets the king off the edge: it can reach b2\./.test(r2.n)&&r2.same,'TC-LS-073 stage 2: Qd5 is refused because the king can reach b2, and the board does not move',r2.n);
   const n7=await P.play('Qb4#');
   L.say(/ is checkmate!/.test(n7)&&(await learnDays(b,NAME))===0,'TC-LS-073 the run still mates, and with the two stage refusals in it (and nothing else refused) it banks nothing (ct_learnprog: '+(await learnDays(b,NAME))+')',n7);});
  await block('TC-LS-073 stalemate','g156-stalemate',async(b)=>{
   await openPractice(b,/^Queen Mate: the Box Method$/);const P=mkPlayer(b);
   for(const s of ['Qe4','Kd2','Kc3','Qe6','Qd6','Kc4'])await P.play(s);
   const r3=await P.refuse('Qc5');
   L.say(/^✗ Qc5 is stalemate/.test(r3.n)&&r3.same,'TC-LS-073 stage 2 (6.Kc4 Ka4): Qc5 is refused as stalemate and the board does not move',r3.n);});
  await block('TC-LS-073 hint','g156-hint',async(b)=>{
   await openPractice(b,/^Queen Mate: the Box Method$/);const P=mkPlayer(b);
   for(const s of ['Qe4','Ke2'])await P.play(s);
   await D.tapBtn(b,/^Hints$/,400);const hs=await hintSquares(b);
   L.say(E.toFEN(P.g).split(' ')[0]==='8/8/3k4/8/4Q3/8/4K3/8'&&!!hs&&hs.join(',')==='d3,e2','TC-LS-073 off the book (2.Ke2 Kd6) the hint paints the stage\'s move Kd3 (e2, d3), which keeps the box at 12 and brings the king',{hs,fen:E.toFEN(P.g)});});

  // TC-LS-074: the old lessons play as before
  await block('TC-LS-074','g156-old',async(b)=>{
   await openPractice(b,/^King & Queen Mate$/);
   const t0=(await D.noteText(b))||'';
   L.say(!/Stage \d/.test(t0),'TC-LS-074 King & Queen Mate (no stages) opens practice with no stage text',t0);
   const g=E.fromFEN('8/8/4k3/8/4K3/8/3Q4/8 w - - 0 1');
   const p0=await position(b);const n1=await tapMove(b,E,g,bySan(E,g,'Qd3'));const p1=await position(b);
   L.say(/^✗/.test(n1)&&p0===p1,'TC-LS-074 King & Queen Mate still refuses a safe move that is not its line (Qd3, guarded by the king) and the board does not move',n1);
   const n2=await tapMove(b,E,g,bySan(E,g,'Qd8'));
   L.say(/^✓ Qd8/.test(n2),'TC-LS-074 and accepts its book move Qd8',n2);});
  L.done();
},'156-lesson-stages');
