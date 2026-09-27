// #424 before-and-after rendering for the job's definition-of-done (d), with a red box on the change.
// TWO geometries and that is deliberate: at 375x730 the honest rendering shows NOTHING changed, which is
// Kunal's Z-06 condition and is itself the claim; the change is only visible where the board is narrow.
// CT_APP picks the bundle, so "before" is the shipped #423 bytes rather than a reconstruction.
const L=require('../lib');const D=require('../drive/lesson');
const TAG=process.env.SHOT_TAG||'after';
const BOX=()=>{
  const el=document.querySelector('[data-ct="lesson-lines"]');if(!el)return null;
  const r=el.getBoundingClientRect(),row=el.parentElement.getBoundingClientRect();
  const mk=(x,y,w,h,col,lab)=>{const d=document.createElement('div');
    d.style.cssText='position:fixed;left:'+x+'px;top:'+y+'px;width:'+w+'px;height:'+h+'px;border:2px solid '
      +col+';z-index:99999;pointer-events:none;box-sizing:border-box';
    if(lab){const s=document.createElement('div');s.textContent=lab;
      s.style.cssText='position:absolute;left:0;top:-15px;font:700 10px sans-serif;color:'+col
        +';white-space:nowrap;text-shadow:0 0 3px #000';d.appendChild(s);}
    document.body.appendChild(d);};
  mk(r.left,r.top,r.width,r.height,'#ff2d55','button '+r.left.toFixed(2)+'..'+r.right.toFixed(2));
  mk(row.left,row.top-3,row.width,row.height+6,'#32d74b','its row ends '+row.right.toFixed(2));
  return {btnR:+r.right.toFixed(2),rowR:+row.right.toFixed(2),past:+(r.right-row.right).toFixed(2),
          text:(el.innerText||'').trim()};
};
(async()=>{
 for(const [name,w,h] of [['320x568',320,568],['375x730',375,730]]){
  const b=await L.launch({geo:{w,h,safe:'',label:name},name:'shot-'+TAG+'-'+name});
  await b.open();
  try{
   await D.states['demo-end'](b);
   const m=await b.page.evaluate(BOX);
   const p=await b.shot('otherlines-'+TAG+'-'+name);
   console.log(TAG,name,'->',p,JSON.stringify(m));
  }catch(e){console.log(TAG,name,'ERR',String(e.message||e).slice(0,100));}
  await b.close();
 }
 console.log('SHOTS COMPLETE '+TAG);
})();
