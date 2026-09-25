import fs from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

function getEnvValue(key) {
  return fs.readFile(".env.local", "utf8").then((content) => {
    const line = content
      .split(/\r?\n/)
      .find((item) => item.trim().startsWith(`${key}=`));

    if (!line) return "";

    let value = line.slice(line.indexOf("=") + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    return value;
  });
}

function slug(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function option(name, price = 0, isDiscountEligible = true) {
  return { name, price, isDiscountEligible };
}

const categories = [
  ["bowle", "Bowle", true],
  ["przystawki", "Przystawki", true],
  ["zupy", "Zupy", true],
  ["desery", "Desery", true],
  ["dania-glowne", "Dania główne", true],
  ["ramen", "Ramen", true],
  ["burgery", "Burgery", true],
  ["futomaki", "Futomaki", true],
  ["hosomaki", "Hosomaki", true],
  ["nigiri", "Nigiri", true],
  ["california-maki", "California maki", true],
  ["special-rolls", "Special Rolls", true],
  ["zestawy", "Zestawy sushi", true],
  ["sashimi", "Sashimi", true],
  ["tatary", "Tatary", true],
  ["wagyu", "Premium Wagyu", true],
  ["napoje", "Napoje", false],
];

const products = [];
const groups = [];

function add(category, name, price, description = "", isDiscountEligible = true) {
  const item = {
    category,
    key: `${category}:${slug(name)}`,
    name,
    price,
    description,
    isDiscountEligible,
  };

  products.push(item);
  return item;
}

function addMany(category, items, isDiscountEligible = true) {
  return items.map(([name, price, description = ""]) =>
    add(category, name, price, description, isDiscountEligible)
  );
}

function choice(product, name, values, required = false, maxSelected = 1) {
  groups.push({
    productKey: product.key,
    name,
    selectionType: maxSelected === 1 ? "single" : "multiple",
    minSelected: required ? 1 : 0,
    maxSelected,
    values,
  });
}

function addSized(category, name, smallPrice, largePrice, description, smallLabel, largeLabel) {
  const product = add(category, name, smallPrice, description);

  choice(
    product,
    "Wybierz wielkość",
    [
      option(smallLabel, 0),
      option(largeLabel, largePrice - smallPrice),
    ],
    true
  );

  return product;
}

function addFoodOption(product, name, values, required = false, maxSelected = 1) {
  choice(product, name, values, required, maxSelected);
}

/* BOWLE */
addMany("bowle", [
  ["Bataty szarpana wieprzowina", 45, "Cebula marynowana, jalapeño, parmezan, ogórki marynowane, majonez truflowy."],
  ["Bataty wegańskie mięso mielone", 47, "Cebula marynowana, ogórki marynowane, groszek cukrowy, oshinko, awokado, majonez truflowy."],
  ["Frytki shitake", 49, "Smażone shitake, ogórki marynowane, parmezan, tykwa, oshinko, kiełki mung, cebula marynowana, majonez truflowy."],
  ["Frytki kurczak smażony", 43, "Kimchi, jalapeño, parmezan, brokuł chiński, majonez homarowy."],
  ["Ryż mięso mielone", 49, "Jajko sadzone, parmezan, ogórki marynowane, cebula marynowana, majonez homarowy."],
  ["Ryż spicy salmon", 43, "Tykwa, goma wakame, ogórki marynowane, awokado, migdały, dressing miso."],
  ["Sałatka kurczak mango", 54, "Tykwa, goma wakame, ogórki marynowane, awokado, migdały, parmezan, pomidorki koktajlowe, mango, dressing miso."],
  ["Sałatka grillowana krewetka", 44, "Mango, awokado, śliwka, ogórek marynowany, dressing mięta."],
]);

/* PRZYSTAWKI */
const starters = addMany("przystawki", [
  ["Chipsy krewetkowe · 15 szt.", 19],
  ["Goma wakame · 135 g", 20, "Sałatka z morskich wodorostów."],
  ["Edamame", 21, "Smażona japońska fasolka z solą morską i sezamem."],
  ["Kimchi · 130 g", 21, "Kiszone warzywa na ostro."],
  ["Wakame no nori", 26, "Japońska sałatka z marynowanych ogórków i wodorostów w sosie sojowo-sezamowym."],
  ["Ryba w cieście piwnym", 33, "Halibut w tempurze, japoński sos tatarski, nori."],
  ["Warzywa w tempurze", 37],
  ["Sajgonki z udkiem z kurczaka · 4 szt.", 49, "Podawane z autorskim sosem sojowo-czosnkowym."],
  ["Sajgonki z krewetkami · 4 szt.", 51, "Podawane z autorskim sosem homarowym."],
  ["Kalmar w panko · 10 szt.", 52],
  ["Krewetki w panko · 7 szt.", 56],
  ["Mix przystawek + 3 sosy", 114],
]);

const gyoza = add("przystawki", "Pierożki gyoza · 6 szt.", 32, "Smażone japońskie pierożki.");
addFoodOption(gyoza, "Wybierz farsz", [
  option("Warzywne", 0),
  option("Wołowe", 7),
  option("Kaczka", 10),
], true);

/* ZUPY */
const miso = add("zupy", "Miso", 21, "Tradycyjna japońska zupa z pasty ze sfermentowanej soi, wakame i tofu.");
addFoodOption(miso, "Wybierz wersję", [
  option("Vege", 0),
  option("Z łososiem", 4),
], true);

const tomYum = add("zupy", "Tom Yum", 34, "Słodko-ostra zupa na mleczku kokosowym, świeżych pomidorach, paście tom yum, trawie cytrynowej i makaronie mie.");
addFoodOption(tomYum, "Wybierz wersję", [
  option("Vege", 0),
  option("Kurczak", 2),
  option("Owoce morza", 4),
], true);

add("zupy", "Sakana", 35, "Kwaśno-pikantna zupa na mleczku kokosowym, paście tom kha, trawie cytrynowej i makaronie mie.");

/* DESERY */
addMany("desery", [
  ["Brownie z fasoli adzuki", 21, "Wegańskie ciasto z japońskiej fasoli adzuki podawane z frużeliną wiśniową."],
  ["Mochi", 26, "O szczegóły zapytaj obsługę."],
  ["Mus matcha", 27, "Mus matcha i ziemia czekoladowa."],
  ["Mango sticky rice", 32, "Ryż, mleko kokosowe, mango."],
]);

/* DANIA GŁÓWNE */
add("dania-glowne", "Boczek kimchi · 350 g", 55, "Smażony boczek wieprzowy, sos z kimchi, ryż.");

const udonGrzybowy = add("dania-glowne", "Udon z emulsją grzybową · 400 g", 55, "Udon, emulsja grzybowa, brokuł chiński, groszek cukrowy, grzybki shimeji.");
addFoodOption(udonGrzybowy, "Wybierz wersję", [
  option("Vege", 0),
  option("Kurczak", 0),
  option("Wołowina", 7),
], true);

const udonTruflowy = add("dania-glowne", "Udon z emulsją truflową · 400 g", 58, "Udon, emulsja truflowa, brokuł chiński, groszek cukrowy, tarta trufla.");
addFoodOption(udonTruflowy, "Wybierz wersję", [
  option("Vege", 0),
  option("Kurczak", 0),
  option("Wołowina", 6),
], true);

addMany("dania-glowne", [
  ["Stir-fry · 400 g", 67, "Udon, polędwica wołowa, brokuł chiński, groszek cukrowy, edamame, warzywa, olej Rayu, sos ostrygowy."],
  ["Seafood Gochuyang · 400 g", 68, "Udon, warzywa, emulsja z owoców morza i pieczonych pomidorów, gochuyang."],
  ["Stek z łososia", 86, "Stek z łososia 180 g, sos miso-yuzu, sałatka ze szpinaku i warzyw, ryż, sos kabayaki i chilli jam."],
  ["Okoń", 66, "Okoń 150 g, frytki 100 g, sałatka ze szpinaku i warzyw."],
]);

const padThai = add("dania-glowne", "Pad Thai · 400 g", 55, "Makaron ryżowy, sos z tamaryndowca, orzechy ziemne, jajko, tofu.");
addFoodOption(padThai, "Wybierz wersję", [
  option("Vege", 0),
  option("Kurczak", 2),
  option("Wołowina", 12),
  option("Krewetka", 12),
], true);

const steak = add("dania-glowne", "Stek z polędwicy", 129, "Stek z polędwicy wołowej 180 g, frytki stekowe, sałatka, krążki cebulowe, dwa sosy.");
addFoodOption(steak, "Dobierz dodatek", [
  option("Frytki", 10),
  option("Frytki stekowe", 10),
  option("Frytki z batatów", 10),
  option("Ryż", 10),
  option("Sałatka", 10),
]);

/* RAMEN */
const ramenExtras = [
  option("Jajko", 7),
  option("Krewetka panko · 1 szt.", 7),
  option("Krewetki smażone na maśle · 2 szt.", 6),
  option("Mięso mielone · niku soboro", 7),
  option("Boczek chashu", 7),
  option("Wołowina szarpana", 7),
  option("Wołowina marynowana", 12),
  option("Owoce morza", 12),
];

for (const [name, price, description] of [
  ["Tonkotsu · 900 g", 51, "Bulion chintan, tare na bazie mleka sojowego i oliwy truflowej, jajko, soboro wieprzowe, piklowana cebula, edamame."],
  ["Cheese · 900 g", 52, "Bulion chintan, tare na bazie sera mimolette, parmezan, jalapeño, kurczak sous-vide."],
  ["Shoyu Classic · 900 g", 48, "Bulion chintan drobiowy, boczek, marynowana czerwona cebula, szczypior, jajko."],
  ["Tori Shoyu · 900 g", 52, "Bulion chintan drobiowy, kurczak sous-vide, marynowana czerwona cebula, szczypior, jajko."],
  ["Truffle Spicy Shoyu · 900 g", 54, "Bulion chintan drobiowy, kurczak sous-vide, boczek, shitake, pikle z białej cebuli, szczypior, jajko."],
  ["Kimchi · 900 g", 54, "Bulion chintan drobiowy, soboro wieprzowe, kimchi, kolendra, olej habanero."],
]) {
  const ramen = add("ramen", name, price, description);
  addFoodOption(ramen, "Wybierz bulion", [
    option("Bulion vege", 0),
    option("Bulion mięsny", 0),
  ], true);
  addFoodOption(ramen, "Dodatki", ramenExtras, false, 8);
}

/* BURGERY */
const burgerExtras = [
  option("Podwójne mięso", 10),
  option("Jalapeño", 3),
  option("Awokado", 6),
  option("Zestaw z frytkami i napojem", 11, false),
];

for (const [name, price, description] of [
  ["Vege", 49, "Ryż, kotlet z buraka i tofu, awokado, marynowany ogórek, marynowana cebula, oshinko, tykwa, majonez truflowy."],
  ["Szarpana wieprzowina", 51, "Ryż, szarpana wieprzowina, marynowany ogórek, marynowana cebula, oshinko, jalapeño, tykwa."],
  ["Kurczak panko", 54, "Ryż, kurczak panko, kimchi, ogórek marynowany, tykwa."],
  ["Łosoś", 55, "Ryż, siekany surowy łosoś, awokado, serek, tykwa, marynowany ogórek."],
  ["Tuńczyk", 55, "Ryż, siekany tuńczyk, marynowany ogórek, marynowana cebula, oshinko, tykwa, awokado, spicy mayo."],
  ["Krewetka panko", 57, "Ryż, krewetki w panko, marynowany ogórek, marynowana cebula, oshinko, tykwa, awokado, spicy mayo."],
  ["Węgorz panko", 59, "Ryż, węgorz w panko, marynowany ogórek, awokado, mango, oshinko, majonez limonkowo-miętowy."],
  ["Krab soft shell", 65, "Ryż, marynowany ogórek, awokado, serek, oshinko, szczypiorek."],
  ["Ośmiornica", 68, "Ryż, awokado, marynowany ogórek, oshinko, spicy mayo, szczypiorek, sriracha."],
]) {
  const burger = add("burgery", name, price, description);
  addFoodOption(burger, "Dodatkowe składniki", burgerExtras, false, 4);
}

/* FUTOMAKI */
for (const [name, p6, p12, description] of [
  ["Świeże warzywa", 32, 60, "Serek philadelphia, sałata, ogórek, awokado, tykwa, oshinko, groszek cukrowy, szczypiorek."],
  ["Warzywa w tempurze", 33, 62, "Truflowy majonez, warzywa w chrupiącym cieście."],
  ["Tofu w tempurze", 36, 67, "Truflowy majonez, kabayaki, tofu w tempurze, ogórek, awokado, tykwa, oshinko."],
  ["Kimchi tempura", 36, 67, "Spicy mayo, sałatka kimchi w chrupiącej panierce."],
  ["Warzywa panko", 36, 67, "Chilli jam, sałata, warzywa panko, piklowana cebula, szczypiorek."],
  ["Kalmar tempura", 39, 70, "Majonez homarowy, mango, awokado, ogórek, tykwa, shiso, sałata."],
  ["Dorada tempura", 39, 70, "Majonez homarowy, ogórek, oshinko, awokado."],
  ["Łosoś premium", 39, 71, "Serek philadelphia, surowy łosoś, awokado, ogórek, tykwa."],
  ["Łosoś grill", 43, 80, "Serek philadelphia, łosoś grillowany, awokado, ogórek, szczypiorek, sałata."],
  ["Krewetki w tempurze", 45, 82, "Majonez homarowy, dwie krewetki, awokado, ogórek, sałata, mango."],
  ["Tatar z łososia", 46, 86, "Tatar z łososia, ogórek, sałata, szczypiorek."],
  ["Krewetki w panko", 46, 87, "Spicy mayo, awokado, dwie krewetki w panko, sałata, oshinko, ogórek."],
  ["Okoń", 46, 87, "Surowy okoń, sriracha, sałata, ogórek, oshinko, szczypiorek, piklowana cebulka, awokado."],
  ["Seriola", 49, 91, "Majonez limonkowo-miętowy, surowa seriola, sałata, awokado, ogórek, szczypiorek."],
  ["Unagi roll", 49, 91, "Majonez limonkowo-miętowy, węgorz w tempurze, mango, ogórek, mięta."],
  ["Tuńczyk premium", 55, 95, "Majonez homarowy, surowy tuńczyk błękitny, sałata, awokado, oshinko, szczypiorek, shiso."],
  ["Tatar z tuńczyka premium", 56, 96, "Tatar z tuńczyka, szczypiorek, ogórek, shiso."],
]) {
  const futomaki = addSized("futomaki", name, p6, p12, description, "6 szt.", "12 szt.");
  addFoodOption(futomaki, "Dodatkowo", [
    option("Cała rolka zapieczona w panko", 7),
  ]);
}

/* HOSOMAKI */
addMany("hosomaki", [
  ["Ogórek · 8 szt.", 19],
  ["Tykwa · 8 szt.", 19],
  ["Oshinko · 8 szt.", 19],
  ["Shitake · 8 szt.", 19],
  ["Goma wakame · 8 szt.", 19],
  ["Awokado · 8 szt.", 24],
  ["Łosoś premium · 8 szt.", 26],
  ["Okoń · 8 szt.", 30],
  ["Seriola · 8 szt.", 32],
  ["Krewetka w tempurze · 8 szt.", 33],
  ["Wołowina · 8 szt.", 33],
  ["Tuńczyk premium · 8 szt.", 34],
  ["Węgorz · 8 szt.", 34],
  ["Przegrzebek · 8 szt.", 41],
]);

/* NIGIRI */
addMany("nigiri", [
  ["Łosoś premium · 1 szt.", 13],
  ["Łosoś tataki · 1 szt.", 14],
  ["Wołowina · 1 szt.", 14],
  ["Tuńczyk Balfego · 1 szt.", 19],
  ["Tuńczyk tataki · 1 szt.", 20],
  ["Okoń · 1 szt.", 20],
  ["Węgorz tataki · 1 szt.", 20],
  ["Seriola · 1 szt.", 20],
]);

/* CALIFORNIA MAKI */
for (const [name, p5, p10, description] of [
  ["Vege obłożone awokado", 25, 45, "Serek philadelphia, ogórek, tykwa, oshinko, szczypiorek, chilli jam, majonez truflowy."],
  ["Tofu w panko obłożone awokado", 26, 46, "Serek philadelphia, ogórek, tykwa, kabayaki, truflowy majonez."],
  ["Tykwa tempura obłożona awokado", 27, 50, "Sriracha, ogórek, oshinko."],
  ["Kurczak panko obłożony awokado", 28, 52, "Spicy mayo, ogórek, oshinko."],
  ["Świeży okoń morski", 31, 56, "Sos limonka-mięta, surowy okoń, szczypiorek, ogórek, mango."],
  ["Łosoś obłożony awokado", 32, 57, "Serek philadelphia, surowy łosoś, ogórek, tykwa."],
  ["Rainbow", 33, 58, "Serek philadelphia, dwie krewetki w tempurze, ogórek, tykwa, łosoś, tuńczyk, okoń."],
  ["Kalmar w migdałach obłożony mango", 33, 49, "Homar mayo, awokado, ogórek, tykwa."],
  ["Sandacz w panko obłożony śliwką", 33, 58, "Serek philadelphia, sriracha, ogórek, awokado, tykwa."],
  ["Łosoś w tempurze", 33, 60, "Spicy mayo, ogórek, tykwa."],
  ["Warzywa w tempurze obłożone tatarem z łososia premium", 34, 67],
  ["Kimchi tempura obłożone tatarem z łososia premium", 37, 69],
  ["Węgorz w tempurze obłożony awokado", 38, 72, "Majonez limonkowo-miętowy, ogórek, mango, groszek cukrowy."],
  ["Krewetki w panko obłożone opalanym łososiem", 38, 72, "Spicy mayo, ogórek, szczypior, awokado."],
  ["Dwie krewetki w panko obłożone tatarem z łososia", 39, 74, "Spicy mayo, awokado, ogórek."],
  ["Krewetka panko obłożona marynowaną wołowiną", 43, 78, "Spicy mayo, ogórek, szczypiorek."],
  ["Tuńczyk premium obłożony tuńczykiem", 44, 78, "Majonez homarowy, ogórek, szczypiorek, awokado."],
  ["Tuńczyk premium obłożony okoniem", 45, 81, "Majonez homarowy, sriracha, ogórek, szczypior, groszek cukrowy, mango."],
  ["Krewetki panko obłożone tatarem z tuńczyka premium", 45, 81, "Majonez homarowy, ogórek, szczypior, awokado."],
]) {
  addSized("california-maki", name, p5, p10, description, "5 szt.", "10 szt.");
}

/* SPECIAL ROLLS */
addMany("special-rolls", [
  ["Surf & Turf Roll · futomaki · 6 szt.", 56, "Roladka po pół na pół: ryż marynowana wołowina oraz krewetka panko, kimchi, szczypiorek, ogórek."],
  ["Ryż i awokado · okoń · futomaki · 6 szt.", 60, "Okoń morski, ogórek, sriracha, serek, shiso, groszek cukrowy."],
  ["Ryż i awokado · krewetka · futomaki · 6 szt.", 63, "Krewetka panko, łosoś, oshinko, spicy mayo."],
  ["Tuńczyk Bluefin Balfego · futomaki · 6 szt.", 63, "Szparag grill, shiso, szczypiorek."],
  ["Ośmiornica · futomaki · 6 szt.", 66, "Serek, sriracha, ogórek, awokado, szczypiorek, spicy mayo."],
  ["Ryż i wołowina · futomaki · 6 szt.", 68, "Krewetka panko, kimchi, warzywa panko, majonez homarowy."],
  ["Tuńczyk Bluefin Balfego · futomaki premium · 6 szt.", 69, "Groszek cukrowy, awokado, cebula marynowana, szczypior, dressing jalapeño."],
  ["Brie z karmelizowaną gruszką · california · 8 szt.", 60, "Krewetka panko, ser brie, karmelizowana gruszka."],
  ["Vege Rainbow · california · 8 szt.", 64, "Szparag w panko, ogórek, śliwka, mango, awokado."],
  ["Dragon Roll – krab softshell · california · 8 szt.", 64, "Obłożony węgorzem."],
  ["Płatek sojowy · mamenori · california · 8 szt.", 66, "Krewetka tempura, mango, obłożone łososiem, żel mango."],
  ["Łosoś Yuzu · california · 8 szt.", 66, "Awokado, ogórek, miso ceviche, shiso."],
  ["Seriola · california · 8 szt.", 66, "Awokado, ogórek, jalapeño tempura, miso ceviche, spicy mayo."],
  ["Przegrzebki · california · 8 szt.", 68, "Awokado, ogórek, kolendra, kataifi, majonez limonkowo-miętowy."],
]);

const pankoTatar = add("special-rolls", "Rolki panko obłożone tatarem", 66, "Oshinko, tykwa, ogórek.");
addFoodOption(pankoTatar, "Wybierz tatar", [
  option("Tatar shitake", 0),
  option("Guacamole", 0),
  option("Tatar seriola", 0),
  option("Tatar łosoś", 0),
  option("Tatar tuńczyk", 0),
], true);

/* ZESTAWY */
addMany("zestawy", [
  ["Fugenzo · 22 szt.", 78, "Hosomaki awokado 8 szt., hosomaki ogórek 8 szt., futomaki świeże warzywa 6 szt."],
  ["Ariake · 24 szt.", 118, "California surowy łosoś 10 szt., nigiri łosoś 2 szt., futomaki surowy łosoś 6 szt., futomaki łosoś grill 6 szt."],
  ["Shogetsu · 38 szt.", 130, "Zestaw wegetariański."],
  ["Prunus · 48 szt.", 130],
  ["Sakura · 30 szt.", 130],
  ["Ichiyo · 24 szt.", 166],
  ["Oshidori · 38 szt.", 178],
  ["Somei · 40 szt.", 178],
  ["Kanzan · 32 szt.", 180],
  ["Kiku-Shidare · 30 szt.", 199],
  ["Fukubana · 44 szt.", 239],
  ["Takasago · 48 szt.", 239],
  ["Higan · 58 szt.", 288],
  ["Beni-Shidare · 82 szt.", 374],
]);

/* SASHIMI I TATARY */
addMany("sashimi", [
  ["Łosoś premium · 50 g", 52],
  ["Łosoś opalany · 50 g", 57],
  ["Okoń morski · 50 g", 61],
  ["Seriola · 50 g", 75],
  ["Tuńczyk premium · 50 g", 75],
  ["Tuńczyk opalany · 50 g", 79],
]);

addMany("tatary", [
  ["Tatar z shitake · 115 g", 56, "Grzyby shitake, awokado, musztarda francuska, szczypiorek, sezam, majonez, sos sojowy."],
  ["Tatar łosoś premium · 115 g", 56, "Łosoś MOWI supreme, awokado, sos sojowy, sriracha, szczypiorek, sezam."],
  ["Tatar tuńczyk · 115 g", 65, "Tuńczyk yellowfin, awokado, sos sojowy, sezam, sriracha, szczypiorek."],
  ["Ceviche seafood · 115 g", 67, "Mix świeżych ryb, owoce morza, wakame, kolendra, awokado, ponzu, yuzu miso, żel mango."],
  ["Tatar okoń · 115 g", 67, "Okoń morski, mięta, mango, awokado, pomidorki koktajlowe, szczypior, dressing jalapeño."],
  ["Tatar seriola · 115 g", 70, "Seriola, szczypiorek, awokado, shiso, sezam, ponzu, żel mango."],
  ["Tatar tuńczyk premium · 100 g", 86, "Tuńczyk bluefin Balfego, shiso tempura, awokado, szczypiorek, majonez homarowy, sriracha, żel mango, sos sojowy, sezam."],
]);

/* WAGYU */
addMany("wagyu", [
  ["Wagyu Roll Asparagus", 79, "Tatar wagyu, szparag panko, awokado, ogórek, sos yakiniku."],
  ["Wagyu Roll Shrimp", 89, "Tatar wagyu, awokado, krewetka panko, szczypiorek, sos yakiniku."],
  ["Tataki Wagyu", 89, "Delikatne plastry wagyu, dressing jalapeño, ponzu, kataifi, massago arare."],
]);

/* NAPOJE — KAŻDA POZYCJA BEZ RABATU */
const beverage = (name, price, description = "") =>
  add("napoje", name, price, description, false);

for (const [name, price] of [
  ["Coca-Cola Zero · 0,25 l", 11],
  ["Coca-Cola Original · 0,25 l", 11],
  ["Fanta · 0,25 l", 11],
  ["Sprite · 0,25 l", 11],
  ["Kinley · 0,25 l", 11],
  ["Kropla Beskidu · 0,33 l", 10],
  ["Kropla Beskidu · 0,75 l", 18],
  ["Fuze Tea · 0,25 l", 11],
  ["Cappy · 0,25 l", 11],
  ["Burn · 0,25 l", 17],
  ["Three Cents · 0,2 l", 16],
  ["Woda sodowa w karafce · 1 l", 16],
  ["Dodatek do wody: cytryna lub lód", 5],
  ["Espresso", 11],
  ["Americano", 13],
  ["Cappuccino", 14],
  ["Flat White", 15],
  ["Caffe Latte", 15],
  ["Zielona herbata z wiśnią · 0,8 l", 22],
  ["Zielona herbata z mango · 0,8 l", 22],
  ["Zielona herbata z prażonym ryżem · 0,8 l", 22],
  ["Zielona Sencha · 0,8 l", 22],
  ["Biała herbata z maliną · 0,8 l", 22],
  ["Herbata sekret japońskich świątyń · 0,8 l", 22],
  ["Herbata kaktusowa · 0,8 l", 22],
  ["Herbata jaśminowa · 0,8 l", 22],
  ["Czarna herbata z cytryną", 12],
]) {
  beverage(name, price);
}

for (const name of ["Yuzu Japanese", "Aloe Cucumber", "Marakuja", "Yuzu Matcha"]) {
  const lemonade = beverage(`Lemoniada ${name}`, 20);
  choice(
    lemonade,
    "Wybierz wielkość",
    [
      option("Szklanka 0,6 l", 0, false),
      option("Karafka 1 l", 15, false),
    ],
    true
  );
}

for (const [name, price] of [
  ["Matcha baza", 27],
  ["Matcha: mleko i cynamon", 30],
  ["Matcha: napój roślinny sojowy + pasta pistacjowa + syrop wanilia", 38],
  ["Matcha: napój roślinny kokosowy + syrop wanilia", 32],
  ["Matcha: mleko ice + puree marakuja", 33],
]) {
  const matcha = beverage(name, price);
  if (name === "Matcha baza") {
    choice(matcha, "Dodatki", [
      option("Syrop Monin", 5, false),
      option("Puree Monin", 6, false),
      option("Pasta pistacjowa", 6, false),
      option("Sezonowe owoce", 5, false),
      option("Cynamon", 3, false),
    ], false, 5);
  }
}

for (const coffeeName of ["Cappuccino", "Flat White", "Caffe Latte"]) {
  const coffee = products.find(
    (product) => product.category === "napoje" && product.name === coffeeName
  );
  if (coffee) {
    choice(coffee, "Rodzaj mleka", [
      option("Mleko", 0, false),
      option("Mleko bez laktozy", 0, false),
      option("Napój owsiany", 0, false),
      option("Napój sojowy", 0, false),
      option("Napój kokosowy", 0, false),
    ], true);
    choice(coffee, "Syrop Monin", [option("Dodaj syrop", 5, false)]);
  }
}

/* IMPORT */
const supabaseUrl = await getEnvValue("NEXT_PUBLIC_SUPABASE_URL");
const serviceRoleKey = await getEnvValue("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Brakuje NEXT_PUBLIC_SUPABASE_URL lub SUPABASE_SERVICE_ROLE_KEY w .env.local."
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function fail(error, label) {
  if (error) throw new Error(`${label}: ${error.message}`);
}

const now = new Date().toISOString();

const { data: vendor, error: vendorError } = await supabase
  .from("tokama_onsite_vendors")
  .upsert(
    {
      slug: "kanzan",
      name: "KANZAN Food & Cocktails",
      description:
        "Menu dla gości TOKAMA. Rabat 10% obejmuje jedzenie; napoje są w cenie regularnej. Dostawa do domku jest bezpłatna.",
      discount_percent: 10,
      delivery_cents: 0,
      is_active: true,
      sort_order: 1,
      updated_at: now,
    },
    { onConflict: "slug" }
  )
  .select("id")
  .single();

fail(vendorError, "Nie udało się zapisać restauracji");

const categoryPayload = categories.map(([slug, name, isDiscountEligible], index) => ({
  vendor_id: vendor.id,
  slug,
  name_pl: name,
  sort_order: index + 1,
  is_active: true,
  is_discount_eligible: isDiscountEligible,
  updated_at: now,
}));

const { error: categoryError } = await supabase
  .from("tokama_onsite_menu_categories")
  .upsert(categoryPayload, { onConflict: "vendor_id,slug" });

fail(categoryError, "Nie udało się zapisać kategorii");

const { data: categoryRows, error: categoryRowsError } = await supabase
  .from("tokama_onsite_menu_categories")
  .select("id, slug")
  .eq("vendor_id", vendor.id);

fail(categoryRowsError, "Nie udało się pobrać kategorii");

const categoryIds = new Map(categoryRows.map((row) => [row.slug, row.id]));

const { error: deactivateError } = await supabase
  .from("tokama_onsite_menu_products")
  .update({ is_active: false, updated_at: now })
  .eq("vendor_id", vendor.id);

fail(deactivateError, "Nie udało się przygotować aktualizacji menu");

const productPayload = products.map((product, index) => ({
  vendor_id: vendor.id,
  category_id: categoryIds.get(product.category),
  source_key: product.key,
  name_pl: product.name,
  description_pl: product.description || null,
  base_price_cents: product.price * 100,
  is_discount_eligible: product.isDiscountEligible,
  is_active: true,
  sort_order: index + 1,
  source_url: null,
  metadata: {
    source: "kanzan-menu-plansze",
    imported_at: now,
  },
  updated_at: now,
}));

const { error: productError } = await supabase
  .from("tokama_onsite_menu_products")
  .upsert(productPayload, { onConflict: "vendor_id,source_key" });

fail(productError, "Nie udało się zapisać pozycji menu");

const { data: productRows, error: productRowsError } = await supabase
  .from("tokama_onsite_menu_products")
  .select("id, source_key")
  .eq("vendor_id", vendor.id)
  .eq("is_active", true);

fail(productRowsError, "Nie udało się pobrać pozycji menu");

const productIds = new Map(productRows.map((row) => [row.source_key, row.id]));

const { error: oldGroupsError } = await supabase
  .from("tokama_onsite_menu_option_groups")
  .delete()
  .in("product_id", productRows.map((row) => row.id));

fail(oldGroupsError, "Nie udało się odświeżyć wariantów i dodatków");

let importedGroups = 0;
let importedOptions = 0;

for (const group of groups) {
  const productId = productIds.get(group.productKey);

  if (!productId) {
    throw new Error(`Brakuje produktu dla grupy opcji: ${group.productKey}`);
  }

  const { data: groupRow, error: groupError } = await supabase
    .from("tokama_onsite_menu_option_groups")
    .insert({
      product_id: productId,
      name_pl: group.name,
      selection_type: group.selectionType,
      min_selected: group.minSelected,
      max_selected: group.maxSelected,
      sort_order: importedGroups + 1,
      is_active: true,
      updated_at: now,
    })
    .select("id")
    .single();

  fail(groupError, `Nie udało się zapisać grupy: ${group.name}`);

  importedGroups += 1;

  const { error: optionsError } = await supabase
    .from("tokama_onsite_menu_options")
    .insert(
      group.values.map((value, index) => ({
        group_id: groupRow.id,
        name_pl: value.name,
        price_delta_cents: value.price * 100,
        is_discount_eligible: value.isDiscountEligible,
        sort_order: index + 1,
        is_default: index === 0 && group.minSelected > 0,
        is_active: true,
        updated_at: now,
      }))
    );

  fail(optionsError, `Nie udało się zapisać opcji: ${group.name}`);

  importedOptions += group.values.length;
}

const foodProducts = products.filter((product) => product.isDiscountEligible).length;
const drinkProducts = products.length - foodProducts;

console.log("\n--- MENU KANZAN ZAIMPORTOWANE ---");
console.log(`Kategorie: ${categories.length}`);
console.log(`Pozycje menu: ${products.length}`);
console.log(`Pozycje objęte rabatem TOKAMA: ${foodProducts}`);
console.log(`Napoje bez rabatu: ${drinkProducts}`);
console.log(`Grupy personalizacji: ${importedGroups}`);
console.log(`Warianty i dodatki: ${importedOptions}`);
