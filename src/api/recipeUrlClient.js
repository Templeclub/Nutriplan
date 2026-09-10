// Import d'une recette depuis l'URL d'un site francophone, via la fonction
// serverless /api/recipe-import qui lit le JSON-LD schema.org de la page.
// Le fetch doit passer par le serveur : le navigateur ne peut pas lire une page
// d'un autre domaine (CORS).

const EST_LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);

/**
 * @param {string} url
 * @returns {Promise<import('../db/db.js').Recipe>}
 */
export async function importerRecetteDepuisUrl(url) {
  if (EST_LOCAL) {
    throw new Error(
      "L'import par URL nécessite la fonction serverless : il fonctionne sur la version déployée, pas en local sans Node."
    );
  }

  const reponse = await fetch(`/api/recipe-import?url=${encodeURIComponent(url)}`);
  const data = await reponse.json();
  if (!reponse.ok) throw new Error(data.error || 'Import impossible');

  return {
    titre: data.titre,
    source: 'url',
    url: data.url,
    image: '',
    tags: data.categories || [],
    regimes: { vegetarien: false, vegan: false, sansGluten: false, sansLactose: false },
    tempsPrep: data.tempsPrep,
    tempsCuisson: data.tempsCuisson,
    portions: data.portions,
    ingredients: data.ingredients,
    instructions: data.instructions,
    nutritionParPortion: data.nutritionParPortion,
    effortScore: null,
    batchScore: null,
    favori: false,
    langueOrigine: 'fr',
    dateAjout: new Date().toISOString(),
    historiqueConsommation: [],
  };
}
