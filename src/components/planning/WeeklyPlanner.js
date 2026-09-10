import { useEffect, useState } from 'preact/hooks';
import { html } from '../../htm-preact.js';
import { Bouton, Badge, Titre, SousTitre, Jauge, Alerte, Chip } from '../ui/ui.js';
import { db } from '../../db/db.js';
import { useLiveQuery } from '../../hooks/useLiveQuery.js';
import { useActiveProfile } from '../../hooks/useActiveProfile.js';
import { calculerBesoins, NIVEAUX_ACTIVITE, LABELS_ACTIVITE } from '../../domain/nutrition.js';
import { genererPlanningHebdomadaire, POIDS_PAR_DEFAUT } from '../../domain/planning.js';
import { classifierRegime, LABELS_REGIME, COULEURS_REGIME } from '../../domain/classification.js';
import { naviguerVers } from '../../router.js';

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const LABELS_JOURS = { lundi: 'Lun', mardi: 'Mar', mercredi: 'Mer', jeudi: 'Jeu', vendredi: 'Ven', samedi: 'Sam', dimanche: 'Dim' };
const CATEGORIES = ['vegetarien', 'poisson', 'viande', 'autre'];

function semaineIso(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const jourSemaine = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - jourSemaine);
  const debutAnnee = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const numeroSemaine = Math.ceil(((d - debutAnnee) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(numeroSemaine).padStart(2, '0')}`;
}

function objectifsParDefaut(profil) {
  return JOURS.map((jour) => {
    const macrosCible = calculerBesoins(
      { poidsKg: profil.poidsKg, tailleCm: profil.tailleCm, age: profil.age, sexe: profil.sexe },
      'modere'
    );
    return { jour, niveauActivitePrevu: 'modere', kcalCible: macrosCible.kcal, macrosCible };
  });
}

export const WeeklyPlanner = () => {
  const profil = useActiveProfile();
  const recettes = useLiveQuery(() => db.recipes.toArray(), [], []);
  const semaine = semaineIso();
  const planExistant = useLiveQuery(() => db.weeklyPlans.where('semaine').equals(semaine).first(), [semaine]);

  const [envies, setEnvies] = useState({ vegetarien: 2, poisson: 1, viande: 3, autre: 1, batchSouhaite: 2 });
  const [objectifsJournaliers, setObjectifsJournaliers] = useState(null);
  const [genere, setGenere] = useState(null);
  const [reglagesOuverts, setReglagesOuverts] = useState(true);

  useEffect(() => {
    if (profil && !objectifsJournaliers) setObjectifsJournaliers(objectifsParDefaut(profil));
  }, [profil]);

  useEffect(() => {
    if (planExistant?.envies) setEnvies(planExistant.envies);
    if (planExistant?.objectifsJournaliers) setObjectifsJournaliers(planExistant.objectifsJournaliers);
    if (planExistant?.repasAssignes?.length) setReglagesOuverts(false);
  }, [planExistant?.semaine]);

  if (!profil) {
    return html`<div class="pb-10">
      <${Titre}>Planning<//>
      <${Alerte}>Crée d'abord un profil pour calculer tes besoins de la semaine.<//>
    </div>`;
  }
  if (!objectifsJournaliers) return html`<p class="font-titre uppercase text-sm">Chargement…</p>`;

  const planAffiche = genere || planExistant?.repasAssignes;
  const recetteParId = (id) => (recettes || []).find((r) => r.id === id);

  const majActiviteJour = (jour, niveau) => {
    setObjectifsJournaliers((liste) =>
      liste.map((o) => {
        if (o.jour !== jour) return o;
        const macrosCible = calculerBesoins(
          { poidsKg: profil.poidsKg, tailleCm: profil.tailleCm, age: profil.age, sexe: profil.sexe },
          niveau
        );
        return { ...o, niveauActivitePrevu: niveau, kcalCible: macrosCible.kcal, macrosCible };
      })
    );
  };

  const genererPlan = async () => {
    const repasAssignes = genererPlanningHebdomadaire({
      recettesDisponibles: recettes || [],
      objectifsJournaliers,
      envies,
      preferences: profil.preferencesAlimentaires,
      poids: POIDS_PAR_DEFAUT,
    });
    setGenere(repasAssignes);
    setReglagesOuverts(false);
    await db.weeklyPlans.put({ ...(planExistant || {}), semaine, envies, objectifsJournaliers, repasAssignes });
  };

  const echangerAvecAlternative = async (index, nouvelleRecetteId) => {
    const maj = planAffiche.map((repas, i) => {
      if (i !== index) return repas;
      const alternatives = [repas.recetteId, ...repas.alternatives.filter((a) => a !== nouvelleRecetteId)];
      return { ...repas, recetteId: nouvelleRecetteId, alternatives: alternatives.slice(0, 3) };
    });
    setGenere(maj);
    await db.weeklyPlans.put({ ...(planExistant || {}), semaine, envies, objectifsJournaliers, repasAssignes: maj });
  };

  const totaux = (planAffiche || []).reduce(
    (acc, repas) => {
      const r = recetteParId(repas.recetteId);
      if (!r) return acc;
      acc.kcal += r.nutritionParPortion?.kcal || 0;
      acc.proteines += r.nutritionParPortion?.proteines || 0;
      return acc;
    },
    { kcal: 0, proteines: 0 }
  );
  const kcalCibleSemaine = objectifsJournaliers.reduce((s, o) => s + o.kcalCible, 0);
  const bibliothequeVide = !recettes || recettes.length === 0;

  return html`
    <div class="pb-10">
      <${Titre}>Semaine ${semaine.split('-W')[1]}<//>

      ${bibliothequeVide && html`<${Alerte}>Ajoute des recettes à ta bibliothèque avant de générer un planning.<//>`}

      <button
        class="w-full flex items-center justify-between border-[3px] border-noir bg-white px-3 py-2 mb-3 font-titre text-[11px] uppercase tracking-widest"
        onClick=${() => setReglagesOuverts((v) => !v)}
      >
        <span>Envies & activité</span>
        <span class="text-rouge text-lg leading-none">${reglagesOuverts ? '−' : '+'}</span>
      </button>

      ${reglagesOuverts &&
      html`
        <div class="anim-monter mb-5">
          <div class="bg-white border-[3px] border-noir shadow-dur p-3 mb-3">
            <${SousTitre}>Repas souhaités<//>
            <div class="grid grid-cols-4 gap-2 mb-3">
              ${CATEGORIES.map(
                (cat) => html`
                  <label class="text-center">
                    <span class="block text-[9px] uppercase tracking-widest text-gris mb-1">${LABELS_REGIME[cat]}</span>
                    <input
                      type="number" min="0" inputmode="numeric"
                      class="w-full min-h-[44px] text-center font-titre text-lg border-[3px] border-noir focus:outline-none focus:border-rouge"
                      value=${envies[cat]}
                      onInput=${(e) => setEnvies((v) => ({ ...v, [cat]: Number(e.target.value) }))}
                    />
                  </label>
                `
              )}
            </div>
            <label class="flex items-center justify-between gap-3">
              <span class="font-titre text-[11px] uppercase tracking-widest">Repas en batch</span>
              <input
                type="number" min="0" inputmode="numeric"
                class="w-20 min-h-[44px] text-center font-titre text-lg border-[3px] border-noir focus:outline-none focus:border-rouge"
                value=${envies.batchSouhaite}
                onInput=${(e) => setEnvies((v) => ({ ...v, batchSouhaite: Number(e.target.value) }))}
              />
            </label>
          </div>

          <div class="bg-white border-[3px] border-noir shadow-dur p-3">
            <${SousTitre}>Activité prévue<//>
            <div class="space-y-1.5">
              ${objectifsJournaliers.map(
                (o) => html`
                  <div class="flex items-center gap-2">
                    <span class="font-titre text-[11px] uppercase w-9 shrink-0">${LABELS_JOURS[o.jour]}</span>
                    <div class="flex gap-1 flex-1">
                      ${NIVEAUX_ACTIVITE.map(
                        (n) => html`<button
                          class="flex-1 min-h-[36px] font-titre text-[9px] uppercase border-2 border-noir ${o.niveauActivitePrevu === n ? 'bg-rouge text-creme' : 'bg-white'}"
                          onClick=${() => majActiviteJour(o.jour, n)}
                        >${LABELS_ACTIVITE[n].slice(0, 3)}</button>`
                      )}
                    </div>
                    <span class="font-titre text-[11px] w-12 text-right shrink-0">${o.kcalCible}</span>
                  </div>
                `
              )}
            </div>
          </div>
        </div>
      `}

      <${Bouton} class="w-full mb-5" disabled=${bibliothequeVide} onClick=${genererPlan}>
        ${planAffiche ? 'Régénérer' : 'Générer le planning'}
      <//>

      ${planAffiche &&
      html`
        <div class="bg-noir text-creme border-[3px] border-noir shadow-dur-rouge p-3 mb-5">
          <${SousTitre}>Bilan de la semaine<//>
          <div class="flex justify-between items-baseline mb-2">
            <span class="font-titre text-2xl">${totaux.kcal}</span>
            <span class="text-xs text-creme/60">/ ${kcalCibleSemaine} kcal cibles</span>
          </div>
          <${Jauge} pourcentage=${(totaux.kcal / (kcalCibleSemaine || 1)) * 100} couleur="rouge" />
          <p class="text-xs text-creme/60 mt-2">
            ${planAffiche.length} repas planifiés · ${totaux.proteines}g de protéines
          </p>
        </div>

        <div class="flex flex-col gap-3">
          ${planAffiche.map((repas, index) => {
            const r = recetteParId(repas.recetteId);
            if (!r) return '';
            const regime = classifierRegime(r);
            const alternatives = (repas.alternatives || []).map(recetteParId).filter(Boolean);
            return html`
              <article key=${`${repas.jour}-${repas.typeRepas}`} class="bg-white border-[3px] border-noir shadow-dur anim-monter" style=${`animation-delay:${index * 40}ms`}>
                <div class="flex">
                  <div class="w-14 shrink-0 bg-noir text-creme flex items-center justify-center">
                    <span class="font-titre text-xs uppercase">${LABELS_JOURS[repas.jour]}</span>
                  </div>
                  <div class="flex-1 p-3 min-w-0">
                    <div class="flex items-start justify-between gap-2">
                      <h3 class="font-titre text-base uppercase leading-tight cursor-pointer" onClick=${() => naviguerVers(`#/recette/${r.id}`)}>${r.titre}</h3>
                      <${Badge} couleur=${COULEURS_REGIME[regime]}>${LABELS_REGIME[regime]}<//>
                    </div>
                    <p class="text-xs text-gris mt-1">
                      ${r.nutritionParPortion?.kcal || 0} kcal · ${(r.tempsPrep || 0) + (r.tempsCuisson || 0)} min · batch ${r.batchScore ?? '—'}
                    </p>

                    ${alternatives.length > 0 &&
                    html`<div class="mt-2 pt-2 border-t-2 border-noir">
                      <span class="block text-[9px] uppercase tracking-widest text-gris mb-1.5">Remplacer par</span>
                      <div class="flex gap-1.5 overflow-x-auto pb-1">
                        ${alternatives.map(
                          (alt) => html`<${Chip} onClick=${() => echangerAvecAlternative(index, alt.id)}>${alt.titre}<//>`
                        )}
                      </div>
                    </div>`}
                  </div>
                </div>
              </article>
            `;
          })}
        </div>
      `}
    </div>
  `;
};
