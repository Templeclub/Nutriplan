import { useMemo, useState } from 'preact/hooks';
import { html } from '../../htm-preact.js';
import { Bouton, inputClass } from '../ui/ui.js';
import { RecipeCard } from './RecipeCard.js';
import { RecipeSearch } from './RecipeSearch.js';
import { RecipeForm } from './RecipeForm.js';
import { db } from '../../db/db.js';
import { useLiveQuery } from '../../hooks/useLiveQuery.js';
import { useActiveProfile } from '../../hooks/useActiveProfile.js';
import { appliquerPreferenceGluten } from '../../domain/scoring.js';

const TRIS = {
  recent: { label: 'Plus récentes', fn: (a, b) => new Date(b.dateAjout) - new Date(a.dateAjout) },
  effort: { label: 'Efficacité', fn: (a, b) => (b.effortScore || 0) - (a.effortScore || 0) },
  batch: { label: 'Batch-cooking', fn: (a, b) => (b.batchScore || 0) - (a.batchScore || 0) },
};

export const RecipeLibrary = () => {
  const recettes = useLiveQuery(() => db.recipes.toArray(), [], []);
  const profil = useActiveProfile();
  const [vue, setVue] = useState('liste'); // 'liste' | 'recherche' | 'ajout-manuel'
  const [filtreTexte, setFiltreTexte] = useState('');
  const [filtreFavoris, setFiltreFavoris] = useState(false);
  const [tri, setTri] = useState('recent');

  const recettesAffichees = useMemo(() => {
    let liste = recettes || [];

    if (profil) {
      liste = liste.filter((r) => !appliquerPreferenceGluten(r, profil.preferencesAlimentaires).bloque);
    }
    if (filtreTexte.trim()) {
      const q = filtreTexte.trim().toLowerCase();
      liste = liste.filter((r) => r.titre.toLowerCase().includes(q));
    }
    if (filtreFavoris) liste = liste.filter((r) => r.favori);

    liste = [...liste].sort(TRIS[tri].fn);

    // Le tri par défaut ("récentes") reste influencé par la préférence gluten "à réduire" :
    // les recettes à fort signal gluten sont légèrement reléguées, sans être masquées.
    if (profil && tri === 'recent') {
      liste = [...liste].sort((a, b) => {
        const malusA = appliquerPreferenceGluten(a, profil.preferencesAlimentaires).malus;
        const malusB = appliquerPreferenceGluten(b, profil.preferencesAlimentaires).malus;
        return malusA - malusB;
      });
    }

    return liste;
  }, [recettes, profil, filtreTexte, filtreFavoris, tri]);

  if (vue === 'recherche') return html`<${RecipeSearch} onFermer=${() => setVue('liste')} />`;
  if (vue === 'ajout-manuel') return html`<${RecipeForm} onFermer=${() => setVue('liste')} />`;

  return html`
    <div>
      <div class="flex gap-2 mb-4">
        <${Bouton} class="flex-1" onClick=${() => setVue('recherche')}>🔍 Rechercher<//>
        <${Bouton} variante="secondaire" class="flex-1" onClick=${() => setVue('ajout-manuel')}>+ Manuelle<//>
      </div>

      <input class="${inputClass} mb-3" placeholder="Filtrer par titre…" value=${filtreTexte}
        onInput=${(e) => setFiltreTexte(e.target.value)} />

      <div class="flex items-center gap-2 mb-4 overflow-x-auto">
        <select class="text-sm border border-slate-200 rounded-lg px-2 py-1.5" value=${tri}
          onChange=${(e) => setTri(e.target.value)}>
          ${Object.entries(TRIS).map(([val, t]) => html`<option value=${val}>${t.label}</option>`)}
        </select>
        <button
          class="text-sm px-3 py-1.5 rounded-full whitespace-nowrap ${filtreFavoris ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}"
          onClick=${() => setFiltreFavoris((v) => !v)}
        >⭐ Favoris</button>
      </div>

      ${recettesAffichees.length === 0
        ? html`<p class="text-slate-500 text-sm">Aucune recette pour l'instant. Recherche-en une ou ajoute-la manuellement.</p>`
        : html`<div class="flex flex-col gap-3 pb-8">
            ${recettesAffichees.map((r) => html`<${RecipeCard} key=${r.id} recette=${r} />`)}
          </div>`}
    </div>
  `;
};
