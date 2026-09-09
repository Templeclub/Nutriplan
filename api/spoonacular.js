// Fonction serverless Vercel — proxy vers l'API Spoonacular.
// La clé API vit uniquement dans une variable d'environnement Vercel (SPOONACULAR_API_KEY),
// jamais côté client. Exécutée dans le cloud par Vercel : ne nécessite pas Node en local.

const CHEMINS_AUTORISES = [
  /^\/recipes\/complexSearch$/,
  /^\/recipes\/\d+\/information$/,
  /^\/recipes\/parseIngredients$/,
];

export default async function handler(req, res) {
  const { path, ...params } = req.query;

  if (!path || typeof path !== 'string' || !CHEMINS_AUTORISES.some((re) => re.test(path))) {
    res.status(400).json({ error: 'Chemin non autorisé' });
    return;
  }

  const apiKey = process.env.SPOONACULAR_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'SPOONACULAR_API_KEY manquante côté serveur' });
    return;
  }

  const estPost = req.method === 'POST';
  const url = estPost
    ? `https://api.spoonacular.com${path}?apiKey=${apiKey}`
    : `https://api.spoonacular.com${path}?${new URLSearchParams(params).toString()}&apiKey=${apiKey}`;

  try {
    const reponse = await fetch(url, {
      method: estPost ? 'POST' : 'GET',
      headers: estPost ? { 'Content-Type': 'application/x-www-form-urlencoded' } : undefined,
      body: estPost ? new URLSearchParams(req.body || params).toString() : undefined,
    });
    const data = await reponse.json();
    res.status(reponse.status).json(data);
  } catch (err) {
    res.status(502).json({ error: 'Échec de l\'appel à Spoonacular', detail: String(err) });
  }
}
