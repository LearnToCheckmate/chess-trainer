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
//  (b) TC-HM-058b RE-KEYED AT #550 SEC-01 [docs/security-privacy-2026-11-12, Kunal "All 20, serious first"]: hiding the button had not
//      removed the switch (ct_pro=1 still granted Pro, ct_protest=1 brought the button back), so the switch itself is gone. On a store
//      holding BOTH ct_protest=1 and ct_pro=1 the sheet still shows the paid plans (Pro not granted) and offers no test unlock. This line
//      used to assert the OPPOSITE (the developer's store DID offer it), as the proof that (a)'s absence was the switch; that proof now
//      lives in gate 137's TC-R213b, which shows the same kind of read DOES see Pro when a subscription is real.
// CONTROL-RECORD: f5a3432 2026-11-11 total=4 red=1 scope=trial:4fe71d55db29 how=#550 a1: the bundle before the change (the test unlock shown to every player) - TC-HM-058a's offer line red; the denominator and 058b green; good trial ae0f65399b7d 4/0
// CONTROL-RECORD: 9a6a5c6 2026-11-12 total=4 red=1 scope=trial:79d0124fe952 how=#550 SEC-01 re-key of TC-HM-058b: the bundle before the change (ct_pro=1 grants Pro, ct_protest=1 shows the unlock) - 058b red, 058a and its DENOMINATOR green; on e617c6bd93cb 4/0
const L=require('../lib');
/* #550 antagonist A round 2, A2-10: the DENOMINATOR read /Monthly|Annual|Upgrade|Pro/ over the whole page, and a bare 'Pro' matches 'Progress'
   anywhere, so it could not show the sheet opened. It now needs BOTH plan buttons, found as buttons whose own text starts with the plan. */
// CONTROL-RECORD: df7946d 2026-11-11 total=4 red=0 scope=probe:2f17c3b52792 how=#550 antagonist A round 2, A2-10: the DENOMINATOR's own control - with NO Account sheet open, the new read() reports plans=false at Home and on Puzzles (gates/.probe/p104.js), so it can fail where the sheet did not open; with the sheet open the gate reads 4 of 4 green on t56. Its other lines keep the record above
const read=(b)=>b.page.evaluate(()=>{const t=document.body.innerText||'';const btn=(re)=>[...document.querySelectorAll('button')].some(x=>{const r=x.getBoundingClientRect();return r.width>2&&r.height>2&&re.test((x.innerText||'').trim());});return {plans:btn(/^Monthly\b/)&&btn(/^Annual\b/),test:/Unlock Pro \(test mode\)/.test(t)};});
async function sheet(store,name){const b=await L.launch({geo:'kunal761',name,store});await b.open();await b.settle(700);
  let ok=true;try{await b.page.locator('button[title="Sign in"],button[title="Account"]').first().click();await b.settle(900);}catch(e){ok=false;}
  const r=await read(b);await b.close();return {ok,...r};}
L.run(async()=>{
  const p=await sheet({},'acct-player');
  L.say(p.ok&&p.plans,'TC-HM-058a DENOMINATOR the Account sheet opened from Home on a player\'s store and shows its Pro plans',p);
  L.say(p.ok&&p.plans&&!p.test,'TC-HM-058a a player is NOT offered "Unlock Pro (test mode)" (Kunal, a1: hide it from players)',p);
  const d=await sheet({ct_protest:'1',ct_pro:'1'},'acct-dev');
  L.say(d.ok&&d.plans&&!d.test,'TC-HM-058b (re-keyed at #550 SEC-01) even on a store holding ct_protest=1 and ct_pro=1 the sheet shows the paid plans and offers no test unlock - there is no browser switch for Pro',d);
},'104-no-test-pro-for-players');
