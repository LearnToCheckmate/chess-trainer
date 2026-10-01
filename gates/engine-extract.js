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
// function/const/let/var at column 0 and runs to the line before the next such line.
const lines=src.split('\n');
const starts=[];
for(let i=0;i<lines.length;i++) if(/^(function|const|let|var)\s/.test(lines[i])) starts.push(i);
const blocks=new Map();   // name -> {text, order}
for(let s=0;s<starts.length;s++){
  const a=starts[s], b=(s+1<starts.length?starts[s+1]:lines.length);
  const m=/^(?:function|const|let|var)\s+([A-Za-z_$][\w$]*)/.exec(lines[a]);
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
const NAMES=['FILES','rc2sq','inB','opp','initBoard','initGame','fromFEN','toFEN','cloneB','isAttacked','findKing','isInCheck','pseudoMoves',
  'applyMove','getLegal','getMovesFrom','disambig','toSAN','makeMove','getStatus','VAL','mateW','PST',
  'evaluate','makeFast','orderMoves','QDEPTH','quiesce','minimax','evalPawns','cleanSAN','parsePGN',
  'matchSanLenient','loadSANs','rankMoves','classify','SEEVAL','seeSq','brilliantGate','isBrilliant'];
const code=need(NAMES)+'\nmodule.exports={'+NAMES.join(',')+'};';
const mod={exports:{}};
// `window` is referenced by declarations we did not take; give the sandbox a stub so a stray
// reference throws a clear error rather than a ReferenceError from nowhere.
new Function('module','window',code)(mod,{});
module.exports=Object.assign({},mod.exports,{SOURCE_MD5,SRC_PATH});
