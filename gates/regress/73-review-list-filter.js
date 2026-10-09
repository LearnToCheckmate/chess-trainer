// regress/73-review-list-filter.js
// GUARDS: US-R36 - "The Review list can be narrowed to the games the player is looking for, and whenever it is
//         narrowed the screen says how many games it is showing, names the narrowing when nothing matches, and
//         never presents an answer drawn from a partly computed tally as if it were complete."
// IMPLEMENTS: TC-R48, TC-R61 (block E, #503) and TC-R63 (block F plus C3/C3c and C1b/C1c, #507).
//
// ── #507 EXTENSION, AND WHAT IT CHANGED IN THIS FILE'S EXISTING ASSERTIONS.
//    US-R36 gains clause (6): the filter header's controls RESERVE THEIR SPACE, so nothing under them moves
//    when one appears. Two controls here can appear - the Clear chip and clause (4)'s coverage line - and
//    both were conditionally rendered. The closer's screen named only the Clear chip; the coverage line was
//    found by MEASURING, and it is the worse of the two.
//    THE NUMBERS, one probe over both bundles (main ebb88c8f76f7, this build 6683fe5db924), three geometries:
//      the CLEAR CHIP grows the row 94px/2 lines -> 144px/3 lines at 320x568 and moves it NOT ONE PIXEL at
//      375x730 or 375x761. So the "~50px growth" is real and is a 320-ONLY number.
//      the COVERAGE LINE costs 34px at EVERY geometry including Kunal's own, and its jump is the UNCOMMANDED
//      one: `_ungr` decays to zero as the background pass grades, so on main the line VANISHES on its own
//      seconds after the player stopped touching anything. After the fix: 34 -> 0px at 375, 34 -> 16px at 320
//      (residual, because clause (3)'s narrowed wording wraps to 3 lines there - named, not hidden).
//    BLOCK F runs at 320x568, 375x730 AND 375x761 for that reason, and the geometry list is the input axis
//    under test: a block pinned to this file's 375x730 could not have failed on the defect it is written for,
//    which nc-noreserve proves rather than argues - F2 and F3 each redden EXACTLY ONCE, at `se` alone. Per
//    #505, 761 is ADDED and 730 is NOT substituted, so no existing pin in this file moves.
//    FOUR EXISTING ASSERTIONS WERE REWRITTEN, every one of them because this build changed what they test:
//      C3   was `!ungFound` - NO ELEMENT. The line now holds its box and drops only its ink, so `!ungFound`
//           would go red on a correct build. It asserts no INK; C3c is new and asserts the box is reserved.
//      C1b  was one template regex. Two templates exist now, so it asserts EXACTLY ONE matched, and C1c is
//           new and asserts the NARROW one fired. nc-widetemplate shows why: C1b PASSES there.
//      B7, D2b  both rested on `chips.some(c=>c.ct==='gf-clear')`. This build makes the Clear chip ALWAYS
//           present (ghosted when idle), so that predicate is true on every screen and BOTH assertions would
//           have become unable to fail - created by this build's own change to the thing they assert over.
//           Both now require the chip to be PAINTED.
//    AND ONE NEW ASSERTION WAS WITHDRAWN BEFORE IT SHIPPED. F4's first draft pressed the ghosted chip and
//    asserted nothing changed. It cannot fail: the chip is ghosted only when there is no filter to clear, so
//    a fully live control would have left the screen identical and a pointerEvents:'auto' bundle would have
//    PASSED it. Replaced by three separate inertness properties. Found by asking what the control would print.
//    CLAUSE (2) OF THE CLOSER'S SCREEN IS WITHDRAWN AS A FALSE DEFECT and B6c is deliberately UNTOUCHED: the
//    band from the filter row the player has just tapped to the BOTTOM of the empty-state Clear measures
//    291.6px against a 730 viewport, 291.6 against 761 and 341.6 against 568 on the SHIPPED bundle, so it
//    fits every geometry. The 748.5 reading is at a scroll origin the player is never at. CLAUDE.md records
//    two false P0s in one night from that confusion and one of them was THIS screen (#382). B6c was already
//    the right assertion and this build does not touch it.
//    #507's CONTROLS, three, each one change from the shipping source, each reddening a DISJOINT set:
//      nc-noreserve     a7dec72c28a5   73 pass / 20 FAIL  {F1,F1b,F2,F3,F4,F4b,F4c,F4d}
//      nc-nocovreserve  757fb8c08773   91 pass /  2 FAIL  {C3,C3c}
//      nc-widetemplate  5b24fbf005b3   92 pass /  1 FAIL  {C1c}
//    SHIPPING CANDIDATE 6683fe5db924 over source 2500e53c0824: 93 pass / 0 fail. #507 names TWO bundles (a
//    mid-run revert forced a rebuild and the register flagged it itself) - CITE THE MD5, NEVER THE NUMBER.
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
// #503 BLOCK E's OWN STAMPS. Same seven games, different grading versions; 999 is an impossible version so
// this fixture cannot go quiet when GRADE_VER is next bumped. See block E's header for the case per game.
const TALLYSTALE=[
  [G[0],{bril:1,great:2,inacc:0,mist:0,blun:0,src:'review',gv:999}],
  [G[1],{bril:0,great:1,inacc:1,mist:2,blun:1,src:'est',   gv:999}],
  [G[2],{bril:0,great:0,inacc:0,mist:1,blun:0,src:'est'            }],
  [G[3],{bril:2,great:0,inacc:0,mist:0,blun:3,src:'review'         }],
  [G[4],{bril:0,great:1,inacc:0,mist:0,blun:0,src:'est',   gv:999}],
];
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
      [...document.querySelectorAll('div')].find(x=>x.children.length===0&&/graded \d+ of (?:the )?\d+/i.test(txt(x)||''));
    // #507 THE DENOMINATOR IS PARSED THROUGH BOTH TEMPLATES. The coverage sentence now names its own set when
    // the list is narrowed ("of the 4 games this filter is looking at") and keeps the bare form when it is
    // not ("of 7 so far"). `(?:the )?` is what lets ONE instrument read the shipped bundle and the fix, which
    // is the whole point of block A's design and is why C2/C4/C4b did not have to be rewritten per bundle.
    const ung=txt(ungEl), m=ung?ung.match(/graded (\d+) of (?:the )?(\d+)/i):null;
    const opps=rows.map(r=>{const m2=(r.innerText||'').match(/vs\s+(\S+)/);return m2?m2[1]:null;}).filter(Boolean);
    const badges=rows.map(r=>{const m3=(r.innerText||'').match(/^(WON|LOST|DRAW|GAME)/);return m3?m3[1]:null;});
    const fil=document.querySelector('[data-ct="glist-filters"]');
    // #507 vis AND ghost ARE WHAT STOP B7 AND D2b GOING VACUOUS. The Clear chip is now ALWAYS in the layout
    // (ghosted when there is nothing to clear), so `chips.some(c=>c.ct==='gf-clear')` is true on every screen
    // and any assertion resting on presence alone can no longer fail. Both assertions now require vis.
    const chips=fil?[...fil.querySelectorAll('button')].map(x=>{const q=x.getBoundingClientRect();
      return {ct:x.getAttribute('data-ct'),lab:txt(x),w:Math.round(q.width*10)/10,h:Math.round(q.height*10)/10,
              right:Math.round(q.right*10)/10,left:Math.round(q.left*10)/10,on:x.getAttribute('aria-pressed')==='true',
              vis:getComputedStyle(x).visibility,ghost:x.getAttribute('data-ghost')||null,
              pe:getComputedStyle(x).pointerEvents,ah:x.getAttribute('aria-hidden'),ti:x.getAttribute('tabindex')};}):[];
    // #507 the two reserved boxes, measured as BOXES (offsetHeight, scroll-independent) and as INK (visibility)
    const filOH=fil?fil.offsetHeight:null;
    const filTops=fil?[...new Set([...fil.querySelectorAll('button')].map(c=>Math.round(c.getBoundingClientRect().top)))].length:null;
    const ungBox=ungEl?{oh:ungEl.offsetHeight,vis:getComputedStyle(ungEl).visibility,ghost:ungEl.getAttribute('data-ghost')||null}:null;
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
            filOH,filTops,ungBox,
            ungInk:!!ungEl&&getComputedStyle(ungEl).visibility!=='hidden',
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
  /* #507 THE R19 CITATION IS CORRECTED, AND THE GEOMETRY IS NOT TOUCHED. This line read
     "// R19: Kunal's real phone", and R19's own text says the opposite: it SETTLED on 375x761 on
     2026-10-03 and says in terms that "the figure 730 is wrong and should be corrected wherever it
     appears". So this file was citing R19 as the authority for the one number R19 rejects. #505 found five
     such lines on main and left all five deliberately, because four were gate files its own live suite was
     loading as node subprocesses at the time; it recorded that the citations "are fixable today and do not
     wait on the dispute". This build holds the artefact lock on this file and its suite is not yet running,
     so this one is fixed and the other four are left to whoever holds their locks.
     THE NUMBER STAYS 730 ON PURPOSE. #505 measured that 730 and 761 are the SAME REGIME for this family of
     surfaces and warned: ADD kunal761, never SUBSTITUTE it, because substituting moves every pin in the
     file at once inside an unrelated build. Block F below ADDS 761 and 320x568 for the assertions that are
     new, which is the migration done the way #505 prescribed. */
  const GEO={w:375,h:730,safe:''};   // 375x730, the shorter-phone column for this file's existing pins
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
    /* #507 B7 NOW REQUIRES INK, BECAUSE PRESENCE ALONE CAN NO LONGER FAIL. The Clear chip is always in the
       layout from this build (ghosted when there is nothing to clear), so the old
       `chips.some(c=>c.ct==='gf-clear')` is TRUE ON EVERY SCREEN including the unfiltered one - an assertion
       that cannot go red, created by this build's own change to the thing it asserts over. That is the shape
       this project has recorded eleven times and it would have been the twelfth. Fixed by asserting the
       property the player actually depends on: the control is VISIBLE. */
    const clearChip=pre.chips.find(c=>c.ct==='gf-clear');
    L.say(!!clearChip&&clearChip.vis!=='hidden'&&!clearChip.ghost,
      'B7 a Clear control is offered AND PAINTED while any filter is on',{chip:clearChip});
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
    /* #507 TWO TEMPLATES EXIST NOW, SO THIS PIN ASSERTS WHICH ONE FIRED - IT IS NOT AN ALTERNATION.
       CLAUDE.md's #388 rule: an alternation that matches every branch pins nothing, and the remedy is to
       match ONE template, assert exactly one of the known templates matched, and check the number the
       template printed lies in the band that template is printed for. Here the "band" is the narrowing
       itself: the WIDE form is printed only when the grade filter is choosing from the whole loaded list,
       and the NARROW form only when an account chip or the name box has already cut it down. C1's state has
       account beta on, so 3 != 7 and the NARROW form is the one that must fire; asserting merely that one of
       the two fired would pass on a build that printed the wide form over a narrowed set, which is the exact
       sentence #476's C4 exists to forbid. */
    const COV_WIDE=/^Graded (\d+) of (\d+) so far — a game we haven’t graded yet can’t match this filter\.$/;
    const COV_NARROW=/^Graded (\d+) of the (\d+) games this filter is looking at — a game we haven’t graded yet can’t match this filter\.$/;
    const cov=(line,loadedTotal)=>{
      const w=COV_WIDE.exec(line||''),n=COV_NARROW.exec(line||'');
      const m=w||n;
      return {wide:!!w,narrow:!!n,exactlyOne:(!!w)!==(!!n),graded:m?+m[1]:null,total:m?+m[2]:null,
              branchAgrees:m?((!!n)===( (+m[2])!==loadedTotal )):false};
    };
    const cv1=cov(c1.ungraded,7);
    L.say(cv1.exactlyOne,'C1b the coverage line is EXACTLY one of the two known templates end to end - no stray escape, no drifted wording, and not something that satisfies both',{line:c1.ungraded,wide:cv1.wide,narrow:cv1.narrow});
    L.say(cv1.narrow&&cv1.branchAgrees,
      'C1c and it is the NARROW template, because beta\'s 3 is not the loaded 7 - a build printing the wide form over a narrowed set states a figure about a set nobody is looking at',
      {line:c1.ungraded,total:cv1.total,loaded:7,branchAgrees:cv1.branchAgrees});
    L.say(c1.ungGraded!==null&&c1.ungTotal!==null&&c1.ungGraded<c1.ungTotal,
      'C2 the coverage line says fewer are graded than are listed, so a partial answer cannot read as complete',{graded:c1.ungGraded,total:c1.ungTotal});
    L.say(c1.ungTotal===3,
      'C4 the coverage DENOMINATOR is the set the grade filter is choosing from (beta\'s 3), not the whole list of 7 - otherwise the sentence is true of a set nobody is looking at',{total:c1.ungTotal,rows:c1.rows});
    L.say(c1.ungGraded===1,'C4b and the numerator is the one beta game that has a tally',{graded:c1.ungGraded});

    // the same filter over a FULLY graded set must say nothing - the deterministic half of the pair
    await tapC('gf-acct-beta',500);                         // off
    const c3=await tapC('gf-acct-alpha');                   // alpha's four are all graded
    /* #507 C3's PROMISE CHANGED DELIBERATELY AND IS REWRITTEN TO THE NEW ONE, NOT DELETED AND NOT WEAKENED.
       It used to read `!c3.ungFound` - no ELEMENT. The coverage line now holds its space for as long as a
       grade filter is on and drops only its INK, because on the shipped bundle `_ungr` decays to zero as the
       background pass grades and the line VANISHED ON ITS OWN, jumping the list 34px at every geometry with
       the player touching nothing (measured both ways on both bundles with one probe: SHIPPED 34px -> 0px
       box, FIX 34px -> 34px box). So the element now exists in this state and `!ungFound` would go red on a
       correct build. WHAT C3 PROTECTED IS KEPT AND IS NOW ASSERTED MORE TIGHTLY: the player must still read
       nothing here, which is tested as computed visibility rather than as absence, AND the box must still be
       there, which the old assertion could not have told apart from the defect. Two assertions, because a
       conjunct whose halves cannot fail independently is this project's own eleventh costume of the
       check-is-the-thing-checked trap. */
    L.say(c3.ungFound&&c3.ungInk===false,'C3 over a fully graded set the coverage line paints NO INK, so it is still not noise on a screen that has nothing to report',{found:c3.ungFound,ink:c3.ungInk,vis:(c3.ungBox||{}).vis,line:c3.ungraded});
    L.say(!!c3.ungBox&&c3.ungBox.oh>0,'C3c and its BOX IS STILL RESERVED, so the list does not jump when the background grading pass finishes and the sentence stops applying',{box:c3.ungBox});
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
      /* #507 ALSO REQUIRES INK NOW - see B7. D2b's whole subject is that Clear SURVIVES when the list
         shrinks below the seven-game threshold that renders the row, and a ghost satisfies `.some(...)`
         in every state, so without `vis` this assertion would have stopped being about anything. */
      const d2Clear=d2.chips.find(c=>c.ct==='gf-clear');
      L.say(!!d2Clear&&d2Clear.vis!=='hidden'&&!d2Clear.ghost,
        'D2b and Clear is still on screen AND PAINTED, so the narrowing can be undone without reloading the app',{chip:d2Clear,chips:d2.chips.map(c=>c.ct)});
      const d3=await tapD('gf-clear');
      L.say(d3.rows===5&&d3.count==='5 loaded','D3 Clear restores every remaining game and the unfiltered wording',{rows:d3.rows,count:d3.count});
    }
    await b.close();
  }


  // ══ BLOCK E. THE GRADING-VERSION STAMP. work[3] of this gate's own job, built at #503.
  //
  //    WHAT IT IS FOR. ct_gamestats memoises a per-game tally and the background pass SKIPS any game that
  //    already has one. Before #503 "already has one" was the whole test, so a tally graded under a
  //    superseded rule was served for ever. decisions/brilliant-is-not-gated-by-who-is-winning-2026-09-23 is
  //    already decided in Kunal's words and drops brilliantGate's evBefore condition; the day it lands, this
  //    gate's own subject - the brilliancy filter - would tell a player with brilliancies that they have none.
  //
  //    WHY THIS BLOCK BRINGS ITS OWN STORE AND ITS OWN LAUNCH. Blocks A, B, C and D pin COUNTS read off the
  //    seeded tally. If this block's stale entries lived in the shared STORE, the background pass would
  //    recompute them mid-run and every count in this file would become a race - the flaky assertion #387
  //    warns about, manufactured by its own fixture. Same seven games, so every threshold and every wording
  //    the other blocks depend on is untouched; only the STAMPS differ.
  //
  //    THE STAMPS, AND EACH ONE IS A DIFFERENT CASE ON PURPOSE. 999 is an impossible version, so an entry
  //    carrying it is stale under any GRADE_VER this app will ever hold, which keeps this block from going
  //    quiet the next time the constant is bumped.
  //      g1  src:'review'  gv:999     STALE, but reviewed -> must be LEFT (E3)
  //      g2  src:'est'     gv:999     STALE -> must be RECOMPUTED (E1)
  //      g3  src:'est'     no gv      GRANDFATHERED as v1 -> must be LEFT (E2)
  //      g4  src:'review'  no gv      grandfathered + reviewed -> must be LEFT (E2b)
  //      g5  src:'est'     gv:999     STALE -> must be RECOMPUTED (E5), and it is the ORDERING WITNESS
  //      g6, g7                       no tally and no moves, so never gradeable (the file's own fixture trick)
  //
  //    E5 IS NOT A SECOND COPY OF E1 AND THIS IS THE LOAD-BEARING PART OF THE DESIGN. E2 claims g3 was left
  //    alone, and "left alone" is indistinguishable from "not reached yet" if the walk is still in flight -
  //    which is the vacuous-denominator trap wearing a timing costume. g5 sits at index 4, AFTER g3 and g4,
  //    so g5 having been recomputed PROVES the pass walked past both of them and their being unchanged is a
  //    decision rather than a race. The poll below therefore waits for BOTH g2 and g5 and only then reads the
  //    preserved three. It also gives the invalidation TWO inputs rather than one, so E1 is a measurement and
  //    not a demonstration [R18].
  //
  //    NEGATIVE CONTROLS - BUILT AND RUN AT #503, NOT PREDICTED. The command is
  //    `CT_APP=<bundle> node gates/regress/73-review-list-filter.js` at 375x730, counts are whole-file, and
  //    the bundle md5 is cited rather than a build number because a number names several bundles [#454].
  //    BLOCK E IS 16 OF THE FILE'S 61: eleven as first written, plus E6a/E6b/E7a/E7b/E7c added on two upheld
  //    antagonist vetoes. THE FIRST VERSION OF THIS LINE SAID "12 of 56" AND THE 12 WAS WRONG IN FOUR
  //    COMMITTED PLACES [R18] - here, TC-R61, the commit message and the `503 minted` register row. The
  //    count came from an `awk` that ran to END OF FILE and swallowed the file's trailing catch handler.
  //    Antagonist A measured it two ways (L.say calls inside the block, and `grep -cE '^PASS E'` on the log,
  //    both 11) and the file's own arithmetic agrees: TC-R48 records the pre-#503 file at 45, and 45+11=56,
  //    which was the total every log printed. The authority is the command, not this comment.
  //      CANDIDATE    9b39aa255045  ->  56 pass /  0 fail
  //      NC-NOSTAMP   9d1b16c16187  ->  52 pass /  4 fail: E1, E1b, E4, E5. The skip test reverted to
  //                   `if(gameStatsRef.current[k])continue;`. The ideal control - it is the shipped
  //                   behaviour this block exists for, and the stale entry comes back gv:999 unchanged after
  //                   the full 20s poll, which is the defect stated as a measurement.
  //      NC-NOREVIEW  d0992388fd5e  ->  53 pass /  3 fail: E0c, E3, E3b. The `||st.src==='review'` clause
  //                   removed from gradeCacheUsable. The reviewed game is re-graded to src:'est' and the row
  //                   badge flips to EST, which is exactly the regression the clause exists to prevent.
  //    THE CONTROLS REDDEN DISJOINT SETS, and that is the point of running several: it proves E1 is not a
  //    restatement of E3, nor E6b of either.
  //    AND THE CLAIM "NEITHER IS A RESTATEMENT OF E2" WAS NOT ESTABLISHED BY THOSE TWO, which antagonist A
  //    caught: NEITHER of them touches E2 or E2b, so nothing in this build's own evidence showed the
  //    preservation-of-unstamped assertions could fail at all. A built the two missing ones and they are
  //    cited here rather than described: NC-ABSENTSTALE (`gradeVerOf` absent -> 0, md5 bdcade045c2e) is
  //    52/4 with E2 RED ALONE in block E, and NC-ABSENT+NOREVIEW (absent -> 0 AND the review clause
  //    removed, md5 65ece67aa9f9) is 44/12 with E0c, E2, E2b, E3, E3b red. So E2 and E2b can fail; they
  //    had simply never been shown to.
  //    A COUPLING THIS HEADER USED TO DENY, also A's: NC-ABSENTSTALE reddens B2, B3 and D1 as well, because
  //    every entry in the SHARED `TALLY` is unstamped - so blocks A to D's pinned counts are stable only
  //    BECAUSE absent means current. The grandfathering decision is load-bearing for this whole file, not
  //    just for block E, and anyone changing `gradeVerOf`'s default should expect reds outside E.
  //    E0c IS COUPLED TO THE REVIEW CLAUSE AND IS DECLARED SO RATHER THAN LEFT TO BE FOUND. It proves the 999
  //    injection arrived by reading it back off g1, the one entry the shipped design preserves - so on
  //    NC-NOREVIEW, where g1 is re-graded, E0c cannot make that proof and correctly goes red. Its red there
  //    is an honest "I cannot ground E1 on this bundle", not a second finding. Reading the map EARLY instead
  //    would be independent of the clause and would also be a race against the pass, which is the trade made
  //    knowingly here: a denominator that is sometimes coupled beats one that is sometimes flaky [#387].
  {
    const T3={};
    TALLYSTALE.forEach(([g,st])=>{T3[gk(g)]=st;});
    const b=await L.launch({geo:GEO,name:'E-gradever',store:{ct_ccuser:'',ct_liuser:'',
      ct_accts:['cc:alpha','cc:beta'],
      ct_acctgames:{'cc:alpha':G.slice(0,4).map(row),'cc:beta':G.slice(4).map(row)},
      ct_gamestats:T3}});
    await b.open(); await b.tile('Review'); await b.settle(1200);

    const MAP=()=>b.page.evaluate(()=>{try{return JSON.parse(localStorage.getItem('ct_gamestats')||'{}')||{};}catch(e){return {};}});
    const K1=gk(G[0]),K2=gk(G[1]),K3=gk(G[2]),K4=gk(G[3]),K5=gk(G[4]);

    /* THE BASELINE IS THE INJECTED LITERAL T3, NOT A READ OFF THE PAGE, AND THE FIRST VERSION OF THIS BLOCK
       GOT THAT WRONG IN A WAY THAT WENT GREEN [self-caught at #503, before any control was run].
       It read a `seeded` map after b.settle(1200) and used it as the before-picture. By then the background
       pass had ALREADY recomputed the stale entries, so the before-picture printed seededGv:1 for an entry
       this fixture injects at 999 - and worse, E2's "unchanged" compared two LATE reads of the same map,
       which is satisfied by an app that recomputed g3 before either read. That is the check and the thing
       being checked collapsing into one object, for the twelfth time in this project's record, wearing a
       timing costume. The fixture constant is the only honest before-picture: it is what was injected. */
    const BASE=T3;

    // E0 THE DENOMINATORS, THREE SEPARATE ASSERTIONS AND NOT ONE CONJUNCT, because each can fail alone and a
    // compound would report the wrong cause.
    const e0=await READ(b);
    L.say(e0.rows===7,'E0 the list renders all seven fixture games, so the background pass has the whole list to walk',{rows:e0.rows});
    const early=await MAP();
    L.say(Object.keys(early).length===5,'E0b five tallies are in ct_gamestats, so the tally fixture arrived',{n:Object.keys(early).length});

    // THE POLL. Settle past the thing we are racing rather than guessing a number [#387]: wait until BOTH
    // stale est entries have been rewritten, which is also the proof the walk passed the preserved ones.
    let waited=0;
    while(waited<20000){
      const now=await MAP();
      if(now[K2]&&now[K2].gv!==999&&now[K5]&&now[K5].gv!==999)break;
      await b.page.waitForTimeout(400); waited+=400;
    }
    // a further quiet period, so "unchanged" below is read after the pass has finished rather than mid-walk
    await b.page.waitForTimeout(1500);
    const fin=await MAP();

    // E0c IS THE DENOMINATOR THAT E1 AND E5 ACTUALLY NEED, and it is why this block cannot go quiet if the
    // stamp injection ever stops working. Every "the 999 was invalidated" claim below is vacuously true on a
    // fixture whose 999 never reached the page. g1 is the one entry this design deliberately preserves, so
    // its stamp surviving at 999 is independent proof that 999 was injected in the first place.
    L.say(!!fin[K1]&&fin[K1].gv===999,'E0c THE STALE STAMP DEMONSTRABLY ARRIVED: an injected gv of 999 is still readable on the page, so the invalidation claims below are not vacuous',{g1:fin[K1]});

    const f2=fin[K2]||{}, b2=BASE[K2];
    L.say(!!fin[K2]&&f2.gv!==999,
      'E1 (TC-R61) THE INVALIDATION: a stale tally (gv 999) is RECOMPUTED rather than served, so a grading change can reach a cached count',
      {injected:b2,final:f2,waitedMs:waited});
    L.say(!!fin[K2]&&(f2.mist!==b2.mist||f2.blun!==b2.blun||f2.great!==b2.great),
      'E1b and the COUNTS moved, not just the stamp - the recompute really re-graded the game rather than restamping a stale tally in place',
      {injected:{great:b2.great,mist:b2.mist,blun:b2.blun},final:{great:f2.great,mist:f2.mist,blun:f2.blun}});
    L.say(typeof f2.gv==='number'&&f2.gv!==999,
      'E4 THE STAMP IS WRITTEN BY THE APP: the recomputed entry carries a numeric grading version, read off the app rather than pinned to a literal in this gate',
      {gv:f2.gv,type:typeof f2.gv});
    const f5=fin[K5]||{}, b5=BASE[K5];
    L.say(!!fin[K5]&&f5.gv!==999,
      'E5 THE SECOND INPUT, and the ORDERING WITNESS: the stale entry at index 4 is also recomputed, which proves the pass walked past g3 and g4',
      {injected:b5,final:f5});

    const same=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
    L.say(same(BASE[K3],fin[K3]),
      'E2 THE CACHE STILL CACHES: an UNSTAMPED tally is grandfathered as version 1 and left byte-identical to what was injected, so no player re-grades their list for nothing',
      {injected:BASE[K3],final:fin[K3]});
    L.say(same(BASE[K4],fin[K4]),
      'E2b and the same holds for an unstamped REVIEWED tally',
      {injected:BASE[K4],final:fin[K4]});
    L.say(same(BASE[K1],fin[K1])&&fin[K1]&&fin[K1].src==='review',
      'E3 THE REVIEW PROVENANCE SURVIVES STALENESS: a stale src:review tally is NOT downgraded to a depth-2 estimate by the background pass',
      {injected:BASE[K1],final:fin[K1]});
    // and the same thing read off the SCREEN rather than the store, because the badge is what the player sees
    const badge=await b.page.evaluate(()=>{
      const rows=[...document.querySelectorAll('[data-ct="game-row"]')];
      const r=rows.find(x=>/opp1/.test(x.innerText||''));
      if(!r)return null;
      return {rev:!!r.querySelector('[data-ct="gstat-rev"]'),est:!!r.querySelector('[data-ct="gstat-est"]')};
    });
    L.say(!!badge&&badge.rev&&!badge.est,
      'E3b and the row for that game still paints the reviewed badge, not the EST one, which is the half of E3 a player can actually see',
      {badge});
    await b.close();

    /* ── E6. THE STEADY STATE, AND IT IS THE HOLE ANTAGONIST A VETOED THIS BUILD FOR. ──────────────────
       Every input above is STALE (gv 999) or UNSTAMPED. Nothing carried gv === GRADE_VER - and from the
       moment #503 ships, that is the state of every entry on every phone from the second Review visit
       onward, because recordGameStats stamps the current version on every write. So the one state the
       installed base is actually IN had no input at all, and E2/E2b reach "left alone" through
       gradeVerOf's absent-means-1 DEFAULT, a path that never reads a stamp the app wrote.
       MEASURED, which is why this is an assertion and not a note: A built the one-clause mutation
       `st.gv===undefined` in place of `gradeVerOf(st)===GRADE_VER` (bundle 17dff0d433ad) - "invalidate
       anything carrying a version I do not recognise", written one clause wrong. It ABOLISHES THE CACHE:
       every game is re-graded on every single visit to the Review screen, for ever, which is the whole
       cost the cache exists to avoid. It scored 56 pass / 0 fail. I reproduced that independently at
       6f49ad6d283c before accepting the veto: 56/0, block E 11/11 green.
       WHY THE OBVIOUS VERSION OF THIS CHECK CANNOT WORK, and it took one try to see: re-seeding the
       post-pass map and asserting it is unchanged proves nothing, because a recompute of the same PGN
       produces the SAME counts and the same stamp - byte-identical whether it was served or recomputed.
       So the fixture carries the app's OWN stamp with IMPOSSIBLE counts. Sevens cannot be re-derived from
       the fixture's ten-ply PGN, so they survive if and only if the entry was genuinely served from
       cache. That also makes this the ROUND TRIP: the stamp the app WROTE is handed back to the app's own
       skip test, which nothing else here tests. */
    {
      const K2b=gk(G[1]);
      const APPGV=(fin[K2b]||{}).gv;
      const SEED={};Object.keys(fin).forEach(k=>{SEED[k]={...fin[k]};});
      SEED[K2b]={bril:7,great:7,inacc:7,mist:7,blun:7,src:'est',gv:APPGV};
      const b2=await L.launch({geo:GEO,name:'E-steady',store:{ct_ccuser:'',ct_liuser:'',
        ct_accts:['cc:alpha','cc:beta'],
        ct_acctgames:{'cc:alpha':G.slice(0,4).map(row),'cc:beta':G.slice(4).map(row)},
        ct_gamestats:SEED}});
      await b2.open(); await b2.tile('Review'); await b2.settle(1200);
      await b2.page.waitForTimeout(6000);   // far past the measured recompute window (every poll above exits at 0ms)
      const f2=await b2.page.evaluate(()=>{try{return JSON.parse(localStorage.getItem('ct_gamestats')||'{}')||{};}catch(e){return {};}});
      const g=f2[K2b]||{};
      L.say(typeof APPGV==='number','E6a the app wrote a numeric stamp for this fixture to hand back, so E6b is not vacuous',{appGv:APPGV});
      L.say(g.bril===7&&g.blun===7&&g.gv===APPGV,
        'E6b (TC-R61) THE STEADY STATE AND THE ROUND TRIP: an entry carrying the stamp THE APP ITSELF WROTE is served from cache, not recomputed - impossible counts survive untouched, so the cache the stamp governs is still a cache',
        {appGv:APPGV,final:g});
      await b2.close();
    }

    /* ── E7. THE COVERAGE LINE MUST SEE STALENESS. Antagonist B's P0, from the shipped-surface door. ───
       _ungr counted only games with NO ENTRY, so a STALE entry read as graded and the one number that
       suppresses both the coverage line and all three empty-state sentences went to 0 - exactly while the
       pass is rewriting the answer. B measured it at the real 200-game cap with everything stale: the
       blunder filter answered "26 of 200" and decayed through 27 DISTINCT COUNTS to "0 of 200" over 23.9
       seconds with glist-ungraded null at all 57 samples, ending on the flat "No games match blunders." -
       the sentence C5b above forbids. Latent today and armed for the first bump, so it ships fixed.
       THE INPUT IS A PERMANENTLY-STALE ENTRY, which is what makes this deterministic rather than a race:
       g6 carries a gv-999 tally AND a PGN with no moves, so analyzeGameCounts returns null, the caller
       records nothing, and the entry can never become current however long the pass runs. g7 gets an
       unstamped entry so it is usable and does NOT contribute - otherwise an always-ungraded game would
       make the line appear on the broken bundle too and E7 would not discriminate. */
    {
      const T4={};
      TALLYSTALE.forEach(([g,st])=>{T4[gk(g)]={...st};});
      T4[gk(G[5])]={bril:0,great:1,inacc:0,mist:0,blun:1,src:'est',gv:999};  // never gradeable: no moves
      T4[gk(G[6])]={bril:0,great:1,inacc:0,mist:0,blun:0,src:'est'};          // unstamped => usable
      const b3=await L.launch({geo:GEO,name:'E-coverage',store:{ct_ccuser:'',ct_liuser:'',
        ct_accts:['cc:alpha','cc:beta'],
        ct_acctgames:{'cc:alpha':G.slice(0,4).map(row),'cc:beta':G.slice(4).map(row)},
        ct_gamestats:T4}});
      await b3.open(); await b3.tile('Review'); await b3.settle(1200);
      await b3.page.waitForTimeout(6000);
      const tapE=mkTap(b3,READ);
      const c=await tapE('gf-blun');
      L.say(c.rows>0||c.emptyFound,'E7a the blunder filter reached a state worth reading, so E7b is not vacuous',{rows:c.rows,count:c.count,empty:c.empty});
      L.say(c.ungFound===true,
        'E7b (TC-R61) THE COVERAGE LINE SEES A STALE TALLY: a game whose tally is present but NOT USABLE is counted as not-yet-graded, so the screen states its own coverage instead of presenting a decaying answer as complete',
        {ungraded:c.ungraded,graded:c.ungGraded,total:c.ungTotal,rows:c.rows});
      L.say(!(c.empty||'').match(/^No games match/),
        'E7c and the empty state never makes the flat "No games match" claim while a stale tally is still unanswered, which is C5b applied to staleness rather than to absence',
        {empty:c.empty});
      await b3.close();
    }
  }

  /* ══ BLOCK F. #507. THE FILTER ROW RESERVES THE SPACE OF EVERY CONTROL THAT CAN APPEAR IN IT.
     CLAUDE.md: "A row that can appear must reserve its space." Two controls in this header can appear: the
     Clear chip (when any filter goes on) and the coverage line (when a grade filter is on over a set with
     ungraded games). Block C now covers the coverage line's box at C3/C3c. This block covers the ROW.

     IT RUNS AT 320x568 AND AT 375x761 AS WELL AS AT THIS FILE'S 375x730, AND THAT IS THE WHOLE REASON IT
     IS A SEPARATE BLOCK. MEASURED on the shipped bundle with one probe across three geometries: turning on
     a grade chip grows the chip row from 94px/2 lines to 144px/3 lines AT 320x568 ONLY. At 375x730 and
     375x761 the row is 94px and 2 lines in BOTH states - it does not move one pixel. So the closer's
     "consistent with the recorded ~50px growth" is TRUE AND IS A 320-ONLY NUMBER, published here with its
     geometry attached rather than as a bare figure [#411/#412: a count with no scope cannot be checked].
     A BLOCK PINNED TO THIS FILE'S 375x730 COULD NOT HAVE FAILED ON THE DEFECT IT IS WRITTEN FOR - the
     shipped bundle passes F2 and F3 at 375 - which is the #375 trap (a gate that exercises the fixed path
     twice) arriving through the geometry list instead of through a worker pool.

     F4 IS THE ONE THAT STOPS THE RESERVE BEING A HIDDEN LIVE CONTROL. A reserved box the player cannot see
     but CAN press would clear a filter with no visible cause, which is worse than the jump it replaces. */
  {
    for(const gname of ['se','kunal730','kunal761']){
      const g=L.GEOS[gname];
      const b=await L.launch({geo:g,store:STORE,name:'F-reserve-'+gname});
      await b.open(); await b.tile('Review'); await b.settle(1200);
      const tapF=mkTap(b,READ);
      const pre=await READ(b);
      const preClear=pre.chips.find(c=>c.ct==='gf-clear');

      L.say(!!preClear,'F1 ['+gname+'] the Clear chip is IN THE LAYOUT on the unfiltered screen, which is what reserves its space',{chip:preClear});
      L.say(!!preClear&&preClear.vis==='hidden'&&preClear.ghost==='1',
        'F1b ['+gname+'] and it paints NO INK there, so reserving its space does not put a control on screen with nothing to do',{chip:preClear});
      // THE ANTI-VACUITY GUARD: F2/F3 compare two states, so prove the second state really differs.
      const post=await tapF('gf-bril');
      const postClear=post.chips.find(c=>c.ct==='gf-clear');
      L.say(post.rows!==pre.rows&&!!postClear&&postClear.vis!=='hidden',
        'F2a ['+gname+'] the grade chip really went on - the row count changed AND Clear is now painted - so F2 and F3 are comparing two different states and not one state twice',
        {preRows:pre.rows,postRows:post.rows,clearVis:postClear&&postClear.vis});

      L.say(pre.filOH!=null&&post.filOH!=null&&pre.filOH===post.filOH,
        'F2 ['+gname+'] THE FILTER ROW BOX IS THE SAME HEIGHT before and after Clear appears, so nothing below it moves under the finger that just tapped a chip',
        {before:pre.filOH,after:post.filOH,delta:(post.filOH!=null&&pre.filOH!=null)?(post.filOH-pre.filOH):null,geo:gname});
      L.say(pre.filTops!=null&&post.filTops!=null&&pre.filTops===post.filTops,
        'F3 ['+gname+'] and it still occupies the same number of wrapped LINES, which is the mechanism behind F2 rather than a second reading of it',
        {before:pre.filTops,after:post.filTops,geo:gname});

      /* F4. THE BEHAVIOURAL VERSION OF THIS ASSERTION CANNOT FAIL AND I FOUND THAT BY TRYING TO CONTROL
         IT, so it is replaced rather than kept as decoration. The first draft pressed the ghosted chip's own
         coordinates and asserted the screen did not change. But the chip is ghosted ONLY when `_anyF` is
         false, and `_anyF` false means there is no filter to clear - so _clearAll() is a no-op in that state
         and a FULLY LIVE control would have left the screen identical too. A trial bundle with
         pointerEvents:'auto' restored would have PASSED it. That is this project's own "a negative control
         must cross the threshold, not just disturb the mechanism" rule failing one step earlier: there was
         no threshold to cross. Found by asking what my own control bundle would print, which is the #418
         lesson ("ask what that program would print on a case you already know is FINE").
         WHAT IS ASSERTED INSTEAD IS THE MECHANISM: three properties that each independently make the
         reserved box inert and each of which a regression can remove on its own - out of the TAP path
         (pointerEvents none), out of the ACCESSIBILITY tree (aria-hidden), out of the TAB order (tabIndex
         -1). Three separate assertions, not one conjunct, because a conjunct whose halves cannot fail
         independently is the trap this file's own header warns about. */
      const back=await tapF('gf-clear');
      L.say(back.rows===7&&back.count==='7 loaded','F4a ['+gname+'] Clear emptied the filter, so the chip under test is ghosted again for F4',{rows:back.rows,count:back.count});
      const ghostNow=back.chips.find(c=>c.ct==='gf-clear');
      L.say(!!ghostNow&&ghostNow.vis==='hidden','F4b ['+gname+'] and it is ghosted again rather than gone, so F4 is reading the reserve and not an absence',{chip:ghostNow});
      L.say(!!ghostNow&&ghostNow.pe==='none','F4 ['+gname+'] the ghosted Clear is out of the TAP path (pointerEvents none), so a press where it sits cannot clear a filter the player cannot see',{pe:ghostNow&&ghostNow.pe});
      L.say(!!ghostNow&&ghostNow.ah==='true','F4c ['+gname+'] and out of the ACCESSIBILITY tree, so a screen reader is not offered a control that does nothing',{ariaHidden:ghostNow&&ghostNow.ah});
      L.say(!!ghostNow&&ghostNow.ti==='-1','F4d ['+gname+'] and out of the TAB order, so a keyboard cannot reach it either',{tabIndex:ghostNow&&ghostNow.ti});
      await b.close();
    }
  }

  L.done('73-review-list-filter');
})().catch(e=>{L.say(false,'harness threw: '+((e&&e.stack)||e).toString().split('\n').slice(0,3).join(' | '));L.done('73-review-list-filter');});
