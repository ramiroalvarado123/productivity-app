import json,re,sys
d=json.load(open('usda.json'))
pat=re.compile(sys.argv[1],re.I)
neg=re.compile(sys.argv[2],re.I) if len(sys.argv)>2 and sys.argv[2] else None
n=int(sys.argv[3]) if len(sys.argv)>3 else 40
r=[x for x in d if pat.search(x['desc']) and not (neg and neg.search(x['desc']))]
r.sort(key=lambda x:len(x['desc']))
for x in r[:n]: print(x['id'],'|',x['cat'][:12],'|',x['desc'][:110],'|',x['kcal'],x['p'],x['c'],x['f'])
print(len(r))
