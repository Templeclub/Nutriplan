import { html } from '../../htm-preact.js';
import { Bouton, Badge, BarreProgression, Titre } from '../ui/ui.js';
import { db } from '../../db/db.js';
import { useLiveQuery } from '../../hooks/useLiveQuery.js';
import { useActiveProfile } from '../../hooks/useActiveProfile.js';
import { pourcentageCouverture } from '../../domain/nutrition.js';
import { naviguerVers } from '../../router.js';

const LIGNES_NUTRITION = [
  ['kcal', 'Calories'],
  ['proteines', 'Protéines'],
  ['glucides', 'Glucides'],
  ['lipides', 'Lipides'],
];

export const RecipeDetail = ({ id }) => {
  const recette = useLiveQuery(() => db.recipes.get(Number(id)), [id]);
  const profil = useActiveProfile();

  if (recette === undefined) return html`<p class="text-slate-500">Chargement…</p>`;
  if (recette === null) return html`<p class="text-slate-500">Recette introuvable.</p>`;

  const couverture = profil ? pourcentageCouverture(recette.nutritionParPortion, profil.besoinsBase) : null;

  const toggleFavori = () => db.recipes.update(recette.id, { favori: !recette.favori });
  const marquerConsommee = () =>
    db.recipes.update(recette.id, {
      historiqueConsommation: [...(recette.historiqueConsommation || []), new Date().toISOString()],
    });
  const supprimer = async () => {
    await db.recipes.delete(recette.id);
    naviguerVers('#/bibliotheque');
  };

  return html`
    <div>
      <button class="text-slate-500 text-sm mb-3" onClick=${() => naviguerVers('#/bibliotheque')}>← Retour</button>

      <div class="flex items-start justify-between gap-2 mb-2">
        <${Titre}>${recette.titre}<//>
        <button class="text-2xl leading-none" onClick=${toggleFavori}>${recette.favori ? '⭐' : '☆'}</button>
      </div>

      <div class="flex flex-wrap gap-1.5 mb-4">
        <${Badge}>${recette.tempsPrep} min prépa<//>
        <${Badge}>${recette.tempsCuisson} min cuisson<//>
        <${Badge}>${recette.portions} portions<//>
        ${recette.effortScore != null && html`<${Badge} couleur="emerald">Effort ${recette.effortScore}/100<//>`}
        ${recette.batchScore != null && html`<${Badge} couleur="amber">Batch ${recette.batchScore}/100<//>`}
        ${(recette.tags || []).map((t) => html`<${Badge} couleur="slate">${t}<//>`)}
      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-4">
        <p class="font-semibold mb-3">Nutrition par portion</p>
        ${LIGNES_NUTRITION.map(([cle, label]) => {
          const valeur = recette.nutritionParPortion?.[cle] || 0;
          const pct = couverture?.[cle];
          return html`
            <div class="mb-2.5">
              <div class="flex justify-between text-sm mb-1">
                <span>${label}</span>
                <span class="text-slate-500">${valeur}${cle === 'kcal' ? ' kcal' : ' g'} ${pct != null ? `· ${pct}%` : ''}</span>
              </div>
              ${pct != null && html`<${BarreProgression} pourcentage=${pct} couleur=${pct > 130 ? 'amber' : 'emerald'} />`}
            </div>
          `;
        })}
        ${!profil && html`<p class="text-xs text-slate-400 mt-2">Crée un profil pour voir le % de couverture de tes besoins.</p>`}
      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-4">
        <p class="font-semibold mb-2">Ingrédients (${recette.portions} portions)</p>
        <ul class="list-disc list-inside text-sm text-slate-700 space-y-1">
          ${(recette.ingredients || []).map((i) => html`<li>${i.quantite ? `${i.quantite} ${i.unite} ` : ''}${i.nom}</li>`)}
        </ul>
      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-4">
        <p class="font-semibold mb-2">Instructions</p>
        <p class="text-sm text-slate-700 whitespace-pre-line">${recette.instructions || '—'}</p>
        ${recette.url && html`<a href=${recette.url} target="_blank" rel="noreferrer" class="text-sm text-emerald-700 underline mt-2 inline-block">Source originale</a>`}
      </div>

      <div class="flex gap-2 mb-8">
        <${Bouton} onClick=${marquerConsommee}>Marquer comme consommée<//>
        <${Bouton} variante="danger" onClick=${supprimer}>Supprimer<//>
      </div>
    </div>
  `;
};
