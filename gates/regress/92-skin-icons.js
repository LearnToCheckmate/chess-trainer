'use strict';
// gates/regress/92-skin-icons.js - EVERY SKIN HAS ITS OWN ICONS. TC-HM-057a..c, US-HM-15.
//
// WHY [#550, item (68) of directOpening_2026_11_11_batch10; jobs/playful-and-classic-skins-show-the-same-icon-2026-11-11].
// Kunal, about 12:54am EST Wed 11 Nov 2026, with a screenshot of the menu's Skin rows: "Why do playful and classic have the same
// Icon? I don't think that's right. We used to have different ones." #366 carried out his "all four emoji, ink-matched" choice by
// giving Classic PLAYFUL's four emoji, so the two skins' rows painted the same 🔭♟️ badge and their Home tiles differed only by tint.
// Classic gets back its own pre-#366 set (6cd1449^: 📖 🧩 📈 👑).
//
// WHAT IT ASSERTS. (a) SOURCE, read out of chess.jsx's SKINS: no two skins share their four tile icons, and no two share the
// learn+play pair the Skin row paints in its badge. (b) RENDERED, at kunal761 with the Style sheet open on its Skin rows (Look and feel -> Style since 471b3e7): the rows are
// found by their NAMES (not by a hook), every skin's row is on the sheet (the denominator), and the glyphs leading each row's text
// differ between every pair of rows - which is what he saw from his phone.
// CONTROL-RECORD: c7fe540 2026-11-11 total=6 red=3 scope=trial:fc372324eb77 how=#550 item (68): the bundle and source before the fix (Classic carrying Playful's four icons; CT_SRC = d5d803c's chess.jsx) - TC-HM-057a, b and the rendered c red (Playful = Classic, 🔭♟️); both denominators green
// CONTROL-RECORD: 0083b5a 2026-11-14 total=6 red=1 scope=trial:cc0c74f87f1f how=#550 test-system helper A, after the Style-sheet route: the tip's source with Classic's SKINS icons set back to Playful's (the #366 defect) in the BUNDLE only, CT_SRC the tip's chess.jsx - the rendered TC-HM-057c same-icons line red (Playful = Classic) while 057a/b and the denominator stay green; on the tip's own bundle 0edc98e8fa74 the gate is 6/0, and the pre-route gate (menu-discover) reads 4/2 there, both 057c lines red at 0 rows
const L=require('../lib');const MD=require('../drive/menu');
const fs=require('fs'),path=require('path');
const SRC=process.env.CT_SRC||path.join(__dirname,'..','..','chess.jsx');

L.run(async()=>{
  // ── (a) SOURCE
  const src=fs.readFileSync(SRC,'utf8');
  let SK=null;try{const i=src.indexOf('const SKINS=[');let j=i+'const SKINS='.length,d=0;
    for(;j<src.length;j++){const c=src[j];if(c==='[')d++;else if(c===']'){d--;if(d===0)break;}}
    SK=new Function('return '+src.slice(i+'const SKINS='.length,j+1))();}catch(e){L.note('SKINS did not parse: '+String(e).slice(0,120));}
  L.say(Array.isArray(SK)&&SK.length>=3,'TC-HM-057a DENOMINATOR SKINS read out of '+path.basename(SRC)+': '+(SK?SK.map(s=>s.name).join(', '):'none'),{n:SK&&SK.length});
  if(Array.isArray(SK)){
    const sets=SK.map(s=>({n:s.name,all:['learn','puzzle','analyze','play'].map(k=>s.icons[k]).join(' '),row:s.icons.learn+s.icons.play}));
    const dupAll=[],dupRow=[];
    for(let i=0;i<sets.length;i++)for(let j=i+1;j<sets.length;j++){
      if(sets[i].all===sets[j].all)dupAll.push(sets[i].n+' = '+sets[j].n+' ('+sets[i].all+')');
      if(sets[i].row===sets[j].row)dupRow.push(sets[i].n+' = '+sets[j].n+' ('+sets[i].row+')');}
    L.say(dupAll.length===0,'TC-HM-057a no two skins share their four tile icons ('+sets.map(s=>s.n+': '+s.all).join(' | ')+')',dupAll);
    L.say(dupRow.length===0,'TC-HM-057b no two skins share the learn+play badge their Skin row paints ('+sets.map(s=>s.n+' '+s.row).join(', ')+')',dupRow);
  }
  // ── (b) RENDERED
  /* #553 B2 [jobs/playful-and-classic-skins-show-the-same-icon-2026-11-11]: CT_G92_GEO picks the rendered half's geometry (a GEOS
     name or WxH; default kunal761, his phone), so the pair can grade it at 320x568 too. Every rendered line carries its geometry. */
  const GQ=process.env.CT_G92_GEO||'kunal761';const GM=/^(\d+)x(\d+)$/.exec(GQ);
  const GEO=GM?{w:+GM[1],h:+GM[2],safe:''}:GQ;const GN=GM?GQ:(L.GEOS[GQ]?L.GEOS[GQ].w+'x'+L.GEOS[GQ].h:GQ);
  const b=await L.launch({geo:GEO,name:'skin-rows',store:{}});await b.open();
  /* #550 test-system helper A: the Skin rows left the menu sheet at 471b3e7 (build-menu-one-screen) for their own Style sheet
     (skinOpen, opened from Look and feel's 'Style' row), so menu-discover no longer reaches them and 057c read 0 rows. The route is
     drive/menu's own menu-skin-pro path up to the sheet: Look and feel, then Style. And the row's two icons are now
     two flex items, so innerText reads '📖\n👑\nClassic...' (measured on 0edc98e8fa74): the lead before the name may hold several
     whitespace-separated glyphs, so it is matched as any run of non-letters rather than one \S* token. */
  let rows=[];try{await MD.states['menu-look'](b);await MD.lookTap(b,'^Style',600);await b.settle(500);
    rows=await b.page.evaluate((names)=>{const out=[];for(const n of names){const x=[...document.querySelectorAll('button')].find(e=>new RegExp('^[^A-Za-z]*'+n+'\\b').test((e.innerText||'').trim())&&/\n/.test(e.innerText||''));
      if(x){const t=(x.innerText||'').trim();out.push({n,lead:t.slice(0,t.indexOf(n)).replace(/\s+/g,''),text:t.replace(/\s+/g,' ').slice(0,60)});}}return out;},SK?SK.map(s=>s.name):['Playful','Classic','Medieval']);}catch(e){L.note('menu not reached: '+String(e).slice(0,120));}
  const want=SK?SK.length:3;
  L.say(rows.length===want,GN+': TC-HM-057c DENOMINATOR the menu shows a Skin row for each of the '+want+' skins, found by name ('+rows.map(r=>r.n).join(', ')+')',rows);
  const same=[];for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++)if(rows[i].lead&&rows[i].lead===rows[j].lead)same.push(rows[i].n+' = '+rows[j].n+' ('+rows[i].lead+')');
  L.say(rows.length===want&&rows.every(r=>r.lead.length>0)&&same.length===0,GN+': TC-HM-057c on the menu every Skin row leads with its own icons ('+rows.map(r=>r.n+' '+r.lead).join(', ')+')',same);
  await b.close();
  // ── (c) RENDERED HOME TILES [#553 B2, TC-HM-057d; the job's ifNotDone: 'indistinguishable in the Skin rows AND on the Home tiles'].
  // Each skin is chosen by its stored index (ct_skin) on a fresh launch; the four Home tiles are found by their LABELS, and the glyph
  // each paints in its icon box (the tile button's first child) is read. Precondition per skin: the app booted on that skin (ct_skin
  // reads back) and all four tiles were found. Then no two skins paint the same four glyphs.
  const homes=[];
  for(let i=0;i<(SK?SK.length:3);i++){
    const h=await L.launch({geo:GEO,name:'skin-home-'+i,pro:true,store:{ct_skin:String(i)}});   /* pro: Playful and Medieval are Pro skins, so without a subscriber Home paints Classic whatever ct_skin says (skEff) */await h.open();await h.settle(600);
    const r=await h.page.evaluate(()=>{const want=['Discover','Puzzles','Review','Play'];const out={};
      for(const w of want){const x=[...document.querySelectorAll('button')].find(e=>{const q=e.getBoundingClientRect();if(q.width<1)return false;
        const kids=[...e.children];return kids.length>=2&&(kids[1].innerText||'').trim()===w;});
        if(x)out[w]=(x.children[0].innerText||'').replace(/\s+/g,'');}
      let sk=null;try{sk=localStorage.getItem('ct_skin');}catch(e){}return {out,sk};});
    const n=Object.keys(r.out).filter(k=>r.out[k]).length;
    L.say(String(r.sk)===String(i)&&n===4,GN+': TC-HM-057d PRECONDITION Home is up on skin '+(SK?SK[i].name:i)+' (ct_skin '+r.sk+') with its four tiles found by label ('+n+' of 4)',r);
    homes.push({n:SK?SK[i].name:String(i),set:['Discover','Puzzles','Review','Play'].map(k=>r.out[k]||'').join(' ')});
    await h.close();
  }
  const sameH=[];for(let i=0;i<homes.length;i++)for(let j=i+1;j<homes.length;j++)if(homes[i].set===homes[j].set)sameH.push(homes[i].n+' = '+homes[j].n+' ('+homes[i].set+')');
  L.say(homes.length>=3&&homes.every(x=>x.set.replace(/ /g,'').length>0)&&sameH.length===0,GN+': TC-HM-057d on Home no two skins paint the same four tile icons ('+homes.map(x=>x.n+': '+x.set).join(' | ')+')',sameH);
},'92-skin-icons');
