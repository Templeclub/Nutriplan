// Copie ce fichier en `config.local.js` (gitignored) pour tester en local sans Node,
// où /api/spoonacular (fonction serverless) n'est pas disponible.
// Ta clé sera visible dans les devtools de TON navigateur en local — jamais commitée,
// jamais utilisée en production (le proxy prend le relais une fois déployé).
export const SPOONACULAR_DEV_API_KEY = 'colle-ta-cle-ici';
