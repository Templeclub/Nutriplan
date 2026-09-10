// Classification du régime d'une recette (végétarien / poisson / viande / autre),
// utilisée pour les badges d'affichage et le respect des envies dans le planning.
//
// La détection se fait sur des MOTS ENTIERS, pas des sous-chaînes : "Malabar"
// ne doit pas être lu comme le poisson "bar". Le vocabulaire est bilingue car
// les résultats de recherche sont classés avant leur traduction en français.

import { motsDe } from './texte.js';

const MOTS_POISSON = new Set([
  'poisson', 'fish', 'saumon', 'salmon', 'thon', 'tuna', 'cabillaud', 'cod',
  'morue', 'truite', 'trout', 'crevette', 'crevettes', 'shrimp', 'shrimps',
  'prawn', 'prawns', 'moule', 'moules', 'mussels', 'calamar', 'squid',
  'sardine', 'sardines', 'maquereau', 'mackerel', 'colin', 'hake', 'dorade',
  'bream', 'bar', 'seabass', 'anchois', 'anchovy', 'anchovies', 'crabe', 'crab',
  'homard', 'lobster', 'poulpe', 'octopus', 'seiche', 'cuttlefish', 'scallop',
  'scallops', 'seafood', 'halibut', 'tilapia', 'haddock',
]);

const MOTS_VIANDE = new Set([
  'poulet', 'chicken', 'boeuf', 'beef', 'porc', 'pork', 'agneau', 'lamb',
  'veau', 'veal', 'canard', 'duck', 'dinde', 'turkey', 'jambon', 'ham',
  'lardon', 'lardons', 'bacon', 'saucisse', 'sausage', 'sausages', 'steak',
  'chorizo', 'merguez', 'viande', 'meat', 'escalope', 'magret', 'gigot',
  'pancetta', 'charcuterie', 'prosciutto', 'salami', 'venison', 'rabbit',
  'lapin', 'mince', 'meatball', 'meatballs',
]);

function motsRecette(recette) {
  return motsDe(
    [recette.titre, ...(recette.tags || []), ...(recette.ingredients || []).map((i) => i.nom)].join(' ')
  );
}

/**
 * @param {import('../db/db.js').Recipe} recette
 * @returns {'vegetarien'|'poisson'|'viande'|'autre'}
 */
export function classifierRegime(recette) {
  // Un flag explicite venant de l'API fait autorité.
  if (recette.regimes?.vegetarien || recette.regimes?.vegan) return 'vegetarien';

  const mots = motsRecette(recette);
  if (mots.has('vegetarien') || mots.has('vegetarian') || mots.has('vegan')) return 'vegetarien';

  // La viande est testée avant le poisson : un plat mixte est plus souvent
  // identifié par sa viande, et cela évite qu'un bouillon de poisson en fond
  // de sauce ne requalifie un plat de volaille.
  const aViande = [...MOTS_VIANDE].some((m) => mots.has(m));
  if (aViande) return 'viande';
  const aPoisson = [...MOTS_POISSON].some((m) => mots.has(m));
  if (aPoisson) return 'poisson';

  return 'autre';
}

export const LABELS_REGIME = {
  vegetarien: 'Végétarien',
  poisson: 'Poisson',
  viande: 'Viande',
  autre: 'Autre',
};

export const COULEURS_REGIME = {
  vegetarien: 'jaune',
  poisson: 'bleu',
  viande: 'rouge',
  autre: 'creme',
};
