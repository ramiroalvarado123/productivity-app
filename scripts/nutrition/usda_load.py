import csv, json, os
import sys
D=sys.argv[1].rstrip('/')+'/'  # carpeta con los CSV de USDA SR Legacy descomprimidos
cats={r['id']:r['description'] for r in csv.DictReader(open(D+'food_category.csv'))}
foods={}
for r in csv.DictReader(open(D+'food.csv')):
    foods[r['fdc_id']]={'id':r['fdc_id'],'desc':r['description'],'cat':cats.get(r['food_category_id'],'')}
want={'1008':'kcal','1003':'p','1004':'f','1005':'c','2047':'kcal2'}
for r in csv.DictReader(open(D+'food_nutrient.csv')):
    k=want.get(r['nutrient_id'])
    if k and r['fdc_id'] in foods:
        foods[r['fdc_id']][k]=float(r['amount'])
out=[]
for f in foods.values():
    kcal=f.get('kcal', f.get('kcal2'))
    if kcal is None or 'p' not in f or 'c' not in f or 'f' not in f: continue
    out.append({'id':f['id'],'desc':f['desc'],'cat':f['cat'],'kcal':kcal,'p':f['p'],'c':f['c'],'f':f['f']})
json.dump(out,open('usda.json','w'))
print(len(out))
