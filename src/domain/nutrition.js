// Calcul des besoins nutritionnels (formule Mifflin-St Jeor + multiplicateur d'activité).

export const NIVEAUX_ACTIVITE = ['repos', 'leger', 'modere', 'intense'];

export const LABELS_ACTIVITE = {
  repos: 'Repos',
  leger: 'Léger',
  modere: 'Modéré',
  intense: 'Intense',
};

// Multiplicateurs appliqués au BMR. Pensés pour une activité sportive ponctuelle
// (triathlon, gravel, enduro, foot, packraft) plutôt qu'un métier physique fixe.
const MULTIPLICATEURS_ACTIVITE = {
  repos: 1.2,
  leger: 1.375,
  modere: 1.55,
  intense: 1.8,
};

/**
 * BMR via Mifflin-St Jeor.
 * @param {{poidsKg:number, tailleCm:number, age:number, sexe:'homme'|'femme'}} params
 */
export function calculerBMR({ poidsKg, tailleCm, age, sexe }) {
  const base = 10 * poidsKg + 6.25 * tailleCm - 5 * age;
  return sexe === 'femme' ? base - 161 : base + 5;
}

/**
 * Besoins caloriques + macros cibles pour un niveau d'activité donné.
 * Répartition macro par défaut : 30% protéines / 40% glucides / 30% lipides,
 * protéines recalées à un plancher de 1.6g/kg (pertinent pour profil sportif).
 * @param {{poidsKg:number, tailleCm:number, age:number, sexe:'homme'|'femme'}} donneesCorporelles
 * @param {'repos'|'leger'|'modere'|'intense'} niveauActivite
 */
export function calculerBesoins(donneesCorporelles, niveauActivite) {
  const bmr = calculerBMR(donneesCorporelles);
  const kcal = Math.round(bmr * (MULTIPLICATEURS_ACTIVITE[niveauActivite] ?? 1.2));

  const proteinesPlancher = Math.round((donneesCorporelles.poidsKg || 0) * 1.6);
  const kcalProteines = Math.max(proteinesPlancher * 4, kcal * 0.3);
  const proteines = Math.round(kcalProteines / 4);
  const kcalRestant = kcal - proteines * 4;
  const glucides = Math.round((kcalRestant * (40 / 70)) / 4);
  const lipides = Math.round((kcalRestant * (30 / 70)) / 9);

  return { kcal, proteines, glucides, lipides };
}

/**
 * % de couverture des besoins quotidiens par une portion.
 * @param {import('../db/db.js').NutritionParPortion} nutritionParPortion
 * @param {import('../db/db.js').BesoinsBase} besoinsBase
 */
export function pourcentageCouverture(nutritionParPortion, besoinsBase) {
  const pct = (valeur, cible) => (cible > 0 ? Math.round((valeur / cible) * 100) : 0);
  return {
    kcal: pct(nutritionParPortion.kcal, besoinsBase.kcal),
    proteines: pct(nutritionParPortion.proteines, besoinsBase.proteines),
    glucides: pct(nutritionParPortion.glucides, besoinsBase.glucides),
    lipides: pct(nutritionParPortion.lipides, besoinsBase.lipides),
  };
}
