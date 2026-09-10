import { useMemo, useState } from 'preact/hooks';
import { html } from '../../htm-preact.js';
import { Bouton, Titre, Chip, inputClass } from '../ui/ui.js';
import { RecipeCard } from './RecipeCard.js';
import { RecipeSearch } from './RecipeSearch.js';
import { RecipeForm } from './RecipeForm.js';
import { RecipeUrlImport } from './RecipeUrlImport.js';
import { db } from '../../db/db.js';
import { useLiveQuery } from '../../hooks/useLiveQuery.js';
import { useActiveProfile } from '../../hooks/useActiveProfile.js';
import { appliquerPreferenceGluten } from '../../domain/scoring.js';
import { classifierRegime } from '../../domain/classification.js';
import { evaluerSaisonnalite } from '../../domain/saisonnalite.js';

const TRIS = {
  recent: { label: 'Récentes', fn: (a, b) => new Date(b.dateAjout) - new Date(a.dateAjout) },
  effort: { label: 'Efficacité', fn: (a, b) => (b.effortScore || 0) - (a.effortScore || 0) },
  batch: { label: 'Batch', fn: (a, b) => (b.batchScore || 0) - (a.batchScore || 0) },
  kcal: { label: 'Calories', fn: (a, b) => (a.nutritionParPortion?.kcal || 0) - (b.nutritionParPortion?.kcal || 0) },
};

const FILTRES_REGIME = [
  { valeur: '', label: 'Tout' },
  { valeur: 'vegetarien', label: 'Végé' },
  { valeur: 'poisson', label: 'Poisson' },
  { valeur: 'viande', label: 'Viande' },
];

export const RecipeLibrary = () => {
  const recettes = useLiveQuery(() => db.recipes.toArray(), [], []);
  const profil = useActiveProfile();
  const [vue, setVue] = useState('liste');
  const [filtreTexte, setFiltreTexte] = useState('');
  const [filtreRegime, setFiltreRegime] = useState('');
  const [filtreFavoris, setFiltreFavoris] = useState(false);
  const [filtreSaison, setFiltreSaison] = useState(false);
  const [tri, setTri] = useState('recent');

  const recettesAffichees = useMemo(() => {
    let liste = recettes || [];

    if (profil) {
      liste = liste.filter((r) => !appliquerPreferenceGluten(r, profil.preferencesAlimentaires).bloque);
    }
    if (filtreTexte.trim()) {
      const q = filtreTexte.trim().toLowerCase();
      liste = liste.filter(
        (r) =>
          r.titre.toLowerCase().includes(q) ||
          (r.ingredients || []).some((i) => (i.nom || '').toLowerCase().includes(q))
      );
    }
    if (filtreRegime) liste = liste.filter((r) => classifierRegime(r) === filtreRegime);
    if (filtreFavoris) liste = liste.filter((r) => r.favori);
    if (filtreSaison) liste = liste.filter((r) => ['de_saison', 'partiel'].includes(evaluerSaisonnalite(r).statut));

    liste = [...liste].sort(TRIS[tri].fn);

    // La préférence gluten "à réduire" relègue sans masquer, uniquement sur le tri par défaut.
    if (profil && tri === 'recent') {
      liste = [...liste].sort(
        (a, b) =>
          appliquerPreferenceGluten(a, profil.preferencesAlimentaires).malus -
          appliquerPreferenceGluten(b, profil.preferencesAlimentaires).malus
      );
    }

    return liste;
  }, [recettes, profil, filtreTexte, filtreRegime, filtreFavoris, filtreSaison, tri]);

  if (vue === 'recherche') return html`<${RecipeSearch} onFermer=${() => setVue('liste')} />`;
  if (vue === 'url') return html`<${RecipeUrlImport} onFermer=${() => setVue('liste')} />`;
  if (vue === 'manuelle') return html`<${RecipeForm} onFermer=${() => setVue('liste')} />`;

  const total = (recettes || []).length;

  return html`
    <div class="pb-10">
      <${Titre} compteur=${total > 0 ? total : null}>Bibliothèque<//>

      <div class="grid grid-cols-3 gap-2 mb-5">
        <${Bouton} onClick=${() => setVue('recherche')}>Chercher<//>
        <${Bouton} variante="sombre" onClick=${() => setVue('url')}>URL<//>
        <${Bouton} variante="secondaire" onClick=${() => setVue('manuelle')}>Saisir<//>
      </div>

      ${total > 0 &&
      html`
        <input
          class="${inputClass} mb-3"
          placeholder="Filtrer par titre ou ingrédient…"
          value=${filtreTexte}
          onInput=${(e) => setFiltreTexte(e.target.value)}
        />

        <div class="flex gap-1.5 overflow-x-auto pb-1 mb-2">
          ${FILTRES_REGIME.map((f) => html`<${Chip} actif=${filtreRegime === f.valeur} onClick=${() => setFiltreRegime(f.valeur)}>${f.label}<//>`)}
          <${Chip} actif=${filtreFavoris} onClick=${() => setFiltreFavoris((v) => !v)}>★ Favoris<//>
          <${Chip} actif=${filtreSaison} onClick=${() => setFiltreSaison((v) => !v)}>De saison<//>
        </div>

        <div class="flex gap-1.5 overflow-x-auto pb-1 mb-5">
          ${Object.entries(TRIS).map(([val, t]) => html`<${Chip} actif=${tri === val} onClick=${() => setTri(val)}>${t.label}<//>`)}
        </div>
      `}

      ${total === 0
        ? html`<div class="border-[3px] border-noir bg-white p-6 text-center shadow-dur">
            <div class="w-12 h-12 bg-rouge mx-auto mb-4"></div>
            <p class="font-titre uppercase text-sm mb-2">Bibliothèque vide</p>
            <p class="text-sm text-gris">Cherche une recette, colle l'URL d'une page Marmiton, ou saisis la tienne.</p>
          </div>`
        : recettesAffichees.length === 0
        ? html`<p class="text-sm text-gris">Aucune recette ne correspond à ces filtres.</p>`
        : html`<div class="flex flex-col gap-3">
            ${recettesAffichees.map((r, i) => html`<${RecipeCard} key=${r.id} recette=${r} index=${i} />`)}
          </div>`}
    </div>
  `;
};
