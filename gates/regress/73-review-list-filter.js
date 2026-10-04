// regress/73-review-list-filter.js
// GUARDS: US-R36 - "The Review list can be narrowed to the games the player is looking for, and whenever it is
//         narrowed the screen says how many games it is showing, names the narrowing when nothing matches, and
//         never presents an answer drawn from a partly computed tally as if it were complete."
// IMPLEMENTS: TC-R48.
// JOB: jobs/review-list-filter-and-search-2026-09-23, priority 9, askedBy Kunal 2026-09-23 and WIDENED BY HIM
//      THE SAME DAY (so it is a twice-raised item under STEP 1S's tie-break (a)):
//        "might be good to add the ability to filter, so if I want to filter for games where I have
//         brilliancies, or if I want to filter for games that I have blunders, or by the usernames, because I
//         was trying to see [peter-patzer's] games and I couldn't find any."
//        "I can't specifically filter for his right now. I think maybe there should be some filter on the
//         overall review screen and based on that I can basically pull in every of these games."
//      Ship-list id 2 of 37 (docs/ship-37-plan-2026-10-03).
//
// ── WHAT WAS ALREADY THERE, MEASURED BEFORE ANYTHING WAS WRITTEN, because the job is 11 days old and a job is
//    a statement about the day it was filed and not about main [the #433 lesson: a premise in a comment is a
//    claim about origin/main, and origin/main is one grep away]:
//    A PLAYER-NAME FILTER ALREADY SHIPS. origin/main 11abfaa chess.jsx:6774 renders an input placeholder
//    "Filter by player name" whenever ccGames.length>6, and :6667 filters on white+black+source. So HALF of
//    his "by the usernames" ask was already met and this gate must not claim credit for it. What did NOT
//    exist: any grade, result or colour filter; any account filter; any statement of how many games are being
//    shown; and any empty state. THE SHIPPED SCREEN'S REAL DEFECT, which is what block A measures, is that
//    the existing filter is SILENT: narrow it to nothing and you get a blank list under a header still
//    reading "7 loaded", which is exactly how a filter gets read as an empty archive - the shape of the
//    report that opened this job.
//
// ── THE TWO BLOCKS ARE CONTROLLED DIFFERENTLY AND THE DIFFERENCE IS THE POINT [#432].
//    #432's lesson: an assertion keyed to a hook your own build adds CANNOT be controlled by the shipped
//    bundle, because the selector is absent there and the assertion goes red for a MISSING SELECTOR rather
//    than for the defect - and its negation goes PASS on the one bundle where the defect is real.
//    BLOCK A runs on BOTH bundles and is keyed on NOTHING THIS BUILD ADDED. It drives the pre-existing name
//      box and reads the pre-existing count span and the row count. It is RED on the shipped bundle FOR THE
//      RIGHT REASON (the screen states nothing) and green on the fix. This is the controlled block.
//    BLOCK B and BLOCK C assert the NEW controls, which cannot exist on the shipped bundle by construction.
//      They are NOT controlled by it and this file does not pretend otherwise. Their control is a deliberately
//      broken TRIAL bundle of this build's own logic - see the NEGATIVE CONTROLS list below.
//
// ── FIXTURE. Entirely offline: seven games seeded straight into ct_accts / ct_acctgames / ct_gamestats, with
//    ct_ccuser EMPTY so the auto-fetch effect never fires and api.chess.com is never asked for (lib.js's BLOCK
//    abort stays underneath in any case [R21]). gkey is src+':'+date+':'+white+':'+black (chess.jsx:4209) and
//    the tally map ct_gamestats is keyed on it, which is how a game is "graded" or not.
//      acct cc:alpha - 4 games, ALL FOUR WITH A TALLY
//        g1 Alpha(W) beat opp1       bril 1  blun 0  mist 0
//        g2 opp2 beat Alpha(B)       bril 0  blun 1  mist 2
//        g3 Alpha(W) resigned        bril 0  blun 0  mist 1
//        g4 Alpha(W) drew opp4       bril 2  blun 3  mist 0
//      acct cc:beta - 3 games, ONE WITH A TALLY AND TWO WITHOUT
//        g5 beta(W) beat opp5        bril 0  blun 0  mist 0
//        g6 opp6 beat beta(B)        NO TALLY
//        g7 beta(W) beat opp7        NO TALLY
//    SEVEN is chosen deliberately: the filter row and the name box both render only above six games
//    (ccGames.length>6), so the fixture sits one game past the threshold that gates its own subject.
//    THE CASE TRAP IS IN THE FIXTURE ON PURPOSE. acctId() lowercases and strips '@' (chess.jsx) while the
//    chess.com fetch stores the row's `acct` as the RAW trimmed input (chess.jsx:4203, `acct:u`) and the
//    Lichess one lowercases it (:4227). So alpha's rows carry acct:'Alpha' against an id of 'cc:alpha', and a
//    case-sensitive account filter returns ZERO rows for it. B4 is the assertion that would catch that.
//
// ── HOW "NOT YET GRADED" IS MADE DETERMINISTIC, AND WHAT THAT DOES AND DOES NOT MODEL.
//    The tally is filled by a BACKGROUND pass (chess.jsx, the effect over [ccGames,mode]) that walks the list
//    one game at a time, 60ms apart, while the Review screen is open. So "how many games are graded" is a
//    MOVING quantity, and a gate that pinned it would be the flaky assertion #387 warns about - worse than no
//    assertion, and two runs would not even reliably find it.
//    g6 and g7 therefore carry PGN HEADERS WITH NO MOVES. analyzeGameCounts returns null on that input at its
//    first line (`const sans=parsePGN(pgn); if(!sans||!sans.length)return null;`) and the caller only records
//    a truthy result (`if(c)recordGameStats(...)`), so those two games stay ungraded PERMANENTLY and every
//    number in block C is stable.
//    WHAT IT MODELS: the render state, exactly. The screen's only question is whether ct_gamestats has an
//    entry for that gkey, and it does not, by either route.
//    WHAT IT DOES NOT MODEL: the passage of time. A real ungraded game is one the pass has not REACHED yet
//    and will grade in a few seconds; these two can never be graded. So block C proves the screen is honest
//    about a partly graded list; it does NOT prove the line later disappears once the pass finishes. C3 is the
//    nearest available evidence for that direction - it asserts the line is ABSENT on a fully graded set - and
//    the gap between "absent when complete" and "disappears when it completes while you watch" is named here
//    rather than left to be discovered.
//
// ── NEGATIVE CONTROLS. Block A's control is the SHIPPED BUNDLE, which is the ideal one: free, real, and the
//    actual screen Kunal reported. Blocks B and C are controlled by trial bundles of this build's own logic.
//    Observed pass/fail is recorded in the run record docs/review-list-filter-and-search-2026-09-23-lane
//    and on the job; the shapes:
//    NC-SHIPPED  origin/main 11abfaa app.js (md5 f53b69654395, '#475 - 2026-10-04 ...') -> block A RED at
//                A2/A3/A4 (no count change, no empty state), block B/C red on absent selectors, which is NOT
//                evidence and is why they are reported separately.
//    NC-CASE     the account filter compared case-sensitively (_aid without toLowerCase) -> B4 RED ALONE.
//                This is the control that proves B4 is not a restatement of B3.
//    NC-NOLINE   the coverage line deleted -> MEASURED 26/4: C1, C2, C4 AND C4b red, everything else green.
//                (This line first said "C1, C2, C4 ... everything else green", omitting C4b, which TC-R48 had
//                right and the header did not - antagonist A's F5. The gate file is what a later reader
//                reaches first, so the two must agree.)
//    NC-WHOLE    the coverage line's denominator taken from ccGames instead of the pre-grade set.
//                PUBLISHED HERE WITH A DEFINITE OUTCOME BEFORE IT HAD EVER BEEN BUILT - antagonist A's F4,
//                upheld: three measured controls and one prediction sat in the same list in the same format,
//                and the prediction's "C4 RED ALONE" was already contradicted by NC-NOLINE reddening C4 for a
//                different reason. It has now been built and run; see TC-R48 for its measured counts.
'use strict';
const L=require('../lib');

// ── the fixture, built once so every launch in this file sees byte-identical rows
const MOVES='1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 1-0';
function pgn(w,b,res,withMoves){
  const h=['[Event "Live Chess"]','[Site "Chess.com"]','[Date "2026.09.01"]','[White "'+w+'"]','[Black "'+b+'"]',
           '[Result "'+res+'"]','[TimeControl "180"]','[WhiteElo "1500"]','[BlackElo "1480"]','[ECO "C70"]',''];
  return h.join('\n')+(withMoves?(MOVES+'\n'):'');
}
// date is part of gkey, so every row needs a distinct one
const G=[
  {n:'g1',src:'cc',acct:'Alpha',white:'Alpha',black:'opp1',wr:'win',      tc:'blitz',date:1757000001000,moves:1},
  {n:'g2',src:'cc',acct:'Alpha',white:'opp2', black:'Alpha',wr:'win',     tc:'blitz',date:1757000002000,moves:1},
  {n:'g3',src:'cc',acct:'Alpha',white:'Alpha',black:'opp3',wr:'resigned', tc:'rapid',date:1757000003000,moves:1},
  {n:'g4',src:'cc',acct:'Alpha',white:'Alpha',black:'opp4',wr:'draw',     tc:'blitz',date:1757000004000,moves:1},
  {n:'g5',src:'cc',acct:'beta', white:'beta', black:'opp5',wr:'win',      tc:'blitz',date:1757000005000,moves:1},
  {n:'g6',src:'cc',acct:'beta', white:'opp6', black:'beta',wr:'win',      tc:'blitz',date:1757000006000,moves:0},
  {n:'g7',src:'cc',acct:'beta', white:'beta', black:'opp7',wr:'win',      tc:'blitz',date:1757000007000,moves:0},
];
const row=(g)=>({src:g.src,acct:g.acct,white:g.white,black:g.black,wr:g.wr,tc:g.tc,date:g.date,
                 pgn:pgn(g.white,g.black,g.wr==='win'?'1-0':(g.wr==='draw'?'1/2-1/2':'0-1'),g.moves)});
const gk=(g)=>g.src+':'+g.date+':'+g.white+':'+g.black;
const TALLY={};
TALLY[gk(G[0])]={bril:1,great:2,inacc:0,mist:0,blun:0,src:'review'};
TALLY[gk(G[1])]={bril:0,great:1,inacc:1,mist:2,blun:1,src:'est'};
TALLY[gk(G[2])]={bril:0,great:0,inacc:0,mist:1,blun:0,src:'est'};
TALLY[gk(G[3])]={bril:2,great:0,inacc:0,mist:0,blun:3,src:'review'};
TALLY[gk(G[4])]={bril:0,great:1,inacc:0,mist:0,blun:0,src:'est'};
// g6 and g7 deliberately absent - see the header
const STORE={ct_ccuser:'',ct_liuser:'',
  ct_accts:['cc:alpha','cc:beta'],
  ct_acctgames:{'cc:alpha':G.slice(0,4).map(row),'cc:beta':G.slice(4).map(row)},
  ct_gamestats:TALLY};

// everything the assertions read, in ONE evaluate, so every number in a row comes from one screen state
async function READ(b){
  return b.page.evaluate(()=>{
    const rows=[...document.querySelectorAll('[data-ct="game-row"]')];
    const txt=(el)=>el?(el.textContent||'').replace(/\s+/g,' ').trim():null;
    // THE COUNT IS FOUND BY WHAT IT SAYS AS WELL AS BY THE HOOK, so the same instrument reads both bundles
    // [#432]: data-ct="glist-count" is new, but "N loaded" is the shipped wording and the shipped element.
    const cEl=document.querySelector('[data-ct="glist-count"]')||
      [...document.querySelectorAll('span')].find(x=>/^\d+(?: loaded| of \d+)$/.test(txt(x)||''));
    const emptyEl=document.querySelector('[data-ct="glist-empty"]')||
      [...document.querySelectorAll('div')].find(x=>x.children.length<=1&&/no games match/i.test(txt(x)||''));
    const ungEl=document.querySelector('[data-ct="glist-ungraded"]')||
      [...document.querySelectorAll('div')].find(x=>x.children.length===0&&/graded \d+ of \d+/i.test(txt(x)||''));
    const ung=txt(ungEl), m=ung?ung.match(/graded (\d+) of (\d+)/i):null;
    const opps=rows.map(r=>{const m2=(r.innerText||'').match(/vs\s+(\S+)/);return m2?m2[1]:null;}).filter(Boolean);
    const badges=rows.map(r=>{const m3=(r.innerText||'').match(/^(WON|LOST|DRAW|GAME)/);return m3?m3[1]:null;});
    const fil=document.querySelector('[data-ct="glist-filters"]');
    const chips=fil?[...fil.querySelectorAll('button')].map(x=>{const q=x.getBoundingClientRect();
      return {ct:x.getAttribute('data-ct'),lab:txt(x),w:Math.round(q.width*10)/10,h:Math.round(q.height*10)/10,
              right:Math.round(q.right*10)/10,left:Math.round(q.left*10)/10,on:x.getAttribute('aria-pressed')==='true'};}):[];
    // #476 THE ESCAPE SCAN, screen-wide, added after antagonist A's P0. A `\u2014` written in JSX TEXT
    // (not in a JS string) is never interpreted, so the screen painted the six literal characters while all
    // four assertions on that element passed - they read it through /graded (\d+) of (\d+)/ and never looked
    // at the rest of the sentence. That is "a SHAPE is not a VALUE" (#385) pointed at a sentence instead of a
    // number. This scans everything the player can read, so the next sentence anyone adds is covered too.
    const esc=(document.body.innerText||'').match(/\\u[0-9a-fA-F]{4}|\\n|\\t/g)||[];
    // #476 THE PRESSED CHIP'S OWN LABEL CONTRAST, composited layer by layer and printing its inputs, because
    // a ratio that does not print its inputs is the #432 trap (4.51 vs 4.37 with the threshold between them).
    const lin=(c)=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4);};
    const lum=(r,g,b)=>0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b);
    const parse=(v)=>{const m=(v||'').match(/rgba?\(([^)]+)\)/);if(!m)return null;const p=m[1].split(',').map(x=>parseFloat(x));return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1};};
    const ratio=(el)=>{if(!el)return null;
      const st=getComputedStyle(el),fg=parse(st.color);if(!fg)return null;
      let base={r:0,g:0,b:0},layers=[];
      for(let n=el;n;n=n.parentElement){const b2=parse(getComputedStyle(n).backgroundColor);if(b2&&b2.a>0){layers.push(b2);if(b2.a>=1){base=b2;break;}}}
      let eff=base;for(let k=layers.length-1;k>=0;k--){const l=layers[k];eff={r:l.r*l.a+eff.r*(1-l.a),g:l.g*l.a+eff.g*(1-l.a),b:l.b*l.a+eff.b*(1-l.a)};}
      const L1=lum(fg.r,fg.g,fg.b),L2=lum(eff.r,eff.g,eff.b);
      return {ratio:Math.round(((Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05))*100)/100,
              fg:st.color,eff:[Math.round(eff.r*10)/10,Math.round(eff.g*10)/10,Math.round(eff.b*10)/10],layers:layers.length,px:st.fontSize};};
    const cr={};['gf-bril','gf-blun','gf-mist'].forEach(k=>{const e=document.querySelector('[data-ct="'+k+'"]');if(e)cr[k]=ratio(e);});
    return {rows:rows.length,opps,badges,count:txt(cEl),countFound:!!cEl,esc:[...new Set(esc)],
            empty:txt(emptyEl),emptyFound:!!emptyEl,ungraded:ung,ungFound:!!ungEl,
            ungGraded:m?+m[1]:null,ungTotal:m?+m[2]:null,
            filFound:!!fil,chips,vw:innerWidth,contrast:cr,
            errs:[]};
  });
}


// #476 THE TAP SCROLLS FIRST, AND THAT IS NOT DEFENSIVE BOILERPLATE - IT IS THIS GATE'S OWN FIRST RED.
// On the first run against the fix, B6, B6b and B7b failed with rows unchanged, and the cause was not the
// app: nine 44px chips wrap to three rows on a 375x730 screen, so the LAST chips sat below the fold, and
// b.tapCt takes a boundingBox and clicks that coordinate - which does nothing when the coordinate is past
// the viewport. The early chips tapped, the last two did not, which reads exactly like a filter that
// ignores its own control. This is the trap CLAUDE.md records at #386 and again at #390 ("before tapping
// anything in a new gate, ask whether an existing gate already had to fight that control"), and it cost
// this gate one run to rediscover because I reached for the harness helper without asking that question.
// A missing control reddens one assertion of its own and every later assertion is still measured against
// an unchanged screen rather than skipped [#393], so one absent chip never hides the rest of the file.
function mkTap(b,READ){
  const warned={};
  return async function tap(ct,wait){
    const loc=b.page.locator('[data-ct="'+ct+'"]').last();
    if(await loc.count()===0){
      if(!warned[ct]){L.say(false,'control '+ct+' is absent, so every assertion below that depends on it is measured against an unchanged screen rather than skipped',{ct});warned[ct]=1;}
      return READ(b);
    }
    await loc.scrollIntoViewIfNeeded();
    const box=await loc.boundingBox();
    const on=!!box&&box.y>=-0.5&&(box.y+box.height)<=b.geo.h+0.5;
    if(!on&&!warned['off'+ct]){L.say(false,'control '+ct+' could not be brought on screen to tap, so the assertions below it are not evidence',{ct,box});warned['off'+ct]=1;}
    await loc.click();
    await b.page.waitForTimeout(wait==null?650:wait);
    return READ(b);
  };
}

(async()=>{
  const GEO={w:375,h:730,safe:''};   // R19: Kunal's real phone
  const NAMEBOX='Filter by player name';

  // ══ BLOCK A. THE SHIPPED SCREEN'S OWN DEFECT, keyed on nothing this build added, so it runs on both
  //    bundles and its red on the shipped bundle is evidence rather than a missing selector.
  {
    const b=await L.launch({geo:GEO,store:STORE,name:'A-silent-filter'});
    await b.open(); await b.tile('Review'); await b.settle(1200);
    const base=await READ(b);
    L.say(base.rows===7,'A1 the seven seeded games are listed before any filtering',{rows:base.rows,opps:base.opps.length});
    L.say(base.countFound&&base.count==='7 loaded',
      'A1b the unfiltered count reads exactly "7 loaded" - the SHIPPED wording, unchanged by this build, which is what gate 61 locates with /^\\d+ loaded$/',{count:base.count});

    // drive the PRE-EXISTING name box to a state that matches nothing
    const box=b.page.locator('input[placeholder="'+NAMEBOX+'"]');
    const boxThere=await box.count()>0;
    L.say(boxThere,'A1c the pre-existing name box is on screen at 7 games (it renders above six)',{found:boxThere});
    if(boxThere){
      await box.fill('zzzznosuchplayer'); await b.settle(700);
      const z=await READ(b);
      L.say(z.rows===0,'A2a a name that matches nothing empties the list (the pre-existing filter works)',{rows:z.rows});
      // THE DEFECT: the shipped screen says nothing about why the list is empty.
      L.say(z.emptyFound,'A2 RED ON SHIPPED: an empty filtered list states that a filter emptied it, rather than leaving a blank list',{empty:z.empty});
      L.say(!!z.empty&&/zzzznosuchplayer/.test(z.empty),'A3 RED ON SHIPPED: the empty state NAMES the narrowing that produced it',{empty:z.empty});
      L.say(z.count==='0 of 7','A4 RED ON SHIPPED: the count readout attributes the emptiness - "0 of 7", not a bare "7 loaded" over no rows',{count:z.count});
      await box.fill(''); await b.settle(600);
      const back=await READ(b);
      L.say(back.rows===7&&back.count==='7 loaded','A5 clearing the name box restores all seven rows and the "N loaded" wording',{rows:back.rows,count:back.count});
    }
    await b.close();
  }

  // ══ BLOCK B. THE NEW CHIPS. Not controlled by the shipped bundle - see the header.
  {
    const b=await L.launch({geo:GEO,store:STORE,name:'B-chips'});
    await b.open(); await b.tile('Review'); await b.settle(1200);
    const base=await READ(b);
    L.say(base.filFound,'B0 a filter row is on screen at 7 games',{found:base.filFound,chips:base.chips.length});
    L.say(base.esc.length===0,'B0a nothing the player can read on this screen contains an uninterpreted escape sequence',{found:base.esc});
    const want=['gf-bril','gf-blun','gf-mist'];
    const have=base.chips.map(c=>c.ct);
    L.say(want.every(w=>have.includes(w)),'B0b the row carries a chip for each of the three grades the job names',{missing:want.filter(w=>!have.includes(w)),have});
    // the account chips: two accounts are connected, so both are offered
    L.say(have.filter(c=>/^gf-acct-/.test(c||'')).length===2,'B0c one account chip per connected account (two seeded)',{acct:have.filter(c=>/^gf-acct-/.test(c||''))});
    // GEOMETRY, at Kunal's phone: nothing in the row may paint past the viewport, and every chip meets 44px.
    // #476 SELF-CAUGHT, AND IT IS THE REASON THESE TWO CARRY `chips.length>0`. As first written these read
    // `spill.length===0` and `small.length===0` over base.chips, and on the NC-SHIPPED control - a bundle with
    // NO filter row at all - both went PASS, because [].filter(...).length is 0. Two assertions that cannot
    // fail, found by running the designed control rather than by reading them, which is the one thing that
    // finds this class. A geometry assertion over an empty set is a statement about nothing.
    const spill=base.chips.filter(c=>c.right>base.vw+0.5||c.left<-0.5);
    L.say(base.chips.length>0&&spill.length===0,'B0d no chip paints past the 375 viewport (the row wraps)',{vw:base.vw,chips:base.chips.length,spill:spill.map(c=>c.ct+'@'+c.right)});
    const small=base.chips.filter(c=>c.h<43.95);
    L.say(base.chips.length>0&&small.length===0,'B0e every filter chip is at least 44px tall - Kunal\'s tap-target standard, which invariant 1 only REPORTS',{chips:base.chips.length,small:small.map(c=>c.ct+' '+c.w+'x'+c.h)});

    const tap=mkTap(b,READ);
    const r1=await tap('gf-bril');
    // #476 THE PRESSED STATE IS THE ONE THAT HAD TO BE MEASURED, and it is the one this build got wrong:
    // antagonist B measured the accent-as-text-colour at 2.80:1 composited and 2.65:1 from painted pixels,
    // two instruments agreeing, 1.7x under AA - while '? mistake' pressed sat on exactly 4.50, where the
    // verdict belongs to the instrument rather than the design. The ratio prints its own inputs [#432].
    // #476 EVERY CHIP IS MEASURED IN ITS OWN PRESSED STATE, AND THE FIRST VERSION OF THIS WAS AN ASSERTION
    // THAT COULD NOT FAIL - found by running NC-ACCENT, the control built for exactly this fix, which came
    // back 44 PASS / 0 FAIL. The reason is the one this project keeps relearning: B1c read gf-bril and B3c
    // gf-mist, and with the accent as the text colour those two are 6.69:1 (bright cyan) and EXACTLY 4.50
    // (orange) - one comfortably passing and one passing on the nose - while the chip that actually failed,
    // gf-blun at 2.80:1 composited and 2.65:1 painted, WAS NOT ASSERTED AT ALL. A contrast assertion that
    // skips the failing colour is a statement about the other two. The `cr` map also reads whatever state
    // each chip is in, so a chip measured while NOT pressed returns its unpressed 8.07:1 and passes
    // trivially - hence one assertion per chip, each taken immediately after that chip is tapped.
    const cPress=r1.contrast&&r1.contrast['gf-bril'];
    L.say(!!cPress&&cPress.ratio>=4.5,'B1c the PRESSED brilliant chip label clears WCAG AA against its own composited background',cPress);
    L.say(r1.rows===2&&r1.opps.sort().join(',')==='opp1,opp4',
      'B1 "!! brilliant" shows exactly the two seeded games whose tally has bril>0',{rows:r1.rows,opps:r1.opps});
    L.say(r1.count==='2 of 7','B1b the count reads "2 of 7" while that filter is on',{count:r1.count});
    await tap('gf-bril');                                   // toggle off
    const r2=await tap('gf-blun');
    L.say(r2.rows===2&&r2.opps.sort().join(',')==='opp2,opp4',
      'B2 "?? blunder" shows exactly the two seeded games whose tally has blun>0',{rows:r2.rows,opps:r2.opps});
    // THE ONE THAT WAS THE DEFECT. Antagonist B measured this label at 2.80:1 composited and 2.65:1 from the
    // painted pixels when the accent was the text colour - 1.7x under AA, and the worst text in the feature.
    const cBlun=r2.contrast&&r2.contrast['gf-blun'];
    L.say(!!cBlun&&cBlun.ratio>=4.5,'B2c and so does the PRESSED blunder chip - the label that measured 2.65:1 painted before this build fixed it',cBlun);
    await tap('gf-blun');
    const r3=await tap('gf-mist');
    const cMist=r3.contrast&&r3.contrast['gf-mist'];
    // #476 B3c IS NOT CONTROLLED BY NC-ACCENT AND THIS SAYS SO RATHER THAN LEAVING IT TO BE DISCOVERED.
    // With the accent restored this chip measures EXACTLY 4.50, which clears AA's 4.5 by 0.00, so the control
    // cannot redden it and a reader must not count it as controlled. Inventing a stricter threshold than the
    // standard to make a control fire would be calibrating the assertion to the control instead of to the
    // requirement - the inverse of "a threshold belongs to the instrument it was calibrated on". B2c is what
    // makes this trio falsifiable; B3c rides on it.
    L.say(!!cMist&&cMist.ratio>=4.5,'B3c and so does the PRESSED mistake chip - which measured exactly 4.50 before this build, i.e. AA by nothing',cMist);
    L.say(r3.rows===2&&r3.opps.sort().join(',')==='opp2,opp3',
      'B3 "? mistake" shows exactly the two seeded games whose tally has mist>0',{rows:r3.rows,opps:r3.opps});
    await tap('gf-mist');
    // THE CASE TRAP: alpha's rows carry acct 'Alpha' against an id of 'cc:alpha'.
    const r5=await tap('gf-acct-alpha');
    L.say(r5.rows===4,'B4 the account chip for a MIXED-CASE stored account still returns its four rows (acctId lowercases, the chess.com row does not)',{rows:r5.rows,opps:r5.opps});
    // two filters at once must INTERSECT, not union
    const r6=await tap('gf-bril');
    L.say(r6.rows===2&&r6.opps.sort().join(',')==='opp1,opp4',
      'B5 two filters intersect: account alpha AND a brilliancy is two games, not six',{rows:r6.rows,opps:r6.opps});
    await tap('gf-acct-alpha');                             // leave brilliant on, swap account
    const r7=await tap('gf-acct-beta');
    L.say(r7.rows===0,'B6 account beta AND a brilliancy matches nothing in the fixture',{rows:r7.rows});
    L.say(r7.emptyFound&&/brilliancies/.test(r7.empty||'')&&/beta/.test(r7.empty||''),
      'B6b and the empty state names BOTH active filters',{empty:r7.empty});
    // #476 AND IT HAS TO BE REACHABLE BY A FINGER, which nothing here asserted until antagonist A's F8.
    // Measured at 375x730 it arrives BELOW THE FOLD (top 748.5 against a 730 viewport). That is not the same
    // as unreachable - `#root` is the app's scroller and docScrollY is 0 by design - so this does what
    // gates/regress/40-reachability.js does: scroll the real scrolling ancestor and RE-READ the rect, rather
    // than trusting scrollIntoView, which says yes even on an overflow:hidden box.
    const reach=await b.page.evaluate(()=>{
      const el=document.querySelector('[data-ct="glist-empty"]');if(!el)return {found:false};
      const before=el.getBoundingClientRect();
      let sc=el.parentElement,chosen=null;
      while(sc){const st=getComputedStyle(sc);if(/(auto|scroll)/.test(st.overflowY)&&sc.scrollHeight>sc.clientHeight+1){chosen=sc;break;}sc=sc.parentElement;}
      if(chosen)chosen.scrollTop=Math.min(chosen.scrollHeight,chosen.scrollTop+(before.top-innerHeight/2));
      const after=el.getBoundingClientRect();
      return {found:true,beforeTop:Math.round(before.top*10)/10,afterTop:Math.round(after.top*10)/10,
              moved:Math.round((before.top-after.top)*10)/10,onScreen:after.top>=0&&after.bottom<=innerHeight+0.5,
              scroller:chosen?(chosen.id||chosen.className||chosen.tagName):null};});
    L.say(reach.found&&reach.onScreen&&reach.moved!==0,
      'B6c the empty state is REACHABLE: scrolling its real scrolling ancestor moves it and brings it fully on screen',reach);
    // the Clear control returns the whole list
    const pre=await READ(b);
    const hasClear=pre.chips.some(c=>c.ct==='gf-clear');
    L.say(hasClear,'B7 a Clear control is offered while any filter is on',{found:hasClear});
    // #476 B7a IS THE PRECONDITION B7b COULD NOT DO WITHOUT, and its absence was antagonist A's F3 veto.
    // B7b alone reads rows===7 && count==='7 loaded', which is what the UNFILTERED screen reads - so it
    // passed on the real shipped bundle, which has no Clear control in existence, and on all three trial
    // bundles. No bundle could falsify the only behavioural assertion about Clear. Assert FIRST that the
    // screen is in the narrowed state, exactly as #385 prescribes: "when an assertion says X is absent in
    // state S, assert first that X was present just before, and that S was actually reached".
    L.say(pre.rows===0&&pre.count==='0 of 7','B7a the screen really is in the narrowed state before Clear is tapped, so B7b is measuring a restore and not the default screen',{rows:pre.rows,count:pre.count});
    const r8=await tap('gf-clear');
    L.say(r8.rows===7&&r8.count==='7 loaded','B7b Clear restores all seven rows and the unfiltered wording',{rows:r8.rows,count:r8.count});
    await b.close();
  }

  // ══ BLOCK C. THE HONESTY OF A FILTER OVER A PARTLY COMPUTED TALLY. This is the block that exists because
  //    the obvious implementation of this feature reproduces the complaint that opened the job.
  {
    const b=await L.launch({geo:GEO,store:STORE,name:'C-coverage'});
    await b.open(); await b.tile('Review'); await b.settle(1200);
    const base=await READ(b);
    L.say(!base.ungFound,'C0 with no grade filter on, no coverage line is shown (it is not noise on the default screen)',{line:base.ungraded});

    // account beta holds 3 games, ONE graded and two permanently ungraded
    const tapC=mkTap(b,READ);
    await tapC('gf-acct-beta');
    const c1=await tapC('gf-bril');
    L.say(c1.ungFound,'C1 a grade filter over a set containing ungraded games STATES its coverage',{line:c1.ungraded});
    // #476 PIN THE WHOLE SENTENCE. C2/C4/C4b read only the two digits, which is how a literal escape sequence
    // in the same sentence passed four assertions [antagonist A, F1]. One template, matched end to end.
    const SENT=/^Graded \d+ of \d+ so far — a game we haven’t graded yet can’t match this filter\.$/;
    L.say(!!c1.ungraded&&SENT.test(c1.ungraded),'C1b the coverage line is EXACTLY its template end to end - no stray escape, no drifted wording',{line:c1.ungraded});
    L.say(c1.ungGraded!==null&&c1.ungTotal!==null&&c1.ungGraded<c1.ungTotal,
      'C2 the coverage line says fewer are graded than are listed, so a partial answer cannot read as complete',{graded:c1.ungGraded,total:c1.ungTotal});
    L.say(c1.ungTotal===3,
      'C4 the coverage DENOMINATOR is the set the grade filter is choosing from (beta\'s 3), not the whole list of 7 - otherwise the sentence is true of a set nobody is looking at',{total:c1.ungTotal,rows:c1.rows});
    L.say(c1.ungGraded===1,'C4b and the numerator is the one beta game that has a tally',{graded:c1.ungGraded});

    // the same filter over a FULLY graded set must say nothing - the deterministic half of the pair
    await tapC('gf-acct-beta',500);                         // off
    const c3=await tapC('gf-acct-alpha');                   // alpha's four are all graded
    L.say(!c3.ungFound,'C3 the same grade filter over a fully graded set shows NO coverage line',{line:c3.ungraded,rows:c3.rows});
    L.say(c3.rows===2,'C3b and it still returns alpha\'s two brilliancy games',{rows:c3.rows,opps:c3.opps});
    // #476 C5 IS ANTAGONIST B's P1 VETO AS AN ASSERTION. Clause (4) made the COVERAGE line honest and left
    // the EMPTY state flatly claiming "No games match brilliancies" while the sentence 59px above admitted
    // the filter had seen 2 of 120 games - two sentences at one moment, and the one a player reads as the
    // answer is the wrong one. So in the state where the result is empty AND something is still ungraded,
    // the empty text must be SCOPED to what was graded and must not make the flat claim.
    await tapC('gf-acct-alpha',500);                        // off alpha, back to the whole list
    await tapC('gf-acct-beta');                             // beta: 1 graded, 2 ungraded, no brilliancy
    const c5=await READ(b);
    L.say(c5.rows===0&&c5.emptyFound,'C5 the empty state is on screen for a grade filter that matches nothing over a partly graded set',{rows:c5.rows,empty:c5.empty});
    L.say(!!c5.empty&&!/^No games match/.test(c5.empty),
      'C5b and it does NOT make the flat claim "No games match ..." while games are still ungraded',{empty:c5.empty});
    L.say(!!c5.empty&&/graded so far/.test(c5.empty)&&/still to grade/.test(c5.empty),
      'C5c it names what WAS graded and what is still coming, so the answer carries its own scope',{empty:c5.empty});
    await b.close();
  }

  // ══ BLOCK D. ANTAGONIST B's P0: A FILTER MUST NEVER OUTLIVE THE CONTROLS THAT SET IT.
  //    B measured this on the shipped #476 candidate: 8 games over two accounts, filter to one blunder, then
  //    remove the other account with the Imported row's x. The list drops to 6, the filter ROW is gated on
  //    >6 games and vanishes, and the filter STATE is not - so the screen read "1 of 6" with one row, ZERO
  //    elements matching [data-ct^="gf-"], no empty state (the list is not empty, so it cannot help) and,
  //    B enumerated every clickable element on the screen, NO control anywhere that could clear it. Five of
  //    six games gone, escapable only by reloading the app. That is the strongest finding of this build and
  //    it is a stranding, not a cosmetic: the affordance that cancels the narrowing is deleted by the
  //    narrowing's own side effect.
  {
    const A=[G[0],G[1]].map(row), Bv=G.slice(2).map(row);   // alpha 2, beta 5 -> 7 loaded, over the threshold
    const T2={};[...A,...Bv].forEach(g=>{T2[g.src+':'+g.date+':'+g.white+':'+g.black]={bril:0,great:1,inacc:0,mist:0,blun:(g.black==='opp5'?2:0),src:'est'};});
    const b=await L.launch({geo:GEO,name:'D-strand',store:{ct_ccuser:'',ct_liuser:'',
      ct_accts:['cc:alpha','cc:beta'],ct_acctgames:{'cc:alpha':A,'cc:beta':Bv},ct_gamestats:T2}});
    await b.open(); await b.tile('Review'); await b.settle(1200);
    const tapD=mkTap(b,READ);
    const d0=await READ(b);
    L.say(d0.rows===7&&d0.filFound,'D0 seven games over two accounts, filter row on screen',{rows:d0.rows,fil:d0.filFound});
    const d1=await tapD('gf-blun');
    L.say(d1.rows===1&&d1.count==='1 of 7','D1 the blunder filter narrows to the one seeded blunder',{rows:d1.rows,count:d1.count});
    // remove the OTHER account: the list falls to 5, BELOW the >6 threshold the filter row is gated on
    const x=b.page.locator('[aria-label="Remove alpha"]').last();
    if(await x.count()===0){L.say(false,'D2 the Imported remove control for alpha is absent, so this block is not evidence',{});}
    else{
      await x.scrollIntoViewIfNeeded(); await x.click(); await b.page.waitForTimeout(900);
      const d2=await READ(b);
      L.say(d2.filFound,'D2 THE FILTER ROW SURVIVES the list dropping below the seven-game threshold while a filter is still applied',{rows:d2.rows,count:d2.count,fil:d2.filFound,chips:d2.chips.length});
      L.say(d2.chips.some(c=>c.ct==='gf-clear'),'D2b and Clear is still on screen, so the narrowing can be undone without reloading the app',{chips:d2.chips.map(c=>c.ct)});
      const d3=await tapD('gf-clear');
      L.say(d3.rows===5&&d3.count==='5 loaded','D3 Clear restores every remaining game and the unfiltered wording',{rows:d3.rows,count:d3.count});
    }
    await b.close();
  }

  L.done('73-review-list-filter');
})().catch(e=>{L.say(false,'harness threw: '+((e&&e.stack)||e).toString().split('\n').slice(0,3).join(' | '));L.done('73-review-list-filter');});
