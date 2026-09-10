import { html } from '../../htm-preact.js';
import { Badge } from '../ui/ui.js';
import { naviguerVers } from '../../router.js';
import { classifierRegime, LABELS_REGIME, COULEURS_REGIME } from '../../domain/classification.js';
import { evaluerSaisonnalite, LABELS_SAISON } from '../../domain/saisonnalite.js';

/** Aperçu compact mais informatif : régime, temps, kcal, scores, saison, ingrédients. */
export const RecipeCard = ({ recette, index = 0 }) => {
  const temps = (recette.tempsPrep || 0) + (recette.tempsCuisson || 0);
  const regime = classifierRegime(recette);
  const saison = evaluerSaisonnalite(recette);
  const ingredientsApercu = (recette.ingredients || []).slice(0, 4).map((i) => i.nom).join(' · ');

  return html`
    <article
      onClick=${() => naviguerVers(`#/recette/${recette.id}`)}
      class="press cursor-pointer bg-white border-[3px] border-noir shadow-dur anim-monter"
      style=${`animation-delay:${Math.min(index * 40, 240)}ms`}
    >
      <div class="flex">
        <!-- Bande verticale colorée : lecture du régime en un coup d'œil -->
        <div class="w-3 shrink-0 ${regime === 'viande' ? 'bg-rouge' : regime === 'poisson' ? 'bg-bleu' : regime === 'vegetarien' ? 'bg-jaune' : 'diagonale'}"></div>

        <div class="flex-1 p-3 min-w-0">
          <div class="flex items-start justify-between gap-2">
            <h3 class="font-titre text-base uppercase leading-tight">${recette.titre}</h3>
            ${recette.favori && html`<span class="text-rouge text-lg leading-none shrink-0">★</span>`}
          </div>

          <div class="flex flex-wrap gap-1 mt-2">
            <${Badge} couleur=${COULEURS_REGIME[regime]}>${LABELS_REGIME[regime]}<//>
            <${Badge} couleur="creme">${temps} min<//>
            <${Badge} couleur="creme">${recette.portions} p.<//>
            ${recette.nutritionParPortion?.kcal > 0 && html`<${Badge} couleur="noir">${recette.nutritionParPortion.kcal} kcal<//>`}
            ${saison.statut === 'de_saison' && html`<${Badge} couleur="jaune">${LABELS_SAISON.de_saison}<//>`}
            ${saison.statut === 'hors_saison' && html`<${Badge} couleur="creme">Hors saison<//>`}
          </div>

          ${ingredientsApercu &&
          html`<p class="text-xs text-gris mt-2 truncate">${ingredientsApercu}</p>`}

          <div class="flex gap-3 mt-2 font-titre text-[10px] uppercase tracking-wider">
            ${recette.effortScore != null && html`<span>Effort <span class="text-rouge">${recette.effortScore}</span></span>`}
            ${recette.batchScore != null && html`<span>Batch <span class="text-rouge">${recette.batchScore}</span></span>`}
          </div>
        </div>
      </div>
    </article>
  `;
};
