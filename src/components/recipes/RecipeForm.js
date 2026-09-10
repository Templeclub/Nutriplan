import { useState } from 'preact/hooks';
import { html } from '../../htm-preact.js';
import { Bouton, Champ, Chip, Titre, Alerte, SousTitre, inputClass } from '../ui/ui.js';
import { db } from '../../db/db.js';
import { estimerNutritionIngredients } from '../../api/spoonacularClient.js';
import { calculerEffortScore, calculerBatchScore } from '../../domain/scoring.js';
import { naviguerVers } from '../../router.js';

const TAGS_DISPONIBLES = ['vegetarien', 'poisson', 'viande', 'plat-principal', 'entree', 'dessert', 'soupe', 'salade'];

export const RecipeForm = ({ onFermer }) => {
  const [titre, setTitre] = useState('');
  const [tempsPrep, setTempsPrep] = useState(15);
  const [tempsCuisson, setTempsCuisson] = useState(15);
  const [portions, setPortions] = useState(4);
  const [instructions, setInstructions] = useState('');
  const [tags, setTags] = useState([]);
  const [ingredients, setIngredients] = useState([{ nom: '', quantite: '', unite: '' }]);
  const [enregistrement, setEnregistrement] = useState(false);
  const [avertissement, setAvertissement] = useState('');

  const majIngredient = (i, champ, valeur) =>
    setIngredients((liste) => liste.map((ing, idx) => (idx === i ? { ...ing, [champ]: valeur } : ing)));

  const toggleTag = (tag) => setTags((t) => (t.includes(tag) ? t.filter((x) => x !== tag) : [...t, tag]));

  const enregistrer = async (e) => {
    e.preventDefault();
    setEnregistrement(true);
    setAvertissement('');

    const ingredientsValides = ingredients
      .filter((i) => i.nom.trim())
      .map((i) => ({ ...i, quantite: Number(i.quantite) || 0 }));

    let nutritionParPortion = { kcal: 0, proteines: 0, glucides: 0, lipides: 0, fibres: 0 };
    try {
      if (ingredientsValides.length > 0) {
        nutritionParPortion = await estimerNutritionIngredients(ingredientsValides, Number(portions));
      }
    } catch (err) {
      setAvertissement(`Enregistrée sans estimation nutritionnelle (${err.message})`);
    }

    const donnees = {
      titre,
      source: 'manuel',
      url: '',
      image: '',
      tags,
      regimes: {
        vegetarien: tags.includes('vegetarien'),
        vegan: false,
        sansGluten: false,
        sansLactose: false,
      },
      langueOrigine: 'fr',
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
    <form onSubmit=${enregistrer} class="pb-10">
      <div class="flex items-start justify-between gap-3">
        <${Titre}>Nouvelle recette<//>
        <button type="button" class="font-titre text-xs uppercase underline underline-offset-4 mt-1.5" onClick=${onFermer}>Fermer</button>
      </div>

      <${Champ} label="Titre">
        <input class=${inputClass} required value=${titre} onInput=${(e) => setTitre(e.target.value)} placeholder="Curry de lentilles" />
      <//>

      <div class="grid grid-cols-3 gap-2">
        <${Champ} label="Prépa">
          <input class=${inputClass} type="number" min="0" value=${tempsPrep} onInput=${(e) => setTempsPrep(e.target.value)} />
        <//>
        <${Champ} label="Cuisson">
          <input class=${inputClass} type="number" min="0" value=${tempsCuisson} onInput=${(e) => setTempsCuisson(e.target.value)} />
        <//>
        <${Champ} label="Portions">
          <input class=${inputClass} type="number" min="1" value=${portions} onInput=${(e) => setPortions(e.target.value)} />
        <//>
      </div>

      <${SousTitre}>Tags<//>
      <div class="flex flex-wrap gap-1.5 mb-5">
        ${TAGS_DISPONIBLES.map((tag) => html`<${Chip} actif=${tags.includes(tag)} onClick=${() => toggleTag(tag)}>${tag}<//>`)}
      </div>

      <${SousTitre}>Ingrédients<//>
      <div class="space-y-2 mb-3">
        ${ingredients.map(
          (ing, i) => html`
            <div class="flex gap-1.5">
              <input class="${inputClass} flex-1" placeholder="nom" value=${ing.nom}
                onInput=${(e) => majIngredient(i, 'nom', e.target.value)} />
              <input class="${inputClass} w-16" placeholder="qté" inputmode="decimal" value=${ing.quantite}
                onInput=${(e) => majIngredient(i, 'quantite', e.target.value)} />
              <input class="${inputClass} w-16" placeholder="unité" value=${ing.unite}
                onInput=${(e) => majIngredient(i, 'unite', e.target.value)} />
              <button type="button" class="w-11 shrink-0 border-[3px] border-noir bg-white text-rouge font-titre"
                onClick=${() => setIngredients((l) => l.filter((_, idx) => idx !== i))}>✕</button>
            </div>
          `
        )}
      </div>
      <${Bouton} variante="secondaire" class="mb-5"
        onClick=${() => setIngredients((l) => [...l, { nom: '', quantite: '', unite: '' }])}>+ Ingrédient<//>

      <${Champ} label="Préparation" indice="Une étape par ligne">
        <textarea class="${inputClass} min-h-[140px]" value=${instructions}
          onInput=${(e) => setInstructions(e.target.value)}></textarea>
      <//>

      ${avertissement && html`<${Alerte}>${avertissement}<//>`}

      <${Bouton} type="submit" class="w-full" disabled=${enregistrement}>
        ${enregistrement ? 'Enregistrement…' : 'Enregistrer'}
      <//>
    </form>
  `;
};
