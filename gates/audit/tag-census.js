// gates/audit/tag-census.js - THE FRESH CHECKER FOR A LOG TAG THAT CANNOT SAY WHICH FIXTURE IT IS ABOUT [#550 helper A;
// jobs/gate-61-a10c-asserts-the-forty-row-inference-2026-09-30, outcome.whatIsLeft: "the census is a heuristic scan (a 40-line
// window, const tag/TAG/lbl/label names only): a tag built under another name is not seen"].
// WHAT IT READS INSTEAD OF A NAME: every message actually passed to say()/note() (L.say, L.note or bare) inside a loop body
// (for/for-of/for-in, and .forEach/.map/.filter/.some/.every/.reduce/.flatMap callbacks), found by a tokenizer with brace
// matching rather than a line window, so a tag built under ANY name, at ANY distance, is followed through the loop-body
// declarations it is built from (comma declarators included).
//   inner      the message depends on the innermost loop's binding (directly or through a declaration built from it)
//   outerOnly  it depends only on an enclosing loop's binding (the old census's "reads an outer loop's fixture field")
//   none       it depends on no enclosing loop's binding: every iteration prints the same sentence
//   RANGE      a number of 2+ digits written into the message's own STRINGS (or into the strings of a loop-body declaration it
//              reads) equals one of several numbers in the loop's fixture literal - the '(cap 40)' over 9/40/41/137/200 shape
//              #474 fixed. This is the half the old census could not reach at all: that tag DID read t.n, so "inner".
// CONTROL: node gates/audit/tag-census.js --control  runs it over gate 61 as it stood before ea25f95 (the constant
// '(cap 40)' tag) and exits 1 unless RANGE fires at that tag's loop (5 messages there, measured at #550).
// KNOW ITS LIMITS: a fixture held in a variable defined outside a `const X=[...]` literal (built by a function, imported) gives
// RANGE nothing to compare; a guarded message (if(geo==='kunal761') L.say('kunal761: ...')) reads as `none`/RANGE although it
// is correct by its guard - so `none` and RANGE are candidates for a reading, never findings by themselves.
// Usage: node gates/audit/tag-census.js [dir=gates/regress] [--list] | --control
'use strict';
const fs=require('fs'),path=require('path');
const CONTROL=process.argv.includes('--control');
const LIST=process.argv.includes('--list')||CONTROL;
let dir=process.argv.slice(2).find(a=>!a.startsWith('--'))||path.join(__dirname,'..','regress');
if(CONTROL){const os=require('os'),cp=require('child_process');dir=fs.mkdtempSync(path.join(os.tmpdir(),'tagcensus-'));
  fs.writeFileSync(path.join(dir,'61-pre-ea25f95.js'),cp.execFileSync('git',['-C',path.join(__dirname,'..','..'),'show','ea25f95^:gates/regress/61-review-list-month-independence.js']));}
const KW=new Set('break case catch class const continue debugger default delete do else export extends finally for function if import in instanceof let new return super switch this throw try typeof var void while with yield await async of null true false undefined NaN Infinity'.split(' '));
function tokenize(s){ // -> [{t:type,v,i}] types: id num str tpl punc ; comments dropped
  const T=[];let i=0;const n=s.length;
  const prevSig=()=>{for(let k=T.length-1;k>=0;k--)return T[k];return null;};
  while(i<n){const c=s[i];
    if(c==='/'&&s[i+1]==='/'){while(i<n&&s[i]!=='\n')i++;continue;}
    if(c==='/'&&s[i+1]==='*'){const j=s.indexOf('*/',i+2);i=j<0?n:j+2;continue;}
    if(/\s/.test(c)){i++;continue;}
    if(c==="'"||c==='"'){let j=i+1;while(j<n&&s[j]!==c){if(s[j]==='\\')j++;j++;}T.push({t:'str',v:s.slice(i,j+1),i});i=j+1;continue;}
    if(c==='`'){ // template: record expressions' identifiers separately
      let j=i+1,exprs=[];while(j<n&&s[j]!=='`'){if(s[j]==='\\'){j+=2;continue;}if(s[j]==='$'&&s[j+1]==='{'){let d=1,k=j+2;const st=k;while(k<n&&d){if(s[k]==='{')d++;else if(s[k]==='}')d--;k++;}exprs.push(s.slice(st,k-1));j=k;continue;}j++;}
      T.push({t:'tpl',v:s.slice(i,j+1),exprs,i});i=j+1;continue;}
    if(c==='/'){const p=prevSig();const regexOk=!p||(p.t==='punc'&&!/[)\]}]/.test(p.v))||(p.t==='id'&&/^(return|typeof|case|in|of|new|delete|void|throw)$/.test(p.v));
      if(regexOk){let j=i+1,cls=false;while(j<n){if(s[j]==='\\'){j+=2;continue;}if(s[j]==='[')cls=true;else if(s[j]===']')cls=false;else if(s[j]==='/'&&!cls)break;else if(s[j]==='\n')break;j++;}j++;while(j<n&&/[a-z]/i.test(s[j]))j++;T.push({t:'re',v:s.slice(i,j),i});i=j;continue;}}
    if(/[A-Za-z_$]/.test(c)){let j=i;while(j<n&&/[\w$]/.test(s[j]))j++;T.push({t:'id',v:s.slice(i,j),i});i=j;continue;}
    if(/[0-9]/.test(c)){let j=i;while(j<n&&/[\w.]/.test(s[j]))j++;T.push({t:'num',v:s.slice(i,j),i});i=j;continue;}
    if(s.startsWith('=>',i)||s.startsWith('...',i)){const v=s.startsWith('=>',i)?'=>':'...';T.push({t:'punc',v,i});i+=v.length;continue;}
    T.push({t:'punc',v:c,i});i++;}
  return T;}
function match(T,k){const o=T[k].v,c={'(':')','{':'}','[':']'}[o];let d=0;for(let j=k;j<T.length;j++){if(T[j].t!=='punc')continue;if(T[j].v===o)d++;else if(T[j].v===c){d--;if(!d)return j;}}return T.length-1;}
const idsIn=(T,a,b)=>{const r=new Set();for(let k=a;k<=b;k++){const x=T[k];if(x.t==='id'&&!KW.has(x.v)&&!(k>0&&T[k-1].v==='.'))r.add(x.v);if(x.t==='tpl')for(const e of x.exprs)for(const m of e.matchAll(/(?<![.\w$])[A-Za-z_$][\w$]*/g))if(!KW.has(m[0]))r.add(m[0]);}return r;};
let tot={files:0,loops:0,msgs:0,inner:0,outerOnly:0,none:0};const rows=[];
for(const f of fs.readdirSync(dir).filter(x=>x.endsWith('.js')).sort()){
  const src=fs.readFileSync(path.join(dir,f),'utf8');tot.files++;
  const lineOf=(i)=>src.slice(0,i).split('\n').length;
  const T=tokenize(src);const loops=[]; // {a,b,binds:Set}
  for(let k=0;k<T.length;k++){
    // for ( ... ) body
    if(T[k].v==='for'&&T[k].t==='id'&&T[k+1]&&T[k+1].v==='('){const pe=match(T,k+1);let binds=new Set();
      const hdr=T.slice(k+2,pe);const ofI=hdr.findIndex(x=>x.t==='id'&&(x.v==='of'||x.v==='in'));
      if(ofI>=0)binds=idsIn(hdr,0,ofI-1);else{const semi=hdr.findIndex(x=>x.v===';');binds=idsIn(hdr,0,semi<0?hdr.length-1:semi-1);}
      for(const kw of ['const','let','var'])binds.delete(kw);
      const bs=pe+1;if(T[bs]&&T[bs].v==='{'){loops.push({a:bs,b:match(T,bs),binds,kind:ofI>=0?'for-'+hdr[ofI].v:'for',line:lineOf(T[k].i),it:ofI>=0?[k+2+ofI+1,pe-1]:null});}}
    // .forEach / .map ( (params) => { or function(params){
    if(T[k].v==='.'&&T[k+1]&&/^(forEach|map|filter|some|every|reduce|flatMap)$/.test(T[k+1].v)&&T[k+2]&&T[k+2].v==='('){
      const ce=match(T,k+2);let j=k+3;if(T[j]&&T[j].v==='async')j++;let binds=new Set(),bodyStart=-1;
      if(T[j]&&T[j].v==='('){const pe=match(T,j);binds=idsIn(T,j+1,pe-1);if(T[pe+1]&&T[pe+1].v==='=>'&&T[pe+2]&&T[pe+2].v==='{')bodyStart=pe+2;}
      else if(T[j]&&T[j].t==='id'&&T[j+1]&&T[j+1].v==='=>'){binds.add(T[j].v);if(T[j+2]&&T[j+2].v==='{')bodyStart=j+2;}
      if(bodyStart>0&&bodyStart<ce)loops.push({a:bodyStart,b:match(T,bodyStart),binds,kind:'.'+T[k+1].v,line:lineOf(T[k].i)});}
  }
  tot.loops+=loops.length;
  for(let k=0;k<T.length;k++){
    const x=T[k];if(x.t!=='id'||!(x.v==='say'||x.v==='note')||!T[k+1]||T[k+1].v!=='(')continue;
    if(k>0&&T[k-1].v==='.'&&!(T[k-2]&&T[k-2].v==='L'))continue;
    if(k>0&&T[k-1].v==='function')continue;
    const encl=loops.filter(l=>l.a<k&&k<l.b).sort((p,q)=>q.a-p.a); // innermost first
    if(!encl.length)continue;
    const ce=match(T,k+1);const args=[];let d=0,st=k+2;
    for(let j=k+2;j<ce;j++){const v=T[j].v;if(T[j].t==='punc'){if('([{'.includes(v))d++;else if(')]}'.includes(v))d--;else if(v===','&&d===0){args.push([st,j-1]);st=j+1;}}}
    args.push([st,ce-1]);
    const mi=x.v==='say'?1:0;if(!args[mi])continue;const [a,b]=args[mi];
    // derived names: consts in enclosing loop bodies whose initializer uses a binding (iterate to fixpoint)
    const used=idsIn(T,a,b);
    const depends=(l)=>{const set=new Set(l.binds);let grew=true;while(grew){grew=false;for(let j=l.a;j<l.b;j++){if(T[j].t==='id'&&/^(const|let|var)$/.test(T[j].v)){let e=j+1;let dd=0;for(;e<l.b;e++){const v=T[e].v;if('([{'.includes(v))dd++;else if(')]}'.includes(v))dd--;if(dd<0||(dd===0&&(v===';'||(T[e].t==='id'&&/^(const|let|var)$/.test(v)&&e>j+1))))break;}
        const parts=[];let pd=0,ps=j+1;for(let q=j+1;q<e;q++){const v=T[q].v;if(T[q].t==='punc'){if('([{'.includes(v))pd++;else if(')]}'.includes(v))pd--;else if(v===','&&pd===0){parts.push([ps,q-1]);ps=q+1;}}}parts.push([ps,e-1]);
        for(const [pa,pb] of parts){let eq=-1;for(let q=pa;q<=pb;q++)if(T[q].v==='='){eq=q;break;}if(eq<0)continue;const lhs=idsIn(T,pa,eq-1);const rhs=idsIn(T,eq+1,pb);if([...rhs].some(v=>set.has(v)))for(const v of lhs)if(!set.has(v)){set.add(v);grew=true;}}}}}return set;};
    tot.msgs++;
    const inner=depends(encl[0]);
    const hitInner=[...used].some(v=>inner.has(v));
    const hitOuter=encl.slice(1).some(l=>{const s=depends(l);return [...used].some(v=>s.has(v));});
    const cls=hitInner?'inner':hitOuter?'outerOnly':'none';tot[cls]++;
    // RANGE ARM: a number written into the message's own STRINGS (or into the strings of a loop-body const it reads) that is
    // ONE of the values the loop's fixture literal covers, when that literal covers several - the '(cap 40)' over 39/40/41 shape.
    {const L0=encl[0];if(L0.it){let [ia,ib]=L0.it;if(ia===ib&&T[ia].t==='id'){for(let q=0;q<T.length-3;q++)if(T[q].t==='id'&&/^(const|let|var)$/.test(T[q].v)&&T[q+1].v===T[ia].v&&T[q+2].v==='='&&T[q+3].v==='['){ia=q+3;ib=match(T,q+3);break;}}
      const fx=new Set();for(let q=ia;q<=ib;q++)if(T[q].t==='num'&&/^\d+$/.test(T[q].v))fx.add(+T[q].v);
      if(fx.size>=2){const strNums=new Set();const seen=new Set();const take=(a2,b2)=>{for(let q=a2;q<=b2;q++){const t=T[q];if(t.t==='str'||t.t==='tpl'){const raw=t.t==='tpl'?t.v.replace(/\$\{[^}]*\}/g,''):t.v;for(const m of raw.matchAll(/(?<![\w.#])\d+(?![\w.])/g))strNums.add(+m[0]);}
          if(t.t==='id'&&!seen.has(t.v)&&!(q>0&&T[q-1].v==='.')){seen.add(t.v);for(let r=L0.a;r<L0.b;r++)if(T[r].t==='id'&&T[r].v===t.v&&T[r+1]&&T[r+1].v==='='&&T[r-1]&&(/^(const|let|var)$/.test(T[r-1].v)||T[r-1].v===',')){let e=r+2,dd=0;for(;e<L0.b;e++){const v=T[e].v;if('([{'.includes(v))dd++;else if(')]}'.includes(v))dd--;if(dd<0||(dd===0&&(v===';'||v===',')))break;}take(r+2,e-1);break;}}}};
        take(a,b);const hit=[...strNums].filter(v=>v>=10&&fx.has(v));
        if(hit.length){tot.range=(tot.range||0)+1;rows.push(['RANGE',f+':'+lineOf(x.i),'loop@'+L0.line+' fixture numbers '+[...fx].sort((p,q)=>p-q).join(','),'constant '+hit.join(','),src.slice(T[a].i,(T[b+1]||T[b]).i).replace(/\s+/g,' ').slice(0,120)].join('\t'));}}}}
    if(cls!=='inner'){const txt=src.slice(T[a].i,(T[b+1]||T[b]).i).replace(/\s+/g,' ').slice(0,140);rows.push([cls,f+':'+lineOf(x.i),encl[0].kind+'@'+encl[0].line+' binds='+[...encl[0].binds].join(','),/\d/.test(txt)?'DIGITS':'',txt].join('\t'));}
  }
}
console.log('CENSUS '+JSON.stringify(tot));
if(LIST)for(const r of rows)console.log(r);
if(CONTROL){const n=rows.filter(r=>r.startsWith('RANGE\t61-pre-ea25f95.js:')&&/constant 40\t/.test(r)).length;
  console.log('CONTROL '+(n>=1?'OK':'RED')+': RANGE fired on '+n+' message(s) built from the constant "(cap 40)" tag of gate 61 before ea25f95');process.exit(n>=1?0:1);}
