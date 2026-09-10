// Calendrier de saisonnalité France métropolitaine (mois 1-12).
// Aucune API de recettes ne fournit cette information : la table est embarquée,
// et on la croise avec les ingrédients pour qualifier une recette.

import { normaliser, correspondanceLaPlusLongue } from './texte.js';

const M = (...mois) => mois;

const CALENDRIER = {
  // Légumes
  artichaut: M(5, 6, 7, 8, 9, 10, 11),
  asperge: M(4, 5, 6),
  aubergine: M(7, 8, 9, 10),
  betterave: M(6, 7, 8, 9, 10, 11, 12),
  blette: M(5, 6, 7, 8, 9, 10, 11),
  brocoli: M(6, 7, 8, 9, 10, 11),
  carotte: M(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12),
  céleri: M(8, 9, 10, 11, 12),
  champignon: M(9, 10, 11, 12),
  chou: M(9, 10, 11, 12, 1, 2, 3, 4),
  'chou-fleur': M(9, 10, 11, 12, 1, 2, 3, 4),
  concombre: M(5, 6, 7, 8, 9),
  courge: M(9, 10, 11, 12),
  courgette: M(6, 7, 8, 9),
  butternut: M(9, 10, 11, 12),
  endive: M(10, 11, 12, 1, 2, 3, 4),
  épinard: M(3, 4, 5, 6, 9, 10, 11),
  fenouil: M(6, 7, 8, 9, 10),
  'haricot vert': M(6, 7, 8, 9),
  mâche: M(10, 11, 12, 1, 2, 3),
  navet: M(10, 11, 12, 1, 2, 3, 4),
  oignon: M(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12),
  panais: M(10, 11, 12, 1, 2, 3),
  'petit pois': M(5, 6, 7),
  poireau: M(9, 10, 11, 12, 1, 2, 3, 4),
  poivron: M(7, 8, 9, 10),
  'pomme de terre': M(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12),
  potimarron: M(9, 10, 11, 12, 1),
  potiron: M(9, 10, 11, 12),
  radis: M(3, 4, 5, 6, 7, 8, 9, 10),
  roquette: M(4, 5, 6, 7, 8, 9, 10),
  salade: M(4, 5, 6, 7, 8, 9, 10),
  laitue: M(4, 5, 6, 7, 8, 9, 10),
  tomate: M(6, 7, 8, 9, 10),
  topinambour: M(10, 11, 12, 1, 2, 3),

  // Fruits
  abricot: M(6, 7, 8),
  cerise: M(5, 6, 7),
  citron: M(1, 2, 3, 4, 11, 12),
  clémentine: M(11, 12, 1),
  figue: M(8, 9, 10),
  fraise: M(4, 5, 6, 7),
  framboise: M(6, 7, 8, 9),
  kiwi: M(11, 12, 1, 2, 3),
  melon: M(6, 7, 8, 9),
  mirabelle: M(8, 9),
  myrtille: M(7, 8, 9),
  nectarine: M(7, 8, 9),
  orange: M(12, 1, 2, 3, 4),
  pastèque: M(7, 8, 9),
  pêche: M(6, 7, 8, 9),
  poire: M(8, 9, 10, 11, 12),
  pomme: M(8, 9, 10, 11, 12, 1, 2, 3, 4),
  prune: M(7, 8, 9),
  raisin: M(9, 10),
  rhubarbe: M(4, 5, 6),
};

/**
 * Qualifie une recette par rapport au mois courant.
 * Retourne 'inconnu' si aucun ingrédient saisonnier n'est reconnu — mieux vaut
 * ne rien afficher qu'un badge trompeur.
 * @param {import('../db/db.js').Recipe} recette
 * @param {number} [mois] 1-12, par défaut le mois courant
 */
export function evaluerSaisonnalite(recette, mois = new Date().getMonth() + 1) {
  const produits = Object.keys(CALENDRIER);
  const deSaison = new Set();
  const horsSaison = new Set();

  // Un ingrédient ne compte que pour le produit le plus spécifique qu'il désigne :
  // "pomme de terre" est une pomme de terre, jamais une pomme.
  for (const ingredient of recette.ingredients || []) {
    const produit = correspondanceLaPlusLongue(normaliser(ingredient.nom), produits);
    if (!produit) continue;
    if (CALENDRIER[produit].includes(mois)) deSaison.add(produit);
    else horsSaison.add(produit);
  }

  const resultat = { deSaison: [...deSaison], horsSaison: [...horsSaison] };
  if (resultat.deSaison.length + resultat.horsSaison.length === 0) return { statut: 'inconnu', ...resultat };
  if (resultat.horsSaison.length === 0) return { statut: 'de_saison', ...resultat };
  if (resultat.deSaison.length === 0) return { statut: 'hors_saison', ...resultat };
  return { statut: 'partiel', ...resultat };
}

export const LABELS_SAISON = {
  de_saison: 'De saison',
  partiel: 'Partiellement de saison',
  hors_saison: 'Hors saison',
  inconnu: '',
};
