// Traduction via DeepL, derrière la fonction serverless /api/translate.
// Stratégie de quota : le lexique culinaire local traite la plupart des requêtes
// de recherche sans appel réseau ; DeepL n'est sollicité que pour le reste, et
// le contenu d'une recette n'est traduit qu'une seule fois — à l'import, avant
// d'être stocké en français en base.

import { traduireRequeteViaLexique } from '../domain/lexique-culinaire.js';

const EST_LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);
const cache = new Map();

/**
 * DeepL n'autorise pas les appels navigateur (pas de CORS), donc en local — où
 * la fonction serverless n'existe pas — la traduction est simplement indisponible.
 * L'app doit alors se rabattre sur le texte original plutôt que d'échouer.
 */
async function appelerDeepL(textes, source, cible) {
  const reponse = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ textes, source, cible }),
  });
  if (!reponse.ok) throw new Error(`Traduction indisponible (${reponse.status})`);
  const data = await reponse.json();
  return (data.translations || []).map((t) => t.text);
}

/**
 * Traduit une requête de recherche FR→EN. Utilise le lexique quand il suffit.
 * @param {string} requeteFr
 * @returns {Promise<{requete: string, viaLexique: boolean}>}
 */
export async function traduireRequete(requeteFr) {
  const viaLexique = traduireRequeteViaLexique(requeteFr);
  if (viaLexique !== null) return { requete: viaLexique, viaLexique: true };

  if (EST_LOCAL) return { requete: requeteFr, viaLexique: false };

  try {
    const [traduit] = await appelerDeepL([requeteFr], 'FR', 'EN-US');
    return { requete: traduit || requeteFr, viaLexique: false };
  } catch {
    return { requete: requeteFr, viaLexique: false };
  }
}

/**
 * Traduit un lot de textes EN→FR. Renvoie les textes originaux en cas d'échec
 * (mieux vaut une recette en anglais qu'un import qui plante).
 * @param {string[]} textes
 * @returns {Promise<{textes: string[], traduit: boolean}>}
 */
export async function traduireVersFrancais(textes) {
  const aTraduire = textes.filter((t) => t && !cache.has(t));

  if (aTraduire.length === 0) {
    return { textes: textes.map((t) => cache.get(t) ?? t), traduit: true };
  }
  if (EST_LOCAL) return { textes, traduit: false };

  try {
    // DeepL accepte 50 textes par appel : on découpe si nécessaire.
    for (let i = 0; i < aTraduire.length; i += 50) {
      const lot = aTraduire.slice(i, i + 50);
      const traduits = await appelerDeepL(lot, 'EN', 'FR');
      lot.forEach((original, idx) => cache.set(original, traduits[idx] ?? original));
    }
    return { textes: textes.map((t) => cache.get(t) ?? t), traduit: true };
  } catch {
    return { textes, traduit: false };
  }
}

/**
 * Traduit une recette complète (titre, ingrédients, instructions) en français.
 * Appelé une seule fois, au moment de l'ajout en bibliothèque.
 * @param {import('../db/db.js').Recipe} recette
 */
export async function traduireRecette(recette) {
  const instructions = (recette.instructions || '').split('\n').filter(Boolean);
  const nomsIngredients = (recette.ingredients || []).map((i) => i.nom);

  const aTraduire = [recette.titre, ...nomsIngredients, ...instructions];
  const { textes, traduit } = await traduireVersFrancais(aTraduire);

  if (!traduit) return { ...recette, langueOrigine: 'en' };

  let curseur = 0;
  const titre = textes[curseur++];
  const ingredients = (recette.ingredients || []).map((ing) => ({ ...ing, nom: textes[curseur++] }));
  const instructionsFr = instructions.map(() => textes[curseur++]).join('\n');

  return { ...recette, titre, ingredients, instructions: instructionsFr, langueOrigine: 'fr' };
}
