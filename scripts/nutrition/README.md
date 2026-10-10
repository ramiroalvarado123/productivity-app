# Catálogo de alimentos

`features/nutrition/data/food-catalog.ts` se genera desde USDA FoodData Central (SR Legacy, dominio público)
más algunas preparaciones argentinas estimadas a mano. No hace falta tocar esto para usar la app: sólo si
querés ampliar o corregir el catálogo.

1. Bajá `FoodData_Central_sr_legacy_food_csv_2018-04.zip` de https://fdc.nal.usda.gov/download-datasets y descomprimilo (afuera del repo).
2. `python3 scripts/nutrition/usda_load.py <carpeta con los CSV>` → deja `usda.json` en el directorio actual.
3. `python3 scripts/nutrition/q.py '<regex>' '<exclusión>' 20` para buscar un alimento en la USDA.
4. Agregá una línea `m('Nombre en español', 'Categoría', r'^regex de la USDA', [pequeña, mediana, grande], 'sinónimos')`
   en `spec_*.py` (o `manual=(kcal, prot, carbs, grasas)` por 100 g si la USDA no lo tiene).
5. `python3 scripts/nutrition/build.py` (desde esta carpeta, con `usda.json` al lado) regenera el `.ts`.
