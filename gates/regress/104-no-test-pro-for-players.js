'use strict';
// gates/regress/104-no-test-pro-for-players.js - THE ACCOUNT SHEET OFFERS NO "Unlock Pro (test mode)" TO A PLAYER. TC-HM-058a..b, US-HM-17.
//
// WHY [#550; docs/app-audit-2026-11-11 AUD-H14, P1: "Unlock Pro (test mode)" sat in the shipped Account sheet for every player -
// one tap turned Pro on with no sign-in and no payment (measured there: button 275x36 at y 540, the badge then read ACTIVE);
// Kunal's answer a1 on questions/B10-Q1, Wed 11 Nov 2026: "Hide it from players"]. The button now renders only when that device
// has opted in as a developer (localStorage ct_protest=1).
//
// WHAT IT ASSERTS, at kunal761, Home -> the sign-in button (top right) -> the Account sheet, signed out:
//  (a) TC-HM-058a on a player's store the sheet is open (DENOMINATOR: its plan buttons are on screen) and NO element reads
//      "Unlock Pro (test mode)".
//  (b) TC-HM-058b on a developer's store (ct_protest=1) the same sheet DOES offer it - so the absence in (a) is the switch,
//      and not a renamed or moved button the selector would miss.
const L=require('../lib');
const read=(b)=>b.page.evaluate(()=>{const t=document.body.innerText||'';return {plans:/Monthly|Annual|Upgrade|Pro/.test(t),test:/Unlock Pro \(test mode\)/.test(t)};});
async function sheet(store,name){const b=await L.launch({geo:'kunal761',name,store});await b.open();await b.settle(700);
  let ok=true;try{await b.page.locator('button[title="Sign in"],button[title="Account"]').first().click();await b.settle(900);}catch(e){ok=false;}
  const r=await read(b);await b.close();return {ok,...r};}
L.run(async()=>{
  const p=await sheet({},'acct-player');
  L.say(p.ok&&p.plans,'TC-HM-058a DENOMINATOR the Account sheet opened from Home on a player\'s store and shows its Pro plans',p);
  L.say(p.ok&&p.plans&&!p.test,'TC-HM-058a a player is NOT offered "Unlock Pro (test mode)" (Kunal, a1: hide it from players)',p);
  const d=await sheet({ct_protest:'1'},'acct-dev');
  L.say(d.ok&&d.test,'TC-HM-058b on a developer\'s store (ct_protest=1) the same sheet DOES offer it, so the absence above is the switch and not a missed selector',d);
},'104-no-test-pro-for-players');
