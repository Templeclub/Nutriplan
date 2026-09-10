// Comparaison de texte sur des MOTS ENTIERS, base commune aux heuristiques
// (régime, gluten, saisonnalité). Les comparaisons par sous-chaîne produisent
// des faux positifs coûteux : "vegetable" contient "ble", "Malabar" contient
// "bar", "pomme de terre" contient "pomme".

/** Minuscules, sans accents, ponctuation réduite à des espaces. */
export function normaliser(texte) {
  return String(texte || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Ensemble des mots d'un texte normalisé. */
export function motsDe(texte) {
  return new Set(normaliser(texte).split(' ').filter(Boolean));
}

/**
 * Vrai si `expression` (un mot ou plusieurs) apparaît dans `texte` en mots entiers.
 * @param {string} texteNormalise déjà passé par normaliser()
 * @param {string} expression
 */
export function contientExpression(texteNormalise, expression) {
  const cible = normaliser(expression);
  if (!cible) return false;
  return new RegExp(`(^| )${cible.replace(/ /g, ' ')}( |$)`).test(texteNormalise);
}

/**
 * Parmi une liste d'expressions, retourne la plus longue qui correspond au texte.
 * Évite qu'un terme court masque un terme composé ("pomme" dans "pomme de terre").
 * @param {string} texteNormalise
 * @param {string[]} expressions
 */
export function correspondanceLaPlusLongue(texteNormalise, expressions) {
  let meilleure = null;
  for (const expression of expressions) {
    if (!contientExpression(texteNormalise, expression)) continue;
    if (!meilleure || expression.length > meilleure.length) meilleure = expression;
  }
  return meilleure;
}
