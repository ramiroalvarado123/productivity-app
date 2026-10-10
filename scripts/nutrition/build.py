import json, os, re
import spec_meat, spec_more, spec_plant, spec_rest, spec_extra, resolve
rows=resolve.ROWS
assert not resolve.MISS, resolve.MISS
seen=set(); out=[]
for r in rows:
    if r['name'] in seen: continue
    seen.add(r['name']); out.append(r)
out.sort(key=lambda r:(r['cat'],r['name']))
def js(s): return json.dumps(s,ensure_ascii=False)
lines=[]
for r in out:
    k,p,c,f=r['per100']
    lines.append(f"  [{js(r['name'])}, {js(r['cat'])}, {k}, {p:g}, {c:g}, {f:g}, [{r['sizes'][0]}, {r['sizes'][1]}, {r['sizes'][2]}], {js(r['aliases'])}],")
ts='''/**
 * Catálogo de alimentos: valores por 100 g (calorías, proteínas, carbohidratos y grasas).
 *
 * Fuente: USDA FoodData Central, base "SR Legacy" (dominio público, https://fdc.nal.usda.gov).
 * Los nombres están traducidos al español rioplatense y se eligió el corte/preparación
 * equivalente (p. ej. "bife de chorizo" = top loin steak). Las preparaciones argentinas que
 * la USDA no tiene (empanadas, milanesas, alfajores, mate…) son estimaciones propias.
 *
 * Archivo generado: para ampliarlo, agregá filas con el mismo formato o, mejor, sumá
 * búsquedas en scripts/nutrition/ (ver docs/architecture.md).
 */
/** [nombre, categoría, kcal/100 g, proteínas g, carbohidratos g, grasas g, [pequeña, mediana, grande] en g, alias de búsqueda] */
export type FoodRow = [string, string, number, number, number, number, [number, number, number], string];

export const FOOD_ROWS: FoodRow[] = [
'''+"\n".join(lines)+"\n];\n"
import os
dest=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','features','nutrition','data')
os.makedirs(dest,exist_ok=True)
open(dest+'/food-catalog.ts','w').write(ts)
print(len(out), len(ts))
from collections import Counter
print(Counter(r['cat'] for r in out))
