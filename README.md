# NutriPlan

Application personnelle mono-utilisateur pour gérer son alimentation : bibliothèque de
recettes qualifiées nutritionnellement, scoring effort/batch-cooking, planning hebdomadaire.

## Stack (sans étape de build)

Cette machine n'a pas Node.js installé. L'app est donc écrite en JavaScript natif (modules
ES), sans bundler :

- **Preact + [htm](https://github.com/developit/htm)** (JSX-like en template literals) —
  chargés via CDN (`esm.sh`) et résolus par un *import map* dans `index.html`.
- **Tailwind CSS** via le script CDN (`cdn.tailwindcss.com`).
- **Dexie.js** (IndexedDB) pour le stockage local, chargé via CDN.
- **Spoonacular API**, appelée en production via une fonction serverless Vercel
  (`api/spoonacular.js`) qui cache la clé API.
- **PWA** : `manifest.webmanifest` + `sw.js` écrits à la main (précache l'app shell,
  y compris les libs CDN, pour la consultation hors-ligne).

Aucune étape `npm install` / `npm run build` n'est nécessaire : les fichiers sont servis tels quels.

## Lancer en local

Pas de Node/Python sur cette machine → un petit serveur statique PowerShell (sans
dépendance, basé sur `System.Net.HttpListener`) sert le dossier :

- Double-clique **`Lancer-NutriPlan.bat`** → ouvre `http://localhost:8766/` dans le navigateur.
- Ou, depuis Claude Code : `preview_start name="nutriplan"`.

### Recherche de recettes en local (sans proxy serverless)

En local, `/api/spoonacular` n'existe pas (pas de Node pour exécuter la fonction). Pour
tester la recherche Spoonacular :

1. Copie `src/config.local.example.js` → `src/config.local.js`
2. Colle ta clé API Spoonacular (https://spoonacular.com/food-api) dans `SPOONACULAR_DEV_API_KEY`
3. `src/config.local.js` est gitignored — ta clé ne sera jamais commitée. Elle reste
   visible dans les devtools de ton navigateur en local uniquement (jamais en prod).

Sans cette clé, la recherche et l'estimation nutritionnelle des recettes manuelles ne
fonctionnent pas en local — mais tout le reste de l'app (profils, bibliothèque, planning
sur des recettes déjà ajoutées) fonctionne normalement.

## Déploiement (Vercel)

1. Pousse le projet sur un repo GitHub.
2. Importe-le sur [vercel.com](https://vercel.com) (Framework preset : *Other*, pas de build command).
3. Dans les *Environment Variables* du projet Vercel, ajoute `SPOONACULAR_API_KEY` avec ta clé.
4. Déploie. Le site est statique + une fonction serverless (`/api/spoonacular`) — le
   build Vercel s'exécute dans le cloud, tu n'as pas besoin de Node en local pour ça.
5. Sur ton téléphone Android, ouvre l'URL Vercel dans Chrome → menu → **"Installer l'application"**.

## Instructions de test manuel — Phase 1

1. **Profils** : onglet *Profils* → *Nouveau profil* → renseigne poids/taille/âge/sexe,
   niveau d'activité, préférences (gluten en "à réduire" par ex.) → vérifie que les
   kcal/protéines affichés sur la carte se recalculent.
2. Bascule entre deux profils (crée-en un second) → vérifie que le bandeau en haut
   change de profil actif et que les kcal/j affichés changent.
3. Change le niveau d'activité du jour dans le bandeau → les kcal/j doivent se mettre à
   jour immédiatement (sans recharger la page).
4. **Recherche de recette** (bibliothèque → 🔍 Rechercher) : cherche "poulet" → les
   résultats affichent kcal/portion et temps → "+ Ajouter" → vérifie l'ajout dans la
   bibliothèque et l'ouverture de la fiche détail.
5. **Fiche recette** : vérifie l'affichage des % de couverture des besoins (barres de
   progression) cohérents avec le profil actif.
6. **Ajout manuel** (bibliothèque → + Manuelle) : renseigne titre, 2-3 ingrédients,
   instructions → vérifie que la nutrition s'estime automatiquement (nécessite la clé
   API en local, cf. ci-dessus) et que les tags apparaissent bien sur la carte.
7. Marque une recette en gluten (titre/ingrédient contenant "pain", "pâtes"...) avec un
   profil réglé sur "à éviter strictement" pour le gluten → elle doit disparaître de la
   bibliothèque. Repasse la préférence à "à réduire" → elle doit réapparaître, mais en
   fin de liste triée par défaut.

## Instructions de test manuel — Phase 2 (scoring)

1. Ajoute une recette longue à préparer pour peu de portions (ex. 90 min / 2 portions)
   et une recette rapide en grosse quantité (ex. 20 min / 8 portions) → vérifie que la
   seconde a un `effortScore` nettement plus haut.
2. Ajoute une recette "soupe" ou "curry" en 6 portions → `batchScore` élevé. Ajoute une
   "salade" en 2 portions → `batchScore` faible.
3. Bibliothèque → trie par "Efficacité" puis "Batch-cooking" → vérifie l'ordre.

## Instructions de test manuel — Phase 3 (planning)

1. Ajoute au moins 5-6 recettes variées (végé/poisson/viande, différents scores) à la bibliothèque.
2. Onglet *Planning* → règle les envies de la semaine (ex. 2 végé / 1 poisson / 3
   viande / 1 autre) et l'activité prévue par jour (varie quelques jours en "intense").
3. *Générer le planning* → vérifie que les jours "intense" pointent vers des kcal
   cibles plus hautes, que la répartition respecte à peu près les envies déclarées, et
   que chaque repas propose des alternatives.
4. Recharge la page → le planning de la semaine doit être conservé (persistance Dexie).
5. Clique sur un repas du planning → doit ouvrir la fiche recette correspondante.

## Sauvegarde / export

Onglet *Profils* → bas de page → *Exporter (JSON)* télécharge une sauvegarde complète
(recettes, profils, plannings) ; *Importer* recharge un fichier exporté (remplace les
données actuelles, avec confirmation). Les données restent sinon locales au navigateur
(IndexedDB) — vider les données de site dans Chrome effacerait la bibliothèque et les
profils sans sauvegarde préalable.
