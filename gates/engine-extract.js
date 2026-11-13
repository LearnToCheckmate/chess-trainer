// gates/engine-extract.js  —  #443
// Load the PURE chess engine out of chess.jsx into plain Node, with no browser and no React.
//
// WHY THIS EXISTS, and why it is not another copy of the engine. The brilliancy measurement
// (jobs/brilliant-gate-cannot-fire-on-a-non-sacrifice-only-move-2026-09-30) has to run the SHIPPED
// brilliantGate over real games and compare it against a candidate. Re-implementing the gate in the
// harness would measure the harness; this reads the real declarations out of chess.jsx by balanced
// braces, exactly as gates/unit-drill-why.js does, so the thing under test IS the thing that ships.
//
// THE RULE IT OBEYS, from CLAUDE.md: "a harness that substitutes the thing under test silently will be
// believed." So this module exports `SOURCE_MD5` and every caller prints it. If a run's output does
// not say which chess.jsx it read, it is not evidence.
'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const SRC_PATH=process.env.CT_SRC||path.join(__dirname,'..','chess.jsx');
const src=fs.readFileSync(SRC_PATH,'utf8');
const SOURCE_MD5=crypto.createHash('md5').update(src).digest('hex').slice(0,12);

// Split chess.jsx into top-level declaration blocks: a block starts at a line beginning with
// [async] function/const/let/var at column 0 and runs to the line before the next such line.
// #545 item (91) [jobs/the-grading-helpers-moved-and-the-extraction-instrument-did-not-so-e-classify-throws-on-main-
// 2026-10-08]: `async function` did not start a block, so a top-level async function was absorbed into the body of the
// declaration above it (the job measured analyzeGameCounts swallowed into isBrilliant's block).
const lines=src.split('\n');
const starts=[];
for(let i=0;i<lines.length;i++) if(/^(async\s+function|function|const|let|var)\s/.test(lines[i])) starts.push(i);
const blocks=new Map();   // name -> {text, order}
for(let s=0;s<starts.length;s++){
  const a=starts[s], b=(s+1<starts.length?starts[s+1]:lines.length);
  const m=/^(?:async\s+function|function|const|let|var)\s+([A-Za-z_$][\w$]*)/.exec(lines[a]);
  if(!m) continue;
  if(!blocks.has(m[1])) blocks.set(m[1],{text:lines.slice(a,b).join('\n'),order:a});
}
function need(names){
  const miss=names.filter(n=>!blocks.has(n));
  if(miss.length) throw new Error('engine-extract: not found in '+SRC_PATH+': '+miss.join(', '));
  return names.map(n=>blocks.get(n)).sort((x,y)=>x.order-y.order).map(b=>b.text).join('\n');
}

// The pure engine, in source order. OPENINGS (chess.jsx:203) is deliberately NOT here: it reads
// window.CTLESSONS and nothing below needs it.
// #549 item (28): the last row (PNAME .. styleBias) is the one brilliant rule's sentence and its regrade, with what they read, so
// gate 82 measures the shipped functions and not copies.
const NAMES=['FLAG_KEYS','flagOf','wrongWhy','replyWhy','FILES','rc2sq','inB','opp','initBoard','initGame','fromFEN','toFEN','cloneB','isAttacked','findKing','isInCheck','pseudoMoves',
  'applyMove','getLegal','getMovesFrom','disambig','toSAN','makeMove','getStatus','VAL','mateW','PST',
  'evaluate','makeFast','orderMoves','QDEPTH','quiesce','minimax','evalPawns','cleanSAN','parsePGN',
  'pgnStripLineComments','matchSanLenient','loadSANs','rankMoves','classify','SEEVAL','seeSq','BRIL_FLOOR','BRIL_NEEDED','BRIL_RULE_DEFAULT','BRIL_RULE','BRIL_A','brilHangAge','brilCheckArm','sq2rc','brilliantGate','isBrilliant','nextBestW','missedBrilliant','MISSED_BRIL_DEFAULT','MISS_CLEAR','MISSED_BRIL',
  // #545 item (91): the eleven grading helpers #440 and #491 added. classify reads CLS_BANDS, so without them E.classify()
  // threw "CLS_BANDS is not defined" on every call.
  'winPct','moveAcc','winDrop','classifyByLoss','CLS_BANDS','GRADES2_DEFAULT','GRADES2','GRADE_VER','CLS_BANDS2','FORCED_CLS','BEST_CLS','classifyMove','clsByName','matesMover','mateLadder','DRILL_GRADES','drillGrade','gameAcc',
  'PNAME','brilGiveTxt','forkTargets','forkTxt','brilCardWhy','uciToMove','moveMotifs','moveGist','sfGradePly','brilliantV1ok','_tallyBucket','_tallySplit','BOOK_CLS','effCls','effLabel','gradeHist','START_PLACEMENT','regradeGame','moveHits','bestMove','styleBias',
  // #549 item (97): the mistakes-drill grader and its two sentences, so gate 17 and the disagreement measurement of job (106) run the
  // shipped functions (whyShape is the generator the accept sentence reuses).
  'whyShape','findMoveBySAN','whyBand','DRILL_RANK_DEPTH','_drillRankMax','_drillRank','_drillRankStore','drillRanking','drillRankWarm','DRILL_ACCEPT','gradeDrillMove','drillGradeMsg','drillAcceptMsg','DRILL_GRADE_DEFAULT','DRILL_GRADE',
  // #549 item (35): the brilliancy motif tagger, read by gates/measure-brilliancy-motifs.js and gate 89.
  'BRIL_MOTIF_ORDER','brilMotifs','BRIL_LIB_DEFAULT','BRIL_LIB','BRIL_LIB_MAX','BRIL_KIND_NAME','_brilKindMemo','brilKind',
  // #549 item (98): the opening book - the named-position table, its key, and the Book count the review reads, so gate 87 and
  // gates/opening-book/build.js run the shipped functions (lessonBookPlies takes the lesson list as an argument; the stub window has none).
  'BOOK_TABLE_DEFAULT','BOOK_TABLE','bookKey','_bookSet','bookHas','bookTablePlies','lessonBookPlies','openingBookPlies','BOOK_POS',
  // #550 item (51): the second move a review rated, on a drill card - its switch, so the E0 line of gate 52 reads the shipped default.
  // (No apostrophe in a comment inside this array: gate 79 X1 reads the names between quote marks, and one read a fragment of this line as a name.)
  'REVIEW_TWO_DEFAULT','REVIEW_TWO',
  // #550 hint audit: the concrete reading and the two drill texts it feeds
  'concreteRead','_cheapAttacker','_mateInOne','drillVerdict','mistakeHint','WHY_DRILL_MAXW','ACC_HARM_FLOOR','ACC_SHIFT','pzText','_sanDesc','_pzTxtC','brilHint','mistakeWhy',
  // #550 HEX-T-08: the Brilliant card's refutation line (the review's sacrifice pieces and the card's own taker and sentence)
  'SAC_LINE_MAX','sacTaker','sacLine','sacKeep','refuteTxt','brilTaker','brilRefuteTxt'];

// #545 item (91), the part that stops this recurring: a STALE LIST IS A RED, NOT A SILENCE. For every exported block, any
// identifier that is a top-level declaration of chess.jsx and is NOT in NAMES is a reference this module cannot satisfy,
// so it throws HERE, at require time, naming it - instead of a ReferenceError on first call in whatever caller hits it.
// Comments and string literals are stripped first so a name merely mentioned does not count. Measured at #545: 0 stale
// references with the 51 names below; the pre-#545 list of 40 gives classify -> CLS_BANDS (measured), and a list missing only CLS_BANDS throws naming classify and clsByName.
function staleRefs(names){
  const top=new Set(blocks.keys()), inN=new Set(names), out=[];
  const strip=t=>t.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'')
    .replace(/'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/g,'""');
  for(const n of names){const b=blocks.get(n); if(!b) continue;
    for(const id of new Set(strip(b.text).match(/[A-Za-z_$][\w$]*/g)||[])) if(id!==n&&top.has(id)&&!inN.has(id)) out.push(n+' -> '+id);}
  return out;
}
// A CONTROL SOURCE MAY PREDATE A HELPER, AND THAT IS NOT THE SAME AS A STALE LIST [#546, item (16);
// jobs/gate-68-publishes-a-negative-control-against-half-its-current-size-2026-10-07]. Since #545 item (91) took the
// eleven grading helpers, a pre-fix CT_SRC (gate 68's own control is df79fb7's chess.jsx, which has none of them) threw
// at require, so a gate's documented control could not run at all. So: with CT_SRC set, a name the control source does
// not DECLARE is left out of the export and named on stderr - a caller that uses it then fails loudly on its first call,
// which is the honest answer for a control that does not have it. WITHOUT CT_SRC NOTHING CHANGES: the shipped
// chess.jsx must declare every name and need() still throws on a missing one.
const ABSENT=process.env.CT_SRC?NAMES.filter(n=>!blocks.has(n)):[];
if(ABSENT.length) process.stderr.write('engine-extract: CT_SRC '+SRC_PATH+' declares none of '+ABSENT.join(', ')+' - not exported (a control source older than those helpers)\n');
const TAKE=NAMES.filter(n=>!ABSENT.includes(n));
const STALE=staleRefs(TAKE);
if(STALE.length&&!process.env.CT_EXTRACT_ALLOW_STALE) throw new Error('engine-extract: NAMES is stale against '+SRC_PATH+' - exported blocks reference top-level declarations it does not take: '+STALE.join('; ')+'. Add them to NAMES.');
const code=need(TAKE)+'\nmodule.exports={'+TAKE.join(',')+'};';
const mod={exports:{}};
// `window` is referenced by declarations we did not take; give the sandbox a stub so a stray
// reference throws a clear error rather than a ReferenceError from nowhere.
new Function('module','window',code)(mod,{});
module.exports=Object.assign({},mod.exports,{SOURCE_MD5,SRC_PATH,NAMES:NAMES.slice(),ABSENT:ABSENT.slice(),staleRefs});
