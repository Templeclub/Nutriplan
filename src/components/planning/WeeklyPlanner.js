import { useEffect, useState } from 'preact/hooks';
import { html } from '../../htm-preact.js';
import { Bouton, Badge, Titre, Carte, BarreProgression } from '../ui/ui.js';
import { db } from '../../db/db.js';
import { useLiveQuery } from '../../hooks/useLiveQuery.js';
import { useActiveProfile } from '../../hooks/useActiveProfile.js';
import { calculerBesoins, NIVEAUX_ACTIVITE, LABELS_ACTIVITE } from '../../domain/nutrition.js';
import { genererPlanningHebdomadaire, POIDS_PAR_DEFAUT } from '../../domain/planning.js';
import { naviguerVers } from '../../router.js';

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const LABELS_JOURS = { lundi: 'Lun', mardi: 'Mar', mercredi: 'Mer', jeudi: 'Jeu', vendredi: 'Ven', samedi: 'Sam', dimanche: 'Dim' };

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

  useEffect(() => {
    if (profil && !objectifsJournaliers) setObjectifsJournaliers(objectifsParDefaut(profil));
  }, [profil]);

  useEffect(() => {
    if (planExistant?.envies) setEnvies(planExistant.envies);
    if (planExistant?.objectifsJournaliers) setObjectifsJournaliers(planExistant.objectifsJournaliers);
  }, [planExistant?.semaine]);

  if (!profil) {
    return html`<p class="text-slate-500">Crée d'abord un profil pour générer un planning.</p>`;
  }
  if (!objectifsJournaliers) {
    return html`<p class="text-slate-500">Chargement…</p>`;
  }

  const planAffiche = genere || planExistant?.repasAssignes;

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
    await db.weeklyPlans.put({
      ...(planExistant || {}),
      semaine,
      envies,
      objectifsJournaliers,
      repasAssignes,
    });
  };

  const recetteParId = (id) => (recettes || []).find((r) => r.id === id);

  const totalSemaine = (planAffiche || []).reduce(
    (acc, repas) => {
      const r = recetteParId(repas.recetteId);
      if (!r) return acc;
      acc.kcal += r.nutritionParPortion?.kcal || 0;
      acc.proteines += r.nutritionParPortion?.proteines || 0;
      return acc;
    },
    { kcal: 0, proteines: 0 }
  );
  const kcalCibleSemaine = (objectifsJournaliers || []).reduce((s, o) => s + o.kcalCible, 0);

  return html`
    <div class="pb-8">
      <${Titre}>Planning — ${semaine}<//>

      <${Carte} class="mb-4">
        <p class="font-semibold mb-3">Envies de la semaine</p>
        <div class="grid grid-cols-2 gap-3">
          ${['vegetarien', 'poisson', 'viande', 'autre'].map(
            (cat) => html`
              <label class="text-sm">
                <span class="block text-slate-600 mb-1 capitalize">${cat}</span>
                <input type="number" min="0" class="w-full min-h-[40px] px-2 rounded-lg border border-slate-300"
                  value=${envies[cat]}
                  onInput=${(e) => setEnvies((v) => ({ ...v, [cat]: Number(e.target.value) }))} />
              </label>
            `
          )}
        </div>
        <label class="text-sm block mt-3">
          <span class="block text-slate-600 mb-1">Repas en batch-cooking souhaités</span>
          <input type="number" min="0" class="w-full min-h-[40px] px-2 rounded-lg border border-slate-300"
            value=${envies.batchSouhaite}
            onInput=${(e) => setEnvies((v) => ({ ...v, batchSouhaite: Number(e.target.value) }))} />
        </label>
      <//>

      <${Carte} class="mb-4">
        <p class="font-semibold mb-3">Activité prévue par jour</p>
        <div class="flex flex-col gap-2">
          ${(objectifsJournaliers || []).map(
            (o) => html`
              <div class="flex items-center justify-between gap-2">
                <span class="text-sm w-10">${LABELS_JOURS[o.jour]}</span>
                <div class="flex gap-1 flex-1 overflow-x-auto">
                  ${NIVEAUX_ACTIVITE.map(
                    (n) => html`<button
                      class="text-xs px-2 py-1 rounded-full min-h-[32px] ${o.niveauActivitePrevu === n ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}"
                      onClick=${() => majActiviteJour(o.jour, n)}
                    >${LABELS_ACTIVITE[n]}</button>`
                  )}
                </div>
                <span class="text-xs text-slate-400 w-16 text-right">${o.kcalCible} kcal</span>
              </div>
            `
          )}
        </div>
      <//>

      <${Bouton} class="w-full mb-4" onClick=${genererPlan}
        disabled=${!recettes || recettes.length === 0}>
        ${planAffiche ? 'Régénérer le planning' : 'Générer le planning'}
      <//>
      ${(!recettes || recettes.length === 0) && html`<p class="text-sm text-amber-700 mb-4">Ajoute des recettes à ta bibliothèque avant de générer un planning.</p>`}

      ${planAffiche &&
      html`
        <${Carte} class="mb-4">
          <p class="font-semibold mb-2">Synthèse de la semaine</p>
          <div class="text-sm flex justify-between mb-1">
            <span>Calories</span><span>${totalSemaine.kcal} / ${kcalCibleSemaine} kcal</span>
          </div>
          <${BarreProgression} pourcentage=${(totalSemaine.kcal / (kcalCibleSemaine || 1)) * 100} />
        <//>

        <div class="flex flex-col gap-3">
          ${planAffiche.map((repas) => {
            const r = recetteParId(repas.recetteId);
            if (!r) return '';
            return html`
              <${Carte} key=${`${repas.jour}-${repas.typeRepas}`} onClick=${() => naviguerVers(`#/recette/${r.id}`)} class="cursor-pointer">
                <div class="flex justify-between items-start">
                  <div>
                    <p class="text-xs text-slate-500 capitalize">${LABELS_JOURS[repas.jour]} · ${repas.typeRepas}</p>
                    <p class="font-semibold">${r.titre}</p>
                  </div>
                  <${Badge} couleur="blue">${r.nutritionParPortion?.kcal || 0} kcal<//>
                </div>
                ${repas.alternatives?.length > 0 &&
                html`<p class="text-xs text-slate-400 mt-2">
                  Alternatives : ${repas.alternatives.map((id) => recetteParId(id)?.titre).filter(Boolean).join(', ')}
                </p>`}
              <//>
            `;
          })}
        </div>
      `}
    </div>
  `;
};
