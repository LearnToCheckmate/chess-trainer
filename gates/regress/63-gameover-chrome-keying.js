// regress/63-gameover-chrome-keying.js  -  #437.
// THE DEFECT: the play control row was chosen from `isOver`, which is getStatus(boardGame), and boardGame is
// playHist[pvIdx] while Back/Forward preview an earlier ply. So stepping back inside a FINISHED game rebuilt the
// row as a LIVE row: an enabled Hint whose handler returns immediately on getStatus(game), with Review and
// Rematch gone until you stepped Forward again. #437 keys that chrome to `_gameOver`, read from the real game.
//
// WHY THIS GATE IS SHAPED THE WAY IT IS, and each of these is a trap this repository has already paid for:
//  * THE INSTRUMENT IS PROVED BEFORE IT IS BELIEVED. The dead-Hint assertion is an ABSENCE claim - "tapping this
//    changes nothing" - and CLAUDE.md's rule is that an absence is worthless until the instrument is shown able to
//    move. So A1/A2 tap Hint in a LIVE game FIRST and require the 64-square signature to move there. If the
//    instrument is dead, this gate fails on the good bundle rather than passing vacuously on a broken one.
//  * IT LOCATES THE ROW BY WHAT THE SCREEN SAYS, never by a data-ct this build adds. #432 shipped three assertions
//    keyed to an attribute its own commit created; against the one bundle in existence where the defect was live,
//    the selector came back null and the assertion that the defect was ABSENT went green. _CBtn already renders
//    title={label}, so the labels are the shipped surface and were there before #437.
//  * IT ASSERTS THE STATE WAS REACHED. #385's "no bubble in analysis mode" passed against a bundle with the guard
//    deleted, because it never checked it had arrived. So before every step-back assertion this gate proves the
//    game really ended (the result card names the ending) AND that the step back really happened (the board's own
//    64-square signature differs from the terminal one). Both are one line each.
//  * IT COVERS THE THREE TERMINAL KINDS SEPARATELY, because `_gameOver` has two terms - playEnd and
//    getStatus(game). Checkmate exercises ONLY the getStatus half (playEnd is null on a mate); resignation and the
//    repetition draw exercise ONLY the playEnd half. A gate that drove just one of them would leave half the
//    predicate untested, which is the #375 single-worker-fallback mistake.
'use strict';
const L=require('../lib');

// The 64-square signature: each square's own background and shadow, every NON-piece child overlay, and the piece
// text/glyph in it. This is the instrument the #436 auditor used to show the Hint was inert, re-derived here.
const sigOf=(b)=>b.page.evaluate(()=>{
  const els=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));
  let best=null;for(const e of els){const r=e.getBoundingClientRect();if(r.width<40)continue;if(!best||r.width>best.r.width)best={e,r};}
  if(!best)return null;
  return [...best.e.children].slice(0,64).map(k=>{
    const cs=getComputedStyle(k);
    const kids=[...k.children].map(c=>{const s=getComputedStyle(c);const r=c.getBoundingClientRect();
      return c.tagName+':'+s.backgroundColor+':'+s.backgroundImage.slice(0,40)+':'+s.opacity+':'+s.border+':'+Math.round(r.width)+'x'+Math.round(r.height);}).join(',');
    return cs.backgroundColor+'|'+cs.boxShadow+'|'+kids+'|'+(k.innerText||'').trim();
  }).join(';');
});

// The control row, read off the rendered labels _CBtn has always emitted as title=.
const rowOf=(b)=>b.page.evaluate(()=>{
  const want=['Moves','Back','Forward','Review','Rematch','Hint','Flip','More'];
  const all=[...document.querySelectorAll('button')].filter(x=>{const t=(x.title||'').trim();const r=x.getBoundingClientRect();
    return want.indexOf(t)>=0&&r.width>1&&r.height>1&&r.top<innerHeight&&r.bottom>0;})
    .map(x=>{const r=x.getBoundingClientRect();const cs=getComputedStyle(x);
      return {label:(x.title||'').trim(),x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width*10)/10,h:Math.round(r.height*10)/10,dis:!!x.disabled,op:cs.opacity};});
  if(!all.length)return {labels:[],items:[]};
  // the row is the densest y band: take the modal y, within 3px
  const ys=all.map(a=>a.y).sort((p,q)=>p-q);let bandY=ys[0],bandN=0;
  for(const y of ys){const n=all.filter(a=>Math.abs(a.y-y)<=3).length;if(n>bandN){bandN=n;bandY=y;}}
  const items=all.filter(a=>Math.abs(a.y-bandY)<=3).sort((p,q)=>p.x-q.x);
  return {labels:items.map(i=>i.label),items};
});

// The More bottom sheet's items, also read off their rendered labels.
const sheetOf=(b)=>b.page.evaluate(()=>{
  const sh=[...document.querySelectorAll('div')].filter(d=>{const st=getComputedStyle(d);return st.position==='fixed'&&(+st.zIndex)>=9990;});
  if(!sh.length)return null;
  const items=[...sh[0].querySelectorAll('button')].filter(x=>{const r=x.getBoundingClientRect();return r.width>1&&r.height>1;})
    .map(x=>{const r=x.getBoundingClientRect();return {label:(x.innerText||x.title||'').replace(/\s+/g,' ').trim(),x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width*10)/10,h:Math.round(r.height*10)/10,dis:!!x.disabled};});
  return items;
});

const resultText=(b)=>b.page.evaluate(()=>{const e=document.querySelector('[data-ct="result-card"]');return e?(e.innerText||'').replace(/\s+/g,' ').trim():null;});

L.run(async()=>{
 for(const geo of ['kunal730','se']){
  const G=geo+': ';

  // ================= A. THE INSTRUMENT, PROVED ON A LIVE GAME BEFORE IT IS TRUSTED =================
  {
    const b=await L.launch({geo,name:'gk-live-'+geo});await b.open();
    await b.tile('Play');await b.tapText(/^Pass & Play$/);await b.tapText(/^\u25b6 Start game$/,{wait:900});
    await b.move('e2','e4',500);await b.move('e7','e5',500);await b.settle(400);
    const row0=await rowOf(b);
    L.say(row0.labels.indexOf('Hint')>=0&&row0.labels.indexOf('Flip')>=0,
      G+'A1 live game: the row is the LIVE row (Hint and Flip present) - the control state this gate compares against',row0.labels.join(' · '));
    const before=await sigOf(b);
    L.say(!!before&&before.split(';').length===64,G+'A1b the 64-square signature reads 64 squares',before?before.split(';').length:null);
    const hint=row0.items.filter(i=>i.label==='Hint')[0];
    if(hint&&before){
      await b.page.mouse.click(hint.x+hint.w/2,hint.y+hint.h/2);await b.settle(900);
      const after=await sigOf(b);
      L.say(after!==before,G+'A2 INSTRUMENT VALIDATION: tapping Hint in a LIVE game MOVES the 64-square signature. Every "the Hint does nothing" assertion below is vacuous unless this one passes',{moved:after!==before});
    } else L.say(false,G+'A2 could not reach a live Hint button to validate the instrument',{hint:!!hint,sig:!!before});
    await b.close();
  }

  // ================= B/C/D. THE THREE TERMINAL KINDS =================
  // Each ends the game a different way, steps BACK, and asks the same four questions of the row.
  const kinds=[
    {id:'B',name:'checkmate',  term:/Checkmate/i, drive:async(b)=>{   // playEnd stays null: this exercises getStatus(game) alone
        await b.move('f2','f3',500);await b.move('e7','e5',500);await b.move('g2','g4',500);await b.move('d8','h4',500);await b.settle(1100);}},
    {id:'C',name:'resignation',term:/Resign/i,   drive:async(b)=>{   // playEnd={reason:'resign'}: exercises the playEnd half alone
        await b.move('e2','e4',500);await b.move('e7','e5',500);await b.settle(300);
        await b.tapText(/^More$/).catch(()=>{});await b.settle(600);
        await b.tapText(/^Resign$/).catch(()=>{});await b.settle(400);            // #375: the first tap only ARMS it
        await b.tapText(/^Tap again to resign$/).catch(()=>{});await b.settle(1100);}},
    {id:'D',name:'repetition draw',term:/Draw/i, drive:async(b)=>{   // playEnd={reason:'draw'}: the #414 auto-draw
        for(let i=0;i<5;i++){
          for(const [f,t] of [['g1','f3'],['g8','f6'],['f3','g1'],['f6','g8']]){await b.move(f,t,380);}
          const r=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="result-card"]');return e?(e.innerText||''):null;});
          if(r)break;                                        // the auto-draw has fired; do not keep tapping a dead board
        }
        await b.settle(1200);}},
  ];

  for(const k of kinds){
    const b=await L.launch({geo,name:'gk-'+k.name.replace(/ /g,'-')+'-'+geo});await b.open();
    await b.tile('Play');await b.tapText(/^Pass & Play$/);await b.tapText(/^\u25b6 Start game$/,{wait:900});
    // Read the LIVE sheet first, at ply 0 where the game is plainly playable. This is the positive control that
    // assertion 10's set difference is taken against; without it the absence check is a search for a word.
    await b.tapText(/^More$/).catch(function(){});await b.settle(700);
    const liveSheet=(await sheetOf(b))||[];
    await b.page.mouse.click(5,5);await b.settle(450);
    await k.drive(b);

    const res=await resultText(b);
    const endRow=await rowOf(b);
    const endSig=await sigOf(b);
    await b.shot('gk437-'+geo+'-'+k.name.replace(/ /g,'-')+'-end');

    // ARRIVAL CHECK 1: the game really ended, and ended the way this case intends.
    const arrived=!!res&&k.term.test(res);
    L.say(arrived,G+k.id+'1 ARRIVAL: the game ended by '+k.name+' and the result card says so',{result:res});
    L.say(endRow.labels.indexOf('Review')>=0&&endRow.labels.indexOf('Rematch')>=0,
      G+k.id+'2 at the terminal ply the row offers Review and Rematch',endRow.labels.join(' · '));

    if(arrived){
      await b.tapText(/^Back$/).catch(()=>{});await b.settle(350);
      await b.tapText(/^Back$/).catch(()=>{});await b.settle(600);
      const backSig=await sigOf(b);
      const backRow=await rowOf(b);
      await b.shot('gk437-'+geo+'-'+k.name.replace(/ /g,'-')+'-backx2');

      // ARRIVAL CHECK 2: we really stepped back. Without this, every assertion below is about the terminal ply.
      L.say(!!backSig&&backSig!==endSig,G+k.id+'3 ARRIVAL: stepping Back actually changed the position on the board',{moved:backSig!==endSig});

      if(backSig&&backSig!==endSig){
        // THE DEFECT ITSELF.
        L.say(backRow.labels.indexOf('Review')>=0&&backRow.labels.indexOf('Rematch')>=0,
          G+k.id+'4 THE DEFECT: after stepping back inside a FINISHED game, Review and Rematch are STILL in the row. Before #437 they left x=191 and x=254 and did not return until you stepped Forward',backRow.labels.join(' · '));
        L.say(backRow.labels.indexOf('Hint')<0,
          G+k.id+'5 the live-only Hint has NOT reappeared on a finished game',backRow.labels.join(' · '));

        // The row must not have been rebuilt at all: same labels in the same order, same x positions.
        const same=endRow.labels.join(',')===backRow.labels.join(',');
        L.say(same,G+k.id+'6 the row is UNCHANGED across the step back - same controls, same order',{end:endRow.labels.join(' · '),back:backRow.labels.join(' · ')});
        if(same){
          const maxdx=Math.max(...endRow.items.map((it,i)=>Math.abs(it.x-(backRow.items[i]?backRow.items[i].x:1e6))));
          L.say(maxdx<=1,G+k.id+'6b and no control moved horizontally across the step back (max dx '+maxdx+'px)',{maxdx});
        }

        // AND THE INERT-CONTROL CHECK, which A2 has already proved able to move.
        const inert=[];
        for(const it of backRow.items){
          if(it.dis)continue;                                  // a correctly-disabled control is the app's own right idiom
          if(['Moves','Back','Forward','More','Rematch','Review','Flip'].indexOf(it.label)>=0)continue;  // these navigate or open, not board-visible
          const pre=await sigOf(b);
          await b.page.mouse.click(it.x+it.w/2,it.y+it.h/2);await b.settle(900);
          const post=await sigOf(b);
          if(post===pre)inert.push(it.label);
        }
        L.say(inert.length===0,G+k.id+'7 no board control in the row is enabled-but-inert (instrument proved live at A2)',{inert});

        // #437's FIFTH SITE, found by counting the class rather than eyeballing the grep: the More sheet showed
        // its Resign item on `!(isOver||playEnd)` too, so stepping back in a mated game put Resign back on a
        // finished game - and resign() returns immediately on getStatus(game), so it is inert exactly as the Hint
        // was. At the terminal ply isOver is already true and Resign is already hidden, so this changes no state
        // that was correct; it only stops the stepped-back state from resurrecting it.
        await b.tapText(/^More$/).catch(function(){});await b.settle(700);
        const overSheet=(await sheetOf(b))||[];
        await b.shot('gk437-'+geo+'-'+k.name.replace(/ /g,'-')+'-backx2-moresheet');
        const liveL=liveSheet.map(function(i){return i.label;}), overL=overSheet.map(function(i){return i.label;});
        L.say(overSheet.length>0,G+k.id+'9 ARRIVAL: the More sheet opened on the stepped-back finished game',{n:overSheet.length});
        // 9b POSITIVE CONTROL, and it exists because antagonist A proved the absence check below was VACUOUS without
        // one. A took the shipped #436, renamed the item Resign -> Forfeit and left the defect gating untouched, so
        // the sheet still resurrected it - and the old assertion PASSED, because it searched for a fixed string that
        // no longer existed. That is #432's trap in the opposite direction: the check and the thing checked were the
        // same string. Now the LIVE sheet is read first, through the SAME selector, and the defect is a DIFFERENCE.
        L.say(liveL.some(function(t){return /resign/i.test(t);}),G+k.id+'9b POSITIVE CONTROL: the LIVE game sheet offers a resign control, read with the same selector the absence check uses - so a rename or removal reddens HERE and names the cause',liveL.join(' | '));
        if(overSheet.length&&liveL.length){
          var gone=liveL.filter(function(t){return overL.indexOf(t)<0;});
          L.say(gone.length===1&&/resign/i.test(gone[0]),
            G+k.id+'10 THE DEFECT, as a SET DIFFERENCE so a rename cannot make it pass: the ONLY thing the finished sheet drops relative to the live sheet is the resign control. On the shipped #436 it drops NOTHING, because stepping back resurrected it, and resign() returns immediately on getStatus(game) - a second enabled-but-inert control',{live:liveL.join(' | '),over:overL.join(' | '),dropped:gone});
          // 11 THE CAPABILITY, added after antagonist B measured that this build's first draft took away the LAST
          // route to Flip on a finished game. The row gives Flip up at game over and #371's comment claimed the sheet
          // carried it; measured, it did not, on any bundle. So Flip must be reachable somewhere in every finished state.
          var flipInRow=backRow.labels.indexOf('Flip')>=0, flipInSheet=overL.some(function(t){return /flip/i.test(t);});
          L.say(flipInRow||flipInSheet,G+k.id+'11 CAPABILITY: the board can still be flipped on a finished game - Flip reachable in the row or the sheet',{flipInRow:flipInRow,flipInSheet:flipInSheet,sheet:overL.join(' | ')});
          L.say(!(flipInRow&&flipInSheet),G+k.id+'11b and it is offered ONCE, not twice',{flipInRow:flipInRow,flipInSheet:flipInSheet});
        }
      }
    }
    L.say(b.errs.length===0,G+k.id+'8 zero app errors through '+k.name+' and the step back',b.errs.slice(0,3));
    await b.close();
  }
 }
},'GAMEOVER-CHROME-KEYING');
