# gates/measure-accuracy-alternatives.py - #550 item (44), REPORT-ONLY (not a gate): over the jsonl gates/measure-accuracy-vs-chesscom.js writes, the shipped
# aggregation against harmonic-floor and floor-plus-shift alternatives, chosen on the even games and reported on the odd. usage: python3 gates/measure-accuracy-alternatives.py <out.jsonl>
import json,math,sys,importlib.util
def winpct(cp): return 50+50*(2/(1+math.exp(-0.00368208*cp))-1)
rows=[r for r in (json.loads(l) for l in open(sys.argv[1]) if l.strip()) if r.get('an')]
def pp(r,side):
    an=r['an'];bk=r['book'] or 0
    ww=[winpct((an[0]['eb'] or 0)*100)]+[winpct((o['ea'] or 0)*100) for o in an]
    accs=[];idx=[]
    for i,o in enumerate(an):
        if (i%2==0)!=(side=='w'):continue
        if i<bk and o['cls'] not in ('Brilliant','Great'):continue
        accs.append(o['macc'] if isinstance(o['macc'],(int,float)) else max(0,min(100,103.1668*math.exp(-0.04354*max(0,o['wdrop'] or 0))-3.1669)));idx.append(i)
    if not accs:return None
    n=len(ww);ws=max(2,min(8,math.ceil((n-1)/10)));wt=[]
    for i in idx:
        lo=max(0,min(i-ws+1,n-ws));w=ww[lo:lo+ws]
        if len(w)<2:wt.append(0.5);continue
        m=sum(w)/len(w);v=sum((x-m)**2 for x in w)/len(w);wt.append(max(0.5,min(12,math.sqrt(v))))
    return accs,wt
def agg(accs,wt,F=0.01,shift=0):
    sw=sum(wt);W=sum(a*b for a,b in zip(accs,wt))/sw;H=len(accs)/sum(1/max(F,a) for a in accs)
    return max(15,min(99.5,(W+H)/2-shift))
D=[]
for r in rows:
    for s in 'wb':
        p=pp(r,s);cc=r.get('ccW' if s=='w' else 'ccB')
        if cc is None:cc=r.get('cc',{}).get(s) if isinstance(r.get('cc'),dict) else None
        if p is None or cc is None:continue
        D.append((p,float(cc),min(p[0])<10))
print('readings',len(D))
def ev(f,label):
    e=[f(p)-cc for p,cc,lo in D];el=[f(p)-cc for p,cc,lo in D if lo];eh=[f(p)-cc for p,cc,lo in D if not lo]
    mae=lambda x:sum(abs(v) for v in x)/len(x);ms=lambda x:sum(x)/len(x)
    w5=sum(1 for v in e if abs(v)<=5);w10=sum(1 for v in e if abs(v)<=10);o15=sum(1 for v in e if abs(v)>15)
    print('%-44s MAE %5.2f signed %+5.2f | with<10 MAE %5.2f signed %+6.2f | without MAE %5.2f signed %+5.2f | within5 %3d within10 %3d over15 %3d'%(label,mae(e),ms(e),mae(el),ms(el),mae(eh),ms(eh),w5,w10,o15))
ev(lambda p:agg(*p),'SHIPPED')
for F in (10,20,30,40,50):
    ev(lambda p,F=F:agg(*p,F=F),'harmonic floor %d'%F)
for F in (20,30,40):
  for sh in (4,6,8):
    ev(lambda p,F=F,sh=sh:agg(*p,F=F,shift=sh),'harmonic floor %d, minus %d'%(F,sh))
print('--- split-half: choose on even games, report on odd')
G=[];gi=0
for r in rows:
    for s in 'wb':
        p=pp(r,s);cc=r.get('ccW' if s=='w' else 'ccB')
        if p is None or cc is None:continue
        G.append((gi%2,p,float(cc),min(p[0])<10))
    gi+=1
best=None
for F in (5,10,15,20,25):
  for sh in range(4,14):
    tr=[abs(agg(*p,F=F,shift=sh)-cc) for h,p,cc,lo in G if h==0];m=sum(tr)/len(tr)
    if best is None or m<best[0]:best=(m,F,sh)
m,F,sh=best;te=[agg(*p,F=F,shift=sh)-cc for h,p,cc,lo in G if h==1];tl=[agg(*p,F=F,shift=sh)-cc for h,p,cc,lo in G if h==1 and lo];ts=[agg(*p)-cc for h,p,cc,lo in G if h==1]
print('chosen floor %d minus %d (train MAE %.2f); held-out n=%d MAE %.2f signed %+.2f, with<10 n=%d MAE %.2f signed %+.2f; shipped on the same held-out MAE %.2f signed %+.2f'%(F,sh,m,len(te),sum(abs(x) for x in te)/len(te),sum(te)/len(te),len(tl),sum(abs(x) for x in tl)/len(tl),sum(tl)/len(tl),sum(abs(x) for x in ts)/len(ts),sum(ts)/len(ts)))
ev(lambda p:agg(*p,F=F,shift=sh),'ALL 388 at the chosen floor %d minus %d'%(F,sh))
# the job's game
for r in rows:
    if '185163502752' in r['link']:
        for s in 'wb':
            p=pp(r,s);print('185163502752',s,'shipped %.1f chosen %.1f chess.com %s'%(agg(*p),agg(*p,F=F,shift=sh),r['ccW' if s=='w' else 'ccB']))
# ordering agreement
oa=0;on=0
for r in rows:
    pw,pb=pp(r,'w'),pp(r,'b')
    if not pw or not pb or r.get('ccW') is None or r.get('ccB') is None or r['ccW']==r['ccB']:continue
    on+=1;oa+=((agg(*pw,F=F,shift=sh)-agg(*pb,F=F,shift=sh))*(r['ccW']-r['ccB'])>0)
print('ordering agreement chosen',oa,'of',on)
