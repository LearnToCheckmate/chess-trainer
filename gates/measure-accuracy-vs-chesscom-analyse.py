# gates/measure-accuracy-vs-chesscom-analyse.py - #549 item (82). REPORT-ONLY; reads the JSONL that
# gates/measure-accuracy-vs-chesscom.js writes. The '+1 bonus' column is a WHAT-IF (a recollection that Lichess adds
# +1 to each per-move accuracy; lichess.org NOT fetched [R21]), not a claim about Lichess and not a proposal.
# REPORT-ONLY analysis of measure.js output. Recomputes gameAcc from the recorded per-move inputs (to prove the
# decomposition reproduces the shipped number), then the two halves separately and a plain mean, against chess.com.
import json, math, sys
rows=[json.loads(l) for f in sys.argv[1:] for l in open(f) if l.strip()]
seen=set(); R=[]
for r in rows:
    if r.get('err') or r['link'] in seen or r.get('an') is None: continue
    seen.add(r['link']); R.append(r)
def winpct(cp): return 50+50*(2/(1+math.exp(-0.00368208*cp))-1)
def parts(r,side):
    an=r['an']; bk=r['book'] or 0
    ww=[winpct((an[0]['eb'] or 0)*100)]+[winpct((o['ea'] or 0)*100) for o in an]
    accs=[];idx=[]
    for i,o in enumerate(an):
        if (i%2==0)!=(side=='w'): continue
        if i<bk and o['cls'] not in ('Brilliant','Great'): continue
        accs.append(o['macc'] if isinstance(o['macc'],(int,float)) else max(0,min(100,103.1668*math.exp(-0.04354*max(0,o['wdrop'] or 0))-3.1669)))
        idx.append(i)
    if not accs: return None
    n=len(ww); ws=max(2,min(8,math.ceil((n-1)/10))); wt=[]
    for i in idx:
        lo=max(0,min(i-ws+1,n-ws)); w=ww[lo:lo+ws]
        if len(w)<2: wt.append(0.5); continue
        m=sum(w)/len(w); v=sum((x-m)**2 for x in w)/len(w); wt.append(max(0.5,min(12,math.sqrt(v))))
    sw=sum(wt); weighted=sum(a*b for a,b in zip(accs,wt))/sw if sw>0 else sum(accs)/len(accs)
    harm=len(accs)/sum(1/max(0.01,a) for a in accs)
    mean=sum(accs)/len(accs)
    a1=[min(100,a+1) for a in accs]; h1=len(a1)/sum(1/max(0.01,a) for a in a1); w1=sum(a*b for a,b in zip(a1,wt))/sw if sw>0 else sum(a1)/len(a1)
    bonus=(w1+h1)/2
    clamp=lambda x:round(max(15,min(99.5,x))*10)/10
    return dict(ship=clamp((weighted+harm)/2),weighted=weighted,harm=harm,mean=mean,bonus=bonus,h1=h1,n=len(accs),low=sum(1 for a in accs if a<10),accs=accs)
out=[]
for r in R:
    for side in 'wb':
        p=parts(r,side)
        if not p: continue
        ours=r['ourW'] if side=='w' else r['ourB']; cc=r['ccW'] if side=='w' else r['ccB']
        if cc!=cc or cc==0: continue
        out.append(dict(link=r['link'],side=side,kunal=((r['white'] if side=='w' else r['black']).lower()=='kunal2023'),ours=ours,cc=cc,rep=p['ship'],w=p['weighted'],h=p['harm'],m=p['mean'],bon=max(15,min(99.5,p['bonus'])),h1=p['h1'],low=p['low'],n=p['n'],term=r['term'],result=r['result']))
def stats(xs,key):
    d=[x[key]-x['cc'] for x in xs]
    if not d: return 'n=0'
    return 'n=%d MAE %.2f mean signed %+.2f median %+.1f' % (len(d),sum(abs(e) for e in d)/len(d),sum(d)/len(d),sorted(d)[len(d)//2])
print('games',len(R),'side-readings',len(out))
print('reproduced shipped number from recorded inputs:',sum(1 for x in out if abs(x['rep']-x['ours'])<0.11),'of',len(out))
for key,name in (('ours','SHIPPED (weighted+harmonic)/2'),('w','volatility-weighted half alone'),('h','harmonic half alone'),('m','plain mean of per-move acc'),('bon','WHAT-IF +1 per-move bonus, same agg')):
    print('%-34s all: %s' % (name,stats(out,key)))
blun=[x for x in out if x['low']>0]; clean=[x for x in out if x['low']==0]
print('--- split by whether the side has a move with per-move accuracy < 10 (a blunder-class move)')
for key,name in (('ours','SHIPPED'),('w','weighted alone'),('h','harmonic alone'),('m','plain mean'),('bon','+1 bonus')):
    print('%-16s with<10: %s   |  without: %s' % (name,stats(blun,key),stats(clean,key)))
# ordering agreement: per game, does the side ranked higher agree
agree=tot=0
by={}
for x in out: by.setdefault(x['link'],{})[x['side']]=x
for k,v in by.items():
    if 'w' in v and 'b' in v and v['w']['cc']!=v['b']['cc']:
        tot+=1; agree+= (v['w']['ours']-v['b']['ours'])*(v['w']['cc']-v['b']['cc'])>0
print('ordering agreement (which side more accurate), shipped: %d of %d' % (agree,tot))
mx=[x for x in out]
print('--- per side-reading')
for x in sorted(out,key=lambda x:x['ours']-x['cc']):
    print('%s %s %s ours %5.1f cc %5.2f diff %+6.1f | weighted %5.1f harmonic %5.1f mean %5.1f +1bonus %5.1f lowMoves %d/%d | %s' % (x['link'].split('/')[-1],x['side'],'K' if x['kunal'] else ' ',x['ours'],x['cc'],x['ours']-x['cc'],x['w'],x['h'],x['m'],x['bon'],x['low'],x['n'],x['term']))
