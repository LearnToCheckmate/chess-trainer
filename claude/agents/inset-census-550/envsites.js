// node envsites.js <file>  -> one TSV row per env(safe-area-inset-*) use: line, side, css property, nearest data-ct before it on the line
const fs=require('fs');const f=process.argv[2];const L=fs.readFileSync(f,'utf8').split('\n');
for(let i=0;i<L.length;i++){const l=L[i];const re=/env\(safe-area-inset-([a-z]+)/g;let m;
  while((m=re.exec(l))){
    const before=l.slice(Math.max(0,m.index-160),m.index);
    const prop=(before.match(/([A-Za-z-]+)\s*:\s*[^,:{}]*$/)||[])[1]||'?';
    const cts=[...l.slice(0,m.index).matchAll(/data-ct=["{]'?([A-Za-z0-9_-]+)/g)];const ct=cts.length?cts[cts.length-1][1]:'-';
    const ctx=l.slice(Math.max(0,m.index-50),m.index+60).replace(/\s+/g,' ').replace(/\|/g,'/');
    console.log([i+1,m[1],prop,ct,ctx].join('\t'));
  }}
