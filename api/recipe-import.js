// Fonction serverless Vercel — importe une recette depuis l'URL d'un site de
// recettes en lisant son JSON-LD schema.org/Recipe (Marmiton, 750g, CuisineAZ,
// Cuisine Actuelle... l'exposent tous). Contenu nativement en français, sans quota.

const HOTES_INTERDITS = /^(localhost$|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$|.*\.(internal|local)$)/i;
const TAILLE_MAX = 3_000_000; // 3 Mo de HTML suffisent largement

function urlAutorisee(brute) {
  let url;
  try {
    url = new URL(brute);
  } catch {
    return null;
  }
  if (!['http:', 'https:'].includes(url.protocol)) return null;
  // Empêche d'utiliser la fonction comme relais vers le réseau interne (SSRF).
  if (HOTES_INTERDITS.test(url.hostname)) return null;
  return url;
}

/** "PT1H30M" → 90 (minutes) */
function dureeEnMinutes(duree) {
  if (!duree || typeof duree !== 'string') return 0;
  const m = duree.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return 0;
  return (Number(m[1] || 0) * 1440) + (Number(m[2] || 0) * 60) + Number(m[3] || 0);
}

function extraireBlocsJsonLd(html) {
  const blocs = [];
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      blocs.push(JSON.parse(match[1].trim()));
    } catch {
      // Bloc malformé : on ignore et on continue avec les suivants.
    }
  }
  return blocs;
}

function estRecette(noeud) {
  const type = noeud?.['@type'];
  if (!type) return false;
  return Array.isArray(type) ? type.includes('Recipe') : type === 'Recipe';
}

function trouverRecette(blocs) {
  const file = [...blocs];
  while (file.length > 0) {
    const noeud = file.shift();
    if (Array.isArray(noeud)) {
      file.push(...noeud);
      continue;
    }
    if (!noeud || typeof noeud !== 'object') continue;
    if (estRecette(noeud)) return noeud;
    if (Array.isArray(noeud['@graph'])) file.push(...noeud['@graph']);
  }
  return null;
}

function normaliserInstructions(instructions) {
  if (!instructions) return '';
  if (typeof instructions === 'string') {
    return instructions.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  if (!Array.isArray(instructions)) return '';

  const etapes = [];
  for (const item of instructions) {
    if (typeof item === 'string') {
      etapes.push(item);
    } else if (item?.['@type'] === 'HowToSection' && Array.isArray(item.itemListElement)) {
      etapes.push(...item.itemListElement.map((e) => e?.text || e?.name || '').filter(Boolean));
    } else if (item?.text || item?.name) {
      etapes.push(item.text || item.name);
    }
  }
  return etapes
    .map((e, i) => `${i + 1}. ${String(e).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}`)
    .join('\n');
}

/** "6 personnes" | ["4"] | 4 → 4 */
function normaliserPortions(recipeYield) {
  const brut = Array.isArray(recipeYield) ? recipeYield[0] : recipeYield;
  if (typeof brut === 'number') return brut;
  const m = String(brut || '').match(/\d+/);
  return m ? Number(m[0]) : 4;
}

/** "245 kcal" | "12 g" → 245 | 12 */
function nombreDepuisTexte(valeur) {
  const m = String(valeur ?? '').match(/[\d.,]+/);
  return m ? Math.round(Number(m[0].replace(',', '.'))) : 0;
}

/** "200 g de farine" → { nom: 'farine', quantite: 200, unite: 'g' } */
function normaliserIngredient(ligne) {
  const texte = String(ligne).replace(/\s+/g, ' ').trim();
  const m = texte.match(/^([\d.,/]+)\s*([a-zA-Zàâéèêëîïôöùûüç]{0,12}?)\s+(?:de\s+|d')?(.+)$/);
  if (!m) return { nom: texte, quantite: 0, unite: '' };

  const quantite = Number(m[1].replace(',', '.').replace(/\/.*/, '')) || 0;
  const unitesConnues = ['g', 'kg', 'ml', 'cl', 'l', 'cuillère', 'cuillères', 'cs', 'cc', 'pincée', 'gousse', 'gousses', 'tranche', 'tranches', 'sachet'];
  const unite = unitesConnues.includes(m[2].toLowerCase()) ? m[2] : '';
  const nom = unite ? m[3] : `${m[2]} ${m[3]}`.trim();

  return { nom, quantite, unite };
}

export default async function handler(req, res) {
  const url = urlAutorisee(req.query.url);
  if (!url) {
    res.status(400).json({ error: 'URL invalide ou non autorisée' });
    return;
  }

  try {
    const reponse = await fetch(url.href, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NutriPlan/1.0)' },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });
    if (!reponse.ok) {
      res.status(502).json({ error: `La page a répondu ${reponse.status}` });
      return;
    }

    const html = (await reponse.text()).slice(0, TAILLE_MAX);
    const recette = trouverRecette(extraireBlocsJsonLd(html));

    if (!recette) {
      res.status(422).json({ error: 'Aucune recette structurée trouvée sur cette page' });
      return;
    }

    const nutrition = recette.nutrition || {};
    const portions = normaliserPortions(recette.recipeYield);
    const tempsPrep = dureeEnMinutes(recette.prepTime);
    const tempsCuisson = dureeEnMinutes(recette.cookTime);
    const total = dureeEnMinutes(recette.totalTime);

    res.status(200).json({
      titre: recette.name || 'Recette importée',
      url: url.href,
      portions,
      tempsPrep: tempsPrep || Math.round(total / 2),
      tempsCuisson: tempsCuisson || Math.round(total / 2),
      ingredients: (recette.recipeIngredient || []).map(normaliserIngredient),
      instructions: normaliserInstructions(recette.recipeInstructions),
      categories: [recette.recipeCategory, recette.recipeCuisine].flat().filter(Boolean),
      nutritionParPortion: {
        kcal: nombreDepuisTexte(nutrition.calories),
        proteines: nombreDepuisTexte(nutrition.proteinContent),
        glucides: nombreDepuisTexte(nutrition.carbohydrateContent),
        lipides: nombreDepuisTexte(nutrition.fatContent),
        fibres: nombreDepuisTexte(nutrition.fiberContent),
      },
    });
  } catch (err) {
    res.status(502).json({ error: 'Impossible de lire cette page', detail: String(err) });
  }
}
