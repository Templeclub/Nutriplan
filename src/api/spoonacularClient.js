// Client Spoonacular. En production, tous les appels passent par /api/spoonacular
// (fonction serverless Vercel) pour ne jamais exposer la clé côté client.
// En dev local (pas de Node donc pas de fonction serverless disponible sur
// localhost:8766), on appelle l'API directement avec une clé de dev lue depuis
// src/config.local.js — fichier gitignored, jamais commité. Voir config.local.example.js.
//
// L'API est anglophone : la requête de l'utilisateur est traduite FR→EN avant
// l'appel, et le contenu d'une recette est traduit EN→FR une seule fois, au
// moment de l'ajout en bibliothèque (cf. translationClient.js).

import { traduireRequete } from './translationClient.js';

let devApiKey = null;
try {
  const mod = await import('../config.local.js');
  devApiKey = mod.SPOONACULAR_DEV_API_KEY || null;
} catch {
  // Pas de config locale : normal en production (le proxy est utilisé à la place).
}

const EST_LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);

// `parseIngredients` exige un body x-www-form-urlencoded chez Spoonacular ; les
// autres endpoints utilisés ici sont de simples GET avec params en query string.
const ENDPOINTS_POST = ['/recipes/parseIngredients'];

function construireUrl(chemin, params, methode) {
  const qs = new URLSearchParams(params).toString();
  const estPost = methode === 'POST';
  if (EST_LOCAL && devApiKey) {
    const base = `https://api.spoonacular.com${chemin}?apiKey=${devApiKey}`;
    return estPost ? base : `${base}&${qs}`;
  }
  return `/api/spoonacular?path=${encodeURIComponent(chemin)}${estPost ? '' : `&${qs}`}`;
}

async function appelerApi(chemin, params) {
  const methode = ENDPOINTS_POST.includes(chemin) ? 'POST' : 'GET';
  const url = construireUrl(chemin, params, methode);
  const options =
    methode === 'POST'
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(params).toString(),
        }
      : undefined;
  const reponse = await fetch(url, options);
  if (!reponse.ok) {
    if (EST_LOCAL && !devApiKey) {
      throw new Error(
        "Pas de proxy serverless disponible en local sans Node. Crée src/config.local.js " +
          '(copie config.local.example.js) avec ta clé Spoonacular pour tester en dev.'
      );
    }
    throw new Error(`Erreur API Spoonacular (${reponse.status})`);
  }
  return reponse.json();
}

/**
 * Recherche de recettes. `query` est saisie en français et traduite avant l'appel.
 * @param {{query:string, diet?:string, type?:string, maxTemps?:number, number?:number}} params
 * @returns {Promise<{resultats: object[], requeteTraduite: string}>}
 */
export async function rechercherRecettes({ query, diet, type, maxTemps, number = 12 }) {
  const { requete } = await traduireRequete(query || '');

  const data = await appelerApi('/recipes/complexSearch', {
    query: requete,
    ...(diet ? { diet } : {}),
    ...(type ? { type } : {}),
    ...(maxTemps ? { maxReadyTime: String(maxTemps) } : {}),
    number: String(number),
    addRecipeNutrition: 'true',
    addRecipeInformation: 'true',
    instructionsRequired: 'true',
    fillIngredients: 'true',
  });

  return {
    resultats: (data.results || []).map(mapperRecetteApiVersDomaine),
    requeteTraduite: requete,
  };
}

/** Détail complet d'une recette (si la recherche n'a pas tout renvoyé). */
export async function obtenirDetailRecette(idApi) {
  const data = await appelerApi(`/recipes/${idApi}/information`, { includeNutrition: 'true' });
  return mapperRecetteApiVersDomaine(data);
}

/** Estime la nutrition d'une recette manuelle à partir de sa liste d'ingrédients. */
export async function estimerNutritionIngredients(ingredients, portions) {
  const lignes = ingredients.map((i) => `${i.quantite} ${i.unite} ${i.nom}`);
  const data = await appelerApi('/recipes/parseIngredients', {
    ingredientList: lignes.join('\n'),
    servings: String(portions || 1),
    includeNutrition: 'true',
  });
  const total = { kcal: 0, proteines: 0, glucides: 0, lipides: 0, fibres: 0 };
  for (const item of Array.isArray(data) ? data : []) {
    const nutriments = item?.nutrition?.nutrients || [];
    const trouver = (nom) => nutriments.find((n) => n.name === nom)?.amount || 0;
    total.kcal += trouver('Calories');
    total.proteines += trouver('Protein');
    total.glucides += trouver('Carbohydrates');
    total.lipides += trouver('Fat');
    total.fibres += trouver('Fiber');
  }
  const p = portions || 1;
  return {
    kcal: Math.round(total.kcal / p),
    proteines: Math.round(total.proteines / p),
    glucides: Math.round(total.glucides / p),
    lipides: Math.round(total.lipides / p),
    fibres: Math.round(total.fibres / p),
  };
}

function trouverNutriment(nutriments, nom) {
  return Math.round(nutriments?.find((n) => n.name === nom)?.amount || 0);
}

/** Convertit une recette au format Spoonacular vers notre modèle Recipe. */
function mapperRecetteApiVersDomaine(r) {
  const nutriments = r.nutrition?.nutrients || [];
  const readyIn = r.readyInMinutes || 0;

  return {
    titre: r.title,
    source: 'api',
    url: r.sourceUrl || r.spoonacularSourceUrl || '',
    image: r.image || '',
    tags: [...(r.dishTypes || []), ...(r.cuisines || [])],
    regimes: {
      vegetarien: Boolean(r.vegetarian),
      vegan: Boolean(r.vegan),
      sansGluten: Boolean(r.glutenFree),
      sansLactose: Boolean(r.dairyFree),
    },
    tempsPrep: Math.round(r.preparationMinutes > 0 ? r.preparationMinutes : readyIn / 2),
    tempsCuisson: Math.round(r.cookingMinutes > 0 ? r.cookingMinutes : readyIn / 2),
    portions: r.servings || 1,
    ingredients: (r.extendedIngredients || r.missedIngredients || r.usedIngredients || []).map((i) => ({
      nom: i.name || i.originalName || '',
      quantite: Math.round((i.amount || 0) * 10) / 10,
      unite: i.unit || '',
    })),
    instructions:
      r.instructions?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() ||
      (r.analyzedInstructions?.[0]?.steps || []).map((s) => `${s.number}. ${s.step}`).join('\n'),
    nutritionParPortion: {
      kcal: trouverNutriment(nutriments, 'Calories'),
      proteines: trouverNutriment(nutriments, 'Protein'),
      glucides: trouverNutriment(nutriments, 'Carbohydrates'),
      lipides: trouverNutriment(nutriments, 'Fat'),
      fibres: trouverNutriment(nutriments, 'Fiber'),
    },
    effortScore: null,
    batchScore: null,
    favori: false,
    langueOrigine: 'en',
    dateAjout: new Date().toISOString(),
    historiqueConsommation: [],
    _idApi: r.id,
  };
}
