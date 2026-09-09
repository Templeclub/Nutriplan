import { useState } from 'preact/hooks';
import { html } from '../../htm-preact.js';
import { Bouton, Champ, inputClass, Badge } from '../ui/ui.js';
import { rechercherRecettes } from '../../api/spoonacularClient.js';
import { db } from '../../db/db.js';
import { calculerEffortScore, calculerBatchScore } from '../../domain/scoring.js';
import { naviguerVers } from '../../router.js';

export const RecipeSearch = ({ onFermer }) => {
  const [requete, setRequete] = useState('');
  const [type, setType] = useState('');
  const [resultats, setResultats] = useState([]);
  const [enChargement, setEnChargement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [idsEnCoursAjout, setIdsEnCoursAjout] = useState(new Set());

  const rechercher = async (e) => {
    e.preventDefault();
    setEnChargement(true);
    setErreur('');
    try {
      const resultats = await rechercherRecettes({ query: requete, type: type || undefined, number: 12 });
      setResultats(resultats);
    } catch (err) {
      setErreur(err.message || 'Erreur de recherche');
    } finally {
      setEnChargement(false);
    }
  };

  const ajouter = async (recette) => {
    setIdsEnCoursAjout((s) => new Set(s).add(recette._idApi));
    const { _idApi, ...donnees } = recette;
    donnees.effortScore = calculerEffortScore(donnees);
    donnees.batchScore = calculerBatchScore(donnees);
    const id = await db.recipes.add(donnees);
    naviguerVers(`#/recette/${id}`);
  };

  return html`
    <div>
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-bold">Rechercher une recette</h2>
        <button class="text-slate-500 text-sm" onClick=${onFermer}>Fermer</button>
      </div>

      <form onSubmit=${rechercher} class="mb-4">
        <${Champ} label="Mots-clés">
          <input class=${inputClass} value=${requete} onInput=${(e) => setRequete(e.target.value)}
            placeholder="ex. poulet curry" />
        <//>
        <${Champ} label="Type de plat (optionnel)">
          <select class=${inputClass} value=${type} onChange=${(e) => setType(e.target.value)}>
            <option value="">Tous</option>
            <option value="main course">Plat principal</option>
            <option value="soup">Soupe</option>
            <option value="salad">Salade</option>
            <option value="side dish">Accompagnement</option>
          </select>
        <//>
        <${Bouton} type="submit" disabled=${enChargement}>${enChargement ? 'Recherche…' : 'Rechercher'}<//>
      </form>

      ${erreur && html`<p class="text-red-600 text-sm mb-3">${erreur}</p>`}

      <div class="flex flex-col gap-3">
        ${resultats.map(
          (r) => html`
            <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
              <p class="font-semibold text-slate-900">${r.titre}</p>
              <div class="flex flex-wrap gap-1.5 my-2">
                <${Badge}>${r.tempsPrep + r.tempsCuisson} min<//>
                <${Badge} couleur="blue">${r.nutritionParPortion.kcal} kcal/portion<//>
              </div>
              <${Bouton} variante="secondaire" disabled=${idsEnCoursAjout.has(r._idApi)}
                onClick=${() => ajouter(r)}>
                ${idsEnCoursAjout.has(r._idApi) ? 'Ajouté ✓' : '+ Ajouter à ma bibliothèque'}
              <//>
            </div>
          `
        )}
      </div>
    </div>
  `;
};
