'use strict';
// gates/regress/235-play-best-button-small-phone.js - ON THE SMALLEST PHONES A BEST BUTTON IN THE GAME'S BOTTOM ROW OPENS THE BEST ROW ON THE
// MOVES SHEET; CLOSE THE SHEET AND IT GOES. TC-R402..R404; US-R242.
//
// WHY [#553 B3, jobs/short-upright-boards-sized-to-height-2026-11-12, his pick (1) on Desk card 82, run-answers
// orchestrator-B14-PREP7B-2026-11-24 (Amber: flags/amber-553-play-best-button)]: batch 13 put the three best moves of a game from a scanned board
// on the Moves box's heading row; on a phone whose move list is a closed sheet (playFit.noMoves, 320x568 against the computer) the row is
// reachable only by opening Moves. His pick: a Best button in the bottom row, in the standard style, that opens that same sheet with the BEST
// row on top; close the sheet and it goes. No floating bubble, no popup.
// WHAT IT ASSERTS, a vs-Computer game started through the board scan (gates/drive/scan.js) from FEN0, after 1.Bc4 and Pip's reply, at
// CT_G235_GEO (se by default; the pairs file also runs kunal761):
//  TC-R402 PRECONDITION the move list is a closed sheet here (the Moves button is in the row and no move list is painted under the board) -
//          or, at a phone where it is not a sheet, the Best button is ABSENT (the row is as it was) and the remaining lines are not run.
//  TC-R402 the row carries a button named "Best moves" (found by its aria-label, not by any hook the fix adds), after Forward and before Hint,
//          and the row's buttons all lie inside the screen and do not overlap one another.
//  TC-R403 a tap on it opens the Moves sheet with the BEST row (role status, aria-label "Best moves") painted on screen, holding at least one
//          move, and the button reads pressed; the board does not move (its top and width are the same before and after, to 0.6px).
//  TC-R404 a second tap closes the sheet: the BEST row is no longer painted (not visible), the button reads not pressed, the board unmoved.
const L=require('../lib');const P=require('../drive/play');
const GEO=process.env.CT_G235_GEO||'se';
const FEN0='r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
const rowRead=(b)=>b.page.evaluate(()=>{const row=document.querySelector('[data-ct="play-ctlrow"]');if(!row)return null;
  const bs=[...row.querySelectorAll('button')].filter(x=>{const r=x.getBoundingClientRect();return r.width>0&&r.height>0;}).map(x=>{const r=x.getBoundingClientRect();return {lab:x.getAttribute('aria-label')||'',l:Math.round(r.left*10)/10,r:Math.round(r.right*10)/10,w:Math.round(r.width*10)/10,h:Math.round(r.height*10)/10,pressed:x.getAttribute('aria-pressed')};});
  return {vw:window.innerWidth,bs};});
const bestRow=(b)=>b.page.evaluate(()=>{const e=[...document.querySelectorAll('[role="status"][aria-label="Best moves"]')].find(x=>{const r=x.getBoundingClientRect();return r.width>0&&r.height>0;});if(!e)return null;
  const r=e.getBoundingClientRect(),cs=getComputedStyle(e);const at=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
  return {vis:cs.visibility,top:Math.round(r.top),h:Math.round(r.height),front:!!at&&(e===at||e.contains(at)),moves:[...e.querySelectorAll('b')].map(x=>(x.textContent||'').trim()).filter(Boolean)};});
const boardAt=async(b)=>{const d=await b.board();return d?{y:d.y,w:d.w}:null;};
L.run(async()=>{
  const tag=GEO+': ';
  const b=await L.launch({geo:GEO,name:'g235-'+GEO,store:{ct_pool:'3'}});await b.open();
  const st=await require('../drive/scan').through(b,{fen:FEN0,turn:'w',side:'w',kind:'Play',settle:1600});
  if(st!=='ok'){L.say(false,tag+'TC-R402 PRECONDITION the scan route started a game',st);await b.close();return;}
  await b.move('f1','c4',0);await P.waitPlies(b,2,20000);await b.settle(2500);
  const row=await rowRead(b);const labs=row?row.bs.map(x=>x.lab):[];
  const sheetish=await b.page.evaluate(()=>{const p=document.querySelector('[data-ct="moves-panel"]');if(!p)return 'none';const r=p.getBoundingClientRect();return (r.height<1||getComputedStyle(p).visibility==='hidden')?'closed':'open';});
  const best=row&&row.bs.find(x=>x.lab==='Best moves');
  if(process.env.CT_G235_EXPECT==='absent'){
    L.say(!!row&&labs.includes('Moves')&&!best,tag+'TC-R402 where the move list is not a sheet the row is as it was: no Best moves button ('+labs.join(', ')+')',{labs,sheetish});
    await b.close();return;}
  L.say(!!row&&labs.includes('Moves')&&sheetish!=='open',tag+'TC-R402 PRECONDITION the move list is a closed sheet here (Moves in the row, the list not painted: '+sheetish+')',{labs,sheetish});
  const iF=labs.indexOf('Forward'),iB=labs.indexOf('Best moves'),iH=labs.indexOf('Hint');
  const inside=!!row&&row.bs.every(x=>x.l>=-0.5&&x.r<=row.vw+0.5);const apart=!!row&&row.bs.every((x,i)=>i===0||x.l>=row.bs[i-1].r-0.5);
  L.say(!!best&&iB===iF+1&&iH===iB+1&&inside&&apart,tag+'TC-R402 the row carries a "Best moves" button after Forward and before Hint, and all '+labs.length+' buttons lie inside the screen without overlapping ('+(row?row.bs.map(x=>x.lab+' '+x.w+'x'+x.h).join(', '):'no row')+')',row);
  if(best){
    // the star's painted ink (its larger side) against the row's other icons' (gate 157's measure: the shapes' union, not the svg box)
    const ink=await b.page.evaluate(()=>[...document.querySelectorAll('[data-ct="play-ctlrow"] button')].map(x=>{let l=1e9,t=1e9,r=-1e9,bt=-1e9;
      x.querySelectorAll('svg path,svg polygon,svg circle,svg rect,svg line,svg polyline,svg ellipse').forEach(e=>{const q=e.getBoundingClientRect();if(q.width<0.3&&q.height<0.3)return;l=Math.min(l,q.left);t=Math.min(t,q.top);r=Math.max(r,q.right);bt=Math.max(bt,q.bottom);});
      return {lab:x.getAttribute('aria-label'),ink:r>l?Math.round(Math.max(r-l,bt-t)*10)/10:null};}));
    const star=ink.find(x=>x.lab==='Best moves'),others=ink.filter(x=>x.lab!=='Best moves'&&x.ink!=null).map(x=>x.ink).sort((p,q)=>p-q);const med=others.length?others[Math.floor(others.length/2)]:null;
    L.say(!!star&&star.ink!=null&&med!=null&&Math.abs(star.ink-med)<=1.5,tag+'TC-R402 the star is drawn at the row\'s icon size: '+(star&&star.ink)+' of ink against the row\'s median '+med+' (within 1.5)',ink);
    const b0=await boardAt(b);const r0=await bestRow(b);
    await b.page.locator('[data-ct="play-ctlrow"] button[aria-label="Best moves"]').click();await b.settle(2500);
    const r1=await bestRow(b);const b1=await boardAt(b);const p1=(await rowRead(b)).bs.find(x=>x.lab==='Best moves');
    L.say(!(r0&&r0.vis!=='hidden'&&r0.front)&&!!r1&&r1.vis!=='hidden'&&r1.front&&r1.moves.length>=1&&p1&&p1.pressed==='true',tag+'TC-R403 a tap on Best moves opens the sheet with the BEST row on screen and in front ('+(r1?r1.moves.join(' '):'none')+'), the button pressed; before the tap the row was not shown',{before:r0,after:r1,pressed:p1&&p1.pressed});
    L.say(!!b0&&!!b1&&Math.abs(b0.y-b1.y)<0.6&&Math.abs(b0.w-b1.w)<0.6,tag+'TC-R403 opening it does not move the board ('+(b0&&b0.y)+'/'+(b0&&b0.w)+' -> '+(b1&&b1.y)+'/'+(b1&&b1.w)+')',{b0,b1});
    await b.shot('235-'+GEO+'-best-open');
    await b.page.locator('[data-ct="play-ctlrow"] button[aria-label="Best moves"]').click();await b.settle(900);
    const r2=await bestRow(b);const b2=await boardAt(b);const p2=(await rowRead(b)).bs.find(x=>x.lab==='Best moves');
    L.say(!(r2&&r2.vis!=='hidden'&&r2.front)&&p2&&p2.pressed==='false'&&!!b2&&Math.abs(b0.y-b2.y)<0.6&&Math.abs(b0.w-b2.w)<0.6,tag+'TC-R404 a second tap closes the sheet: the BEST row is gone, the button not pressed, the board unmoved',{r2,pressed:p2&&p2.pressed,b2});
  }
  L.say(b.errs.filter(e=>!/RuntimeError: unreachable/.test(e)).length===0,tag+'TC-R402 no app error beyond the allowed engine trap',b.errs.slice(0,3));
  await b.close();
},'235-play-best-button-small-phone');
