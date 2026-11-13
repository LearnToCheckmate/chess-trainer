// gates/vocab.js - the driving vocabulary of the bundle under test: for each reachable screen state, a
// screenshot, the visible button labels, the data-ct hooks with their rects, the board geometry and the
// overflow. Written for whoever must drive a screen they have not seen (the audit agents, a new session).
//   node gates/vocab.js [geo]      -> gates/shots/vocab-<geo>-<state>.png and a JSON summary on stdout
'use strict';
const L=require('./lib');
const geo=process.argv[2]||'kunal';
const only=process.argv[3]?new RegExp(process.argv[3]):null;
const out={};
async function state(b,name,fn){
  if(only&&!only.test(name))return;
  try{await fn();await b.settle(700);}catch(e){out[name]={error:String(e).split('\n')[0]};console.log('!! '+name+': '+String(e).split('\n')[0]);return;}
  const m=await b.metrics();const buttons=await b.texts();const cts=await b.cts();
  const shot=await b.shot('vocab-'+geo+'-'+name);
  out[name]={board:m.board,over:m.over,errs:b.errs.slice(),buttons,cts,shot};
  console.log('== '+name+'  board='+JSON.stringify(m.board)+' over='+m.over.over+' errs='+b.errs.length);
  console.log('   buttons: '+buttons.slice(0,40).join(' | '));
  console.log('   data-ct: '+cts.slice(0,40).join(' '));
}
L.run(async()=>{
  const b=await L.launch({geo,name:'vocab'});await b.open();
  await state(b,'home',async()=>{});
  await state(b,'discover',async()=>{await b.tile('Discover');});
  await state(b,'puzzles-roadmap',async()=>{await b.home();await b.tile('Puzzles');});
  await state(b,'puzzles-browse',async()=>{await b.tapText(/^Free play/);});
  await state(b,'review-list',async()=>{await b.home();await b.tile('Review');});
  await state(b,'play-setup',async()=>{await b.home();await b.tile('Play');});
  await state(b,'play-setup-passplay',async()=>{await b.tapText(/^Pass & Play$/);});
  await state(b,'play-live-computer',async()=>{await b.home();await b.card('k8',7000);});
  // #550 round 2 [jobs/five-gates-enter-their-state-by-tapping-a-dev-gallery-card-2026-10-01]: was b.card('k10',12000). Game over is now
  // reached the way a player reaches it - Pass & Play, Scholar's mate played by hand (drive/play.js 'k10' = pp-scholar-mate + the move list
  // shown). MEASURED on 489840ab49bb at 375x679, card against route: the 8 buttons identical in order (⌂ ☰ Moves Back Forward Review Rematch
  // More), over 0 both, board 375 wide both; the data-ct names identical but for rec-cap (the card's caption strip, gone with the card) and
  // result-card (the end-of-game card, which the card's game did not show and the player's does). The board reads top 103.7 flipped where
  // the card read 100 unflipped, because the card's game was the dev-only 'demo' opponent and this is Pass & Play (it turns the board to the
  // side to move and folds 'vs Human' into its top row), so the bars are 54 tall here against 46.
  await state(b,'play-gameover',async()=>{await b.home();await require('./drive/play').states['k10'](b);});
  await state(b,'lesson-demo-end',async()=>{await b.home();await b.card('k11',6000);});
  await state(b,'puzzle-hint',async()=>{await b.home();await b.card('A-06',5000);});
  await state(b,'menu',async()=>{await b.home();await b.tile('Discover');await b.settle(300);const t=await b.texts();const m=t.find(x=>/^(☰|Menu)$/.test(x));if(m)await b.tapText(m);else await b.tapText(/☰/);});
  require('fs').writeFileSync(require('path').join(L.SHOTS,'vocab-'+geo+'.json'),JSON.stringify(out,null,1));
  L.say(true,'vocabulary written for '+Object.keys(out).length+' states');
  await b.close();
},'VOCAB');
