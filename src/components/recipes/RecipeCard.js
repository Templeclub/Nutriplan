import { html } from '../../htm-preact.js';
import { Carte, Badge } from '../ui/ui.js';
import { naviguerVers } from '../../router.js';

export const RecipeCard = ({ recette }) => {
  const temps = (recette.tempsPrep || 0) + (recette.tempsCuisson || 0);
  return html`
    <${Carte} onClick=${() => naviguerVers(`#/recette/${recette.id}`)} class="cursor-pointer">
      <div class="flex justify-between items-start gap-2">
        <p class="font-semibold text-slate-900 flex-1">${recette.titre}</p>
        ${recette.favori && html`<span aria-label="favori">⭐</span>`}
      </div>
      <div class="flex flex-wrap gap-1.5 mt-2">
        <${Badge}>${temps} min<//>
        <${Badge}>${recette.portions} portions<//>
        ${recette.nutritionParPortion?.kcal
          ? html`<${Badge} couleur="blue">${recette.nutritionParPortion.kcal} kcal<//>`
          : ''}
        ${recette.effortScore != null && html`<${Badge} couleur="emerald">Effort ${recette.effortScore}<//>`}
        ${recette.batchScore != null && html`<${Badge} couleur="amber">Batch ${recette.batchScore}<//>`}
      </div>
    <//>
  `;
};
