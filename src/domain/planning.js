// Algorithme de planification hebdomadaire — glouton pondéré (MVP).
// Pas de solveur de contraintes : à chaque créneau restant, on choisit la recette
// qui maximise un score composite, sous réserve des contraintes d'envies et du
// filtre bloquant "gluten à éviter strictement".

import { appliquerPreferenceGluten, calculerEffortScore, calculerBatchScore } from './scoring.js';
import { pourcentageCouverture } from './nutrition.js';

export const POIDS_PAR_DEFAUT = {
  completionNutrition: 0.35,
  respectEnvies: 0.3,
  effort: 0.2,
  batch: 0.15,
};

/**
 * Classe une recette par catégorie d'envie à partir de ses tags.
 * @param {import('../db/db.js').Recipe} recipe
 */
function categorieEnvie(recipe) {
  const tags = (recipe.tags || []).map((t) => t.toLowerCase());
  if (tags.includes('vegetarien') || tags.includes('végétarien')) return 'vegetarien';
  if (tags.includes('poisson')) return 'poisson';
  if (tags.includes('viande')) return 'viande';
  return 'autre';
}

/**
 * Score composite d'une recette candidate pour un créneau donné.
 * @param {import('../db/db.js').Recipe} recipe
 * @param {{kcal:number, proteines:number, glucides:number, lipides:number}} besoinsRestants
 * @param {Record<string, number>} envieRestantes
 * @param {import('../db/db.js').PreferenceAlimentaire[]} preferences
 * @param {typeof POIDS_PAR_DEFAUT} poids
 */
function scoreComposite(recipe, besoinsRestants, envieRestantes, preferences, poids) {
  const { bloque, malus } = appliquerPreferenceGluten(recipe, preferences);
  if (bloque) return null;

  const couverture = pourcentageCouverture(recipe.nutritionParPortion || {}, besoinsRestants);
  // Pénalise autant le sous- que le sur-apport par rapport au restant à couvrir.
  const ecartKcal = Math.abs(100 - couverture.kcal);
  const scoreNutrition = Math.max(0, 100 - ecartKcal);

  const cat = categorieEnvie(recipe);
  const scoreEnvie = (envieRestantes[cat] || 0) > 0 ? 100 : 20;

  const effort = recipe.effortScore ?? calculerEffortScore(recipe);
  const batch = recipe.batchScore ?? calculerBatchScore(recipe);

  const composite =
    poids.completionNutrition * scoreNutrition +
    poids.respectEnvies * scoreEnvie +
    poids.effort * effort +
    poids.batch * batch -
    malus * 100;

  return { composite, categorie: cat };
}

/**
 * Génère un planning hebdomadaire par sélection gloutonne.
 * @param {{
 *   recettesDisponibles: import('../db/db.js').Recipe[],
 *   objectifsJournaliers: import('../db/db.js').ObjectifJournalier[],
 *   envies: {vegetarien:number, poisson:number, viande:number, autre:number, batchSouhaite:number},
 *   preferences: import('../db/db.js').PreferenceAlimentaire[],
 *   typesRepas?: string[],
 *   nbAlternatives?: number,
 *   poids?: typeof POIDS_PAR_DEFAUT,
 * }} params
 * @returns {import('../db/db.js').RepasAssigne[]}
 */
export function genererPlanningHebdomadaire({
  recettesDisponibles,
  objectifsJournaliers,
  envies,
  preferences,
  typesRepas = ['diner'],
  nbAlternatives = 3,
  poids = POIDS_PAR_DEFAUT,
}) {
  const envieRestantes = { ...envies };
  const repasAssignes = [];
  const recentesParId = new Set();

  for (const objectif of objectifsJournaliers) {
    for (const typeRepas of typesRepas) {
      const besoinsRestants = objectif.macrosCible
        ? { ...objectif.macrosCible, kcal: objectif.kcalCible }
        : { kcal: objectif.kcalCible, proteines: 0, glucides: 0, lipides: 0 };

      const candidats = recettesDisponibles
        .filter((r) => !recentesParId.has(r.id))
        .map((r) => ({ recipe: r, s: scoreComposite(r, besoinsRestants, envieRestantes, preferences, poids) }))
        .filter((c) => c.s !== null)
        .sort((a, b) => b.s.composite - a.s.composite);

      if (candidats.length === 0) continue;

      const [choisi, ...reste] = candidats;
      repasAssignes.push({
        jour: objectif.jour,
        typeRepas,
        recetteId: choisi.recipe.id,
        alternatives: reste.slice(0, nbAlternatives).map((c) => c.recipe.id),
      });

      if (envieRestantes[choisi.s.categorie] > 0) envieRestantes[choisi.s.categorie] -= 1;
      recentesParId.add(choisi.recipe.id);
    }
  }

  return repasAssignes;
}
