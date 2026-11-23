'use strict';
// gates/regress/184-review-board-full-width-in-the-home-screen-app.js - REVIEW'S BOARD IS AS WIDE AS PLAY'S ON HIS PHONE IN THE HOME
// SCREEN APP, WITH THE INSETS PADDED AS THE PHONE PADS THEM. US-R174 / TC-R263a..c.
//
// WHY: jobs/short-upright-boards-sized-to-height-2026-11-12, its first item for batch 14. Kunal, about 9:40pm EST Sun 22 Nov 2026, with a
// picture of Game review on Version 552 in the Home Screen app: "Did the sizing job complete.  The chess board still isn't full size" -
// the board about 330 of 375 and about 100pt empty under the explanation; and at 9:54pm, of Play against the computer on the same phone:
// "This board for reference is full sized". Every gate before this one read his phone as kunal761 (a 375x761 viewport, ct_safe 51,31),
// which hands the app the inset NUMBERS, pads nothing, and is not the 812 shell index.html lays the app out in - so none could see it.
// THE CAUSE (chess.jsx, search "THE ROOM IS THE SHELL'S HEIGHT"): installed, iOS reports a 375x761 LAYOUT viewport on the 375x812 screen;
// index.html's shell sizes html, body and #root to the 812 it paints, and the app's vp.h follows it (window.__ctFullH) - but the fit loop
// compared the content's bottom with documentElement.clientHeight, which is the layout viewport (761) whatever height html is given. So
// Review read 51px over, trimmed its board 375 -> 343.03 and gave the room to the explanation's box (rev-compact 156 -> 188 tall, its
// text ending 99px above the box's foot). Play's bars and move list count as absorbed slack in that loop, which is why Play was spared.
// WHAT IT READS: the bundle under test (CT_APP). Review of the Opera Game (drive/review) at ply 0, ply 16 and the last ply, then a game
// against the computer at move 0 (drive/play cpu-m0), in six launches:
//   app      L.HOME_SCREEN_APP - his phone in the Home Screen app: a 375x761 layout viewport, a 375x812 screen, the shell on (ct_fullh
//            stands in for navigator.standalone), and env(safe-area-inset-top/bottom) = 51/31 reported by Chromium itself
//            (opts.realInsets, CDP Emulation.setSafeAreaInsetsOverride), so every env() padding in the app is really there
//   812      a 375x812 layout viewport with the same real insets and no shell (how Safari reports it when it does not cut the status bar)
//   320x568-app  the same shape on a small phone: a 320x548 layout viewport on a 320x568 screen, the shell on, real insets 20/0
//            (antagonist B of batch 14 measured Review 285.03 against Play's 320 there on the shipped bundle)
//   375x761  kunal761 (ct_safe 51,31), 375x667 and 320x568 (no insets): unchanged
//   sideways 812x375 on the same 375x812 screen with ct_fullh: the shell stays off sideways, so nothing here can apply
// WHAT IT ASSERTS:
//  -  DENOMINATOR, per launch: every state reached and every board found; in app and 812 the insets read 51/31 through env(), and in
//     app the shell is on (window.__ctFullH 812, innerHeight 761); sideways the shell is off
//  a  upright: at each of the three plies Review's board is the full width (left and right gaps 1.5px or less) AND within 0.5px of
//     Play's board on the same launch; sideways: within 0.5px of Play's and the full height (gap under 1.5px)
//  c  320x568-app only: there the rows at their tightest (revFit's last step, 247) and the 20 inset leave 301.03 for the board, so the height
//     caps it: at least 301.03 and centred (the shipped #552 bundle drew 269.03; full width there would need more rows to give way,
//     which is a layout call left for Kunal, not made here)
//  b  upright: the rows stack on screen - board, bottom player bar, move strip, the explanation's box, the buttons - the buttons ending
//     inside the painted height (812 in app, the viewport elsewhere)
// KNOW ITS LIMIT: headless Chromium with Chromium's own inset override, not iOS Safari; ct_fullh stands in for navigator.standalone; one
// game at normal text size. His own look on the phone is his. His picture also showed the GAME REVIEW title row, which this launch does not
// draw (revFit counts the insets and drops it); the empty band under the explanation and the narrowed board are what it reproduces.
// CONTROL-RECORD: see gates/pairs/jobs/short-upright-boards-sized-to-height-2026-11-12--review-in-the-home-screen-app.json (the grading
// machine's breaks) and the before reading in the job's commit: on the shipped #552 bundle the app launch reads 343.03 at all three plies
// against Play's 375.03, x 16, rev-compact 562..750 with its text ending at 651.
const L=require('../lib');
const R=require('../drive/review');
const P=require('../drive/play');
R.shareAnalysis();
const H=L.HOME_SCREEN_APP;
const LAUNCHES=[
  ['app',Object.assign({},H,{store:Object.assign({},H.store,{ct_pool:'3'})}),{insets:[51,31],shell:812,ih:761,paint:812}],
  ['812',{geo:{w:375,h:812,safe:'',label:'375x812 real insets, no shell'},screen:{w:375,h:812},realInsets:'51,31',store:{ct_pool:'3'}},{insets:[51,31],shell:0,paint:812}],
  ['320x568-app',{geo:{w:320,h:548,safe:'',label:'320x568 Home Screen app: 548 layout viewport, the 568 shell, real insets 20/0'},screen:{w:320,h:568},realInsets:'20,0',store:{ct_pool:'3',ct_fullh:'1'}},{insets:[20,0],shell:568,ih:548,paint:568,capped:301.03}],
  ['375x761',{geo:'kunal761',store:{ct_pool:'3'}},{paint:761}],
  ['375x667',{geo:{w:375,h:667,safe:'',label:'375x667'},store:{ct_pool:'3'}},{paint:667}],
  ['320x568',{geo:'se',store:{ct_pool:'3'}},{paint:568}],
  ['sideways',{geo:{w:812,h:375,safe:'',label:'812x375 on a 375x812 screen'},screen:{w:375,h:812},store:{ct_pool:'3',ct_fullh:'1'}},{side:true,shell:0,paint:375}],
];
const ONLY=process.env.CT_G184_ONLY?new RegExp(process.env.CT_G184_ONLY):null;
const read=(b)=>b.page.evaluate(()=>{const R=e=>{if(!e)return null;const r=e.getBoundingClientRect();if(r.width<=0||r.height<=0)return null;return {l:Math.round(r.left*100)/100,t:Math.round(r.top*100)/100,r:Math.round(r.right*100)/100,b:Math.round(r.bottom*100)/100,w:Math.round(r.width*100)/100,h:Math.round(r.height*100)/100};};
  const q=s=>document.querySelector('[data-ct="'+s+'"]');
  const grid=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).sort((a,c)=>c.getBoundingClientRect().width-a.getBoundingClientRect().width)[0];
  return {vw:innerWidth,vh:innerHeight,board:R(grid),bot:R(q('pbar-bottom')),strip:R(q('strip-row')),rc:R(q('rev-compact')),tb:R(q('rev-toolbar'))};});
const insets=(b)=>b.page.evaluate(()=>{const m=(css)=>{const d=document.createElement('div');d.style.cssText='position:absolute;left:0;top:0;width:1px;visibility:hidden;height:'+css;document.documentElement.appendChild(d);const h=d.getBoundingClientRect().height;d.remove();return Math.round(h);};return {top:m('env(safe-area-inset-top,0px)'),bot:m('env(safe-area-inset-bottom,0px)')};});
L.run(async()=>{
  for(const [name,opts,want] of LAUNCHES){
    if(ONLY&&!ONLY.test(name))continue;
    const tag=name;let b=null,ok=true;const rev=[];let play=null,ins=null,shell=null;
    try{b=await L.launch(opts);await b.open();ins=await insets(b);shell=await b.page.evaluate(()=>({fullH:document.documentElement.classList.contains('ct-fullh')?Math.round(document.documentElement.getBoundingClientRect().height):0,ih:innerHeight}));   /* the PAINTED shell (index.html's class and html's height), not window.__ctFullH, which is what the app is handed and is the thing under test */
      await R.ensureReview(b,'opera');await R.startReview(b);
      for(const [pn,ply] of [['ply 0',0],['ply 16',16],['the last ply',99]]){await R.goPly(b,ply);await b.settle(1500);rev.push([pn,await read(b)]);}
      await P.states['cpu-m0'](b);await b.settle(1200);play=await read(b);
    }catch(e){ok=false;L.note(tag+': '+String(e).slice(0,200));}
    const allB=ok&&rev.length===3&&rev.every(([,m])=>!!m.board)&&!!play&&!!play.board;
    L.say(allB,'TC-R263 '+tag+': DENOMINATOR - Review reached at ply 0, ply 16 and the last ply and Play at move 0, a board found in each',{ok,rev:rev.map(([p,m])=>[p,m.board&&m.board.w]),play:play&&play.board&&play.board.w});
    if(want.insets)L.say(!!ins&&ins.top===want.insets[0]&&ins.bot===want.insets[1],'TC-R263 '+tag+': DENOMINATOR - env(safe-area-inset-top/bottom) read '+want.insets.join('/')+' in the page (real insets, padded as on the phone)',ins);
    if(want.shell)L.say(!!shell&&shell.fullH===want.shell&&shell.ih===want.ih,'TC-R263 '+tag+': DENOMINATOR - the Home Screen shell is on: html is ct-fullh and '+want.shell+' tall over a '+want.ih+' layout viewport',shell);
    if(want.side)L.say(!!shell&&shell.fullH===0,'TC-R263 '+tag+': DENOMINATOR - sideways the shell is off (no ct-fullh), so the shell height cannot enter',shell);
    if(!allB){if(b)await b.browser.close().catch(()=>{});continue;}
    const pw=play.board.w;
    for(const [pn,m] of rev){
      const gl=Math.round(m.board.l*100)/100,gr=Math.round((m.vw-m.board.r)*100)/100;
      if(want.side){
        const gh=Math.round((m.vh-m.board.h)*100)/100;
        L.say(Math.abs(m.board.w-pw)<=0.5&&gh<=1.5&&gh>=-0.5,'TC-R263a '+tag+' '+pn+': sideways Review\'s board is '+m.board.w+' tall-and-wide, Play\'s '+pw+', '+gh+'px short of the height',{board:m.board,play:play.board,vh:m.vh});
        continue;}
      if(want.capped){
        L.say(m.board.w>=want.capped-0.5&&Math.abs(gl-gr)<=1.5,'TC-R263c '+tag+' '+pn+': the height caps Review\'s board here (the rows at their tightest, 247, and the 20 inset leave '+want.capped+'), so it is at least '+want.capped+' and centred - '+m.board.w+' ('+gl+' left, '+gr+' right) against Play\'s '+pw,{board:m.board,play:play.board});
      }else
      L.say(Math.abs(m.board.w-pw)<=0.5&&Math.abs(gl)<=1.5&&Math.abs(gr)<=1.5,'TC-R263a '+tag+' '+pn+': Review\'s board is the full width, as Play\'s - '+m.board.w+' against Play\'s '+pw+' of '+m.vw+', '+gl+'px from the left and '+gr+'px from the right',{board:m.board,play:play.board});
      const order=!!m.bot&&!!m.strip&&!!m.rc&&!!m.tb&&m.bot.t>=m.board.b-0.5&&m.strip.t>=m.bot.b-0.5&&m.rc.t>=m.strip.b-0.5&&m.tb.t>=m.rc.b-0.5&&m.tb.b<=want.paint+0.5;
      L.say(order,'TC-R263b '+tag+' '+pn+': the rows stack on screen - board, bottom bar, move strip, the explanation\'s box, the buttons ending at '+(m.tb&&m.tb.b)+' of '+want.paint,{board:m.board,bot:m.bot,strip:m.strip,rc:m.rc,tb:m.tb});
    }
    await b.browser.close().catch(()=>{});
  }
},'184-review-board-full-width-in-the-home-screen-app');
