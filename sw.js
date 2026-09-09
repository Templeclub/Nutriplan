// Service worker "app shell" — précache le HTML/JS local + les libs CDN utilisées
// (import map), pour permettre la consultation hors-ligne des recettes déjà
// synchronisées dans IndexedDB (qui, elle, fonctionne nativement hors-ligne).
// Incrémenter CACHE_VERSION à chaque déploiement pour forcer le renouvellement du cache.
const CACHE_VERSION = 'nutriplan-v1';

const RESSOURCES_LOCALES = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/src/main.js',
  '/src/App.js',
  '/src/router.js',
  '/src/htm-preact.js',
  '/src/db/db.js',
  '/src/domain/nutrition.js',
  '/src/domain/scoring.js',
  '/src/domain/planning.js',
  '/src/api/spoonacularClient.js',
  '/src/hooks/useLiveQuery.js',
  '/src/hooks/useActiveProfile.js',
  '/src/components/ui/ui.js',
  '/src/components/profiles/ProfileForm.js',
  '/src/components/profiles/ProfileList.js',
  '/src/components/profiles/ProfileSwitcher.js',
  '/src/components/profiles/DataBackup.js',
  '/src/components/recipes/RecipeCard.js',
  '/src/components/recipes/RecipeSearch.js',
  '/src/components/recipes/RecipeForm.js',
  '/src/components/recipes/RecipeDetail.js',
  '/src/components/recipes/RecipeLibrary.js',
  '/src/components/planning/WeeklyPlanner.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

const RESSOURCES_CDN = [
  'https://cdn.tailwindcss.com',
  'https://esm.sh/preact@10.24.3',
  'https://esm.sh/preact@10.24.3/hooks',
  'https://esm.sh/preact@10.24.3/compat',
  'https://esm.sh/htm@3.1.1',
  'https://esm.sh/htm@3.1.1/preact?external=preact',
  'https://esm.sh/dexie@4.0.11',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(async (cache) => {
      await cache.addAll(RESSOURCES_LOCALES);
      // Les CDN sont mis en cache un par un : un seul échec (ex. rate-limit) ne
      // doit pas empêcher l'installation du reste de l'app shell.
      await Promise.all(
        RESSOURCES_CDN.map((url) =>
          fetch(url, { mode: 'cors' })
            .then((r) => (r.ok ? cache.put(url, r) : null))
            .catch(() => null)
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cles) => Promise.all(cles.filter((c) => c !== CACHE_VERSION).map((c) => caches.delete(c))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // Jamais mettre en cache les appels API (recherche/nutrition doivent rester frais).
  if (request.url.includes('/api/spoonacular') || request.url.includes('api.spoonacular.com')) return;

  event.respondWith(
    caches.match(request).then((reponseCache) => {
      if (reponseCache) return reponseCache;
      return fetch(request)
        .then((reponse) => {
          if (reponse.ok && (request.url.startsWith(self.location.origin) || RESSOURCES_CDN.some((u) => request.url.startsWith(u.split('?')[0])))) {
            const clone = reponse.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
          }
          return reponse;
        })
        .catch(() => (request.mode === 'navigate' ? caches.match('/index.html') : undefined));
    })
  );
});
