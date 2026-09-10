// Fonction serverless Vercel — proxy vers l'API DeepL.
// La clé vit uniquement dans DEEPL_API_KEY (variable d'environnement Vercel).
// Accepte un POST JSON : { textes: string[], source: 'FR'|'EN', cible: 'FR'|'EN' }

const LANGUES = ['FR', 'EN', 'EN-US'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }

  const corps = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  const { textes, source, cible } = corps;

  if (!Array.isArray(textes) || textes.length === 0 || textes.length > 50) {
    res.status(400).json({ error: 'textes doit être un tableau de 1 à 50 chaînes' });
    return;
  }
  if (!LANGUES.includes(cible) || (source && !LANGUES.includes(source))) {
    res.status(400).json({ error: 'Langue non supportée' });
    return;
  }

  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'DEEPL_API_KEY manquante côté serveur' });
    return;
  }

  // Les clés d'offre gratuite se terminent par ":fx" et utilisent un domaine distinct.
  const base = apiKey.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com';

  try {
    const reponse = await fetch(`${base}/v2/translate`, {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: textes,
        target_lang: cible,
        ...(source ? { source_lang: source } : {}),
      }),
    });
    const data = await reponse.json();
    res.status(reponse.status).json(data);
  } catch (err) {
    res.status(502).json({ error: 'Échec de l\'appel à DeepL', detail: String(err) });
  }
}
