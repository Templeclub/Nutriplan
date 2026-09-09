// Scores de recette : préférences alimentaires (ex. gluten), effort, batch-cooking.

// Mots-clés heuristiques pour détecter la présence de gluten dans une recette
// (utilisé faute de donnée structurée fiable venant de l'API ou de la saisie manuelle).
const MOTS_CLES_GLUTEN = [
  'blé', 'ble', 'farine', 'pâte', 'pate', 'pâtes', 'pates', 'pain', 'baguette',
  'couscous', 'semoule', 'orge', 'seigle', 'pizza', 'burger', 'chapelure',
  'biscuit', 'gâteau', 'gateau', 'sauce soja', 'nouilles', 'boulgour',
];

/**
 * Estime une teneur "gluten probable" 0 (aucun signal) à 1 (fort signal) à partir
 * des ingrédients/titre/tags. Heuristique volontairement simple pour le MVP.
 * @param {import('../db/db.js').Recipe} recipe
 */
export function estimerScoreGluten(recipe) {
  const texte = [
    recipe.titre,
    ...(recipe.tags || []),
    ...(recipe.ingredients || []).map((i) => i.nom),
  ]
    .join(' ')
    .toLowerCase();

  const occurrences = MOTS_CLES_GLUTEN.filter((mot) => texte.includes(mot)).length;
  return Math.min(1, occurrences / 3);
}

/**
 * Ajustement de score appliqué selon la préférence "gluten" du profil actif.
 * Retourne { bloque, malus } — bloque=true seulement si intensite = a_eviter_strictement
 * ET la recette a un signal gluten. malus est un facteur [0..1] à soustraire du score composite.
 * @param {import('../db/db.js').Recipe} recipe
 * @param {import('../db/db.js').PreferenceAlimentaire[]} preferences
 */
export function appliquerPreferenceGluten(recipe, preferences) {
  const pref = (preferences || []).find((p) => p.type === 'gluten');
  if (!pref || pref.intensite === 'aucune_contrainte') {
    return { bloque: false, malus: 0 };
  }
  const scoreGluten = estimerScoreGluten(recipe);
  if (pref.intensite === 'a_eviter_strictement') {
    return { bloque: scoreGluten > 0, malus: 0 };
  }
  // 'a_reduire' : influence le tri, ne bloque jamais.
  return { bloque: false, malus: scoreGluten * 0.5 };
}

/**
 * Score d'efficacité : temps total / portions, pondéré par la complexité
 * (nb d'ingrédients + nb d'étapes estimé depuis les instructions).
 * Retourne un score normalisé 0 (peu efficace) à 100 (très efficace).
 * @param {import('../db/db.js').Recipe} recipe
 */
export function calculerEffortScore(recipe) {
  const tempsTotal = (recipe.tempsPrep || 0) + (recipe.tempsCuisson || 0);
  const portions = recipe.portions || 1;
  const tempsParPortion = tempsTotal / portions;

  const nbIngredients = (recipe.ingredients || []).length;
  const nbEtapes = (recipe.instructions || '')
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean).length;
  const complexite = 1 + (nbIngredients + nbEtapes) / 20; // ~1 à ~2 pour recettes courantes

  const chargeAjustee = tempsParPortion * complexite;
  // Normalisation empirique : 5 min/portion ajustée => ~100, 40 min/portion ajustée => ~0
  const score = 100 - ((chargeAjustee - 5) / (40 - 5)) * 100;
  return Math.round(Math.max(0, Math.min(100, score)));
}

// Ingrédients dont la présence suggère une bonne tenue à la congélation.
const MOTS_CLES_CONGELABLE = [
  'soupe', 'velouté', 'veloute', 'curry', 'chili', 'ragoût', 'ragout', 'bolognaise',
  'sauce tomate', 'dahl', 'dal', 'lentilles', 'haricots', 'riz', 'gratin', 'tajine',
  'pot-au-feu', 'bouillon', 'compote',
];
const MOTS_CLES_NON_CONGELABLE = [
  'salade', 'crudité', 'crudite', 'avocat', 'mayonnaise', 'oeuf dur', 'œuf dur',
  'concombre', 'tartare', 'ceviche', 'carpaccio',
];

/**
 * Score batch-cooking : combine nombre de portions et compatibilité congélation.
 * `tagBatchManuel` (bool|null) permet à l'utilisateur d'outrepasser l'heuristique.
 * Retourne un score 0-100.
 * @param {import('../db/db.js').Recipe} recipe
 * @param {boolean|null} [tagBatchManuel]
 */
export function calculerBatchScore(recipe, tagBatchManuel = null) {
  const texte = [recipe.titre, ...(recipe.tags || [])].join(' ').toLowerCase();

  let compatCongelation;
  if (tagBatchManuel !== null && tagBatchManuel !== undefined) {
    compatCongelation = tagBatchManuel ? 1 : 0;
  } else {
    const bon = MOTS_CLES_CONGELABLE.some((m) => texte.includes(m));
    const mauvais = MOTS_CLES_NON_CONGELABLE.some((m) => texte.includes(m));
    compatCongelation = mauvais ? 0.1 : bon ? 1 : 0.5;
  }

  const scorePortions = Math.min(1, (recipe.portions || 1) / 6); // 6+ portions = max

  return Math.round((compatCongelation * 0.6 + scorePortions * 0.4) * 100);
}
