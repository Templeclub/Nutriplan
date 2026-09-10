// Lexique culinaire FR→EN pour traduire les requêtes de recherche sans consommer
// de quota DeepL. Couvre les termes les plus fréquents ; toute requête contenant
// un mot inconnu bascule sur DeepL.

export const LEXIQUE_FR_EN = {
  // Viandes & poissons
  poulet: 'chicken', boeuf: 'beef', bœuf: 'beef', porc: 'pork', agneau: 'lamb',
  veau: 'veal', canard: 'duck', dinde: 'turkey', jambon: 'ham', lardons: 'bacon',
  saucisse: 'sausage', steak: 'steak', poisson: 'fish', saumon: 'salmon',
  thon: 'tuna', cabillaud: 'cod', morue: 'cod', truite: 'trout', crevette: 'shrimp',
  crevettes: 'shrimp', moules: 'mussels', calamar: 'squid', sardine: 'sardine',
  maquereau: 'mackerel', colin: 'hake', bar: 'sea bass', dorade: 'sea bream',

  // Légumes
  légume: 'vegetable', légumes: 'vegetables', tomate: 'tomato', tomates: 'tomatoes',
  courgette: 'zucchini', courgettes: 'zucchini', aubergine: 'eggplant',
  poivron: 'bell pepper', carotte: 'carrot', carottes: 'carrots', oignon: 'onion',
  ail: 'garlic', poireau: 'leek', épinard: 'spinach', épinards: 'spinach',
  brocoli: 'broccoli', chou: 'cabbage', 'chou-fleur': 'cauliflower',
  champignon: 'mushroom', champignons: 'mushrooms', patate: 'potato',
  'pomme de terre': 'potato', 'pommes de terre': 'potatoes', potiron: 'pumpkin',
  potimarron: 'pumpkin', courge: 'squash', butternut: 'butternut squash',
  haricot: 'bean', haricots: 'beans', 'haricot vert': 'green bean',
  'petit pois': 'peas', 'petits pois': 'peas', lentille: 'lentil',
  lentilles: 'lentils', 'pois chiche': 'chickpea', 'pois chiches': 'chickpeas',
  betterave: 'beetroot', navet: 'turnip', panais: 'parsnip', céleri: 'celery',
  concombre: 'cucumber', avocat: 'avocado', maïs: 'corn', fenouil: 'fennel',

  // Féculents & bases
  riz: 'rice', pâtes: 'pasta', pate: 'pasta', nouilles: 'noodles',
  quinoa: 'quinoa', boulgour: 'bulgur', semoule: 'semolina', couscous: 'couscous',
  polenta: 'polenta', pain: 'bread', farine: 'flour', oeuf: 'egg', œuf: 'egg',
  oeufs: 'eggs', œufs: 'eggs', fromage: 'cheese', beurre: 'butter',
  crème: 'cream', lait: 'milk', yaourt: 'yogurt', tofu: 'tofu',

  // Types de plats
  soupe: 'soup', velouté: 'creamy soup', salade: 'salad', gratin: 'gratin',
  tarte: 'tart', quiche: 'quiche', omelette: 'omelette', curry: 'curry',
  ragoût: 'stew', mijoté: 'stew', rôti: 'roast', grillé: 'grilled',
  poêlé: 'pan-fried', vapeur: 'steamed', four: 'oven', papillote: 'en papillote',
  risotto: 'risotto', lasagne: 'lasagna', lasagnes: 'lasagna', pizza: 'pizza',
  burger: 'burger', wok: 'stir fry', sauté: 'stir fry', bowl: 'bowl',
  gâteau: 'cake', dessert: 'dessert', crumble: 'crumble', compote: 'compote',
  chili: 'chili', tajine: 'tagine', dahl: 'dal', bolognaise: 'bolognese',
  brochette: 'skewer', brochettes: 'skewers', boulette: 'meatball',
  boulettes: 'meatballs', purée: 'mash', poêlée: 'sauté',

  // Régimes & qualificatifs
  végétarien: 'vegetarian', végétarienne: 'vegetarian', végan: 'vegan',
  végétalien: 'vegan', 'sans gluten': 'gluten free', 'sans lactose': 'dairy free',
  léger: 'light', rapide: 'quick', facile: 'easy', simple: 'easy',
  healthy: 'healthy', protéiné: 'high protein', 'riche en protéines': 'high protein',
  complet: 'whole grain', maison: 'homemade', épicé: 'spicy', froid: 'cold',
  chaud: 'warm', hiver: 'winter', été: 'summer', automne: 'autumn',
  printemps: 'spring',

  // Herbes & assaisonnements
  basilic: 'basil', persil: 'parsley', coriandre: 'coriander', thym: 'thyme',
  romarin: 'rosemary', menthe: 'mint', curcuma: 'turmeric', gingembre: 'ginger',
  paprika: 'paprika', cumin: 'cumin', citron: 'lemon', miel: 'honey',
  moutarde: 'mustard', sauce: 'sauce', huile: 'oil', olive: 'olive',

  // Fruits
  pomme: 'apple', poire: 'pear', banane: 'banana', fraise: 'strawberry',
  framboise: 'raspberry', myrtille: 'blueberry', orange: 'orange',
  pêche: 'peach', abricot: 'apricot', figue: 'fig', raisin: 'grape',
  melon: 'melon', ananas: 'pineapple', mangue: 'mango', noix: 'walnut',
  amande: 'almond', 'fruits rouges': 'berries',
};

const MOTS_VIDES = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'au', 'aux', 'à', 'a', 'et', 'en', 'un', 'une', 'avec']);

/**
 * Traduit une requête FR→EN via le lexique.
 * Retourne null si un mot significatif est inconnu (→ il faudra passer par DeepL).
 * @param {string} requeteFr
 */
export function traduireRequeteViaLexique(requeteFr) {
  const normalisee = requeteFr.trim().toLowerCase();
  if (!normalisee) return '';

  // Tente d'abord les expressions à plusieurs mots présentes telles quelles.
  if (LEXIQUE_FR_EN[normalisee]) return LEXIQUE_FR_EN[normalisee];

  const mots = normalisee.split(/\s+/);
  const traduits = [];
  for (const mot of mots) {
    if (MOTS_VIDES.has(mot)) continue;
    const propre = mot.replace(/[.,;!?]/g, '');
    const traduction = LEXIQUE_FR_EN[propre];
    if (!traduction) return null;
    traduits.push(traduction);
  }
  return traduits.join(' ');
}
