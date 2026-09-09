import { useState } from 'preact/hooks';
import { html } from '../../htm-preact.js';
import { Bouton, Champ, inputClass, Titre } from '../ui/ui.js';
import { db } from '../../db/db.js';
import { estimerNutritionIngredients } from '../../api/spoonacularClient.js';
import { calculerEffortScore, calculerBatchScore } from '../../domain/scoring.js';
import { naviguerVers } from '../../router.js';

const TAGS_DISPONIBLES = ['vegetarien', 'poisson', 'viande', 'plat-principal', 'entree', 'dessert'];

export const RecipeForm = ({ onFermer }) => {
  const [titre, setTitre] = useState('');
  const [tempsPrep, setTempsPrep] = useState(15);
  const [tempsCuisson, setTempsCuisson] = useState(15);
  const [portions, setPortions] = useState(4);
  const [instructions, setInstructions] = useState('');
  const [tags, setTags] = useState([]);
  const [ingredients, setIngredients] = useState([{ nom: '', quantite: '', unite: '' }]);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState('');

  const majIngredient = (i, champ, valeur) =>
    setIngredients((liste) => liste.map((ing, idx) => (idx === i ? { ...ing, [champ]: valeur } : ing)));

  const ajouterLigneIngredient = () => setIngredients((l) => [...l, { nom: '', quantite: '', unite: '' }]);
  const retirerLigneIngredient = (i) => setIngredients((l) => l.filter((_, idx) => idx !== i));

  const toggleTag = (tag) =>
    setTags((t) => (t.includes(tag) ? t.filter((x) => x !== tag) : [...t, tag]));

  const enregistrer = async (e) => {
    e.preventDefault();
    setEnregistrement(true);
    setErreur('');
    const ingredientsValides = ingredients
      .filter((i) => i.nom.trim())
      .map((i) => ({ ...i, quantite: Number(i.quantite) || 0 }));

    let nutritionParPortion = { kcal: 0, proteines: 0, glucides: 0, lipides: 0, fibres: 0 };
    try {
      if (ingredientsValides.length > 0) {
        nutritionParPortion = await estimerNutritionIngredients(ingredientsValides, Number(portions));
      }
    } catch (err) {
      setErreur(
        `Recette enregistrée sans estimation nutritionnelle automatique (${err.message}). Tu pourras la corriger plus tard.`
      );
    }

    const donnees = {
      titre,
      source: 'manuel',
      url: '',
      tags,
      tempsPrep: Number(tempsPrep),
      tempsCuisson: Number(tempsCuisson),
      portions: Number(portions),
      ingredients: ingredientsValides,
      instructions,
      nutritionParPortion,
      favori: false,
      dateAjout: new Date().toISOString(),
      historiqueConsommation: [],
    };
    donnees.effortScore = calculerEffortScore(donnees);
    donnees.batchScore = calculerBatchScore(donnees);

    const id = await db.recipes.add(donnees);
    setEnregistrement(false);
    naviguerVers(`#/recette/${id}`);
  };

  return html`
    <form onSubmit=${enregistrer}>
      <div class="flex items-center justify-between mb-4">
        <${Titre}>Ajouter une recette<//>
        <button type="button" class="text-slate-500 text-sm" onClick=${onFermer}>Fermer</button>
      </div>

      <${Champ} label="Titre">
        <input class=${inputClass} required value=${titre} onInput=${(e) => setTitre(e.target.value)} />
      <//>

      <div class="grid grid-cols-3 gap-3">
        <${Champ} label="Prépa (min)">
          <input class=${inputClass} type="number" value=${tempsPrep} onInput=${(e) => setTempsPrep(e.target.value)} />
        <//>
        <${Champ} label="Cuisson (min)">
          <input class=${inputClass} type="number" value=${tempsCuisson} onInput=${(e) => setTempsCuisson(e.target.value)} />
        <//>
        <${Champ} label="Portions">
          <input class=${inputClass} type="number" value=${portions} onInput=${(e) => setPortions(e.target.value)} />
        <//>
      </div>

      <p class="text-sm font-medium text-slate-600 mb-2">Tags</p>
      <div class="flex flex-wrap gap-2 mb-4">
        ${TAGS_DISPONIBLES.map(
          (tag) => html`<button type="button"
            class="text-sm px-3 py-1.5 rounded-full min-h-[36px] ${tags.includes(tag) ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}"
            onClick=${() => toggleTag(tag)}
          >${tag}</button>`
        )}
      </div>

      <p class="text-sm font-medium text-slate-600 mb-2">Ingrédients</p>
      ${ingredients.map(
        (ing, i) => html`
          <div class="flex gap-2 mb-2">
            <input class="${inputClass} flex-1" placeholder="nom" value=${ing.nom}
              onInput=${(e) => majIngredient(i, 'nom', e.target.value)} />
            <input class="${inputClass} w-20" placeholder="qté" value=${ing.quantite}
              onInput=${(e) => majIngredient(i, 'quantite', e.target.value)} />
            <input class="${inputClass} w-24" placeholder="unité" value=${ing.unite}
              onInput=${(e) => majIngredient(i, 'unite', e.target.value)} />
            <button type="button" class="text-red-500 px-2" onClick=${() => retirerLigneIngredient(i)}>✕</button>
          </div>
        `
      )}
      <button type="button" class="text-emerald-700 text-sm mb-4" onClick=${ajouterLigneIngredient}>+ Ajouter un ingrédient</button>

      <${Champ} label="Instructions (une étape par ligne)">
        <textarea class="${inputClass} min-h-[120px]" value=${instructions}
          onInput=${(e) => setInstructions(e.target.value)}></textarea>
      <//>

      ${erreur && html`<p class="text-amber-700 text-sm mb-3">${erreur}</p>`}

      <${Bouton} type="submit" disabled=${enregistrement}>${enregistrement ? 'Enregistrement…' : 'Enregistrer la recette'}<//>
    </form>
  `;
};
