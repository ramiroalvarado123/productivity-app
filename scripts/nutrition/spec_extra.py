from resolve import m
def U(u): return [round(u*0.7), u, round(u*1.5)]
FR='Frutas'; VE='Verduras'; C='Carnes vacunas'; A='Aves'; P='Cerdo'; F='Pescados y mariscos'; M=[80,150,250]; CE='Cereales y pastas'
for n,rx,s,a in [
 ('Lima','^Limes, raw',U(45),'lima limon verde'),
 ('Chirimoya','^Cherimoya, raw',[100,200,350],'chirimoya'),
 ('Guayaba','^Guavas, common, raw',U(55),'guayaba'),
 ('Lichi','^Litchis, raw',[30,60,100],'lichi litchi'),
 ('Tuna (higo chumbo)','^Prickly pears, raw',U(100),'tuna higo chumbo nopal'),
 ('Tamarindo','^Tamarinds, raw',[10,25,50],'tamarindo'),
 ('Grosellas','^Currants, red and white, raw',[30,60,100],'grosellas'),
 ('Arándanos rojos (cranberries)','^Cranberries, raw',[30,60,100],'cranberries arandanos rojos'),
 ('Nectarina','^Nectarines, raw',U(140),'nectarina pelon'),
 ('Pera asiática (nashi)','^Pears, asian, raw',U(200),'pera asiatica nashi'),
 ('Kumquat','^Kumquats, raw',[20,40,80],'kumquat quinoto'),
 ('Plátano macho (cocinar)','^Plantains, yellow, raw',[80,150,250],'platano macho'),
 ('Jugo de manzana','^Apple juice, canned or bottled, unsweetened',[150,250,350],'jugo manzana zumo'),
 ('Jugo de uva','^Grape juice, canned or bottled, unsweetened',[150,250,350],'jugo uva zumo'),
 ('Jugo de ananá','^Pineapple juice, canned or bottled, unsweetened, with added ascorbic acid',[150,250,350],'jugo anana zumo'),
 ('Ananá en lata','^Pineapple, canned, juice pack, drained',[60,120,200],'anana lata'),
 ('Duraznos en lata','^Peaches, canned, juice pack, solids and liquids',[60,120,200],'duraznos lata almibar'),
 ('Coco rallado','^Nuts, coconut meat, dried \\(desiccated\\), not sweetened',[5,10,20],'coco rallado seco'),
 ('Agua de coco','^Nuts, coconut water \\(liquid from coconuts\\)',[150,250,350],'agua coco'),
]: m(n,FR,rx,s,a)
for n,rx,s,a in [
 ('Kale','^Kale, raw',[20,40,80],'kale col rizada'),
 ('Repollitos de Bruselas, hervidos','^Brussels sprouts, cooked, boiled, drained, without salt',[60,100,180],'repollitos bruselas coles'),
 ('Lechuga criolla','^Lettuce, green leaf, raw',[20,40,80],'lechuga criolla verde'),
 ('Lechuga morada','^Lettuce, red leaf, raw',[20,40,80],'lechuga morada colorada'),
 ('Lechuga repollada (iceberg)','^Lettuce, iceberg',[20,50,100],'lechuga repollada iceberg'),
 ('Endibia','^Endive, raw',[20,40,80],'endibia endivia achicoria escarola'),
 ('Berro','^Watercress, raw',[10,25,50],'berro'),
 ('Tomate cherry','^Tomatoes, red, ripe, raw, year round average',[30,60,100],'tomate cherry cherrys'),
 ('Tomate perita, en lata','^Tomatoes, red, ripe, canned, packed in tomato juice',[60,120,200],'tomate perita lata pelado triturado'),
 ('Tomate seco','^Tomatoes, sun-dried',[10,20,40],'tomate seco deshidratado'),
 ('Pimiento amarillo','^Peppers, sweet, yellow, raw',U(120),'pimiento amarillo morron'),
 ('Ají picante','^Peppers, hot chili, red, raw',[5,10,20],'aji picante chile'),
 ('Morrón, en conserva','^Peppers, sweet, red, (canned|sauteed|cooked)|^Peppers, sweet, red, raw',[30,60,100],'morron conserva asado'),
 ('Jengibre','^Ginger root, raw',[2,5,10],'jengibre'),
 ('Brotes de soja','^Mung beans, mature seeds, sprouted, raw',[30,60,100],'brotes soja alfalfa germinados'),
 ('Hongos portobello','^Mushrooms, portabella, raw',[40,80,150],'portobello hongos champinon grande'),
 ('Hongos shiitake','^Mushrooms, shiitake, cooked, without salt',[40,80,150],'shiitake hongos'),
 ('Espinaca, congelada','^Spinach, frozen, chopped or leaf, unprepared',[40,80,150],'espinaca congelada'),
 ('Mix de verduras congeladas','^Vegetables, mixed, frozen, cooked, boiled, drained, without salt',[60,120,200],'verduras mixtas congeladas salteado'),
 ('Zanahoria rallada','^Carrots, raw',[30,60,100],'zanahoria rallada ensalada'),
 ('Zapallo, hervido','^Pumpkin, cooked, boiled, drained, without salt',[80,150,250],'zapallo calabaza hervido pure'),
 ('Repollo, hervido','^Cabbage, cooked, boiled, drained, without salt',[60,100,180],'repollo col hervido'),
 ('Nabo, crudo','^Turnips, raw',[40,80,150],'nabo crudo'),
 ('Cebolla, salteada','^Onions, sauteed|^Onions, cooked, boiled, drained, without salt',[30,60,100],'cebolla salteada hervida'),
  ('Papa, hervida sin cáscara','^Potatoes, boiled, cooked without skin, flesh, without salt',U(150),'papa hervida pelada'),
 ('Puré de calabaza (zapallo)','^Pumpkin, canned, without salt',[60,120,200],'pure zapallo calabaza'),
 ('Maíz, granos (choclo) en lata','^Corn, sweet, white, canned, whole kernel, drained solids',[40,80,150],'maiz choclo granos lata'),
]: m(n,VE,rx,s,a)
for n,rx,s,a in [
 ('Pollo, pechuga con piel, al horno','^Chicken, broilers or fryers, breast, meat and skin, cooked, roasted',M,'pollo pechuga con piel horno'),
 ('Pollo, muslo sin piel, hervido','^Chicken, broilers or fryers, thigh, meat only, cooked, stewed',M,'pollo muslo hervido'),
 ('Pollo, pechuga hervida (desmenuzada)','^Chicken, broilers or fryers, breast, meat only, cooked, stewed',M,'pollo pechuga hervida desmenuzada'),
 ('Pollo, muslo con piel, crudo','^Chicken, broilers or fryers, thigh, meat and skin, raw',M,'pollo muslo crudo con piel'),
 ('Pollo frito (con rebozado)','^Chicken, broilers or fryers, breast, meat and skin, cooked, fried, batter',M,'pollo frito rebozado'),
 ('Pavo, muslo, al horno','^Turkey, retail parts, drumstick, meat only, cooked, roasted',M,'pavo muslo'),
 ('Pavo molido, cocido','^Turkey, ground, 93% lean, 7% fat, pan-broiled crumbles|^Turkey, ground, cooked',M,'pavo picado molido'),
 ('Hígado de cerdo, cocido','^Pork, fresh, variety meats and by-products, liver, cooked, braised',M,'higado cerdo chancho'),
 ('Jamón del cerdo (pernil), al horno','^Pork, fresh, leg \\(ham\\), (rump half|shank half), separable lean and fat, cooked, roasted',M,'pernil cerdo horno'),
 ('Lomo de cerdo, crudo','^Pork, fresh, loin, whole, separable lean and fat, raw',M,'lomo cerdo crudo'),
 ('Costilla de cerdo, a la parrilla','^Pork, fresh, backribs, separable lean and fat, cooked, roasted',M,'costilla cerdo parrilla barbacoa bbq'),
 ('Salchicha parrillera','^Sausage, Italian, pork, mild, cooked, pan-fried',[70,140,210],'salchicha parrillera cerdo italiana'),
 ('Salchicha de pollo','^Frankfurter, chicken',[50,100,150],'salchicha pollo pavo'),
 ('Pastrón','^Beef, cured, pastrami',[20,40,80],'pastron fiambre'),
 ('Bondiola feteada (fiambre)','^Pork, cured, ham and water product|^Ham, sliced, regular',[20,40,80],'bondiola fiambre cerdo feteada'),
 ('Lomito ahumado','^Pork, cured, ham, boneless|^Ham, sliced, extra lean',[20,40,80],'lomito ahumado fiambre'),
 ('Hamburguesa vacuna (cruda)','^Beef, ground, 85% lean meat / 15% fat, patty, raw|^Beef, ground, 85% lean meat / 15% fat, raw',[80,115,170],'hamburguesa vacuna cruda medallon'),
 ('Carne al horno con papas','^Beef, round, top round roast.*cooked, roasted',[100,200,300],'carne horno papas asado plato'),
 ('Asado de falda, al horno','^Beef, plate, inside skirt|^Beef, brisket, flat half, separable lean and fat, trimmed to 0" fat, all grades, cooked, braised',M,'asado falda horno'),
 ('Pescado blanco, al vapor','^Fish, haddock, cooked, dry heat|^Fish, cod, Atlantic, cooked, dry heat',M,'pescado blanco vapor abadejo eglefino'),
 ('Bacalao salado, desalado','^Fish, cod, Atlantic, dried and salted',[50,100,180],'bacalao salado desalado'),
 ('Anchoas en aceite','^Fish, anchovy, european, canned in oil, drained solids',[10,20,40],'anchoas anchoa aceite lata'),
 ('Tilapia, a la plancha','^Fish, tilapia, cooked, dry heat',M,'tilapia pescado plancha'),
 ('Pangasio o panga, a la plancha','^Fish, catfish, channel, farmed, cooked, dry heat',M,'panga pangasio pescado'),
 ('Langostinos, rebozados','^Crustaceans, shrimp, mixed species, cooked, breaded and fried',[50,100,180],'langostinos camarones rebozados'),
 ('Almejas, cocidas','^Mollusks, clam, mixed species, cooked, moist heat',[50,100,180],'almejas mariscos'),
 ('Langosta, cocida','^Crustaceans, lobster, northern, cooked, moist heat',[60,120,200],'langosta mariscos'),
]: m(n,C if n.startswith(('Pastr','Hamb','Alb','Carne','Asado','Jam')) else (A if n.startswith(('Pollo','Pavo')) else (F if n.startswith(('Pesc','Baca','Anch','Tila','Pang','Lang','Alme')) else P)),rx,s,a)
for n,rx,s,a in [
 ('Arroz yamaní, hervido','^Rice, brown, long-grain, cooked',[100,180,300],'arroz yamani integral hervido'),
 ('Arroz con leche','^Rice pudding|^Puddings, rice, ready-to-eat',[80,150,250],'arroz con leche postre'),
 ('Fideos de arroz, hervidos','^Rice noodles, cooked',[100,180,300],'fideos arroz hervidos'),
 ('Fideos de huevo (tallarines), hervidos','^Noodles, egg, cooked, enriched, with added salt|^Noodles, egg, enriched, cooked',[100,180,300],'tallarines fideos huevo hervidos'),
 ('Trigo burgol (bulgur), cocido','^Bulgur, cooked',[100,180,300],'burgol bulgur trigo cocido'),
 ('Trigo sarraceno, cocido','^Buckwheat groats, roasted, cooked',[100,180,300],'trigo sarraceno alforfon cocido'),
 ('Cebada perlada, cocida','^Barley, pearled, cooked',[100,180,300],'cebada perlada cocida'),
 ('Mijo, cocido','^Millet, cooked',[100,180,300],'mijo cocido'),
 ('Salvado de avena','^Oat bran, cooked|^Oat bran, raw',[10,20,40],'salvado avena'),
 ('Harina de arroz','^Rice flour, white, unenriched',[10,30,100],'harina arroz'),
 ('Harina de garbanzo','^Chickpea flour|^Chickpeas \\(garbanzo beans, bengal gram\\), mature seeds, raw',[10,30,100],'harina garbanzo'),
]: m(n,CE,rx,s,a)
m('Pan de hamburguesa','Panes y masas',r'^Rolls, hamburger or hotdog, plain',[40,60,90],'pan hamburguesa pancho pebete')
m('Pan lactal integral con semillas','Panes y masas',r'^Bread, multi-grain \(includes whole-grain\)',[25,50,75],'pan multicereal semillas integral')
m('Grisines','Panes y masas',r'^Bread, sticks, plain|^Crackers, breadsticks',[8,16,32],'grisines palitos pan')
m('Bizcochitos de grasa','Panes y masas',r'^NOPE',[10,25,50],'bizcochitos grasa criollos',manual=(470,8.0,52.0,25.0))
m('Facturas (variadas)','Dulces y postres',r'^NOPE',[40,70,120],'facturas medialunas vigilantes churros bolas fraile',manual=(380,7.0,50.0,17.0))
m('Pan dulce','Dulces y postres',r'^Bread, pan dulce, sweet yeast bread|^Bread, pan dulce',[40,80,150],'pan dulce navidad')
m('Turrón o garrapiñada','Dulces y postres',r'^Candies, nougat, with almonds|^Candies, sugar-coated almonds',[15,30,60],'turron garrapinada mani')
m('Membrillo (dulce)','Dulces y postres',r'^Quinces, raw',[20,40,80],'dulce membrillo batata queso y dulce',manual=(260,0.3,68.0,0.1))
m('Dulce de batata','Dulces y postres',r'^NOPE',[20,40,80],'dulce batata vigilante',manual=(280,0.8,70.0,0.2))
m('Yogur bebible','Lácteos',r'^Yogurt, fruit, low fat',[125,200,250],'yogur bebible frutas botella')
m('Queso untable light','Quesos',r'^Cheese, cream, low fat',[15,30,60],'queso untable light descremado')
m('Queso fresco (mantecoso)','Quesos',r'^Cheese, fresh, queso fresco',[20,40,80],'queso fresco blanco')
m('Queso tipo Gruyère','Quesos',r'^Cheese, gruyere',[15,30,60],'queso gruyere emmental suizo')
m('Queso brie','Quesos',r'^Cheese, brie',[15,30,60],'queso brie camembert')
m('Queso feta','Quesos',r'^Cheese, feta',[20,40,80],'queso feta griego')
m('Suero de leche (buttermilk)','Lácteos',r'^Milk, buttermilk, fluid, cultured, lowfat',[125,200,300],'suero leche buttermilk')
m('Leche condensada','Dulces y postres',r'^Milk, canned, condensed, sweetened',[10,20,40],'leche condensada')
m('Leche chocolatada con cacao (preparada)','Bebidas',r'^Milk, chocolate, fluid, commercial, whole',[125,200,300],'leche cacao chocolatada')
m('Proteína en polvo (whey)','Snacks y comida rápida',r'^Beverages, Protein powder whey based|^Beverages, protein powder, whey based',[15,30,45],'proteina polvo whey suplemento batido')
m('Aceite de soja','Aceites y grasas',r'^Oil, soybean, salad or cooking',[5,10,20],'aceite soja')
m('Aceite de maíz','Aceites y grasas',r'^Oil, corn, industrial and retail, all purpose salad or cooking',[5,10,20],'aceite maiz')
m('Grasa vacuna','Aceites y grasas',r'^Fat, beef tallow',[5,10,20],'grasa vacuna pella')
m('Chicharrones de cerdo','Snacks y comida rápida',r'^Snacks, pork skins, plain',[15,30,60],'chicharrones grasa cerdo')
m('Chips de batata o mandioca','Snacks y comida rápida',r'^Snacks, plantain chips, salted',[15,30,60],'chips batata mandioca platano')
m('Nachos con queso','Snacks y comida rápida',r'^Snacks, tortilla chips, nacho-flavor',[15,30,60],'nachos tortilla chips doritos')
m('Maníes confitados','Snacks y comida rápida',r'^Candies, milk chocolate coated peanuts',[15,30,60],'mani confitado chocolate')
m('Galletitas rellenas','Dulces y postres',r'^Cookies, vanilla sandwich with creme filling',[15,30,60],'galletitas rellenas oreo chocolinas pepitos')
m('Chocolate con almendras','Dulces y postres',r'^Candies, milk chocolate, with almonds',[15,30,60],'chocolate almendras')
m('Caramelos duros','Dulces y postres',r'^Candies, hard',[3,6,15],'caramelos duros')
m('Gomitas','Dulces y postres',r'^Candies, gumdrops, starch jelly pieces',[15,30,60],'gomitas gummies')
m('Helado de chocolate','Dulces y postres',r'^Ice creams, chocolate',[50,100,200],'helado chocolate')
m('Helado de dulce de leche','Dulces y postres',r'^NOPE',[50,100,200],'helado dulce leche',manual=(230,4.0,29.0,11.0))
m('Palmeritas','Dulces y postres',r'^NOPE',[10,25,50],'palmeritas hojaldre',manual=(500,6.0,58.0,27.0))
m('Pastafrola','Dulces y postres',r'^NOPE',[50,90,140],'pastafrola membrillo tarta dulce',manual=(340,4.0,52.0,13.0))
m('Lemon pie','Dulces y postres',r'^NOPE',[60,100,150],'lemon pie tarta limon merengue',manual=(300,4.0,45.0,12.0))
m('Panqueque con dulce de leche','Dulces y postres',r'^NOPE',[60,110,170],'panqueque crepe dulce leche',manual=(260,5.0,38.0,10.0))
m('Waffle','Dulces y postres',r'^Waffle, plain, frozen, ready-to-heat',[35,70,105],'waffle gofre')
m('Cereal bar de chocolate','Snacks y comida rápida',r'^Snacks, granola bars, soft, uncoated, chocolate chip',[20,35,60],'barra cereal chocolate')
m('Gelatina','Dulces y postres',r'^Gelatin desserts, dry mix, prepared with water',[80,130,200],'gelatina postre')
m('Sopa de pollo con fideos','Comidas preparadas',r'^Soup, chicken noodle, canned, prepared with equal volume water',[150,250,400],'sopa pollo fideos caldo')
m('Sopa de lentejas','Comidas preparadas',r'^Soup, lentil with ham, canned, prepared with equal volume water|^Soup, lentil',[150,250,400],'sopa lentejas')
m('Albóndigas de carne (cocidas)','Carnes vacunas',r'^NOPE',[60,120,200],'albondigas carne picada',manual=(210,14.0,8.0,13.0))
m('Papas fritas caseras','Verduras',r'^NOPE',[60,120,200],'papas fritas caseras bastones fritura',manual=(270,3.5,35.0,13.0))
