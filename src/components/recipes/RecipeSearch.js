import { useState } from 'preact/hooks';
import { html } from '../../htm-preact.js';
import { Bouton, Badge, Chip, Titre, Alerte, inputClass } from '../ui/ui.js';
import { rechercherRecettes } from '../../api/spoonacularClient.js';
import { traduireRecette } from '../../api/translationClient.js';
import { db } from '../../db/db.js';
import { calculerEffortScore, calculerBatchScore } from '../../domain/scoring.js';
import { classifierRegime, LABELS_REGIME, COULEURS_REGIME } from '../../domain/classification.js';
import { evaluerSaisonnalite } from '../../domain/saisonnalite.js';
import { naviguerVers } from '../../router.js';

const REGIMES = [
  { valeur: '', label: 'Tous' },
  { valeur: 'vegetarian', label: 'Végé' },
  { valeur: 'vegan', label: 'Végan' },
  { valeur: 'gluten free', label: 'Sans gluten' },
];

const TYPES = [
  { valeur: '', label: 'Tout' },
  { valeur: 'main course', label: 'Plat' },
  { valeur: 'soup', label: 'Soupe' },
  { valeur: 'salad', label: 'Salade' },
  { valeur: 'side dish', label: 'Accompagnement' },
  { valeur: 'dessert', label: 'Dessert' },
];

const TEMPS = [
  { valeur: 0, label: 'Sans limite' },
  { valeur: 20, label: '≤ 20 min' },
  { valeur: 40, label: '≤ 40 min' },
];

export const RecipeSearch = ({ onFermer }) => {
  const [requete, setRequete] = useState('');
  const [diet, setDiet] = useState('');
  const [type, setType] = useState('');
  const [maxTemps, setMaxTemps] = useState(0);
  const [resultats, setResultats] = useState(null);
  const [requeteTraduite, setRequeteTraduite] = useState('');
  const [enChargement, setEnChargement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [ajoutEnCours, setAjoutEnCours] = useState(null);

  const rechercher = async (e) => {
    e?.preventDefault();
    setEnChargement(true);
    setErreur('');
    try {
      const { resultats, requeteTraduite } = await rechercherRecettes({
        query: requete,
        diet: diet || undefined,
        type: type || undefined,
        maxTemps: maxTemps || undefined,
      });
      setResultats(resultats);
      setRequeteTraduite(requeteTraduite);
    } catch (err) {
      setErreur(err.message || 'Erreur de recherche');
    } finally {
      setEnChargement(false);
    }
  };

  const ajouter = async (recette) => {
    setAjoutEnCours(recette._idApi);
    try {
      const { _idApi, ...donnees } = recette;
      const traduite = await traduireRecette(donnees);
      traduite.effortScore = calculerEffortScore(traduite);
      traduite.batchScore = calculerBatchScore(traduite);
      const id = await db.recipes.add(traduite);
      naviguerVers(`#/recette/${id}`);
    } catch (err) {
      setErreur(err.message || "Échec de l'ajout");
      setAjoutEnCours(null);
    }
  };

  return html`
    <div class="pb-10">
      <div class="flex items-start justify-between gap-3">
        <${Titre}>Rechercher<//>
        <button class="font-titre text-xs uppercase underline underline-offset-4 mt-1.5" onClick=${onFermer}>Fermer</button>
      </div>

      <form onSubmit=${rechercher} class="mb-4">
        <div class="flex gap-2 mb-3">
          <input
            class="${inputClass} flex-1"
            value=${requete}
            onInput=${(e) => setRequete(e.target.value)}
            placeholder="poulet curry, soupe potiron…"
            enterkeyhint="search"
          />
          <${Bouton} type="submit" disabled=${enChargement}>${enChargement ? '…' : 'OK'}<//>
        </div>

        <div class="space-y-2">
          <div class="flex gap-1.5 overflow-x-auto pb-1">
            ${REGIMES.map((r) => html`<${Chip} actif=${diet === r.valeur} onClick=${() => setDiet(r.valeur)}>${r.label}<//>`)}
          </div>
          <div class="flex gap-1.5 overflow-x-auto pb-1">
            ${TYPES.map((t) => html`<${Chip} actif=${type === t.valeur} onClick=${() => setType(t.valeur)}>${t.label}<//>`)}
          </div>
          <div class="flex gap-1.5 overflow-x-auto pb-1">
            ${TEMPS.map((t) => html`<${Chip} actif=${maxTemps === t.valeur} onClick=${() => setMaxTemps(t.valeur)}>${t.label}<//>`)}
          </div>
        </div>
      </form>

      ${erreur && html`<${Alerte} ton="erreur">${erreur}<//>`}

      ${requeteTraduite && requeteTraduite !== requete.trim().toLowerCase() &&
      html`<p class="text-xs text-gris mb-3 font-titre uppercase tracking-wider">Recherché : « ${requeteTraduite} »</p>`}

      ${resultats?.length === 0 && html`<${Alerte}>Aucun résultat. Essaie d'autres mots-clés ou enlève un filtre.<//>`}

      <div class="flex flex-col gap-4">
        ${(resultats || []).map((r, i) => html`<${ResultatRecherche}
          key=${r._idApi}
          recette=${r}
          index=${i}
          enAjout=${ajoutEnCours === r._idApi}
          onAjouter=${() => ajouter(r)}
        />`)}
      </div>
    </div>
  `;
};

const ResultatRecherche = ({ recette, index, enAjout, onAjouter }) => {
  const [deplie, setDeplie] = useState(false);
  const temps = recette.tempsPrep + recette.tempsCuisson;
  const regime = classifierRegime(recette);
  const saison = evaluerSaisonnalite(recette);
  const n = recette.nutritionParPortion;
  const effort = calculerEffortScore(recette);
  const batch = calculerBatchScore(recette);

  return html`
    <article class="bg-white border-[3px] border-noir shadow-dur anim-monter" style=${`animation-delay:${Math.min(index * 50, 300)}ms`}>
      ${recette.image &&
      html`<div class="border-b-[3px] border-noir h-36 overflow-hidden">
        <img src=${recette.image} alt="" loading="lazy" class="w-full h-full object-cover" />
      </div>`}

      <div class="p-3">
        <h3 class="font-titre text-lg uppercase leading-tight mb-2">${recette.titre}</h3>

        <div class="flex flex-wrap gap-1 mb-3">
          <${Badge} couleur=${COULEURS_REGIME[regime]}>${LABELS_REGIME[regime]}<//>
          ${recette.regimes?.vegan && html`<${Badge} couleur="jaune">Végan<//>`}
          ${recette.regimes?.sansGluten && html`<${Badge} couleur="creme">Sans gluten<//>`}
          ${recette.regimes?.sansLactose && html`<${Badge} couleur="creme">Sans lactose<//>`}
          <${Badge} couleur="creme">${temps} min<//>
          <${Badge} couleur="creme">${recette.portions} portions<//>
          ${saison.statut === 'de_saison' && html`<${Badge} couleur="jaune">De saison<//>`}
          ${saison.statut === 'hors_saison' && html`<${Badge} couleur="creme">Hors saison<//>`}
        </div>

        <!-- Nutrition par portion, en grille lisible -->
        <div class="grid grid-cols-4 border-[3px] border-noir mb-3">
          ${[['kcal', n.kcal], ['Prot.', `${n.proteines}g`], ['Gluc.', `${n.glucides}g`], ['Lip.', `${n.lipides}g`]].map(
            ([label, valeur], i) => html`
              <div class="${i < 3 ? 'border-r-[3px] border-noir' : ''} px-1 py-1.5 text-center">
                <div class="font-titre text-base leading-none">${valeur}</div>
                <div class="text-[9px] uppercase tracking-wider text-gris mt-0.5">${label}</div>
              </div>
            `
          )}
        </div>

        <div class="flex gap-4 font-titre text-[10px] uppercase tracking-wider mb-3">
          <span>Effort <span class="text-rouge">${effort}</span></span>
          <span>Batch <span class="text-rouge">${batch}</span></span>
        </div>

        ${recette.ingredients.length > 0 &&
        html`
          <button
            class="w-full text-left border-t-[3px] border-noir pt-2 mb-3"
            onClick=${() => setDeplie((v) => !v)}
          >
            <span class="font-titre text-[10px] uppercase tracking-widest">
              ${recette.ingredients.length} ingrédients ${deplie ? '−' : '+'}
            </span>
            ${!deplie &&
            html`<p class="text-xs text-gris truncate">${recette.ingredients.slice(0, 5).map((i) => i.nom).join(' · ')}</p>`}
          </button>
          ${deplie &&
          html`<ul class="text-xs mb-3 space-y-0.5">
            ${recette.ingredients.map(
              (i) => html`<li class="flex gap-2">
                <span class="text-rouge font-titre">▪</span>
                <span>${i.quantite ? `${i.quantite} ${i.unite} ` : ''}${i.nom}</span>
              </li>`
            )}
          </ul>`}
        `}

        <${Bouton} class="w-full" disabled=${enAjout} onClick=${onAjouter}>
          ${enAjout ? 'Traduction…' : 'Ajouter'}
        <//>
      </div>
    </article>
  `;
};
