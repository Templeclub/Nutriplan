import Dexie from 'dexie';

export const db = new Dexie('NutriPlanDB');

// v1 schema. Dexie indexes: '++id' auto pk, '*field' multi-entry index on array field.
// `actif` (booléen) n'est volontairement pas indexé : IndexedDB n'accepte pas les
// booléens comme clé indexable. Avec un nombre de profils toujours faible, un
// filtre en mémoire (toArray + find) est largement suffisant.
// `favori` (booléen) n'est pas indexé pour la même raison que `actif` ci-dessus.
db.version(1).stores({
  recipes: '++id, dateAjout, *tags, source',
  profiles: '++id',
  weeklyPlans: '++id, semaine',
});

/**
 * @typedef {Object} Ingredient
 * @property {string} nom
 * @property {number} quantite
 * @property {string} unite
 *
 * @typedef {Object} NutritionParPortion
 * @property {number} kcal
 * @property {number} proteines
 * @property {number} glucides
 * @property {number} lipides
 * @property {number} fibres
 *
 * @typedef {Object} Recipe
 * @property {number} [id]
 * @property {string} titre
 * @property {'manuel'|'api'} source
 * @property {string} [url]
 * @property {string[]} tags  // ex: ['vegetarien', 'plat-principal', 'poulet']
 * @property {number} tempsPrep  // minutes
 * @property {number} tempsCuisson  // minutes
 * @property {number} portions
 * @property {Ingredient[]} ingredients
 * @property {string} instructions
 * @property {NutritionParPortion} nutritionParPortion
 * @property {number|null} effortScore
 * @property {number|null} batchScore
 * @property {boolean} favori
 * @property {string} dateAjout  // ISO date
 * @property {string[]} historiqueConsommation  // ISO dates
 *
 * @typedef {Object} PreferenceAlimentaire
 * @property {string} type  // 'gluten' | 'lactose' | ...
 * @property {'aucune_contrainte'|'a_reduire'|'a_eviter_strictement'} intensite
 *
 * @typedef {Object} BesoinsBase
 * @property {number} kcal
 * @property {number} proteines
 * @property {number} glucides
 * @property {number} lipides
 *
 * @typedef {Object} UserProfile
 * @property {number} [id]
 * @property {string} nom
 * @property {boolean} actif
 * @property {number} [poidsKg]
 * @property {number} [tailleCm]
 * @property {number} [age]
 * @property {'homme'|'femme'} [sexe]
 * @property {BesoinsBase} besoinsBase
 * @property {'repos'|'leger'|'modere'|'intense'} niveauActiviteDuJour
 * @property {PreferenceAlimentaire[]} preferencesAlimentaires
 *
 * @typedef {Object} ObjectifJournalier
 * @property {string} jour  // 'lundi'...'dimanche'
 * @property {'repos'|'leger'|'modere'|'intense'} niveauActivitePrevu
 * @property {number} kcalCible
 * @property {BesoinsBase} macrosCible
 *
 * @typedef {Object} RepasAssigne
 * @property {string} jour
 * @property {string} typeRepas  // 'dejeuner' | 'diner' | ...
 * @property {number} recetteId
 * @property {number[]} alternatives
 *
 * @typedef {Object} WeeklyPlan
 * @property {number} [id]
 * @property {string} semaine  // ISO week, ex '2026-W37'
 * @property {{vegetarien:number, poisson:number, viande:number, autre:number, batchSouhaite:number}} envies
 * @property {ObjectifJournalier[]} objectifsJournaliers
 * @property {RepasAssigne[]} repasAssignes
 */
