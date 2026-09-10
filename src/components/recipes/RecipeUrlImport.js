import { useState } from 'preact/hooks';
import { html } from '../../htm-preact.js';
import { Bouton, Titre, Alerte, Badge, inputClass } from '../ui/ui.js';
import { importerRecetteDepuisUrl } from '../../api/recipeUrlClient.js';
import { estimerNutritionIngredients } from '../../api/spoonacularClient.js';
import { db } from '../../db/db.js';
import { calculerEffortScore, calculerBatchScore } from '../../domain/scoring.js';
import { naviguerVers } from '../../router.js';

export const RecipeUrlImport = ({ onFermer }) => {
  const [url, setUrl] = useState('');
  const [apercu, setApercu] = useState(null);
  const [enChargement, setEnChargement] = useState(false);
  const [erreur, setErreur] = useState('');

  const analyser = async (e) => {
    e.preventDefault();
    setEnChargement(true);
    setErreur('');
    setApercu(null);
    try {
      setApercu(await importerRecetteDepuisUrl(url));
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnChargement(false);
    }
  };

  const enregistrer = async () => {
    setEnChargement(true);
    const recette = { ...apercu };

    // Beaucoup de sites FR n'exposent pas de bloc nutrition : on l'estime alors
    // à partir des ingrédients plutôt que d'enregistrer des zéros.
    if (!recette.nutritionParPortion.kcal && recette.ingredients.length > 0) {
      try {
        recette.nutritionParPortion = await estimerNutritionIngredients(recette.ingredients, recette.portions);
      } catch {
        // Estimation indisponible : la recette est enregistrée telle quelle.
      }
    }

    recette.effortScore = calculerEffortScore(recette);
    recette.batchScore = calculerBatchScore(recette);
    const id = await db.recipes.add(recette);
    naviguerVers(`#/recette/${id}`);
  };

  return html`
    <div class="pb-10">
      <div class="flex items-start justify-between gap-3">
        <${Titre}>Depuis une URL<//>
        <button class="font-titre text-xs uppercase underline underline-offset-4 mt-1.5" onClick=${onFermer}>Fermer</button>
      </div>

      <p class="text-sm mb-4">
        Colle le lien d'une recette (Marmiton, 750g, CuisineAZ…). Le contenu est récupéré
        <strong>en français</strong>, sans quota d'API.
      </p>

      <form onSubmit=${analyser} class="mb-4">
        <input
          class="${inputClass} mb-3"
          type="url"
          required
          value=${url}
          onInput=${(e) => setUrl(e.target.value)}
          placeholder="https://www.marmiton.org/recettes/..."
          enterkeyhint="go"
        />
        <${Bouton} type="submit" class="w-full" disabled=${enChargement}>
          ${enChargement ? 'Lecture…' : 'Analyser la page'}
        <//>
      </form>

      ${erreur && html`<${Alerte} ton="erreur">${erreur}<//>`}

      ${apercu &&
      html`
        <div class="bg-white border-[3px] border-noir shadow-dur p-3 anim-monter">
          <h3 class="font-titre text-lg uppercase leading-tight mb-2">${apercu.titre}</h3>
          <div class="flex flex-wrap gap-1 mb-3">
            <${Badge} couleur="creme">${apercu.tempsPrep + apercu.tempsCuisson} min<//>
            <${Badge} couleur="creme">${apercu.portions} portions<//>
            <${Badge} couleur="noir">${apercu.ingredients.length} ingrédients<//>
            ${apercu.nutritionParPortion.kcal > 0
              ? html`<${Badge} couleur="rouge">${apercu.nutritionParPortion.kcal} kcal<//>`
              : html`<${Badge} couleur="jaune">Nutrition à estimer<//>`}
          </div>

          <ul class="text-xs space-y-0.5 mb-3 max-h-40 overflow-y-auto">
            ${apercu.ingredients.map(
              (i) => html`<li class="flex gap-2">
                <span class="text-rouge font-titre">▪</span>
                <span>${i.quantite ? `${i.quantite} ${i.unite} ` : ''}${i.nom}</span>
              </li>`
            )}
          </ul>

          <${Bouton} class="w-full" disabled=${enChargement} onClick=${enregistrer}>
            ${enChargement ? 'Enregistrement…' : 'Ajouter à ma bibliothèque'}
          <//>
        </div>
      `}
    </div>
  `;
};
