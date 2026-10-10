import json,re
D=json.load(open('usda.json'))
PREF=[r'all grades',r'choice',r'select',r'prime']
def pick(rx, neg=None):
    p=re.compile(rx,re.I); n=re.compile(neg,re.I) if neg else None
    c=[x for x in D if p.search(x['desc']) and not (n and n.search(x['desc'])) and 'Baby' not in x['cat']]
    if not c: return None
    def key(x):
        s=x['desc']
        pr=next((i for i,r in enumerate(PREF) if re.search(r,s,re.I)),len(PREF))
        bad=1 if re.search(r'imported|Wagyu|Australian|New Zealand|restaurant|school|fast food|McDonald|Burger King|KFC|Wendy|Taco Bell|Domino|Pizza Hut|Papa John|ARBY|Subway|Dunkin|Starbucks|Applebee|Denny|Cracker Barrel|Carl|CHICK-FIL',s,re.I) else 0
        lean=1 if re.search(r'lean only',s,re.I) else 0
        return (bad,lean,pr,len(s))
    c.sort(key=key)
    return c[0]
ROWS=[]; MISS=[]
def m(name,cat,rx,sizes,aliases='',neg=None,manual=None,note=None):
    if manual:
        k,p,c,f=manual; src='manual'; desc='(manual)'
    else:
        x=pick(rx,neg)
        if not x: MISS.append((name,rx)); return
        k,p,c,f=x['kcal'],x['p'],x['c'],x['f']; desc=x['desc']
    ROWS.append({'name':name,'cat':cat,'per100':[round(k),round(p,1),round(c,1),round(f,1)],'sizes':sizes,'aliases':aliases,'desc':desc})
